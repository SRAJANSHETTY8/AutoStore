"use client";

import { useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Clock } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface SyncResult {
  success: string;
  created: number;
  updated: number;
}

interface SyncLog {
  id: number;
  channel: string;
  time: string;
  status: "success" | "error";
  created: number;
  updated: number;
  message: string;
}

interface Channel {
  id: string;
  name: string;
  lastSynced: string;
}

const DEMO_PAYLOAD = {
  external_id: "EXT-2026-001",
  sku: "FLT-2042",
  name: "High-Flow Oil Filter",
  category: "Filters",
  price: 1450.00,
  brand: "K&N",
  vehicle_fitment: "Universal 3/4-16 thread",
  description: "Premium media for extended drain intervals.",
  stock: 320,
};

const channels: Channel[] = [
  { id: "Marketplace A", name: "Marketplace A", lastSynced: "Jun 23, 2026" },
  { id: "Marketplace B", name: "Marketplace B", lastSynced: "Jun 23, 2026" },
  { id: "Partner Portal", name: "Partner Portal", lastSynced: "Jun 23, 2026" },
  { id: "External Channel", name: "External Channel", lastSynced: "Jun 23, 2026" },
];


export default function ChannelSyncPage() {
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [totalSyncs, setTotalSyncs] = useState(4);
  const [errorCount, setErrorCount] = useState(0);

  const handleSync = async (channel: Channel) => {
    setSyncingChannel(channel.id);
    const startTime = new Date();

    try {
      const res = await fetch(`${API_BASE}/sync/channel/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEMO_PAYLOAD),
      });

      const data = await res.json();

      if (res.ok) {
        setLastResult(data);
        setTotalSyncs((prev) => prev + 1);

        const newLog: SyncLog = {
          id: Date.now(),
          channel: channel.name,
          time: startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          status: "success",
          created: data.created,
          updated: data.updated,
          message: data.success || "Channel Sync Completed",
        };
        setLogs((prev) => [newLog, ...prev].slice(0, 10));
      } else {
        setErrorCount((prev) => prev + 1);
        const newLog: SyncLog = {
          id: Date.now(),
          channel: channel.name,
          time: startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          status: "error",
          created: 0,
          updated: 0,
          message: data.error || "Sync failed",
        };
        setLogs((prev) => [newLog, ...prev].slice(0, 10));
      }
    } catch (err) {
      setErrorCount((prev) => prev + 1);
      const newLog: SyncLog = {
        id: Date.now(),
        channel: channel.name,
        time: startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        status: "error",
        created: 0,
        updated: 0,
        message: "Network error — API unreachable",
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 10));
    } finally {
      setSyncingChannel(null);
    }
  };

  return (
    <div>
      
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: 0 }}>Channel Sync</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
          Push catalog and inventory to connected marketplaces.
        </p>
      </div>

      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px",
      }}>
        
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "20px",
        }}>
          <p style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
          }}>
            Connected Channels
          </p>
          <p style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#111827",
            margin: "8px 0 0",
          }}>
            4
          </p>
        </div>

        
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "20px",
        }}>
          <p style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
          }}>
            Successful Syncs
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
            <CheckCircle style={{ width: "28px", height: "28px", color: "#111827" }} />
            <p style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#111827",
              margin: 0,
            }}>
              {totalSyncs}
            </p>
          </div>
        </div>

        
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "20px",
        }}>
          <p style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
          }}>
            Errors
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
            <XCircle style={{ width: "28px", height: "28px", color: "#111827" }} />
            <p style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#111827",
              margin: 0,
            }}>
              {errorCount}
            </p>
          </div>
        </div>
      </div>

      
      {lastResult && (
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <CheckCircle style={{ width: "20px", height: "20px", color: "#22c55e" }} />
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0 }}>
              {lastResult.success}
            </p>
          </div>
          <div style={{ display: "flex", gap: "24px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                Created
              </p>
              <p style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "4px 0 0" }}>
                {lastResult.created}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                Updated
              </p>
              <p style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "4px 0 0" }}>
                {lastResult.updated}
              </p>
            </div>
          </div>
        </div>
      )}

      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "16px",
        marginBottom: "24px",
      }}>
        {channels.map((channel) => (
          <div
            key={channel.id}
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <CheckCircle style={{ width: "18px", height: "18px", color: "#111827" }} />
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#111827", margin: 0 }}>
                  {channel.name}
                </p>
              </div>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0", paddingLeft: "28px" }}>
                Last synced {channel.lastSynced}
              </p>
            </div>
            <button
              onClick={() => handleSync(channel)}
              disabled={syncingChannel === channel.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#374151",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: syncingChannel === channel.id ? "not-allowed" : "pointer",
                opacity: syncingChannel === channel.id ? 0.6 : 1,
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (syncingChannel !== channel.id) {
                  e.currentTarget.style.borderColor = "#d1d5db";
                  e.currentTarget.style.background = "#f9fafb";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.background = "#ffffff";
              }}
            >
              <RefreshCw
                style={{
                  width: "14px",
                  height: "14px",
                  animation: syncingChannel === channel.id ? "spin 1s linear infinite" : "none",
                }}
              />
              {syncingChannel === channel.id ? "Syncing..." : "Sync now"}
            </button>
          </div>
        ))}
      </div>

      
      {logs.length > 0 && (
        <div style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <Clock style={{ width: "16px", height: "16px", color: "#6b7280" }} />
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: 0 }}>
              Sync History
            </p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                {["Time", "Channel", "Status", "Created", "Updated", "Message"].map((col, i) => (
                  <th key={i} style={{
                    padding: "12px 20px",
                    textAlign: "left",
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
              {logs.map((log, index) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: index < logs.length - 1 ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <td style={{ padding: "12px 20px", fontSize: "13px", color: "#6b7280", fontFamily: "monospace" }}>
                    {log.time}
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 500, color: "#111827" }}>
                    {log.channel}
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    {log.status === "success" ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#15803d",
                        background: "#f0fdf4",
                        borderRadius: "9999px",
                      }}>
                        <CheckCircle style={{ width: "12px", height: "12px" }} />
                        Success
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#dc2626",
                        background: "#fef2f2",
                        borderRadius: "9999px",
                      }}>
                        <XCircle style={{ width: "12px", height: "12px" }} />
                        Error
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                    {log.created}
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                    {log.updated}
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: "13px", color: "#6b7280" }}>
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}