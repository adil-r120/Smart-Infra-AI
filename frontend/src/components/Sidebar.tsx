import React from "react";
import {
    Home, Calendar, Settings, Map as MapIcon, ShieldAlert,
    FileText, Camera, LogOut, Scan, LayoutDashboard, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    cameraActive?: boolean;
    handleCameraToggle?: () => void;
    isOpen?: boolean;
    toggleSidebar?: () => void;
    closeSidebar?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    setActiveTab,
    isOpen = true,
    toggleSidebar,
    closeSidebar
}) => {
    const { logout, user } = useAuth();

    const allMenuItems = [
        ...(user?.is_admin ? [
            { id: "Dashboard", label: "Dashboard", Icon: LayoutDashboard },
            { id: "Admin", label: "Admin Console", Icon: ShieldAlert },
            { id: "History", label: "Detection Log", Icon: Calendar },
            { id: "Map", label: "Map", Icon: MapIcon },
        ] : []),
        ...(!user?.is_admin ? [
            { id: "Home", label: "Home", Icon: Home },
            { id: "Webcam", label: "Live Feed", Icon: Camera },
            { id: "Scanner", label: "Upload Issues", Icon: Scan },
            { id: "Report", label: "Report & Track", Icon: FileText },
        ] : []),
        { id: "Configuration", label: "Settings", Icon: Settings },
    ];
    const menuItems = allMenuItems;

    const handleItemClick = (id: string) => {
        setActiveTab(id);
        if (typeof window !== "undefined" && window.innerWidth <= 900) {
            if (closeSidebar) closeSidebar();
            else if (toggleSidebar) toggleSidebar();
        }
    };

    return (
        <>
            {/* Backdrop Overlay - Only active on mobile viewports */}
            <div
                className={`sidebar-overlay ${isOpen ? "open" : ""}`}
                onClick={closeSidebar || toggleSidebar}
            />

            {/* Collapsible Sidebar (Expanded 240px <-> Compact Rail 68px) */}
            <aside className={`sidebar glass-sidebar ${isOpen ? "open" : "collapsed"}`}>
                {/* Header with Title & Collapse / Expand Toggle */}
                <div className="sidebar-section-header">
                    {isOpen && <span className="sidebar-section-title">Navigation</span>}
                    <button
                        type="button"
                        className="sidebar-collapse-btn"
                        onClick={toggleSidebar || closeSidebar}
                        title={isOpen ? "Collapse Sidebar" : "Toggle Sidebar"}
                        aria-label={isOpen ? "Collapse" : "Toggle Sidebar"}
                    >
                        {isOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                    </button>
                </div>

                {/* Navigation Items List */}
                <nav className="sidebar-nav">
                    <ul className="nav-list">
                        {menuItems.map(({ id, label, Icon }) => (
                            <li
                                key={id}
                                className={`nav-item-v2 ${activeTab === id ? "active" : ""}`}
                                onClick={() => handleItemClick(id)}
                                title={label}
                            >
                                <Icon size={19} />
                                <span className="nav-label">{label}</span>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Footer with Logout */}
                <div className="sidebar-footer-v2 has-button">
                    <button
                        className="nav-item-v2 logout-btn"
                        onClick={() => logout()}
                        title="Sign Out"
                        type="button"
                    >
                        <LogOut size={18} />
                        <span className="nav-label sidebar-logout-text">Sign Out</span>
                    </button>
                </div>
            </aside>

            <style>{`
                /* ── Base Glass Sidebar ── */
                .sidebar.glass-sidebar {
                    height: 100%;
                    background: var(--bg-card, #121212);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-right: 1px solid var(--border, rgba(255, 255, 255, 0.08));
                    display: flex;
                    flex-direction: column;
                    z-index: 100;
                    flex-shrink: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    box-sizing: border-box;
                    transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                                padding 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }

                /* ── Expanded State (Desktop) ── */
                .sidebar.glass-sidebar.open {
                    width: 240px !important;
                    padding: 18px 14px !important;
                }

                /* ── Collapsed State (Compact Icon Rail) ── */
                .sidebar.glass-sidebar.collapsed {
                    width: 68px !important;
                    padding: 18px 8px !important;
                }

                /* ── Header ── */
                .sidebar-section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 4px 14px 4px;
                    margin-bottom: 8px;
                    border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
                    height: 34px;
                    box-sizing: border-box;
                }

                .sidebar.glass-sidebar.collapsed .sidebar-section-header {
                    justify-content: center !important;
                    padding: 0 0 14px 0 !important;
                }

                .sidebar-section-title {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: var(--text-muted, #94a3b8);
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                .sidebar-collapse-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: var(--bg-surface, #1e1e1e);
                    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
                    color: var(--text-muted, #94a3b8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    flex-shrink: 0;
                }

                .sidebar-collapse-btn:hover {
                    color: #38bdf8;
                    border-color: rgba(56, 189, 248, 0.35);
                    background: rgba(56, 189, 248, 0.08);
                    box-shadow: 0 0 10px rgba(56, 189, 248, 0.15);
                }

                /* ── Nav Items List ── */
                .sidebar-nav {
                    flex: 1;
                    flex-shrink: 0;
                }

                .nav-list {
                    list-style: none;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin: 0;
                    padding: 0;
                }

                .nav-item-v2 {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 14px;
                    border-radius: 10px;
                    color: var(--text-muted, #94a3b8);
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid transparent;
                    border-left: 3px solid transparent;
                    user-select: none;
                    white-space: nowrap;
                }

                .sidebar.glass-sidebar.collapsed .nav-item-v2 {
                    justify-content: center !important;
                    padding: 11px 0 !important;
                    gap: 0 !important;
                    border-left: 3px solid transparent !important;
                }

                .nav-item-v2 svg {
                    flex-shrink: 0;
                    transition: transform 0.2s ease, color 0.2s ease;
                }

                .nav-item-v2:hover {
                    color: var(--primary, #38bdf8);
                    background: var(--bg-hover, rgba(56, 189, 248, 0.06));
                    border-color: rgba(56, 189, 248, 0.12);
                    transform: translateX(3px);
                }

                .sidebar.glass-sidebar.collapsed .nav-item-v2:hover {
                    transform: scale(1.06);
                }

                .nav-item-v2:hover svg {
                    transform: scale(1.08);
                    color: var(--primary, #38bdf8);
                }

                .nav-item-v2.active {
                    background: var(--primary-glow, rgba(56, 189, 248, 0.12));
                    color: var(--primary, #38bdf8);
                    border-color: rgba(56, 189, 248, 0.25);
                    border-left: 3px solid var(--primary, #38bdf8);
                    box-shadow: 0 4px 16px rgba(56, 189, 248, 0.1);
                    font-weight: 700;
                }

                .sidebar.glass-sidebar.collapsed .nav-item-v2.active {
                    border-left: 3px solid transparent !important;
                    box-shadow: 0 0 16px rgba(56, 189, 248, 0.25) !important;
                    background: rgba(56, 189, 248, 0.15) !important;
                }

                .nav-item-v2.active svg {
                    color: var(--primary, #38bdf8);
                    filter: drop-shadow(0 0 6px var(--primary-glow, rgba(56, 189, 248, 0.3)));
                }

                .sidebar.glass-sidebar.collapsed .nav-label {
                    display: none !important;
                }

                /* ── Footer ── */
                .sidebar-footer-v2 {
                    margin: auto -14px 0 -14px; 
                    padding: 14px 14px 4px 14px; 
                    border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
                    flex-shrink: 0;
                }

                .sidebar.glass-sidebar.collapsed .sidebar-footer-v2 {
                    margin: auto -8px 0 -8px !important;
                    padding: 14px 8px 4px 8px !important;
                }

                .logout-btn {
                    width: 100%;
                    height: auto;
                    background: none;
                    color: #ef4444;
                    border: 1px solid transparent;
                    border-left: 3px solid transparent;
                    font-size: 0.825rem;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .sidebar.glass-sidebar.collapsed .logout-btn {
                    justify-content: center !important;
                    padding: 11px 0 !important;
                    gap: 0 !important;
                    border-left: 3px solid transparent !important;
                }

                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.08);
                    color: #f87171;
                    border-color: rgba(239, 68, 68, 0.2);
                    border-left: 3px solid #ef4444;
                    transform: translateX(3px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
                }

                .sidebar.glass-sidebar.collapsed .logout-btn:hover {
                    transform: scale(1.06);
                }

                /* ── Mobile Overlay & Drawer (≤ 900px) ── */
                .sidebar-overlay {
                    display: none;
                }

                @media (max-width: 900px) {
                    .sidebar-overlay {
                        display: block;
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.65);
                        backdrop-filter: blur(4px);
                        -webkit-backdrop-filter: blur(4px);
                        z-index: 998;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .sidebar-overlay.open {
                        opacity: 1;
                        pointer-events: auto;
                    }

                    .sidebar.glass-sidebar {
                        position: fixed;
                        top: 68px;
                        bottom: 0;
                        left: 0;
                        height: calc(100vh - 68px);
                        width: 250px !important;
                        z-index: 999;
                        transform: translateX(-100%);
                        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
                        padding: 18px 14px !important;
                        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .sidebar.glass-sidebar.collapsed {
                        transform: translateX(-100%) !important;
                        width: 250px !important;
                    }

                    .sidebar.glass-sidebar.open {
                        transform: translateX(0) !important;
                        width: 250px !important;
                        opacity: 1 !important;
                        pointer-events: auto !important;
                    }

                    .sidebar.glass-sidebar.collapsed .nav-label {
                        display: inline !important;
                    }

                    .sidebar.glass-sidebar.collapsed .sidebar-section-title {
                        display: block !important;
                    }

                    .sidebar.glass-sidebar.collapsed .nav-item-v2 {
                        justify-content: flex-start !important;
                        padding: 10px 14px !important;
                        gap: 12px !important;
                    }
                }
            `}</style>
        </>
    );
};

export default Sidebar;
