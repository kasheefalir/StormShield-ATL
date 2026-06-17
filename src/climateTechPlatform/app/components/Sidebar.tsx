import { useState } from "react";
import {
  Map,
  Layers,
  Leaf,
  Database,
  Shield,
  ChevronRight,
  ArrowUpRight,
  Droplets,
} from "lucide-react";

const navItems = [
  { id: "flood-map", label: "Flood Map", icon: Map },
  { id: "flood-zones", label: "Flood Zones", icon: Layers, active: true },
  { id: "solutions", label: "Solutions", icon: Leaf },
  { id: "water-management", label: "Water Management", icon: Droplets },
  { id: "data-sources", label: "Data Sources", icon: Database },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onNavigateToMap?: () => void;
}

export function Sidebar({ activePage, onNavigate, onNavigateToMap }: SidebarProps) {
  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: "linear-gradient(180deg, #030c18 0%, #040e1f 100%)",
        borderRight: "1px solid rgba(0,212,216,0.08)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Subtle teal glow on left edge */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 1,
          background: "linear-gradient(180deg, transparent 0%, rgba(0,212,216,0.3) 40%, rgba(0,168,243,0.2) 60%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid rgba(0,212,216,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #00d4d8 0%, #00a8f3 100%)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(0,212,216,0.4)",
            }}
          >
            <Shield size={16} color="#040d1a" strokeWidth={2.5} />
          </div>
          <div>
            <div
              style={{
                color: "#00d4d8",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                lineHeight: 1.2,
                textShadow: "0 0 12px rgba(0,212,216,0.5)",
              }}
            >
              STORMSHIELD
            </div>
            <div
              style={{
                color: "#5b8ab0",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.15em",
                lineHeight: 1.2,
              }}
            >
              ATL
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 10,
            color: "#2d5c7a",
            letterSpacing: "0.06em",
            lineHeight: 1.4,
          }}
        >
          Infrastructure Intelligence
        </div>
      </div>

      {/* System status */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(0,212,216,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 6px #ef4444",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, letterSpacing: "0.08em" }}>
            SYSTEM ALERT
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#5b8ab0", marginTop: 2 }}>
          South Downtown · High Risk
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          const isMapLink = item.id === "flood-map" && !!onNavigateToMap;
          const handleClick = () => isMapLink ? onNavigateToMap!() : onNavigate(item.id);
          return (
            <button
              key={item.id}
              onClick={handleClick}
              title={isMapLink ? "Return to Atlanta flood map" : undefined}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 20px",
                background: isActive
                  ? "linear-gradient(90deg, rgba(0,212,216,0.12) 0%, rgba(0,212,216,0.04) 100%)"
                  : "transparent",
                borderLeft: isActive ? "2px solid #00d4d8" : "2px solid transparent",
                borderTop: "none",
                borderRight: "none",
                borderBottom: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = isMapLink
                    ? "rgba(0,168,243,0.08)"
                    : "rgba(0,212,216,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: "linear-gradient(180deg, #00d4d8, #00a8f3)",
                    boxShadow: "2px 0 8px rgba(0,212,216,0.4)",
                  }}
                />
              )}
              <Icon
                size={15}
                color={isActive ? "#00d4d8" : isMapLink ? "#00a8f3" : "#3a6080"}
                style={{ flexShrink: 0, transition: "color 0.15s" }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: isActive ? "#e2f0ff" : isMapLink ? "#3a7aaa" : "#4a7090",
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: "0.01em",
                  transition: "color 0.15s",
                  flex: 1,
                }}
              >
                {item.label}
              </span>
              {isActive && !isMapLink && (
                <ChevronRight size={12} color="#00d4d8" style={{ marginLeft: "auto", opacity: 0.6 }} />
              )}
              {isMapLink && (
                <ArrowUpRight size={11} color="#00a8f3" style={{ marginLeft: "auto", opacity: 0.55 }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(0,212,216,0.08)",
        }}
      >
        <div style={{ fontSize: 10, color: "#2d5c7a", lineHeight: 1.6 }}>
          <div style={{ color: "#3a6080", fontWeight: 500 }}>ATL Stormwater Dept</div>
          <div>Data as of Jun 15, 2026</div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00d4d8" }} />
            <span style={{ color: "#00d4d8" }}>Live feed active</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </aside>
  );
}
