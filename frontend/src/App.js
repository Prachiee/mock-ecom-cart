import { useEffect, useState } from "react";

function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999
    }}>
      <div style={{
        width: "90%",
        maxWidth: 480,
        background: "white",
        padding: 20,
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)"
      }}>
        <h2>Receipt #{receipt.id ?? "—"}</h2>
        <div><strong>Name:</strong> {receipt.name ?? "—"}</div>
        <div><strong>Email:</strong> {receipt.email ?? "—"}</div>
        <div><strong>Time:</strong> {new Date(receipt.timestamp).toLocaleString()}</div>
        <hr />
        <ul>
          {(receipt.items || []).map((it, idx) => (
            <li key={idx}>
              {it.name} × {it.qty} — ₹{(it.price * it.qty).toFixed(2)}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 8, fontWeight: "bold" }}>Total: ₹{Number(receipt.total).toFixed(2)}</div>
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <button onClick={onClose} style={{ padding: "8px 12px", borderRadius: 6 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // if backend returns { items, total } this will be items
  const [cartTotal, setCartTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Checkout form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCart();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      // data could be array (simple server) or { ok, products } from other version
      if (Array.isArray(data)) setProducts(data);
      else if (data.products) setProducts(data.products);
    } catch (e) {
      console.error("Failed to fetch products", e);
    }
    setLoading(false);
  }

  async function fetchCart() {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      // earlier simple server returned array; our simplified server returns { items, total }
      if (Array.isArray(data)) {
        setCart(data);
        setCartTotal(data.reduce((s, it) => s + (it.price * (it.qty || 1)), 0));
      } else {
        setCart(data.items || []);
        setCartTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch cart", e);
    }
  }

  async function addToCart(productId) {
    // default 1 qty
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, qty: 1 })
      });
      const data = await res.json();
      // simple server returned whole cart array
      if (Array.isArray(data)) setCart(data);
      else fetchCart();
    } catch (e) {
      console.error("Add to cart failed", e);
    }
  }

  async function removeFromCart(id) {
    try {
      const res = await fetch(`/api/cart/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCart(data);
        setCartTotal(data.reduce((s, it) => s + (it.price * (it.qty || 1)), 0));
      } else fetchCart();
    } catch (e) {
      console.error("Remove failed", e);
    }
  }

  async function updateQty(cartId, productId, newQty) {
    // if backend supports update via POST with productId + qty (as our simple server does)
    try {
      const qty = Number(newQty);
      if (isNaN(qty) || qty < 0) return;
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, qty })
      });
      const data = await res.json();
      if (Array.isArray(data)) setCart(data);
      else fetchCart();
    } catch (e) {
      console.error("Update qty failed", e);
    }
  }

  async function doCheckout(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert("Please enter name and email");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      // expecting { total, timestamp } or { ok, receipt }
      if (data.error) {
        alert(data.error);
      } else {
        // normalize possible responses
        let rec = null;
        if (data.receipt) rec = data.receipt;
        else rec = {
          id: data.id ?? null,
          items: data.items ?? cart,
          total: data.total ?? data.total,
          name: name,
          email: email,
          timestamp: data.timestamp ?? new Date().toISOString()
        };
        setReceipt(rec);
        setName("");
        setEmail("");
        // get fresh cart (should be empty after checkout)
        fetchCart();
      }
    } catch (err) {
      console.error("Checkout failed", err);
      alert("Checkout failed (network)");
    }
    setBusy(false);
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, Arial, sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <h1>Vibe Mock E-Com</h1>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <section style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
          <h2>Products</h2>
          {loading ? <div>Loading products…</div> : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12 }}>
            {products.map(p => (
              <div key={p.id} style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, textAlign: "center", background: "#fafafa" }}>
                <img 
                  src={p.img || "https://via.placeholder.com/150?text=No+Image"} 
                  alt={p.name} 
                  style={{ width: "100%", height: "250px", objectFit: "cover", borderRadius: "12px", marginBottom: 8,  boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}
                />
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ margin: "8px 0" }}>₹{Number(p.price).toFixed(2)}</div>
                <button 
                  onClick={() => addToCart(p.id)} 
                  style={{ padding: "6px 10px", borderRadius: 6 }}
                >
                  Add to cart
                </button>
              </div>
            ))}
          </div>
        </section>

        <aside style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
          <h2>Cart</h2>
          {cart.length === 0 ? <div>No items in cart</div> : (
            <>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {cart.map(it => (
                  <li key={it.id ?? it.cartId ?? it.productId} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <div>₹{Number(it.price).toFixed(2)}</div>
                      <div>
                        Qty: <input type="number" min="0" value={it.qty || 1} onChange={(e) => updateQty(it.id ?? it.cartId ?? it.productId, it.productId ?? it.id, Number(e.target.value))} style={{ width: 60, marginLeft: 8 }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div>₹{((it.price||0) * (it.qty||1)).toFixed(2)}</div>
                      <button onClick={() => removeFromCart(it.id ?? it.cartId ?? it.productId)} style={{ marginTop: 6, background: "transparent", color: "#d00", border: "none", cursor: "pointer" }}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 12, fontWeight: "bold" }}>Total: ₹{Number(cartTotal).toFixed(2)}</div>

              <form onSubmit={doCheckout} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <input required placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
                <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
                <button type="submit" disabled={busy} style={{ padding: "8px 12px", borderRadius: 6 }}>{busy ? "Processing…" : "Checkout"}</button>
              </form>
            </>
          )}
        </aside>
      </main>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

export default App;
