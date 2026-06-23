"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart, Minus, Plus, Trash2, CheckCircle2, ArrowLeft, Package,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


interface CartItem {
  product_id: number;
  name: string;
  sku: string;
  category: string;
  brand: string;
  price: string;
  quantity: number;
  stock: number;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
}

interface Dealer {
  id: number;
  name: string;
}
function CartPageContent() {
  const searchParams = useSearchParams();
  const viewMode = (searchParams.get("view") as "admin" | "dealer") || "admin";
  const isDealer = viewMode === "dealer";

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);

  useEffect(() => {
    loadCart();
    fetchDealers();
    window.addEventListener("cart_updated", loadCart);
    return () => window.removeEventListener("cart_updated", loadCart);
  }, []);

  const fetchDealers = async () => {
    try {
      const res = await fetch(`${API_BASE}/dealers/`);
      const data = await res.json();
      setDealers(data);
      if (data.length > 0) setSelectedDealerId(data[0].id);
    } catch {
      setError("Could not fetch dealers from server.");
    }
  };
  const loadCart = () => {
    const data = JSON.parse(localStorage.getItem("dealer_cart") || "[]");
    setCart(data);
  };

  const saveCart = (newCart: CartItem[]) => {
    localStorage.setItem("dealer_cart", JSON.stringify(newCart));
    setCart(newCart);
    window.dispatchEvent(new Event("cart_updated"));
  };

  const adjustQty = (productId: number, delta: number) => {
    const newCart = cart.map((item) => {
      if (item.product_id === productId) {
        const newQty = Math.max(1, Math.min(item.stock, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    });
    saveCart(newCart);
  };

  const removeItem = (productId: number) => {
    const newCart = cart.filter((item) => item.product_id !== productId);
    saveCart(newCart);
  };

  const clearCart = () => {
    localStorage.removeItem("dealer_cart");
    setCart([]);
    window.dispatchEvent(new Event("cart_updated"));
  };

  const formatRupees = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "₹0";
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const buildLink = (href: string) => isDealer ? `${href}?view=dealer` : href;


  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    if (!selectedDealerId) {
      setError("Please select a dealer before confirming the order.");
      return;
    }
    setLoading(true);
    setError("");
    setErrorDetails("");

    try {
      
      console.log("Creating order with dealer:", selectedDealerId);
      const orderRes = await fetch(`${API_BASE}/orders/add/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealer: selectedDealerId }),
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        console.error("Order creation failed:", orderRes.status, errText);
        throw new Error(`Failed to create order: ${orderRes.status} ${errText}`);
      }

      const orderData = await orderRes.json();
      console.log("Order created:", orderData);
      const orderId = orderData.id;

      
      for (const item of cart) {
        const payload = {
          order: orderId,
          product: item.product_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.price).toFixed(2),
        };
        console.log("Adding order item:", payload);

        const itemRes = await fetch(`${API_BASE}/order-items/add/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!itemRes.ok) {
          const errText = await itemRes.text();
          console.error("Order item failed:", itemRes.status, errText);
          throw new Error(`Failed to add item: ${item.name} — ${itemRes.status} ${errText}`);
        }
      }

      
      console.log("Confirming order:", orderId);
      const placeRes = await fetch(`${API_BASE}/orders/${orderId}/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!placeRes.ok) {
        const errText = await placeRes.text();
        console.error("Confirm failed:", placeRes.status, errText);
        throw new Error(`Failed to confirm order: ${placeRes.status} ${errText}`);
      }

      const placedData = await placeRes.json();
      console.log("Order confirmed:", placedData);

      
      clearCart();
      setConfirmedOrder(orderData);
      setOrderConfirmed(true);

    } catch (err: any) {
      console.error("Order error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setErrorDetails(err.toString());
    } finally {
      setLoading(false);
    }
  };

  
  if (orderConfirmed && confirmedOrder) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{
          background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb",
          padding: "48px", textAlign: "center", maxWidth: "480px", width: "100%",
        }}>
          <div style={{
            width: "64px", height: "64px", background: "#111827", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <CheckCircle2 style={{ width: "32px", height: "32px", color: "#ffffff" }} />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 8px 0" }}>
            Order Confirmed Successfully
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 32px 0" }}>
            Your order has been placed and is being processed.
          </p>
          <div style={{ background: "#f3f4f6", borderRadius: "10px", padding: "20px", marginBottom: "32px" }}>
            <p style={{
              fontSize: "11px", fontWeight: 700, color: "#9ca3af",
              textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px 0",
            }}>ORDER NUMBER</p>
            <p style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: 0, fontFamily: "monospace" }}>
              {confirmedOrder.order_number}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link href={buildLink("/products")} style={{
              padding: "12px 24px", fontSize: "14px", fontWeight: 600,
              color: "#374151", background: "#ffffff", border: "1px solid #e5e7eb",
              borderRadius: "10px", textDecoration: "none", cursor: "pointer",
            }}>Continue Shopping</Link>
            <Link href={buildLink("/orders")} style={{
              padding: "12px 24px", fontSize: "14px", fontWeight: 600,
              color: "#ffffff", background: "#111827", border: "none",
              borderRadius: "10px", textDecoration: "none", cursor: "pointer",
            }}>View My Orders</Link>
          </div>
        </div>
      </div>
    );
  }

 
  if (cart.length === 0 && !loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "80px", height: "80px", background: "#f3f4f6", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <ShoppingCart style={{ width: "36px", height: "36px", color: "#9ca3af" }} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", margin: "0 0 8px 0" }}>
            Your cart is empty
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px 0" }}>
            Browse products and add items to your cart.
          </p>
          <Link href={buildLink("/products")} style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "12px 24px", fontSize: "14px", fontWeight: 600,
            color: "#ffffff", background: "#111827", border: "none",
            borderRadius: "10px", textDecoration: "none", cursor: "pointer",
          }}>
            <Package style={{ width: "16px", height: "16px" }} />
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  
  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: 0 }}>Shopping Cart</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
          {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart
        </p>
      </div>

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px",
          padding: "14px 18px", marginBottom: "20px",
        }}>
          <p style={{ color: "#dc2626", fontSize: "14px", margin: "0 0 8px 0" }}>{error}</p>
          {errorDetails && (
            <details>
              <summary style={{ fontSize: "12px", color: "#ef4444", cursor: "pointer" }}>Technical Details</summary>
              <pre style={{ fontSize: "11px", color: "#991b1b", marginTop: "8px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {errorDetails}
              </pre>
            </details>
          )}
        </div>
      )}


      <div style={{
        background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px",
        padding: "16px 20px", marginBottom: "20px",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <label style={{ fontSize: "14px", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>
          Select Dealer
        </label>
        {dealers.length === 0 ? (
          <span style={{ fontSize: "13px", color: "#ef4444" }}>
            No dealers found. Please add a dealer from the admin panel first.
          </span>
        ) : (
          <select
            value={selectedDealerId ?? ""}
            onChange={e => setSelectedDealerId(Number(e.target.value))}
            style={{
              flex: 1, padding: "8px 12px", fontSize: "14px",
              border: "1px solid #e5e7eb", borderRadius: "8px",
              color: "#111827", background: "#fafafa",
              cursor: "pointer", outline: "none",
            }}
          >
            {dealers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
        
        <div style={{
          background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
            padding: "14px 20px", background: "#fafafa", borderBottom: "1px solid #f3f4f6",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Product</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Quantity</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Unit Price</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Line Total</span>
            <span></span>
          </div>

          {cart.map((item, index) => {
            const lineTotal = parseFloat(item.price) * item.quantity;
            return (
              <div key={item.product_id} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
                padding: "18px 20px", alignItems: "center",
                borderBottom: index < cart.length - 1 ? "1px solid #f3f4f6" : "none",
              }}>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: 600, color: "#111827", margin: "0 0 4px 0" }}>{item.name}</p>
                  <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, fontFamily: "monospace" }}>
                    {item.sku} · {item.brand}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <button onClick={() => adjustQty(item.product_id, -1)} disabled={item.quantity <= 1} style={{
                    width: "28px", height: "28px", borderRadius: "6px",
                    border: "1px solid #e5e7eb", background: "#ffffff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: item.quantity <= 1 ? "not-allowed" : "pointer", opacity: item.quantity <= 1 ? 0.4 : 1,
                  }}><Minus style={{ width: "14px", height: "14px", color: "#374151" }} /></button>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827", minWidth: "24px", textAlign: "center" }}>{item.quantity}</span>
                  <button onClick={() => adjustQty(item.product_id, 1)} disabled={item.quantity >= item.stock} style={{
                    width: "28px", height: "28px", borderRadius: "6px",
                    border: "1px solid #e5e7eb", background: "#ffffff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: item.quantity >= item.stock ? "not-allowed" : "pointer", opacity: item.quantity >= item.stock ? 0.4 : 1,
                  }}><Plus style={{ width: "14px", height: "14px", color: "#374151" }} /></button>
                </div>
                <p style={{ fontSize: "14px", color: "#374151", textAlign: "right", margin: 0 }}>{formatRupees(item.price)}</p>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", textAlign: "right", margin: 0 }}>{formatRupees(lineTotal)}</p>
                <button onClick={() => removeItem(item.product_id)} style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: "1px solid #e5e7eb", background: "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#9ca3af", transition: "all 0.15s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#9ca3af"; }}
                  title="Remove"
                ><Trash2 style={{ width: "14px", height: "14px" }} /></button>
              </div>
            );
          })}
        </div>

       
        <div style={{
          background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb",
          padding: "24px", height: "fit-content", position: "sticky", top: "24px",
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: "0 0 20px 0" }}>Order Summary</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Total Items</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{totalItems}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Subtotal</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{formatRupees(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>Tax & Shipping</span>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#9ca3af" }}>—</span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #f3f4f6", marginBottom: "20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>Grand Total</span>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}>{formatRupees(subtotal)}</span>
          </div>
          <button onClick={handleConfirmOrder} disabled={loading || cart.length === 0} style={{
            width: "100%", padding: "14px", fontSize: "14px", fontWeight: 700,
            color: "#ffffff", background: loading ? "#9ca3af" : "#111827",
            border: "none", borderRadius: "10px", cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            marginBottom: "12px", transition: "background 0.15s ease",
          }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#374151"; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#111827"; }}
          >
            {loading ? (
              <>
                <div style={{ width: "16px", height: "16px", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Processing...
              </>
            ) : (<>Confirm Order</>)}
          </button>
          <Link href={buildLink("/products")} style={{
            width: "100%", padding: "14px", fontSize: "14px", fontWeight: 600,
            color: "#374151", background: "#ffffff", border: "1px solid #e5e7eb",
            borderRadius: "10px", textDecoration: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: "60px", textAlign: "center" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid #e5e7eb", borderTopColor: "#111827", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Loading cart...</p>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  );
}