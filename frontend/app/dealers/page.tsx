"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Dealer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export default function DealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);


  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [editForm, setEditForm] = useState<Dealer | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchDealers();
  }, []);

  const fetchDealers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dealers/`);
      const data = await res.json();
      setDealers(data);
    } catch (err) {
      console.error("Failed to fetch dealers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const openAddModal = () => {
    setAddForm({ name: "", email: "", phone: "", address: "" });
    setFormError("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (dealer: Dealer) => {
    setEditForm({ ...dealer });
    setFormError("");
    setIsEditModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setFormError("");
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setFormError("");
    setEditForm(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`${API_BASE}/dealers/add/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
      }
      setIsAddModalOpen(false);
      fetchDealers();
    } catch (err: any) {
      setFormError(err.message || "Failed to add dealer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setIsSubmitting(true);
    setFormError("");

    const payload = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      address: editForm.address,
    };

    try {
      const res = await fetch(`${API_BASE}/dealers/${editForm.id}/update/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
      }
      setIsEditModalOpen(false);
      setEditForm(null);
      fetchDealers();
    } catch (err: any) {
      setFormError(err.message || "Failed to update dealer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this dealer?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/dealers/${id}/delete/`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchDealers();
    } catch (err) {
      alert("Failed to delete dealer.");
    } finally {
      setDeletingId(null);
    }
  };


  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    background: "#fafafa",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    color: "#111827",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s ease",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#6b7280",
    marginBottom: "6px",
  };

  return (
    <div>
      
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: 0 }}>Dealers</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
          Manage authorized dealer accounts.
        </p>
      </div>

      
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button
          onClick={openAddModal}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#ffffff",
            background: "#111827",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Plus style={{ width: "16px", height: "16px" }} />
          Add Dealer
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
            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Loading dealers...</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                {["DEALER", "EMAIL", "PHONE", "ADDRESS", ""].map((col, i) => (
                  <th key={i} style={{
                    padding: "14px 20px",
                    textAlign: i === 4 ? "right" as const : "left" as const,
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
              {dealers.map((dealer, index) => (
                <tr
                  key={dealer.id}
                  style={{
                    borderBottom: index < dealers.length - 1 ? "1px solid #f3f4f6" : "none",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  
                  <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                    {dealer.name}
                  </td>

                  
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#6b7280" }}>
                    {dealer.email}
                  </td>

                  
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#374151" }}>
                    {dealer.phone}
                  </td>

                  
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "#6b7280" }}>
                    {dealer.address}
                  </td>

                  
                  <td style={{ padding: "14px 20px", textAlign: "right" as const }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => openEditModal(dealer)}
                        style={{
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "#6b7280",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                          e.currentTarget.style.color = "#374151";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.color = "#6b7280";
                        }}
                        title="Edit"
                      >
                        <Pencil style={{ width: "14px", height: "14px" }} />
                      </button>
                      <button
                        onClick={() => handleDelete(dealer.id)}
                        disabled={deletingId === dealer.id}
                        style={{
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          cursor: deletingId === dealer.id ? "not-allowed" : "pointer",
                          color: "#6b7280",
                          opacity: deletingId === dealer.id ? 0.5 : 1,
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (deletingId !== dealer.id) {
                            e.currentTarget.style.borderColor = "#ef4444";
                            e.currentTarget.style.color = "#ef4444";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.color = "#6b7280";
                        }}
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

        {dealers.length === 0 && !loading && (
          <div style={{ padding: "60px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>No dealers found.</p>
          </div>
        )}
      </div>

      
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={closeAddModal}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            
            <div style={{
              padding: "24px 28px 16px",
              borderBottom: "1px solid #f3f4f6",
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>Add Dealer</h2>
            </div>

            
            <form onSubmit={handleAddSubmit} style={{ padding: "20px 28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                <div>
                  <label style={labelStyle}>Dealer name</label>
                  <input
                    type="text"
                    name="name"
                    value={addForm.name}
                    onChange={handleAddChange}
                    required
                    style={inputStyle}
                  />
                </div>

                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={addForm.email}
                      onChange={handleAddChange}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={addForm.phone}
                      onChange={handleAddChange}
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                
                <div>
                  <label style={labelStyle}>Address</label>
                  <textarea
                    name="address"
                    value={addForm.address}
                    onChange={handleAddChange}
                    required
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>

              {formError && (
                <div style={{
                  marginTop: "16px",
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#dc2626",
                  fontSize: "13px",
                }}>
                  {formError}
                </div>
              )}

              
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #f3f4f6",
              }}>
                <button
                  type="button"
                  onClick={closeAddModal}
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#374151",
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#ffffff",
                    background: "#111827",
                    border: "none",
                    borderRadius: "10px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? "Creating..." : "Create dealer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {isEditModalOpen && editForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={closeEditModal}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            
            <div style={{
              padding: "24px 28px 16px",
              borderBottom: "1px solid #f3f4f6",
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>Edit Dealer</h2>
            </div>

            
            <form onSubmit={handleEditSubmit} style={{ padding: "20px 28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                <div>
                  <label style={labelStyle}>Dealer name</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    required
                    style={inputStyle}
                  />
                </div>

                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditChange}
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                
                <div>
                  <label style={labelStyle}>Address</label>
                  <textarea
                    name="address"
                    value={editForm.address}
                    onChange={handleEditChange}
                    required
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>

              {formError && (
                <div style={{
                  marginTop: "16px",
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#dc2626",
                  fontSize: "13px",
                }}>
                  {formError}
                </div>
              )}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #f3f4f6",
              }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#374151",
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#ffffff",
                    background: "#111827",
                    border: "none",
                    borderRadius: "10px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}