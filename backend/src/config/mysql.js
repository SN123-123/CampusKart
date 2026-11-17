const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool;
let dbName;

async function hasColumn(table, column) {
  const [r] = await pool.query(
    'SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?',
    [dbName, table, column]
  );
  return r.length > 0;
}

async function hasConstraint(table, name) {
  const [r] = await pool.query(
    'SELECT 1 FROM information_schema.table_constraints WHERE table_schema = ? AND table_name = ? AND constraint_name = ?',
    [dbName, table, name]
  );
  return r.length > 0;
}

// Upgrades a database that was created by an older version of schema.sql.
// Safe to run on every start: each step does nothing if it is already done.
async function migrate() {
  // v3: seller mobile number
  if (!(await hasColumn('users', 'mobile'))) {
    await pool.query('ALTER TABLE users ADD COLUMN mobile CHAR(10) NULL AFTER srn');
    console.log('Migrated: users.mobile added');
  }
  // v2: buyer + admin review columns on listings
  const listingCols = {
    buyer_id: 'INT NULL',
    sold_at: 'DATETIME NULL',
    reviewed_by: 'INT NULL',
    reviewed_at: 'DATETIME NULL',
  };
  for (const [col, def] of Object.entries(listingCols)) {
    if (!(await hasColumn('listings', col))) {
      await pool.query(`ALTER TABLE listings ADD COLUMN ${col} ${def}`);
      console.log(`Migrated: listings.${col} added`);
    }
  }
  const listingFks = { fk_listing_buyer: 'buyer_id', fk_listing_reviewer: 'reviewed_by' };
  for (const [name, col] of Object.entries(listingFks)) {
    if (!(await hasConstraint('listings', name))) {
      await pool.query(
        `ALTER TABLE listings ADD CONSTRAINT ${name} FOREIGN KEY (${col}) REFERENCES users(id) ON DELETE SET NULL`
      );
      console.log(`Migrated: ${name} added`);
    }
  }

  // v2: listing_images becomes a weak entity keyed by (listing_id, image_no).
  // Done in small steps; each step is skipped if it is already finished.
  if (await hasColumn('listing_images', 'id')) {
    await pool.query('ALTER TABLE listing_images MODIFY id INT NOT NULL'); // drop AUTO_INCREMENT first
    await pool.query('ALTER TABLE listing_images DROP PRIMARY KEY, DROP COLUMN id');
    console.log('Migrated: listing_images.id removed');
  }
  if (await hasColumn('listing_images', 'sort_order')) {
    await pool.query('ALTER TABLE listing_images CHANGE sort_order image_no TINYINT NOT NULL');
    await pool.query('UPDATE listing_images SET image_no = image_no + 1'); // numbering now starts at 1
    console.log('Migrated: listing_images.sort_order is now image_no (1, 2, 3...)');
  }
  const [pk] = await pool.query(
    "SELECT 1 FROM information_schema.table_constraints WHERE table_schema = ? AND table_name = 'listing_images' AND constraint_type = 'PRIMARY KEY'",
    [dbName]
  );
  if (!pk.length) {
    await pool.query('ALTER TABLE listing_images ADD PRIMARY KEY (listing_id, image_no)');
    console.log('Migrated: listing_images key is now (listing_id, image_no)');
  }
}

// ----------------------------------------------------------------
// TRIGGERS  (created here rather than schema.sql because trigger
// bodies contain semicolons that mysql2 multipleStatements mode
// would mis-split if they were in the flat SQL file)
// ----------------------------------------------------------------

// TRIGGER 1 & 2: prevent a seller buying their own listing (INSERT + UPDATE)
// TRIGGER 3: auto-stamp sold_at when status flips to 'sold'
async function createTriggers() {
  const triggers = [
    // Trigger 1 – BEFORE INSERT guard
    ['trg_listing_no_self_buy_ins', `
      CREATE TRIGGER trg_listing_no_self_buy_ins BEFORE INSERT ON listings FOR EACH ROW
      BEGIN
        IF NEW.buyer_id IS NOT NULL AND NEW.buyer_id = NEW.seller_id THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A seller cannot buy their own listing';
        END IF;
      END`],

    // Trigger 2 – BEFORE UPDATE guard (same rule, also auto-sets sold_at)
    ['trg_listing_no_self_buy_upd', `
      CREATE TRIGGER trg_listing_no_self_buy_upd BEFORE UPDATE ON listings FOR EACH ROW
      BEGIN
        -- Rule: seller cannot be their own buyer
        IF NEW.buyer_id IS NOT NULL AND NEW.buyer_id = NEW.seller_id THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A seller cannot buy their own listing';
        END IF;
        -- Auto-stamp sold_at the moment status first changes to sold
        IF NEW.status = 'sold' AND OLD.status != 'sold' AND NEW.sold_at IS NULL THEN
          SET NEW.sold_at = NOW();
        END IF;
      END`],

    // Trigger 3 – BEFORE UPDATE: clear sold_at if a listing is re-opened
    ['trg_listing_clear_sold_at', `
      CREATE TRIGGER trg_listing_clear_sold_at BEFORE UPDATE ON listings FOR EACH ROW
      BEGIN
        -- If an admin moves a listing out of 'sold' back to approved/pending,
        -- clear the sale metadata so it is not misleading.
        IF OLD.status = 'sold' AND NEW.status != 'sold' THEN
          SET NEW.sold_at   = NULL;
          SET NEW.buyer_id  = NULL;
        END IF;
      END`],
  ];

  for (const [name, sql] of triggers) {
    await pool.query(`DROP TRIGGER IF EXISTS ${name}`);
    await pool.query(sql);
  }
  console.log('Triggers ready (trg_listing_no_self_buy_ins, trg_listing_no_self_buy_upd, trg_listing_clear_sold_at)');
}

// ----------------------------------------------------------------
// STORED PROCEDURES
// sp_mark_listing_sold  : validates + marks a listing as sold
// sp_get_student_summary: uses a CTE to aggregate a student's stats
// ----------------------------------------------------------------
async function createProcedures() {
  // ---- PROCEDURE 1: sp_mark_listing_sold ----
  // Safely marks a listing as sold with validations:
  //   - listing must exist and be approved
  //   - buyer must not be the seller
  //   - buyer must have chatted (conversation check done in app layer)
  // CALL sp_mark_listing_sold(3, 7);
  await pool.query('DROP PROCEDURE IF EXISTS sp_mark_listing_sold');
  await pool.query(`
    CREATE PROCEDURE sp_mark_listing_sold(
      IN  p_listing_id INT,
      IN  p_buyer_id   INT
    )
    BEGIN
      DECLARE v_seller_id INT;
      DECLARE v_status    VARCHAR(20);

      SELECT seller_id, status
      INTO   v_seller_id, v_status
      FROM   listings
      WHERE  id = p_listing_id;

      IF v_seller_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Listing does not exist';
      ELSEIF v_seller_id = p_buyer_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A seller cannot buy their own listing';
      ELSEIF v_status != 'approved' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only approved listings can be marked as sold';
      ELSE
        UPDATE listings
        SET    status   = 'sold',
               buyer_id = p_buyer_id,
               sold_at  = NOW()
        WHERE  id = p_listing_id;
      END IF;
    END
  `);

  // ---- PROCEDURE 2: sp_get_student_summary ----
  // Uses a CTE (WITH clause) to aggregate selling + buying counts
  // for a given student, then joins to return a single summary row.
  // CALL sp_get_student_summary(5);
  await pool.query('DROP PROCEDURE IF EXISTS sp_get_student_summary');
  await pool.query(`
    CREATE PROCEDURE sp_get_student_summary(IN p_student_id INT)
    BEGIN
      -- CTE: pre-aggregate listing counts for the student
      WITH listing_summary AS (
        SELECT
          seller_id,
          COUNT(*)                                                        AS total_listed,
          SUM(status = 'approved')                                        AS active_listings,
          SUM(status = 'sold')                                            AS total_sold,
          COALESCE(SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END), 0) AS total_earned,
          SUM(status = 'pending')                                         AS pending_review
        FROM listings
        WHERE seller_id = p_student_id
        GROUP BY seller_id
      )
      SELECT
        u.id,
        u.name,
        u.email,
        u.srn,
        u.branch,
        u.admission_year,
        COALESCE(ls.total_listed,    0) AS total_listed,
        COALESCE(ls.active_listings, 0) AS active_listings,
        COALESCE(ls.total_sold,      0) AS total_sold,
        COALESCE(ls.total_earned,    0) AS total_earned,
        COALESCE(ls.pending_review,  0) AS pending_review,
        (SELECT COUNT(*) FROM listings WHERE buyer_id = p_student_id) AS items_purchased,
        (SELECT COUNT(*) FROM wishlist  WHERE user_id  = p_student_id) AS wishlist_count
      FROM  users u
      LEFT JOIN listing_summary ls ON ls.seller_id = u.id
      WHERE u.id = p_student_id;
    END
  `);

  console.log('Procedures ready (sp_mark_listing_sold, sp_get_student_summary)');
}

async function initMySQL() {
  const base = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  };
  dbName = process.env.MYSQL_DATABASE || 'campuskart';

  // Create the database if it does not exist yet
  const boot = await mysql.createConnection(base);
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4`);
  await boot.end();

  pool = mysql.createPool({
    ...base,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
  });

  // Create all tables (safe to run every start), then upgrade any older ones
  const sql = fs.readFileSync(path.join(__dirname, '../../sql/schema.sql'), 'utf8');
  await pool.query(sql);
  await migrate();
  await createTriggers();
  await createProcedures();
  console.log(`MySQL ready (database: ${dbName})`);
  return pool;
}

const db = () => pool;

module.exports = { initMySQL, db };
