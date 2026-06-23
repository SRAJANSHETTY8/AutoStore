"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Package,
  ClipboardList,
  CheckCircle2,
  Truck,
  ShoppingCart,
  ArrowRight,
  Plus,
  Minus,
  Box,
  UserCircle,
  Layers,
  Users,
  ChevronRight,
  AlertCircle,
  Clock,
  Edit3,
  Trash2,
} from "lucide-react";

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: string;
  brand: string;
  vehicle_fitment: string;
  stock_quantity: number;
  created_at: string;
}

interface Dealer {
  id: number;
  name: string;
  email: string;
}

interface Order {
  id: number;
  order_number: string;
  dealer: Dealer;
  status: string;
  total_amount: string;
  created_at: string;
  items_count: number;
}

interface InventoryItem {
  id: number;
  product: Product;
  quantity: number;
}

interface Activity {
  id: string;
  type: "order_placed" | "product_added" | "product_updated" | "product_deleted" | "order_confirmed" | "order_delivered" | "dealer_added" | "inventory_updated";
  title: string;
  description: string;
  entity_name: string;
  timestamp: string;
  amount?: string;
  status?: string;
}

interface DashboardStats {
  total_products: number;
  total_inventory_records: number;
  total_dealers: number;
  total_orders: number;
  brands_count: number;
  total_units: number;
  active_dealers: number;
  orders_in_pipeline: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DEALER_ID = 1;

const formatRupees = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0";
  return "₹" + num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const viewMode = (searchParams.get("view") as "admin" | "dealer") || "admin";
  const isDealer = viewMode === "dealer";

  const [adminStats, setAdminStats] = useState<DashboardStats>({
    total_products: 0, total_inventory_records: 0, total_dealers: 0, total_orders: 0,
    brands_count: 0, total_units: 0, active_dealers: 0, orders_in_pipeline: 0,
  });
  const [adminActivities, setAdminActivities] = useState<Activity[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dealerOrders, setDealerOrders] = useState<Order[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [productsRes, inventoryRes, dealersRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/products/?limit=1000&offset=0`),
        fetch(`${API_BASE}/inventory/`),
        fetch(`${API_BASE}/dealers/`),
        fetch(`${API_BASE}/orders/`),
      ]);

      const productsData = productsRes.ok ? await productsRes.json() : [];
      const inventory = inventoryRes.ok ? await inventoryRes.json() : [];
      const dealers = dealersRes.ok ? await dealersRes.json() : [];
      const orders = ordersRes.ok ? await ordersRes.json() : [];

      setProducts(productsData);

      const brands = new Set(productsData.map((p: Product) => p.brand).filter(Boolean));
      const totalUnits = inventory.reduce((sum: number, inv: InventoryItem) => sum + inv.quantity, 0);
      const activeDealers = dealers.filter((d: Dealer) => d.name).length;
      const pipelineOrders = orders.filter((o: Order) => o.status === "DRAFT" || o.status === "CONFIRMED").length;

      setAdminStats({
        total_products: productsData.length,
        total_inventory_records: inventory.length,
        total_dealers: dealers.length,
        total_orders: orders.length,
        brands_count: brands.size,
        total_units: totalUnits,
        active_dealers: activeDealers,
        orders_in_pipeline: pipelineOrders,
      });

      const dealerOrdersData = orders.filter((o: Order) => o.dealer?.id === DEALER_ID);
      setDealerOrders(dealerOrdersData);

      const allActivities: Activity[] = [];
      orders.forEach((order: Order) => {
        const type = order.status === "DRAFT" ? "order_placed" : order.status === "CONFIRMED" ? "order_confirmed" : "order_delivered";
        allActivities.push({
          id: `order-${order.id}`, type,
          title: order.order_number,
          description: `${order.dealer?.name || "Unknown Dealer"} · ${order.items_count || 1} items · ${formatDate(order.created_at)}`,
          entity_name: order.dealer?.name || "Unknown Dealer",
          timestamp: order.created_at,
          amount: formatRupees(order.total_amount),
          status: order.status,
        });
      });
      productsData.slice(0, 5).forEach((product: Product) => {
        allActivities.push({
          id: `product-add-${product.id}`, type: "product_added",
          title: `Product Added: ${product.name}`,
          description: `SKU: ${product.sku} · ${product.category} · ${formatDate(product.created_at)}`,
          entity_name: product.name,
          timestamp: product.created_at,
        });
      });
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAdminActivities(allActivities.slice(0, 10));

      const initialQtys: Record<number, number> = {};
      productsData.forEach((p: Product) => { initialQtys[p.id] = 1; });
      setQuantities(initialQtys);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, qty: number) => {
    const cart = JSON.parse(localStorage.getItem("dealer_cart") || "[]");
    const existingIndex = cart.findIndex((item: any) => item.product_id === product.id);
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += qty;
    } else {
      cart.push({
        product_id: product.id, name: product.name, sku: product.sku,
        category: product.category, brand: product.brand,
        price: product.price, quantity: qty, stock: product.stock_quantity,
      });
    }
    localStorage.setItem("dealer_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart_updated"));

    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1200);
  };

  const adjustQty = (productId: number, delta: number, maxStock: number) => {
    setQuantities(prev => {
      const newQty = Math.max(1, Math.min(maxStock, (prev[productId] || 1) + delta));
      return { ...prev, [productId]: newQty };
    });
  };

  const getSubtotal = (productId: number, price: string) => {
    return parseFloat(price) * (quantities[productId] || 1);
  };

  const counts = {
    active: dealerOrders.filter(o => o.status === "DRAFT").length,
    confirmed: dealerOrders.filter(o => o.status === "CONFIRMED").length,
    delivered: dealerOrders.filter(o => o.status === "DELIVERED").length,
  };

  const getActivityIcon = (type: Activity["type"]) => {
    const iconStyle = { width: "16px", height: "16px" };
    switch (type) {
      case "order_placed": return <ShoppingCart style={{ ...iconStyle, color: "#3b82f6" }} />;
      case "order_confirmed": return <CheckCircle2 style={{ ...iconStyle, color: "#22c55e" }} />;
      case "order_delivered": return <Truck style={{ ...iconStyle, color: "#a855f7" }} />;
      case "product_added": return <Plus style={{ ...iconStyle, color: "#10b981" }} />;
      case "product_updated": return <Edit3 style={{ ...iconStyle, color: "#f59e0b" }} />;
      case "product_deleted": return <Trash2 style={{ ...iconStyle, color: "#ef4444" }} />;
      case "dealer_added": return <Users style={{ ...iconStyle, color: "#06b6d4" }} />;
      case "inventory_updated": return <Layers style={{ ...iconStyle, color: "#f97316" }} />;
      default: return <Clock style={{ ...iconStyle, color: "#6b7280" }} />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const styles: Record<string, React.CSSProperties> = {
      DRAFT: { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" },
      CONFIRMED: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
      DELIVERED: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
    };
    const s = styles[status] || styles.DRAFT;
    return (
      <span style={{ padding: "2px 12px", fontSize: "11px", fontWeight: 600, borderRadius: "9999px", ...s }}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  const cardIconBox = (Icon: React.ElementType) => (
    <div style={{ width: "40px", height: "40px", background: "#f9fafb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon style={{ width: "20px", height: "20px", color: "#4b5563" }} />
    </div>
  );

  const featuredProducts = products.slice(0, 4);


  const buildLink = (href: string) => {
    if (isDealer) return `${href}?view=dealer`;
    return href;
  };

  return (
    <div>
     
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
          {isDealer
            ? "Welcome back, here is an overview of your account."
            : "Live snapshot of catalog, stock and dealer activity."}
        </p>
      </div>

      {isDealer ? (
        
        <>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
            {[
              { label: "Available Products", value: products.length, icon: Package, color: "#111827" },
              { label: "Active Orders", value: counts.active, icon: ClipboardList, color: "#3b82f6" },
              { label: "Confirmed Orders", value: counts.confirmed, icon: CheckCircle2, color: "#22c55e" },
              { label: "Delivered Orders", value: counts.delivered, icon: Truck, color: "#a855f7" },
            ].map((card, index) => (
              <div key={index} style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>{card.label}</p>
                  <p style={{ fontSize: "32px", fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1 }}>{loading ? "—" : card.value}</p>
                </div>
                <div style={{ width: "40px", height: "40px", background: "#f9fafb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <card.icon style={{ width: "20px", height: "20px", color: card.color }} />
                </div>
              </div>
            ))}
          </div>

          
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>Featured Products</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Popular items ready to order.</p>
            </div>

            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px", height: "280px" }}>
                    <div style={{ height: "16px", width: "60%", background: "#f3f4f6", borderRadius: "4px", marginBottom: "12px" }} />
                    <div style={{ height: "12px", width: "40%", background: "#f3f4f6", borderRadius: "4px", marginBottom: "8px" }} />
                    <div style={{ height: "12px", width: "50%", background: "#f3f4f6", borderRadius: "4px", marginBottom: "16px" }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                {featuredProducts.map((product) => (
                  <div key={product.id} style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px", display: "flex", flexDirection: "column", transition: "box-shadow 0.2s ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ marginBottom: "12px" }}>
                      <p style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>{product.category}</p>
                      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0", lineHeight: 1.3 }}>{product.name}</h3>
                      <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>SKU: {product.sku}</p>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 2px 0" }}>{product.brand || "Generic"}</p>
                      {product.vehicle_fitment && <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>{product.vehicle_fitment}</p>}
                    </div>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      background: product.stock_quantity > 0 ? "#f0fdf4" : "#fef2f2",
                      color: product.stock_quantity > 0 ? "#15803d" : "#dc2626",
                      fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px",
                      marginBottom: "12px", width: "fit-content",
                      border: `1px solid ${product.stock_quantity > 0 ? "#bbf7d0" : "#fecaca"}`,
                    }}>
                      <Box style={{ width: "12px", height: "12px" }} />
                      {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <p style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: 0 }}>{formatRupees(product.price)}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <button
                        onClick={() => adjustQty(product.id, -1, product.stock_quantity)}
                        disabled={(quantities[product.id] || 1) <= 1}
                        style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: (quantities[product.id] || 1) <= 1 ? "not-allowed" : "pointer", opacity: (quantities[product.id] || 1) <= 1 ? 0.5 : 1 }}
                      >
                        <Minus style={{ width: "14px", height: "14px", color: "#374151" }} />
                      </button>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827", minWidth: "24px", textAlign: "center" }}>{quantities[product.id] || 1}</span>
                      <button
                        onClick={() => adjustQty(product.id, 1, product.stock_quantity)}
                        disabled={(quantities[product.id] || 1) >= product.stock_quantity}
                        style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: (quantities[product.id] || 1) >= product.stock_quantity ? "not-allowed" : "pointer", opacity: (quantities[product.id] || 1) >= product.stock_quantity ? 0.5 : 1 }}
                      >
                        <Plus style={{ width: "14px", height: "14px", color: "#374151" }} />
                      </button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "8px 0", borderTop: "1px solid #f3f4f6" }}>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>Subtotal</span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{formatRupees(getSubtotal(product.id, product.price))}</span>
                    </div>
                    <button
                      onClick={() => addToCart(product, quantities[product.id] || 1)}
                      disabled={product.stock_quantity <= 0}
                      style={{
                        width: "100%", padding: "10px 16px",
                        background: addedProductId === product.id ? "#15803d" : (product.stock_quantity > 0 ? "#111827" : "#e5e7eb"),
                        color: product.stock_quantity > 0 ? "#ffffff" : "#9ca3af",
                        border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700,
                        cursor: product.stock_quantity > 0 ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        marginTop: "auto", transition: "background 0.25s ease, transform 0.15s ease",
                        transform: addedProductId === product.id ? "scale(1.03)" : "scale(1)",
                      }}
                      onMouseEnter={e => { if (product.stock_quantity > 0 && addedProductId !== product.id) (e.currentTarget as HTMLElement).style.background = "#374151"; }}
                      onMouseLeave={e => { if (product.stock_quantity > 0 && addedProductId !== product.id) (e.currentTarget as HTMLElement).style.background = "#111827"; }}
                    >
                      {addedProductId === product.id ? (
                        <>
                          <CheckCircle2 style={{ width: "14px", height: "14px" }} />
                          Added!
                        </>
                      ) : (
                        <>
                          <ShoppingCart style={{ width: "14px", height: "14px" }} />
                          Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <Link href={buildLink("/products")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 600, color: "#111827", textDecoration: "none", padding: "10px 20px", borderRadius: "8px", transition: "background 0.15s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f3f4f6"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                View All Products <ArrowRight style={{ width: "16px", height: "16px" }} />
              </Link>
            </div>
          </div>
        </>
      ) : (
        
        <>
        
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Total Products</p>
                  <p style={{ fontSize: "30px", fontWeight: 800, color: "#111827", margin: "8px 0 0" }}>{adminStats.total_products}</p>
                  <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>{adminStats.brands_count} brands</p>
                </div>
                {cardIconBox(Box)}
              </div>
            </div>
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Inventory Records</p>
                  <p style={{ fontSize: "30px", fontWeight: 800, color: "#111827", margin: "8px 0 0" }}>{adminStats.total_inventory_records}</p>
                  <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>{adminStats.total_units.toLocaleString("en-IN")} units on hand</p>
                </div>
                {cardIconBox(Layers)}
              </div>
            </div>
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Dealers</p>
                  <p style={{ fontSize: "30px", fontWeight: 800, color: "#111827", margin: "8px 0 0" }}>{adminStats.total_dealers}</p>
                  <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>{adminStats.active_dealers} active</p>
                </div>
                {cardIconBox(UserCircle)}
              </div>
            </div>
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Orders</p>
                  <p style={{ fontSize: "30px", fontWeight: 800, color: "#111827", margin: "8px 0 0" }}>{adminStats.total_orders}</p>
                  <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0" }}>{adminStats.orders_in_pipeline} in pipeline</p>
                </div>
                {cardIconBox(ClipboardList)}
              </div>
            </div>
          </div>

          
          <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#111827", margin: 0 }}>Recent activity</h2>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>Latest orders across all dealers</p>
              </div>
            </div>
            {loading ? (
              <div style={{ padding: "32px", textAlign: "center" }}>
                <div style={{ width: "24px", height: "24px", border: "2px solid #e5e7eb", borderTopColor: "#1f2937", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>Loading activity...</p>
              </div>
            ) : adminActivities.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center" }}>
                <AlertCircle style={{ width: "32px", height: "32px", color: "#d1d5db", margin: "0 auto 8px" }} />
                <p style={{ fontSize: "14px", color: "#6b7280" }}>No recent activity found</p>
              </div>
            ) : (
              <div>
                {adminActivities.map((activity, index) => (
                  <div key={activity.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: index < adminActivities.length - 1 ? "1px solid #f3f4f6" : "none", transition: "background 0.15s ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: 0 }}>
                      <div style={{ width: "36px", height: "36px", background: "#f9fafb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: 0 }}>{activity.title}</p>
                          {activity.type.startsWith("order") && activity.status && getStatusBadge(activity.status)}
                        </div>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>{activity.description}</p>
                        {activity.type.startsWith("order") && (
                          <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" }}>
                            <span style={{ fontWeight: 600, color: "#4b5563" }}>{activity.entity_name}</span> placed an order
                          </p>
                        )}
                      </div>
                    </div>
                    {activity.amount && (
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", flexShrink: 0, marginLeft: "16px" }}>{activity.amount}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CombinedDashboard() {
  return (
    <Suspense fallback={
      <div style={{ padding: "32px", textAlign: "center" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid #e5e7eb", borderTopColor: "#1f2937", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>Loading dashboard...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}