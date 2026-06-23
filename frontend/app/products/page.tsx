"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Search, Pencil, Trash2, Plus, ShoppingCart, Minus, ChevronDown, SlidersHorizontal, CheckCircle2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Product {
    id: number;
    sku: string;
    name: string;
    category: string;
    price: string;
    brand: string;
    vehicle_fitment: string;
    description: string;
    external_id: string | null;
    stock_quantity: number;
    created_at: string;
    updated_at: string;
}

function ProductsPageContent() {
    const searchParams = useSearchParams();
    const viewMode = (searchParams.get("view") as "admin" | "dealer") || "admin";
    const isDealer = viewMode === "dealer";

    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [loading, setLoading] = useState(true);
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [cartCount, setCartCount] = useState(0);
    const [addedProductId, setAddedProductId] = useState<number | null>(null);

  
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [addForm, setAddForm] = useState({
        sku: "", name: "", category: "", price: "", brand: "", vehicle_fitment: "", description: "", external_id: "",
    });
    const [editForm, setEditForm] = useState<Product | null>(null);
    const [formError, setFormError] = useState("");
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    useEffect(() => {
        fetchProducts();
        updateCartCount();
        window.addEventListener("cart_updated", updateCartCount);
        return () => window.removeEventListener("cart_updated", updateCartCount);
    }, []);

    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) setSearchQuery(urlSearch);
    }, [searchParams]);

    useEffect(() => {
        let result = products;
        if (searchQuery.trim() !== "") {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                p.sku.toLowerCase().includes(q) ||
                p.name.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q)
            );
        }
        if (selectedCategory !== "All") {
            result = result.filter((p) => p.category === selectedCategory);
        }
        setFilteredProducts(result);
    }, [searchQuery, selectedCategory, products]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/products/?limit=1000&offset=0`);
            const data = await res.json();
            
            const invRes = await fetch(`${API_BASE}/inventory/`);
            const inventory = invRes.ok ? await invRes.json() : [];
            const stockMap: Record<number, number> = {};
            inventory.forEach((inv: any) => { stockMap[inv.product] = inv.quantity; });
            const merged = data.map((p: Product) => ({ ...p, stock_quantity: stockMap[p.id] || 0 }));
            setProducts(merged);
            setFilteredProducts(merged);
            const initialQtys: Record<number, number> = {};
            merged.forEach((p: Product) => { initialQtys[p.id] = 1; });
            setQuantities(initialQtys);
        } catch (err) {
            console.error("Failed to fetch products:", err);
        } finally {
            setLoading(false);
        }
    };

    const updateCartCount = () => {
        const cart = JSON.parse(localStorage.getItem("dealer_cart") || "[]");
        const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(count);
    };

    const formatRupees = (amount: string | number) => {
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        if (isNaN(num)) return "₹0";
        return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
        updateCartCount();

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

    
    const categories = ["All", ...Array.from(new Set(products.map(p => p.category))).filter(Boolean).sort()];

    
    const buildLink = (href: string) => isDealer ? `${href}?view=dealer` : href;

   
    const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAddForm((prev) => ({ ...prev, [name]: value }));
    };
    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditForm((prev) => (prev ? { ...prev, [name]: value } : null));
    };
    const openAddModal = () => {
        setAddForm({ sku: "", name: "", category: "", price: "", brand: "", vehicle_fitment: "", description: "", external_id: "" });
        setFormError(""); setIsAddModalOpen(true);
    };
    const openEditModal = (product: Product) => { setEditForm({ ...product }); setFormError(""); setIsEditModalOpen(true); };
    const closeAddModal = () => { setIsAddModalOpen(false); setFormError(""); };
    const closeEditModal = () => { setIsEditModalOpen(false); setFormError(""); setEditForm(null); };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true); setFormError("");
        const payload = { ...addForm, price: parseFloat(addForm.price) || 0 };
        try {
            const res = await fetch(`${API_BASE}/products/add/`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const text = await res.text();
                try { throw new Error(JSON.stringify(JSON.parse(text))); }
                catch { throw new Error(`Server error (${res.status}). Check backend logs.`); }
            }
            setIsAddModalOpen(false); fetchProducts();
        } catch (err: any) {
            setFormError(err.message || "Failed to add product");
        } finally { setIsSubmitting(false); }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); if (!editForm) return; setIsSubmitting(true); setFormError("");
        const payload = {
            sku: editForm.sku, name: editForm.name, category: editForm.category,
            price: parseFloat(String(editForm.price)) || 0, brand: editForm.brand,
            vehicle_fitment: editForm.vehicle_fitment, description: editForm.description, external_id: editForm.external_id,
        };
        try {
            const res = await fetch(`${API_BASE}/products/${editForm.id}/update/`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(JSON.stringify(err)); }
            setIsEditModalOpen(false); setEditForm(null); fetchProducts();
        } catch (err: any) {
            setFormError(err.message || "Failed to update product");
        } finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`${API_BASE}/products/${id}/delete/`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed"); fetchProducts();
        } catch (err) {
            alert("Failed to delete product.");
        } finally { setDeletingId(null); }
    };

    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "10px 14px", fontSize: "14px", background: "#fafafa",
        border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s ease",
    };
    const labelStyle: React.CSSProperties = {
        display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px",
    };

  
    return (
        <div>
            
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: 0 }}>
                    {isDealer ? "Products Catalog" : "Products"}
                </h1>
                <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                    {isDealer ? `${filteredProducts.length} of ${products.length} products` : "Manage your parts catalog, pricing and fitment data."}
                </p>
            </div>

            {isDealer ? (
                
                <>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", justifyContent: "flex-end" }}>
                        
                        <div style={{ position: "relative", width: "320px" }}>
                            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#9ca3af" }} />
                            <input
                                type="text"
                                placeholder="Search products, SKU, brand..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%", padding: "10px 14px 10px 40px", background: "#ffffff",
                                    border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", color: "#374151", outline: "none",
                                }}
                            />
                        </div>
                        
                        <div style={{ position: "relative" }}>
                            <button
                                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                style={{
                                    display: "flex", alignItems: "center", gap: "8px",
                                    padding: "10px 16px", background: "#ffffff", border: "1px solid #e5e7eb",
                                    borderRadius: "10px", fontSize: "14px", fontWeight: 500, color: "#374151",
                                    cursor: "pointer", minWidth: "140px", justifyContent: "space-between",
                                }}
                            >
                                <span>{selectedCategory}</span>
                                <ChevronDown style={{ width: "16px", height: "16px", color: "#6b7280" }} />
                            </button>
                            {showCategoryDropdown && (
                                <>
                                    <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowCategoryDropdown(false)} />
                                    <div style={{
                                        position: "absolute", top: "calc(100% + 4px)", right: 0,
                                        background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px",
                                        boxShadow: "0 10px 40px rgba(0,0,0,0.12)", zIndex: 50, minWidth: "180px",
                                        padding: "6px", maxHeight: "300px", overflowY: "auto",
                                    }}>
                                        {categories.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => { setSelectedCategory(cat); setShowCategoryDropdown(false); }}
                                                style={{
                                                    display: "block", width: "100%", textAlign: "left",
                                                    padding: "8px 12px", fontSize: "14px", fontWeight: selectedCategory === cat ? 600 : 400,
                                                    color: selectedCategory === cat ? "#ffffff" : "#374151",
                                                    background: selectedCategory === cat ? "#3b82f6" : "transparent",
                                                    border: "none", borderRadius: "6px", cursor: "pointer",
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    
                    {loading ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px", height: "320px" }}>
                                    <div style={{ height: "14px", width: "50%", background: "#f3f4f6", borderRadius: "4px", marginBottom: "12px" }} />
                                    <div style={{ height: "20px", width: "80%", background: "#f3f4f6", borderRadius: "4px", marginBottom: "8px" }} />
                                    <div style={{ height: "12px", width: "40%", background: "#f3f4f6", borderRadius: "4px", marginBottom: "16px" }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                            {filteredProducts.map((product) => (
                                <div key={product.id} style={{
                                    background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb",
                                    padding: "20px", display: "flex", flexDirection: "column",
                                    transition: "box-shadow 0.2s ease",
                                }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                                >
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                        <p style={{
                                            fontSize: "10px", fontWeight: 700, color: "#6b7280",
                                            textTransform: "uppercase", letterSpacing: "0.08em", margin: 0,
                                        }}>
                                            {product.category}
                                        </p>
                                        <span style={{
                                            fontSize: "11px", fontWeight: 600,
                                            color: product.stock_quantity > 10 ? "#15803d" : product.stock_quantity > 0 ? "#ca8a04" : "#dc2626",
                                            background: product.stock_quantity > 10 ? "#f0fdf4" : product.stock_quantity > 0 ? "#fefce8" : "#fef2f2",
                                            padding: "3px 10px", borderRadius: "6px",
                                            border: `1px solid ${product.stock_quantity > 10 ? "#bbf7d0" : product.stock_quantity > 0 ? "#fef08a" : "#fecaca"}`,
                                        }}>
                                            {product.stock_quantity} in stock
                                        </span>
                                    </div>

                                    
                                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 12px 0", lineHeight: 1.4 }}>
                                        {product.name}
                                    </h3>

                                    
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: "12px" }}>
                                        <div>
                                            <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px 0" }}>SKU</p>
                                            <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151", margin: 0, fontFamily: "monospace" }}>{product.sku}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px 0" }}>Brand</p>
                                            <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151", margin: 0 }}>{product.brand || "—"}</p>
                                        </div>
                                        <div style={{ gridColumn: "1 / -1" }}>
                                            <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px 0" }}>Fitment</p>
                                            <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151", margin: 0 }}>{product.vehicle_fitment || "Universal"}</p>
                                        </div>
                                    </div>

                                    
                                    <div style={{ borderTop: "1px solid #f3f4f6", margin: "4px 0 12px 0" }} />

                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                        <div>
                                            <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px 0" }}>Price</p>
                                            <p style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: 0 }}>{formatRupees(product.price)}</p>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <p style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px 0" }}>Subtotal</p>
                                            <p style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: 0 }}>{formatRupees(getSubtotal(product.id, product.price))}</p>
                                        </div>
                                    </div>

                                    
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                        <button
                                            onClick={() => adjustQty(product.id, -1, product.stock_quantity)}
                                            disabled={(quantities[product.id] || 1) <= 1}
                                            style={{
                                                width: "32px", height: "32px", borderRadius: "8px",
                                                border: "1px solid #e5e7eb", background: "#ffffff",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                cursor: (quantities[product.id] || 1) <= 1 ? "not-allowed" : "pointer",
                                                opacity: (quantities[product.id] || 1) <= 1 ? 0.4 : 1,
                                            }}
                                        >
                                            <Minus style={{ width: "14px", height: "14px", color: "#374151" }} />
                                        </button>
                                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#111827", minWidth: "28px", textAlign: "center" }}>
                                            {quantities[product.id] || 1}
                                        </span>
                                        <button
                                            onClick={() => adjustQty(product.id, 1, product.stock_quantity)}
                                            disabled={(quantities[product.id] || 1) >= product.stock_quantity}
                                            style={{
                                                width: "32px", height: "32px", borderRadius: "8px",
                                                border: "1px solid #e5e7eb", background: "#ffffff",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                cursor: (quantities[product.id] || 1) >= product.stock_quantity ? "not-allowed" : "pointer",
                                                opacity: (quantities[product.id] || 1) >= product.stock_quantity ? 0.4 : 1,
                                            }}
                                        >
                                            <Plus style={{ width: "14px", height: "14px", color: "#374151" }} />
                                        </button>
                                    </div>

                                    
                                    <button
                                        onClick={() => addToCart(product, quantities[product.id] || 1)}
                                        disabled={product.stock_quantity <= 0}
                                        style={{
                                            width: "100%", padding: "12px 16px",
                                            background: addedProductId === product.id ? "#15803d" : (product.stock_quantity > 0 ? "#111827" : "#e5e7eb"),
                                            color: product.stock_quantity > 0 ? "#ffffff" : "#9ca3af",
                                            border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700,
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
                                                <CheckCircle2 style={{ width: "16px", height: "16px" }} />
                                                Added!
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart style={{ width: "16px", height: "16px" }} />
                                                Add to Cart
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredProducts.length === 0 && !loading && (
                        <div style={{ padding: "60px", textAlign: "center", background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                            <p style={{ fontSize: "16px", color: "#6b7280", fontWeight: 500 }}>No products found.</p>
                            <p style={{ fontSize: "13px", color: "#9ca3af" }}>Try adjusting your search or filter.</p>
                        </div>
                    )}
                </>
            ) : (
                
                <>
                   
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                        <button
                            onClick={openAddModal}
                            style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "10px 18px", fontSize: "14px", fontWeight: 600,
                                color: "#ffffff", background: "#111827", border: "none",
                                borderRadius: "10px", cursor: "pointer", transition: "opacity 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                        >
                            <Plus style={{ width: "16px", height: "16px" }} />
                            Add Product
                        </button>
                    </div>

                    
                    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
                        
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "14px 20px", borderBottom: "1px solid #f3f4f6",
                        }}>
                            <div style={{ position: "relative", width: "360px" }}>
                                <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#9ca3af" }} />
                                <input
                                    type="text" placeholder="Search SKU, name, brand..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: "100%", padding: "8px 14px 8px 38px",
                                        background: "#f9fafb", border: "1px solid #e5e7eb",
                                        borderRadius: "8px", fontSize: "14px", color: "#374151", outline: "none",
                                    }}
                                />
                            </div>
                            <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500 }}>
                                {filteredProducts.length} of {products.length}
                            </span>
                        </div>

                        {loading ? (
                            <div style={{ padding: "60px", textAlign: "center" }}>
                                <div style={{ width: "24px", height: "24px", border: "2px solid #e5e7eb", borderTopColor: "#111827", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Loading products...</p>
                            </div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                                        {["SKU", "NAME", "CATEGORY", "BRAND", "FITMENT", "PRICE", ""].map((col, i) => (
                                            <th key={i} style={{
                                                padding: "12px 20px", textAlign: i === 6 ? "right" as const : "left" as const,
                                                fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
                                                textTransform: "uppercase" as const, color: "#6b7280", background: "#fafafa",
                                            }}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product, index) => (
                                        <tr key={product.id} style={{
                                            borderBottom: index < filteredProducts.length - 1 ? "1px solid #f3f4f6" : "none",
                                            transition: "background 0.12s ease",
                                        }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                        >
                                            <td style={{ padding: "14px 20px", fontSize: "13px", color: "#374151", fontFamily: "monospace" }}>{product.sku}</td>
                                            <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 600, color: "#111827" }}>{product.name}</td>
                                            <td style={{ padding: "14px 20px", fontSize: "13px", color: "#374151" }}>{product.category}</td>
                                            <td style={{ padding: "14px 20px", fontSize: "13px", color: "#374151" }}>{product.brand || "—"}</td>
                                            <td style={{ padding: "14px 20px", fontSize: "13px", color: "#6b7280" }}>{product.vehicle_fitment || "—"}</td>
                                            <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 600, color: "#111827" }}>{formatRupees(product.price)}</td>
                                            <td style={{ padding: "14px 20px", textAlign: "right" as const }}>
                                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                                    <button onClick={() => openEditModal(product)} style={{
                                                        width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
                                                        background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px",
                                                        cursor: "pointer", color: "#6b7280", transition: "all 0.15s ease",
                                                    }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#374151"; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}
                                                        title="Edit"
                                                    >
                                                        <Pencil style={{ width: "14px", height: "14px" }} />
                                                    </button>
                                                    <button onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} style={{
                                                        width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
                                                        background: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px",
                                                        cursor: deletingId === product.id ? "not-allowed" : "pointer",
                                                        color: "#6b7280", opacity: deletingId === product.id ? 0.5 : 1, transition: "all 0.15s ease",
                                                    }}
                                                        onMouseEnter={(e) => { if (deletingId !== product.id) { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; } }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 style={{ width: "14px", height: "14px" }} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {filteredProducts.length === 0 && !loading && (
                            <div style={{ padding: "60px", textAlign: "center" }}>
                                <p style={{ fontSize: "14px", color: "#6b7280" }}>No products found.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

           
            {isAddModalOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={closeAddModal}>
                    <div style={{ background: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #f3f4f6" }}>
                            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>Add Product</h2>
                            <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>All catalog fields are visible to dealers.</p>
                        </div>
                        <form onSubmit={handleAddSubmit} style={{ padding: "20px 28px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div><label style={labelStyle}>SKU</label><input type="text" name="sku" value={addForm.sku} onChange={handleAddChange} required style={inputStyle} /></div>
                                <div><label style={labelStyle}>Name</label><input type="text" name="name" value={addForm.name} onChange={handleAddChange} required style={inputStyle} /></div>
                                <div><label style={labelStyle}>Category</label><input type="text" name="category" value={addForm.category} onChange={handleAddChange} required style={inputStyle} /></div>
                                <div><label style={labelStyle}>Brand</label><input type="text" name="brand" value={addForm.brand} onChange={handleAddChange} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Price (₹)</label><input type="number" name="price" value={addForm.price} onChange={handleAddChange} required min="0" step="0.01" style={inputStyle} /></div>
                                <div><label style={labelStyle}>Vehicle Fitment</label><input type="text" name="vehicle_fitment" value={addForm.vehicle_fitment} onChange={handleAddChange} style={inputStyle} /></div>
                                <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Description</label><textarea name="description" value={addForm.description} onChange={handleAddChange} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
                            </div>
                            {formError && (
                                <div style={{ marginTop: "16px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "13px" }}>{formError}</div>
                            )}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
                                <button type="button" onClick={closeAddModal} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 500, color: "#374151", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", cursor: "pointer" }}>Cancel</button>
                                <button type="submit" disabled={isSubmitting} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 600, color: "#ffffff", background: "#111827", border: "none", borderRadius: "10px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1 }}>{isSubmitting ? "Creating..." : "Create product"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            
            {isEditModalOpen && editForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={closeEditModal}>
                    <div style={{ background: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #f3f4f6" }}>
                            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>Edit Product</h2>
                            <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>All catalog fields are visible to dealers.</p>
                        </div>
                        <form onSubmit={handleEditSubmit} style={{ padding: "20px 28px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div><label style={labelStyle}>SKU</label><input type="text" name="sku" value={editForm.sku} onChange={handleEditChange} required style={inputStyle} /></div>
                                <div><label style={labelStyle}>Name</label><input type="text" name="name" value={editForm.name} onChange={handleEditChange} required style={inputStyle} /></div>
                                <div><label style={labelStyle}>Category</label><input type="text" name="category" value={editForm.category} onChange={handleEditChange} required style={inputStyle} /></div>
                                <div><label style={labelStyle}>Brand</label><input type="text" name="brand" value={editForm.brand} onChange={handleEditChange} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Price (₹)</label><input type="number" name="price" value={editForm.price} onChange={handleEditChange} required min="0" step="0.01" style={inputStyle} /></div>
                                <div><label style={labelStyle}>Vehicle Fitment</label><input type="text" name="vehicle_fitment" value={editForm.vehicle_fitment} onChange={handleEditChange} style={inputStyle} /></div>
                                <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Description</label><textarea name="description" value={editForm.description} onChange={handleEditChange} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
                            </div>
                            {formError && (
                                <div style={{ marginTop: "16px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "13px" }}>{formError}</div>
                            )}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
                                <button type="button" onClick={closeEditModal} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 500, color: "#374151", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", cursor: "pointer" }}>Cancel</button>
                                <button type="submit" disabled={isSubmitting} style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 600, color: "#ffffff", background: "#111827", border: "none", borderRadius: "10px", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1 }}>{isSubmitting ? "Saving..." : "Save changes"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={
            <div style={{ padding: "60px", textAlign: "center" }}>
                <div style={{ width: "24px", height: "24px", border: "2px solid #e5e7eb", borderTopColor: "#111827", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Loading products...</p>
            </div>
        }>
            <ProductsPageContent />
        </Suspense>
    );
}