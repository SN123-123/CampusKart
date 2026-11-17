-- CampusKart relational schema (MySQL 8.0.16+)
-- These tables hold the structured data. Chats and notifications live in MongoDB.
-- Safe to run many times: every statement is IF NOT EXISTS / INSERT IGNORE /
-- CREATE OR REPLACE VIEW / DROP+CREATE FUNCTION.
--
-- Advanced SQL objects in this file:
--   VIEWs    : v_active_listings, v_seller_stats
--   FUNCTION : fn_is_pes_email
--
-- Additional objects created by backend/src/config/mysql.js on every startup:
--   TRIGGERs           : trg_listing_no_self_buy_ins, trg_listing_no_self_buy_upd,
--                        trg_listing_auto_sold_at
--   STORED PROCEDURES  : sp_mark_listing_sold  (uses a CTE internally)
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(120) NOT NULL UNIQUE,
  srn             VARCHAR(30)  NULL UNIQUE,
  mobile          CHAR(10)     NULL,
  name            VARCHAR(100) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('student','admin') NOT NULL DEFAULT 'student',
  branch          VARCHAR(10)  NULL,
  admission_year  SMALLINT     NULL,
  is_verified     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_users_mobile CHECK (mobile IS NULL OR mobile REGEXP '^[6-9][0-9]{9}$')
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_otps (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(120) NOT NULL,
  otp_hash    VARCHAR(255) NOT NULL,
  attempts    TINYINT      NOT NULL DEFAULT 0,
  expires_at  DATETIME     NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS listings (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  seller_id      INT NOT NULL,
  category_id    INT NOT NULL,
  title          VARCHAR(150) NOT NULL,
  description    TEXT NOT NULL,
  price          DECIMAL(10,2) NOT NULL,
  item_condition ENUM('new','like_new','good','fair') NOT NULL DEFAULT 'good',
  status         ENUM('pending','approved','rejected','sold') NOT NULL DEFAULT 'pending',
  reject_reason  VARCHAR(255) NULL,
  buyer_id       INT NULL,                 -- set when the seller marks it sold to a buyer
  sold_at        DATETIME NULL,
  reviewed_by    INT NULL,                 -- the admin who approved or rejected it
  reviewed_at    DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_listing_price    CHECK (price >= 0),
  CONSTRAINT fk_listing_seller   FOREIGN KEY (seller_id)   REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_listing_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_listing_buyer    FOREIGN KEY (buyer_id)    REFERENCES users(id)      ON DELETE SET NULL,
  CONSTRAINT fk_listing_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)      ON DELETE SET NULL,
  INDEX idx_listing_status (status, created_at),
  INDEX idx_listing_seller (seller_id)
) ENGINE=InnoDB;

-- Weak entity: an image only exists for a listing. Key = (listing_id, image_no)
CREATE TABLE IF NOT EXISTS listing_images (
  listing_id  INT NOT NULL,
  image_no    TINYINT NOT NULL,
  image_path  VARCHAR(255) NOT NULL,
  PRIMARY KEY (listing_id, image_no),
  CONSTRAINT fk_image_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wishlist (
  user_id     INT NOT NULL,
  listing_id  INT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, listing_id),
  CONSTRAINT fk_wish_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_wish_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed default categories (safe to run many times)
INSERT IGNORE INTO categories (name) VALUES
  ('Books'), ('Electronics'), ('Furniture'), ('Cycles & Vehicles'),
  ('Clothing'), ('Lab Equipment'), ('Stationery'), ('Others');

-- ============================================================
-- FUNCTION: fn_is_pes_email
-- Returns 1 if the email matches a valid PES University student
-- address pattern (pes...@stu.pes.edu), 0 otherwise.
-- Used by application code and can be used in CHECK constraints
-- or ad-hoc queries: SELECT fn_is_pes_email('pes1ug24cs001@stu.pes.edu');
-- ============================================================
DROP FUNCTION IF EXISTS fn_is_pes_email;
CREATE FUNCTION fn_is_pes_email(p_email VARCHAR(120))
  RETURNS TINYINT(1)
  DETERMINISTIC
  RETURN (p_email REGEXP '^pes[^@]+@stu\\.pes\\.edu$');

-- ============================================================
-- VIEW 1: v_active_listings
-- A pre-joined, filtered view of approved listings for the
-- public Browse page. Hides private columns (buyer_id, mobile).
-- Usage: SELECT * FROM v_active_listings WHERE category = 'Electronics';
-- ============================================================
CREATE OR REPLACE VIEW v_active_listings AS
SELECT
  l.id,
  l.title,
  l.price,
  l.item_condition,
  l.created_at,
  c.name  AS category,
  u.name  AS seller_name,
  u.branch AS seller_branch,
  (SELECT image_path
   FROM   listing_images i
   WHERE  i.listing_id = l.id
   ORDER  BY i.image_no
   LIMIT  1) AS cover_image
FROM  listings l
JOIN  users      u ON u.id = l.seller_id
JOIN  categories c ON c.id = l.category_id
WHERE l.status = 'approved';

-- ============================================================
-- VIEW 2: v_seller_stats
-- Aggregated sales analytics per student seller.
-- Usage: SELECT * FROM v_seller_stats ORDER BY total_revenue DESC;
-- ============================================================
CREATE OR REPLACE VIEW v_seller_stats AS
SELECT
  u.id                                                              AS seller_id,
  u.name                                                            AS seller_name,
  u.srn,
  u.branch,
  COUNT(l.id)                                                       AS total_listed,
  SUM(l.status = 'sold')                                            AS total_sold,
  SUM(l.status = 'approved')                                        AS active_count,
  COALESCE(SUM(CASE WHEN l.status = 'sold' THEN l.price ELSE 0 END), 0) AS total_revenue
FROM  users u
LEFT JOIN listings l ON l.seller_id = u.id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.srn, u.branch;
