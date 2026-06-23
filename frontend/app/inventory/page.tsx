"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Product {
    id: number;
    sku: string;
    name: string;
}

interface InventoryItem {
    id: number;
    product: number;
    quantity: number;
    updated_at: string;
}

interface InventoryRow {
    id: number;
    product_id: number;
    product_name: string;
    sku: string;
    quantity: number;
    updated_at: string;
}

export default function InventoryPage() {
    const [rows, setRows] = useState<InventoryRow[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<Record<number, string>>({});
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newProductId, setNewProductId] = useState<string>("");
    const [newQuantity, setNewQuantity] = useState<string>("");
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState("");

    useEffect(() => {
        fetchInventoryData();
    }, []);

    const fetchInventoryData = async () => {
        setLoading(true);
        try {
            const [productsRes, inventoryRes] = await Promise.all([
                fetch(`${API_BASE}/products/?limit=1000&offset=0`),
                fetch(`${API_BASE}/inventory/`),
            ]);

            const products: Product[] = productsRes.ok ? await productsRes.json() : [];
            const inventory: InventoryItem[] = inventoryRes.ok ? await inventoryRes.json() : [];

            setAllProducts(products);

            const productMap = new Map(products.map((p) => [p.id, p]));

            const merged: InventoryRow[] = inventory.map((inv) => {
                const prod = productMap.get(inv.product);
                return {
                    id: inv.id,
                    product_id: inv.product,
                    product_name: prod?.name || `Product #${inv.product}`,
                    sku: prod?.sku || "—",
                    quantity: inv.quantity,
                    updated_at: inv.updated_at,
                };
            });

            setRows(merged);

            
            const initialEdits: Record<number, string> = {};
            merged.forEach((r) => {
                initialEdits[r.product_id] = String(r.quantity);
            });
            setEditValues(initialEdits);
        } catch (err) {
            console.error("Failed to fetch inventory:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (productId: number, value: string) => {
        setEditValues((prev) => ({ ...prev, [productId]: value }));
    };

    const handleSave = async (productId: number) => {
        const newQty = parseInt(editValues[productId] || "0", 10);
        if (isNaN(newQty) || newQty < 0) {
            alert("Please enter a valid quantity");
            return;
        }

        setSavingId(productId);
        try {
            const res = await fetch(`${API_BASE}/inventory/${productId}/update/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product: productId, quantity: newQty }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(JSON.stringify(err));
            }

           
            fetchInventoryData();
        } catch (err: any) {
            alert("Failed to update inventory: " + (err.message || "Unknown error"));
        } finally {
            setSavingId(null);
        }
    };

    const openAddModal = () => {
        setNewProductId("");
        setNewQuantity("");
        setAddError("");
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setAddError("");
    };

    const handleAddInventory = async () => {
        if (!newProductId) {
            setAddError("Please select a product");
            return;
        }
        const qty = parseInt(newQuantity || "0", 10);
        if (isNaN(qty) || qty < 0) {
            setAddError("Please enter a valid quantity");
            return;
        }

        setIsAdding(true);
        setAddError("");
        try {
            const res = await fetch(`${API_BASE}/inventory/add/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product: parseInt(newProductId, 10), quantity: qty }),
            });

            if (!res.ok) {
                const text = await res.text();
                try { throw new Error(JSON.stringify(JSON.parse(text))); }
                catch { throw new Error(`Server error (${res.status})`); }
            }

            setIsAddModalOpen(false);
            fetchInventoryData();
        } catch (err: any) {
            setAddError(err.message || "Failed to add inventory");
        } finally {
            setIsAdding(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const isLowStock = (qty: number) => qty <= 20;

    return (
        <div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: 0 }}>Inventory</h1>
                    <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                        Live stock levels across all SKUs.
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    style={{
                        padding: "10px 18px", fontSize: "14px", fontWeight: 600,
                        color: "#ffffff", background: "#111827", border: "none",
                        borderRadius: "10px", cursor: "pointer",
                    }}
                >
                    + Add Inventory
                </button>
            </div>

            
            <div style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
            }}>
                {loading ? (
                    <div style={{ padding: "60px", textAlign: "center" }}>
                        <div style={{
                            width: "24px",
                            height: "24px",
                            border: "2px solid #e5e7eb",
                            borderTopColor: "#111827",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            margin: "0 auto",
                        }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Loading inventory...</p>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                                {["PRODUCT", "SKU", "QUANTITY", "LAST UPDATED", "UPDATE"].map((col, i) => (
                                    <th key={i} style={{
                                        padding: "14px 20px",
                                        textAlign: i === 2 || i === 4 ? "right" as const : "left" as const,
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase" as const,
                                        color: "#6b7280",
                                        background: "#fafafa",
                                    }}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr
                                    key={row.id}
                                    style={{
                                        borderBottom: index < rows.length - 1 ? "1px solid #f3f4f6" : "none",
                                        transition: "background 0.12s ease",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                    
                                    <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                                        {row.product_name}
                                    </td>

                                    
                                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "#6b7280", fontFamily: "monospace" }}>
                                        {row.sku}
                                    </td>

                                    
                                    <td style={{ padding: "14px 20px", textAlign: "right" as const }}>
                                        {isLowStock(row.quantity) ? (
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                minWidth: "28px",
                                                height: "24px",
                                                padding: "0 10px",
                                                background: "#f3f4f6",
                                                borderRadius: "9999px",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                color: "#374151",
                                            }}>
                                                {row.quantity}
                                            </span>
                                        ) : (
                                            <span style={{
                                                fontSize: "14px",
                                                fontWeight: 600,
                                                color: "#111827",
                                            }}>
                                                {row.quantity}
                                            </span>
                                        )}
                                    </td>

                                    
                                    <td style={{ padding: "14px 20px", fontSize: "13px", color: "#6b7280", textAlign: "right" as const }}>
                                        {formatDate(row.updated_at)}
                                    </td>

                                    
                                    <td style={{ padding: "14px 20px", textAlign: "right" as const }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editValues[row.product_id] ?? String(row.quantity)}
                                                onChange={(e) => handleQuantityChange(row.product_id, e.target.value)}
                                                style={{
                                                    width: "64px",
                                                    padding: "6px 10px",
                                                    fontSize: "13px",
                                                    fontWeight: 500,
                                                    textAlign: "center" as const,
                                                    background: "#ffffff",
                                                    border: "1px solid #e5e7eb",
                                                    borderRadius: "8px",
                                                    color: "#111827",
                                                    outline: "none",
                                                }}
                                            />
                                            <button
                                                onClick={() => handleSave(row.product_id)}
                                                disabled={savingId === row.product_id}
                                                style={{
                                                    padding: "7px 16px",
                                                    fontSize: "13px",
                                                    fontWeight: 600,
                                                    color: "#ffffff",
                                                    background: "#111827",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    cursor: savingId === row.product_id ? "not-allowed" : "pointer",
                                                    opacity: savingId === row.product_id ? 0.6 : 1,
                                                    transition: "opacity 0.15s ease",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {savingId === row.product_id ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {rows.length === 0 && !loading && (
                    <div style={{ padding: "60px", textAlign: "center" }}>
                        <p style={{ fontSize: "14px", color: "#6b7280" }}>No inventory records found.</p>
                    </div>
                )}
            </div>

            
            {isAddModalOpen && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
                    onClick={closeAddModal}
                >
                    <div
                        style={{ background: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "420px" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #f3f4f6" }}>
                            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>Add Inventory</h2>
                            <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>
                                Pick a product and set quantity.
                            </p>
                        </div>
                        <div style={{ padding: "20px 28px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                                Product
                            </label>
                            <select
                                value={newProductId}
                                onChange={(e) => setNewProductId(e.target.value)}
                                style={{
                                    width: "100%", padding: "10px 14px", fontSize: "14px", background: "#fafafa",
                                    border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827", outline: "none", marginBottom: "16px",
                                }}
                            >
                                <option value="">Select a product...</option>
                                {allProducts.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                ))}
                            </select>

                            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                                Quantity
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={newQuantity}
                                onChange={(e) => setNewQuantity(e.target.value)}
                                placeholder="0"
                                style={{
                                    width: "100%", padding: "10px 14px", fontSize: "14px", background: "#fafafa",
                                    border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827", outline: "none",
                                }}
                            />

                            {addError && (
                                <div style={{ marginTop: "16px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "13px" }}>
                                    {addError}
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                                <button
                                    onClick={closeAddModal}
                                    style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 500, color: "#374151", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddInventory}
                                    disabled={isAdding}
                                    style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 600, color: "#ffffff", background: "#111827", border: "none", borderRadius: "10px", cursor: isAdding ? "not-allowed" : "pointer", opacity: isAdding ? 0.6 : 1 }}
                                >
                                    {isAdding ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}