"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  ShoppingCart,
  Radio,
  Search,
  Bell,
  Home,
  ClipboardList,
  LogOut,
} from "lucide-react";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });


const adminNavLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/dealers", label: "Dealers", icon: Users },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/sync", label: "Channel Sync", icon: Radio },
];


const dealerNavLinks = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "My Orders", icon: ClipboardList },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
];

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();


  const viewMode = (searchParams.get("view") as "admin" | "dealer") || "admin";
  const isDealer = viewMode === "dealer";

  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [dealerName, setDealerName] = useState("Sharma Auto Spares");
  const [headerSearch, setHeaderSearch] = useState("");

  const handleHeaderSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && headerSearch.trim()) {
      const params = new URLSearchParams();
      params.set("search", headerSearch.trim());
      if (isDealer) params.set("view", "dealer");
      router.push(`/products?${params.toString()}`);
    }
  };


  useEffect(() => {
    const updateCart = () => {
      const cart = JSON.parse(localStorage.getItem("dealer_cart") || "[]");
      const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const total = cart.reduce((sum: number, item: any) => sum + (item.quantity * parseFloat(item.price)), 0);
      setCartCount(count);
      setCartTotal(total);
    };
    updateCart();
    window.addEventListener("cart_updated", updateCart);
    return () => window.removeEventListener("cart_updated", updateCart);
  }, []);

  const activeNavLinks = isDealer ? dealerNavLinks : adminNavLinks;

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname?.startsWith(href);
  };

  const switchView = (mode: "admin" | "dealer") => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "admin") {
      params.delete("view");
    } else {
      params.set("view", "dealer");
    }
    router.push(`/?${params.toString()}`);
  };


  const buildHref = (href: string) => {
    if (isDealer && href !== "/") {
      return `${href}?view=dealer`;
    }
    if (isDealer && href === "/") {
      return "/?view=dealer";
    }
    return href;
  };

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body style={{ margin: 0 }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>

          
          <aside style={{
            width: "260px",
            background: "#0a0a0a",
            color: "#ffffff",
            display: "flex",
            flexDirection: "column",
            position: "sticky",
            top: 0,
            height: "100vh",
            flexShrink: 0,
            padding: "20px 0",
          }}>
            
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "0 20px 24px",
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                background: "#ffffff",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "#9ca3af",
                textTransform: "uppercase",
              }}>
                {isDealer ? "Dealer Portal" : "Admin Console"}
              </span>
            </div>

            
            <div style={{ padding: "0 20px 8px" }}>
              <span style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                {isDealer ? "Dealer" : "Workspace"}
              </span>
            </div>
            
            <nav style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              padding: "0 12px",
              flex: 1,
            }}>
              {activeNavLinks.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                const finalHref = buildHref(href);
                return (
                  <Link
                    key={href}
                    href={finalHref}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: active ? 600 : 500,
                      color: active ? "#ffffff" : "#9ca3af",
                      background: active ? "#1a1a1a" : "transparent",
                      transition: "background 0.15s ease, color 0.15s ease",
                      position: "relative",
                      textDecoration: "none",
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "#1a1a1a";
                        (e.currentTarget as HTMLElement).style.color = "#ffffff";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#9ca3af";
                      }
                    }}
                  >
                    <Icon style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                    <span>{label}</span>
                    {label === "Cart" && cartCount > 0 && (
                      <span style={{
                        marginLeft: "auto",
                        background: "#ef4444",
                        color: "#fff",
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "9999px",
                      }}>
                        {cartCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            
            <div style={{
              padding: "16px 20px",
              borderTop: "1px solid #1f2937",
              marginTop: "auto",
            }}>
            </div>
          </aside>

          
          <main style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#f5f5f5",
            minWidth: 0,
          }}>
            
            <header style={{
              height: "64px",
              background: "#ffffff",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              flexShrink: 0,
            }}>
              
              <div style={{ position: "relative", width: "320px" }}>
                <Search style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "16px",
                  height: "16px",
                  color: "#9ca3af",
                }} />
                <input
                  type="text"
                  placeholder={isDealer ? "Search products by name, SKU, brand..." : "Search SKUs, dealers, orders..."}
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  onKeyDown={handleHeaderSearch}
                  style={{
                    width: "100%",
                    padding: "8px 16px 8px 40px",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#374151",
                    outline: "none",
                  }}
                />
              </div>

              
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  padding: "2px",
                }}>
                  <button
                    onClick={() => switchView("admin")}
                    style={{
                      padding: "6px 16px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      background: !isDealer ? "#1a1a1a" : "transparent",
                      color: !isDealer ? "#ffffff" : "#6b7280",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Admin View
                  </button>
                  <button
                    onClick={() => switchView("dealer")}
                    style={{
                      padding: "6px 16px",
                      fontSize: "12px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      background: isDealer ? "#1a1a1a" : "transparent",
                      color: isDealer ? "#ffffff" : "#6b7280",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Dealer View
                  </button>
                </div>
                
                {isDealer && (
                  <Link href={buildHref("/cart")} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#f3f4f6",
                    borderRadius: "9999px",
                    padding: "4px 16px 4px 4px",
                    textDecoration: "none",
                  }}>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      background: "#1a1a1a",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <ShoppingCart style={{ width: "14px", height: "14px", color: "#fff" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "#1f2937", margin: 0, lineHeight: 1.2 }}>
                        ₹{cartTotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p style={{ fontSize: "10px", color: "#6b7280", margin: 0, lineHeight: 1.2 }}>
                        {cartCount} items
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            </header>

            
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
            }}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid #e5e7eb", borderTopColor: "#1f2937", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}