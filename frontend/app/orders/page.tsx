"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown, ChevronUp, ArrowLeft, Package, Truck, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DEALER_ID = 1;

interface Dealer {
  id: number;
  name: string;
  address?: string;
}

interface OrderItem {
  id: number;
  product: {
    id: number;
    sku: string;
    name: string;
    price: string;
  };
  quantity: number;
  unit_price: string;
  line_total: string;
}

interface Order {
  id: number;
  order_number: string;
  dealer: Dealer;
  status: string;
  total_amount: string;
  created_at: string;
  items: OrderItem[];
}

type StatusFilter = "ALL" | "DRAFT" | "CONFIRMED" | "DELIVERED";

const formatRupees = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0";
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const viewMode = (searchParams.get("view") as "admin" | "dealer") || "admin";
  const isDealer = viewMode === "dealer";

  const [orders, setOrders] = useState<Order[]>([]);
  const [dealerMap, setDealerMap] = useState<Record<number, string>>({});
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveringId, setDeliveringId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    let result = isDealer
      ? orders.filter((o) => o.dealer?.id === DEALER_ID)
      : orders;

    if (activeFilter !== "ALL") {
      result = result.filter((o) => o.status === activeFilter);
    }
    setFilteredOrders(result);
  }, [activeFilter, orders, isDealer]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const dr = await fetch(`${API_BASE}/dealers/`);
      const dealers = await dr.json();
      const map: Record<number, string> = {};
      dealers.forEach((d: any) => { map[d.id] = d.address || ""; });
      setDealerMap(map);
      const res = await fetch(`${API_BASE}/orders/`);
      const data = await res.json();
      
      const ordersWithItems = await Promise.all(
        data.map(async (order: Order) => {
          try {
            const itemRes = await fetch(`${API_BASE}/orders/${order.id}/`);
            const fullOrder = await itemRes.json();
            return { ...order, items: fullOrder.items || [] };
          } catch {
            return { ...order, items: [] };
          }
        })
      );
      setOrders(ordersWithItems);
      setFilteredOrders(ordersWithItems);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async (orderId: number) => {
    if (!confirm("Mark this order as delivered?")) return;
    setDeliveringId(orderId);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/deliver/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to deliver");
      }
      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Failed to mark as delivered");
    } finally {
      setDeliveringId(null);
    }
  };

  const toggleExpand = (orderId: number) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
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

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(",", " at");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "4px 12px", fontSize: "12px", fontWeight: 600,
            color: "#374151", background: "#f3f4f6",
            borderRadius: "9999px", border: "1px solid #e5e7eb",
          }}>
            <Clock style={{ width: "12px", height: "12px" }} />
            Draft
          </span>
        );
      case "CONFIRMED":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "4px 12px", fontSize: "12px", fontWeight: 600,
            color: "#ffffff", background: "#111827",
            borderRadius: "9999px",
          }}>
            <CheckCircle2 style={{ width: "12px", height: "12px" }} />
            Confirmed
          </span>
        );
      case "DELIVERED":
        return (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "4px 12px", fontSize: "12px", fontWeight: 600,
            color: "#15803d", background: "#f0fdf4",
            borderRadius: "9999px", border: "1px solid #bbf7d0",
          }}>
            <Truck style={{ width: "12px", height: "12px" }} />
            Delivered
          </span>
        );
      default:
        return (
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "4px 12px", fontSize: "12px", fontWeight: 500,
            color: "#6b7280", background: "#f3f4f6",
            borderRadius: "9999px",
          }}>
            {status}
          </span>
        );
    }
  };

  const getStatusBadgeDark = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span style={{
            padding: "4px 14px", fontSize: "11px", fontWeight: 700,
            color: "#374151", background: "#f3f4f6",
            borderRadius: "6px", border: "1px solid #e5e7eb",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>Draft</span>
        );
      case "CONFIRMED":
        return (
          <span style={{
            padding: "4px 14px", fontSize: "11px", fontWeight: 700,
            color: "#ffffff", background: "#111827",
            borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.05em",
          }}>Confirmed</span>
        );
      case "DELIVERED":
        return (
          <span style={{
            padding: "4px 14px", fontSize: "11px", fontWeight: 700,
            color: "#15803d", background: "#f0fdf4",
            borderRadius: "6px", border: "1px solid #bbf7d0",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>Delivered</span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getStatusCounts = () => {
    const source = isDealer
      ? orders.filter((o) => o.dealer?.id === DEALER_ID)
      : orders;
    return {
      ALL: source.length,
      DRAFT: source.filter((o) => o.status === "DRAFT").length,
      CONFIRMED: source.filter((o) => o.status === "CONFIRMED").length,
      DELIVERED: source.filter((o) => o.status === "DELIVERED").length,
    };
  };

  const counts = getStatusCounts();

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "DRAFT", label: "Draft" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "DELIVERED", label: "Delivered" },
  ];

  const buildLink = (href: string) => isDealer ? `${href}?view=dealer` : href;

  const totalItems = (order: Order) => order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;


  if (isDealer && selectedOrder) {
    return (
      <div>
        
        <button
          onClick={() => setSelectedOrder(null)}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            fontSize: "14px", fontWeight: 600, color: "#6b7280",
            background: "none", border: "none", cursor: "pointer",
            marginBottom: "20px", padding: 0,
          }}
        >
          <ArrowLeft style={{ width: "16px", height: "16px" }} />
          Back to Orders
        </button>

        
        <div style={{
          background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb",
          padding: "28px", marginBottom: "24px",
        }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", margin: 0 }}>
              {selectedOrder.order_number}
            </h2>
            {getStatusBadgeDark(selectedOrder.status)}
          </div>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px 0" }}>
            Placed on {formatDateTime(selectedOrder.created_at)}
          </p>

          
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px", padding: "20px 0",
            borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6",
          }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px 0" }}>Dealer</p>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0 }}>{selectedOrder.dealer?.name || "Unknown"}</p>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0 0" }}>
                DLR-{String(selectedOrder.dealer?.id || 0).padStart(5, "0")}
                {dealerMap[selectedOrder.dealer?.id] ? ` · ${dealerMap[selectedOrder.dealer.id]}` : ""}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px 0" }}>Order Number</p>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0, fontFamily: "monospace" }}>{selectedOrder.order_number}</p>
            </div>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px 0" }}>Status</p>
              {getStatusBadge(selectedOrder.status)}
            </div>
          </div>

          
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: "0 0 16px 0" }}>Ordered Products</h3>
            <div style={{
              background: "#fafafa", borderRadius: "10px", border: "1px solid #f3f4f6", overflow: "hidden",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    {["Product", "Qty", "Unit Price", "Line Total"].map((col, i) => (
                      <th key={i} style={{
                        padding: "12px 20px", textAlign: i === 0 ? "left" : "right" as const,
                        fontSize: "11px", fontWeight: 700, color: "#6b7280",
                        textTransform: "uppercase" as const, letterSpacing: "0.06em",
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item, idx) => (
                    <tr key={item.id} style={{
                      borderBottom: idx < (selectedOrder.items?.length || 0) - 1 ? "1px solid #f3f4f6" : "none",
                    }}>
                      <td style={{ padding: "14px 20px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0 }}>{item.product?.name || "—"}</p>
                        <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0 0", fontFamily: "monospace" }}>{item.product?.sku || "—"}</p>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 600, color: "#111827", textAlign: "right" }}>{item.quantity}</td>
                      <td style={{ padding: "14px 20px", fontSize: "14px", color: "#374151", textAlign: "right" }}>{formatRupees(item.unit_price)}</td>
                      <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 700, color: "#111827", textAlign: "right" }}>{formatRupees(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          
          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "40px" }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px 0" }}>Items</p>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0 }}>{totalItems(selectedOrder)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px 0" }}>Total Amount</p>
                <p style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: 0 }}>{formatRupees(selectedOrder.total_amount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div>
      
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: 0 }}>
          {isDealer ? "My Orders" : "Orders"}
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
          {isDealer
            ? `${counts.ALL} order${counts.ALL !== 1 ? "s" : ""} placed`
            : "Process dealer orders end-to-end."}
        </p>
      </div>

      
      <div style={{
        display: "flex", gap: "2px", background: "#f3f4f6",
        borderRadius: "10px", padding: "3px", width: "fit-content", marginBottom: "20px",
      }}>
        {filters.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 14px", fontSize: "13px", fontWeight: isActive ? 600 : 500,
                color: isActive ? "#ffffff" : "#6b7280",
                background: isActive ? "#111827" : "transparent",
                border: "none", borderRadius: "8px", cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {f.label}
              <span style={{ fontSize: "11px", fontWeight: 600, opacity: isActive ? 0.8 : 0.6 }}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      
      {isDealer ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
              <div style={{ width: "24px", height: "24px", border: "2px solid #e5e7eb", borderTopColor: "#111827", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Loading orders...</p>
            </div>
          ) : (
            <>
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb",
                    padding: "20px 24px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
                    (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
                          {order.order_number}
                        </span>
                        {getStatusBadgeDark(order.status)}
                      </div>
                      <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                        Placed on {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "40px", textAlign: "right" }}>
                    <div>
                      <p style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px 0" }}>Items</p>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>{totalItems(order)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px 0" }}>Total</p>
                      <p style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: 0 }}>{formatRupees(order.total_amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredOrders.length === 0 && (
                <div style={{ padding: "60px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <Package style={{ width: "40px", height: "40px", color: "#d1d5db", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: "16px", color: "#6b7280", fontWeight: 500 }}>No orders found.</p>
                  <p style={{ fontSize: "13px", color: "#9ca3af" }}>Start browsing products to place your first order.</p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div style={{ width: "24px", height: "24px", border: "2px solid #e5e7eb", borderTopColor: "#111827", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Loading orders...</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  {["ORDER", "DEALER", "DATE", "STATUS", "TOTAL", "ACTIONS"].map((col, i) => (
                    <th key={i} style={{
                      padding: "14px 20px",
                      textAlign: i === 4 || i === 5 ? "right" as const : "left" as const,
                      fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
                      textTransform: "uppercase" as const, color: "#6b7280", background: "#fafafa",
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => {
                  const isExpanded = expandedOrderId === order.id;
                  const isConfirmed = order.status === "CONFIRMED";
                  const hasItems = order.items && order.items.length > 0;

                  return (
                    <>
                      <tr
                        key={order.id}
                        style={{
                          borderBottom: isExpanded ? "none" : index < filteredOrders.length - 1 ? "1px solid #f3f4f6" : "none",
                          transition: "background 0.12s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "14px 20px", fontSize: "13px", color: "#374151", fontFamily: "monospace" }}>
                          {order.order_number}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                          {order.dealer?.name || "Unknown Dealer"}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: "13px", color: "#6b7280" }}>
                          {formatDate(order.created_at)}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          {getStatusBadge(order.status)}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 600, color: "#111827", textAlign: "right" as const }}>
                          {formatRupees(order.total_amount)}
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right" as const }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                            {isConfirmed && (
                              <button
                                onClick={() => handleDeliver(order.id)}
                                disabled={deliveringId === order.id}
                                style={{
                                  padding: "7px 14px", fontSize: "12px", fontWeight: 600,
                                  color: "#ffffff", background: "#111827", border: "none",
                                  borderRadius: "8px", cursor: deliveringId === order.id ? "not-allowed" : "pointer",
                                  opacity: deliveringId === order.id ? 0.6 : 1,
                                  transition: "opacity 0.15s ease", whiteSpace: "nowrap",
                                }}
                              >
                                {deliveringId === order.id ? "Marking..." : "Mark Delivered"}
                              </button>
                            )}
                            {hasItems && (
                              <button
                                onClick={() => toggleExpand(order.id)}
                                style={{
                                  width: "32px", height: "32px", display: "flex",
                                  alignItems: "center", justifyContent: "center",
                                  background: "transparent", border: "1px solid #e5e7eb",
                                  borderRadius: "8px", cursor: "pointer", color: "#6b7280",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#374151"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? <ChevronUp style={{ width: "16px", height: "16px" }} /> : <ChevronDown style={{ width: "16px", height: "16px" }} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      
                      {isExpanded && hasItems && (
                        <tr>
                          <td colSpan={6} style={{ padding: "0 20px 16px", background: "#f9fafb" }}>
                            <div style={{
                              background: "#ffffff", border: "1px solid #e5e7eb",
                              borderRadius: "10px", overflow: "hidden", marginTop: "4px",
                            }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    {["SKU", "Product", "Qty", "Price", "Subtotal"].map((col, i) => (
                                      <th key={i} style={{
                                        padding: "10px 16px",
                                        textAlign: i >= 2 ? "right" as const : "left" as const,
                                        fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em",
                                        textTransform: "uppercase" as const, color: "#6b7280", background: "#fafafa",
                                      }}>{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, idx) => (
                                    <tr key={item.id} style={{ borderBottom: idx < order.items.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                                      <td style={{ padding: "10px 16px", fontSize: "13px", color: "#6b7280", fontFamily: "monospace" }}>{item.product?.sku || "—"}</td>
                                      <td style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{item.product?.name || "—"}</td>
                                      <td style={{ padding: "10px 16px", fontSize: "13px", color: "#374151", textAlign: "right" }}>{item.quantity}</td>
                                      <td style={{ padding: "10px 16px", fontSize: "13px", color: "#374151", textAlign: "right" }}>{formatRupees(item.unit_price)}</td>
                                      <td style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "#111827", textAlign: "right" }}>{formatRupees(item.line_total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
          {filteredOrders.length === 0 && !loading && (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>No orders found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: "60px", textAlign: "center" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid #e5e7eb", borderTopColor: "#111827", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Loading orders...</p>
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}