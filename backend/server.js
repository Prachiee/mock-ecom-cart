// backend/server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

let db;

/** Initialize SQLite DB and seed products if needed */
async function initDb() {
  db = await open({
    filename: path.join(__dirname, "vibe.db"),
    driver: sqlite3.Database
  });

  // create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      img TEXT
    );

    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      name TEXT,
      email TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      product_id INTEGER,
      name TEXT,
      price REAL,
      qty INTEGER
    );
  `);

  // seed products if table empty
  const row = await db.get("SELECT COUNT(1) AS c FROM products");
  if (row && row.c === 0) {
    const seed = [
      { name: "Classic Vibe T-Shirt", price: 19.99, img: "https://plus.unsplash.com/premium_photo-1690349404224-53f94f20df8f?auto=format&fit=crop&w=500&q=80" },
      { name: "Urban Backpack", price: 49.99, img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80" },
      { name: "Wireless Earbuds", price: 79.99, img: "https://images.unsplash.com/photo-1632200004922-bc18602c79fc?auto=format&fit=crop&w=500&q=80" },
      { name: "Desk Lamp", price: 24.5, img: "https://plus.unsplash.com/premium_photo-1685287731216-a7a0fae7a41a?auto=format&fit=crop&w=500&q=80" },
      { name: "Vibe Mug", price: 9.99, img: "https://plus.unsplash.com/premium_photo-1719289799337-9cb436447965?auto=format&fit=crop&w=500&q=80" },
      { name: "Sticker Pack", price: 4.99, img: "https://images.unsplash.com/photo-1633533452206-8ab246b00e30?auto=format&fit=crop&w=500&q=80" }
    ];

    const stmt = await db.prepare("INSERT INTO products (name, price, img) VALUES (?, ?, ?)");
    for (const p of seed) {
      await stmt.run(p.name, p.price, p.img);
    }
    await stmt.finalize();
    console.log("✅ Seeded products with Unsplash images into vibe.db");
  }
}

await initDb();

// mock single user
const MOCK_USER_ID = 1;

/* GET /api/products
   returns: { ok:true, products: [...] } */
app.get("/api/products", async (req, res) => {
  try {
    const products = await db.all("SELECT id, name, price, img FROM products");
    res.json({ ok: true, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Failed to fetch products" });
  }
});

/* GET /api/cart
   returns: { ok:true, items: [...], total: <number> } */
app.get("/api/cart", async (req, res) => {
  try {
    const items = await db.all(
      `SELECT c.id AS cartId, p.id AS productId, p.name, p.price, c.qty
       FROM cart c
       JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ?`,
      [MOCK_USER_ID]
    );
    const total = items.reduce((s, it) => s + it.price * it.qty, 0);
    res.json({ ok: true, items, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Failed to fetch cart" });
  }
});

/* POST /api/cart
   body: { productId, qty }
   Inserts or updates (unique per user+product). If qty <= 0, deletes the row.
   Returns the updated item or success message.
*/
app.post("/api/cart", async (req, res) => {
  try {
    const { productId, qty } = req.body;
    if (!productId || typeof qty !== "number") {
      return res.status(400).json({ ok: false, error: "productId and numeric qty required" });
    }

    if (qty <= 0) {
      await db.run("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [MOCK_USER_ID, productId]);
      return res.json({ ok: true, message: "Removed from cart" });
    }

    // insert or update using UPSERT pattern
    await db.run(
      `INSERT INTO cart (user_id, product_id, qty)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, product_id) DO UPDATE SET qty = excluded.qty`,
      [MOCK_USER_ID, productId, qty]
    );

    const item = await db.get(
      `SELECT c.id AS cartId, p.id AS productId, p.name, p.price, c.qty
       FROM cart c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ? AND p.id = ?`,
      [MOCK_USER_ID, productId]
    );

    res.json({ ok: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Failed to add/update cart" });
  }
});

/* DELETE /api/cart/:id
   Remove cart row by cart id (cart.id)
*/
app.delete("/api/cart/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

    await db.run("DELETE FROM cart WHERE id = ? AND user_id = ?", [id, MOCK_USER_ID]);
    res.json({ ok: true, message: "Removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Failed to delete cart item" });
  }
});

/* POST /api/checkout
   body: { name, email }
   Creates a receipt (persisted), clears the cart, returns receipt: { ok:true, receipt: {...} }
*/
app.post("/api/checkout", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ ok: false, error: "name and email required" });

    const items = await db.all(
      `SELECT p.id AS productId, p.name, p.price, c.qty
       FROM cart c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ?`,
      [MOCK_USER_ID]
    );

    if (!items || items.length === 0) {
      return res.status(400).json({ ok: false, error: "Cart is empty" });
    }

    const total = items.reduce((s, it) => s + it.price * it.qty, 0);
    const timestamp = new Date().toISOString();

    const r = await db.run(
      "INSERT INTO receipts (user_id, total, name, email, timestamp) VALUES (?, ?, ?, ?, ?)",
      [MOCK_USER_ID, total, name, email, timestamp]
    );
    const receiptId = r.lastID;

    const insertItem = await db.prepare(
      "INSERT INTO receipt_items (receipt_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)"
    );
    for (const it of items) {
      await insertItem.run(receiptId, it.productId, it.name, it.price, it.qty);
    }
    await insertItem.finalize();

    // clear cart
    await db.run("DELETE FROM cart WHERE user_id = ?", [MOCK_USER_ID]);

    const receipt = { id: receiptId, items, total, name, email, timestamp };
    res.json({ ok: true, receipt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Checkout failed" });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
