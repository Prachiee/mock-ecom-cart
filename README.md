## 🛍️ Vibe Store — Minimal MERN-style E-Commerce App

A simple **full-stack shopping app** built using **React (frontend)** and **Express + SQLite (backend)**.
Users can browse products, add them to cart, and simulate a checkout — all with persistent data stored locally using SQLite.

---

### 🚀 Tech Stack

**Frontend:** React, Fetch API, CSS
**Backend:** Express.js, SQLite
**Database:** SQLite3 (Local)
**Styling:** Simple custom CSS
**API Testing:** Postman / Browser

---

## 📂 Folder Structure

```
vibe-store/
├── backend/
│   ├── server.js        # Express + SQLite backend
│   ├── vibe.db          # SQLite database (auto-created)
│   ├── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.js       # Main React component
│   │   ├── App.css      # Styling
│   │   ├── index.js     # Entry point
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   ├── package.json
│
└── README.md
```
---

### ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```bash
git clone https://github.com/yourusername/vibe-store.git
cd vibe-store
```

### 2️⃣ Backend setup

```bash
cd backend
npm init -y
npm install express cors sqlite sqlite3
node server.js
```

✅ This will start the backend at
**[http://localhost:5000](http://localhost:5000)**

---

### 3️⃣ Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

✅ Frontend runs on
**[http://localhost:3000](http://localhost:3000)**


### 4️⃣ Verify setup

* Visit [http://localhost:3000](http://localhost:3000) → React UI loads
* Backend at [http://localhost:5000/api/products](http://localhost:5000/api/products) → Should return product list
* Product images fetched from **Unsplash URLs**


## 🧩 API Endpoints

| Method | Endpoint        | Description                         |
| ------ | --------------- | ----------------------------------- |
| GET    | `/api/products` | Fetch all products                  |
| GET    | `/api/cart`     | Fetch current user’s cart           |
| POST   | `/api/cart`     | Add/update items in cart            |
| DELETE | `/api/cart/:id` | Remove item from cart               |
| POST   | `/api/checkout` | Simulate checkout (creates receipt) |

---

## 🖼️ Screenshots

Home Page 
[Home](./frontend/public/screenshots/home.png)

Cart Page
[Cart](./frontend/public/screenshots/cart.png)

Checkout 
[Checkout](./frontend/public/screenshots/checkout.png)


## 🧠 How It Works

* **Backend (`server.js`)**

  * Initializes a local SQLite database `vibe.db`
  * Seeds it with product details and Unsplash images
  * Exposes RESTful APIs for product listing, cart management, and checkout

* **Frontend (`App.js`)**

  * Fetches products from the backend
  * Displays them in a grid
  * Allows adding/removing products from cart
  * Displays total and checkout option


## 👩‍💻 Author

**Prachi G.**
