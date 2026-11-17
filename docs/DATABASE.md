# Which data is in MySQL and which is in MongoDB

CampusKart uses **both** databases, each for what it is good at.

| MySQL (tables with fixed columns and relationships) | MongoDB (flexible, fast-growing documents) |
|---|---|
| `users` – students and admins (email, SRN, mobile, password hash, role) | `conversations` – one chat per (listing, buyer) |
| `categories` | `messages` – chat messages |
| `listings` – seller, category, buyer, reviewer, price, status | `notifications` – bell notifications |
| `listing_images` – weak entity, key (listing_id, image_no) | |
| `wishlist` – many-to-many between users and listings | |
| `email_otps` – short-lived verification codes | |

Why this split: users, listings and wishlist have fixed columns and strict
links (foreign keys, CHECK rules, a trigger), which is exactly what a
relational table is for. Chats and notifications are a growing stream of small
documents that are always read per user or per conversation, so MongoDB suits them.

The ER diagram (`CampusKart_ER_Diagram.png`) shows every entity, including the
chat and notification ones, because they are real entities of the system.
`CampusKart_Relational_Schema.png` shows them as tables.
In the running app the MongoDB entities are stored as documents (see `backend/src/models/`).

## MySQL rules worth knowing (MySQL 8.0.16 or newer enforces the CHECKs)
- `users.mobile` must be a 10-digit Indian mobile number (CHECK).
- `listings.price >= 0` (CHECK); status and condition are limited to fixed values (ENUM).
- `listings.buyer_id` and `reviewed_by` become NULL if that user is deleted (ON DELETE SET NULL).
- Deleting a seller deletes their listings, images and wishlist rows (ON DELETE CASCADE).
- A trigger blocks a seller from being recorded as the buyer of their own listing.

## The private mobile number
The seller's mobile is stored in `users.mobile` (MySQL). The API returns it
on a listing only to the seller, admins, and students who have started a chat
about that listing. That chat lives in MongoDB, so the rule checks MongoDB.
