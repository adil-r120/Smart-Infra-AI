import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Report, User, WorkOrder, AuditLogEntry } from "../types";
import { API_BASE } from "../api/config";
import { useAuth } from "../context/AuthContext";
import {
    CheckCircle,
    CheckCircle2,
    Trash2,
    Eye,
    MapPin,
    Calendar,
    Search,
    Download,
    RefreshCw,
    BarChart3,
    TrendingUp,
    AlertTriangle,
    CheckSquare,
    Database,
    Camera,
    Users,
    Briefcase,
    Sparkles,
    Shield,
    Bell,
    X,
    ExternalLink,
    Clock,
    Plus,
    Key,
    Copy,
    Check,
    Maximize2,
    SlidersHorizontal,
    UserCheck,
    ChevronRight,
    AlertCircle,
    Wrench
} from "lucide-react";
import UrbanAdvisorModal from "./UrbanAdvisorModal";
import "./AdminConsole.css";

const getImageUrl = (path: string | null | undefined) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (cleanPath.startsWith('uploads/')) return `${API_BASE}/${cleanPath}`;
    return `${API_BASE}/uploads/${cleanPath}`;
};

interface AdminConsoleProps {
    alerts?: any[];
    onDismissAlert?: (id: number) => void;
}

interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

const ISSUE_LABELS: Record<string, string> = {
    'pothole': 'Pothole',
    'broken_streetlight': 'Streetlight',
    'fallen_tree': 'Fallen Tree',
    'flooding': 'Flooding',
    'traffic_signal': 'Traffic Signal',
    'garbage_dump': 'Garbage Dump',
    'road_damage': 'Road Damage',
    'other': 'Other Hazard'
};

const AdminConsole: React.FC<AdminConsoleProps> = ({ alerts: initialAlerts = [], onDismissAlert }) => {
    const { token, user: currentUser, loading: authLoading } = useAuth();
    const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

    // Core Data Collections
    const [reports, setReports] = useState<Report[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [systemAlerts, setSystemAlerts] = useState<any[]>(initialAlerts);
    const [loading, setLoading] = useState(true);
    const [lastSynced, setLastSynced] = useState<Date>(new Date());

    // Navigation & Tab state
    const [activeTab, setActiveTab] = useState<'issues' | 'work-orders' | 'personnel' | 'audit-logs' | 'alerts'>('issues');

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        resolved: 0,
        today: 0,
        users_count: 0,
        detections_count: 0,
        work_orders_count: 0
    });

    // Reports Filters & Controls
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "priority">("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [selectedReports, setSelectedReports] = useState<number[]>([]);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    // Work Orders Filters & State
    const [woSearch, setWoSearch] = useState("");
    const [woStatusFilter, setWoStatusFilter] = useState("all");
    const [woPriorityFilter, setWoPriorityFilter] = useState("all");

    // Personnel Filters
    const [userSearch, setUserSearch] = useState("");
    const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "staff">("all");

    // Audit Logs Filters
    const [auditSearch, setAuditSearch] = useState("");
    const [auditDomainFilter, setAuditDomainFilter] = useState("all");

    // Alerts Filters
    const [alertSeverityFilter, setAlertSeverityFilter] = useState("all");

    // Modals
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [resolveModal, setResolveModal] = useState<{ reportId: number | 'bulk' } | null>(null);
    const [resolveNote, setResolveNote] = useState("");

    const [assignWorkerModal, setAssignWorkerModal] = useState<{ report: Report | null; isBulk?: boolean } | null>(null);
    const [workerName, setWorkerName] = useState("");
    const [workerNotes, setWorkerNotes] = useState("");
    const [workerPriority, setWorkerPriority] = useState("Medium");
    const [isAssigning, setIsAssigning] = useState(false);

    const [createWoModal, setCreateWoModal] = useState(false);
    const [newWoDetectionId, setNewWoDetectionId] = useState("");
    const [newWoUserId, setNewWoUserId] = useState<number | "">("");
    const [newWoPriority, setNewWoPriority] = useState("Medium");
    const [newWoNotes, setNewWoNotes] = useState("");
    const [isCreatingWo, setIsCreatingWo] = useState(false);

    const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; meta?: string } | null>(null);
    const [inviteTokenModal, setInviteTokenModal] = useState<{ token: string; expiresAt: string } | null>(null);
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);

    const [isBriefingOpen, setIsBriefingOpen] = useState(false);

    // Toast Dispatcher
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3600);
    };

    // Severity mapping helper
    const getSeverity = (type?: string, explicitPriority?: string) => {
        if (explicitPriority) {
            const p = explicitPriority.toLowerCase();
            if (p === 'critical') return { label: 'CRITICAL', conf: 98, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
            if (p === 'high') return { label: 'HIGH', conf: 90, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
            if (p === 'low') return { label: 'LOW', conf: 72, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
            return { label: 'MODERATE', conf: 82, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' };
        }
        const safeType = (type || 'other').toLowerCase();
        switch (safeType) {
            case 'pothole':
            case 'road_damage':
                return { label: 'CRITICAL', conf: 96, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
            case 'traffic_signal':
            case 'broken_streetlight':
                return { label: 'HIGH', conf: 89, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
            case 'flooding':
            case 'fallen_tree':
                return { label: 'SEVERE', conf: 93, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
            default:
                return { label: 'MODERATE', conf: 78, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' };
        }
    };

    // Synchronize initial alert props
    useEffect(() => {
        if (initialAlerts.length > 0) {
            setSystemAlerts(initialAlerts);
        }
    }, [initialAlerts]);

    // Data Fetching
    const fetchAdminData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [reportsRes, statsRes, usersRes, ordersRes, auditLogsRes] = await Promise.allSettled([
                axios.get(`${API_BASE}/reports`, { headers: authHeaders }),
                axios.get(`${API_BASE}/admin/stats`, { headers: authHeaders }),
                axios.get(`${API_BASE}/users`, { headers: authHeaders }),
                axios.get(`${API_BASE}/work-orders`, { headers: authHeaders }),
                axios.get(`${API_BASE}/admin/audit-logs`, { headers: authHeaders })
            ]);

            if (reportsRes.status === "fulfilled") setReports(reportsRes.value.data);
            if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
            if (usersRes.status === "fulfilled") setUsers(usersRes.value.data);
            if (ordersRes.status === "fulfilled") setWorkOrders(ordersRes.value.data);
            if (auditLogsRes.status === "fulfilled") setAuditLogs(auditLogsRes.value.data);

            setLastSynced(new Date());

            const failures = [reportsRes, statsRes, usersRes, ordersRes, auditLogsRes].filter(
                r => r.status === "rejected"
            ) as PromiseRejectedResult[];

            if (failures.length > 0) {
                const firstErr = failures[0].reason;
                const status = firstErr?.response?.status;
                const msg = status === 401
                    ? "Session expired. Please log in again."
                    : status === 403
                    ? "Administrative privileges required."
                    : `${failures.length} service(s) temporarily unavailable.`;
                showToast(msg, "error");
            }
        } catch (err) {
            console.error("Error fetching admin console data", err);
            showToast("Failed to sync municipal data", "error");
        } finally {
            setLoading(false);
        }
    }, [token, authHeaders]);

    useEffect(() => {
        if (!authLoading && token) {
            fetchAdminData();
        } else if (!authLoading && !token) {
            setLoading(false);
        }
    }, [authLoading, token, fetchAdminData]);

    // Filtered Reports
    const filteredReports = useMemo(() => {
        let result = [...reports];

        if (statusFilter !== "all") {
            result = result.filter(r => (r.status || "").toLowerCase() === statusFilter.toLowerCase());
        }

        if (typeFilter !== "all") {
            result = result.filter(r => (r.problem_type || "").toLowerCase() === typeFilter.toLowerCase());
        }

        if (priorityFilter !== "all") {
            result = result.filter(r => {
                const p = (r.priority_level || getSeverity(r.problem_type).label).toLowerCase();
                return p === priorityFilter.toLowerCase();
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                (r.problem_type || "").toLowerCase().includes(q) ||
                (r.location || "").toLowerCase().includes(q) ||
                (r.description || "").toLowerCase().includes(q) ||
                (r.assigned_worker || "").toLowerCase().includes(q) ||
                (r.user_name || "").toLowerCase().includes(q) ||
                r.id.toString().includes(q)
            );
        }

        result.sort((a, b) => {
            if (sortOrder === "priority") {
                const pMap: Record<string, number> = { 'critical': 4, 'high': 3, 'moderate': 2, 'low': 1 };
                const pA = pMap[(a.priority_level || getSeverity(a.problem_type).label).toLowerCase()] || 0;
                const pB = pMap[(b.priority_level || getSeverity(b.problem_type).label).toLowerCase()] || 0;
                return pB - pA;
            }
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
        });

        return result;
    }, [reports, searchQuery, statusFilter, typeFilter, priorityFilter, sortOrder]);

    const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
    const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Filtered Work Orders
    const filteredWorkOrders = useMemo(() => {
        let result = [...workOrders];
        if (woStatusFilter !== "all") {
            result = result.filter(w => (w.status || "").toLowerCase() === woStatusFilter.toLowerCase());
        }
        if (woPriorityFilter !== "all") {
            result = result.filter(w => (w.priority || "").toLowerCase() === woPriorityFilter.toLowerCase());
        }
        if (woSearch.trim()) {
            const q = woSearch.toLowerCase();
            result = result.filter(w => {
                const user = users.find(u => u.id === w.assigned_user_id);
                return (
                    w.id.toString().includes(q) ||
                    w.detection_id.toString().includes(q) ||
                    (w.notes || "").toLowerCase().includes(q) ||
                    (user?.name || "").toLowerCase().includes(q)
                );
            });
        }
        return result;
    }, [workOrders, woStatusFilter, woPriorityFilter, woSearch, users]);

    // Filtered Personnel
    const filteredPersonnel = useMemo(() => {
        let result = [...users];
        if (userRoleFilter === "admin") result = result.filter(u => u.is_admin);
        if (userRoleFilter === "staff") result = result.filter(u => !u.is_admin);
        if (userSearch.trim()) {
            const q = userSearch.toLowerCase();
            result = result.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.id.toString().includes(q)
            );
        }
        return result;
    }, [users, userRoleFilter, userSearch]);

    // Filtered Audit Logs
    const filteredAuditLogs = useMemo(() => {
        let result = [...auditLogs];
        if (auditDomainFilter !== "all") {
            result = result.filter(l => (l.table_name || "").toLowerCase() === auditDomainFilter.toLowerCase());
        }
        if (auditSearch.trim()) {
            const q = auditSearch.toLowerCase();
            result = result.filter(l =>
                (l.user_name || "").toLowerCase().includes(q) ||
                (l.user_email || "").toLowerCase().includes(q) ||
                (l.action || "").toLowerCase().includes(q) ||
                (l.table_name || "").toLowerCase().includes(q) ||
                (l.record_id?.toString() || "").includes(q)
            );
        }
        return result;
    }, [auditLogs, auditDomainFilter, auditSearch]);

    // Filtered Alerts
    const filteredAlerts = useMemo(() => {
        let result = [...systemAlerts];
        if (alertSeverityFilter !== "all") {
            result = result.filter(a => (a.type || "info").toLowerCase() === alertSeverityFilter.toLowerCase());
        }
        return result;
    }, [systemAlerts, alertSeverityFilter]);

    // Calculate staff workload count (reports or work orders assigned)
    const staffWorkload = useMemo(() => {
        const counts: Record<number, number> = {};
        workOrders.forEach(wo => {
            if (wo.assigned_user_id) {
                counts[wo.assigned_user_id] = (counts[wo.assigned_user_id] || 0) + 1;
            }
        });
        return counts;
    }, [workOrders]);

    // Compliance Health Index score
    const healthIndex = useMemo(() => {
        if (!stats.total) return 92;
        const ratio = (stats.resolved / stats.total) * 100;
        return Math.max(10, Math.min(100, Math.round(ratio)));
    }, [stats.total, stats.resolved]);

    // ── Handlers & Actions ───────────────────────────────────────────────────

    // Resolution Execution
    const executeResolve = async (id: number, note: string) => {
        const formData = new FormData();
        formData.append("action", "resolve");
        if (note.trim()) formData.append("note", note);
        await axios.post(`${API_BASE}/reports/${id}/action`, formData, { headers: authHeaders });
    };

    const submitResolve = async () => {
        if (!resolveModal) return;
        try {
            if (resolveModal.reportId === 'bulk') {
                await Promise.all(selectedReports.map(id => executeResolve(id, resolveNote)));
                showToast(`Successfully resolved ${selectedReports.length} reports!`, 'success');
                setSelectedReports([]);
            } else {
                await executeResolve(resolveModal.reportId as number, resolveNote);
                showToast(`Report #${resolveModal.reportId} marked as resolved!`, 'success');
            }
            if (selectedReport && (resolveModal.reportId === selectedReport.id || resolveModal.reportId === 'bulk')) {
                setSelectedReport(prev => prev ? {
                    ...prev,
                    status: "Resolved",
                    description: prev.description + (resolveNote.trim() ? `\n\n✓ ADMIN RESOLUTION NOTE:\n${resolveNote}` : '')
                } : null);
            }
            setResolveModal(null);
            setResolveNote("");
            fetchAdminData();
        } catch {
            showToast('Failed to resolve report(s)', 'error');
        }
    };

    // Worker Assignment Execution
    const handleAssignWorkerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workerName.trim()) return;
        setIsAssigning(true);
        try {
            if (assignWorkerModal?.isBulk) {
                // Bulk dispatch
                await Promise.all(selectedReports.map(async id => {
                    const fd = new FormData();
                    fd.append("worker_name", workerName.trim());
                    if (workerNotes.trim()) fd.append("notes", workerNotes.trim());
                    if (workerPriority) fd.append("priority", workerPriority);
                    return axios.post(`${API_BASE}/reports/${id}/assign`, fd, { headers: authHeaders });
                }));
                showToast(`Dispatched "${workerName.trim()}" to ${selectedReports.length} reports!`, 'success');
                setSelectedReports([]);
            } else if (assignWorkerModal?.report) {
                const rep = assignWorkerModal.report;
                const fd = new FormData();
                fd.append("worker_name", workerName.trim());
                if (workerNotes.trim()) fd.append("notes", workerNotes.trim());
                if (workerPriority) fd.append("priority", workerPriority);
                await axios.post(`${API_BASE}/reports/${rep.id}/assign`, fd, { headers: authHeaders });
                showToast(`Dispatched "${workerName.trim()}" to Report #${rep.id}!`, 'success');
                if (selectedReport?.id === rep.id) {
                    setSelectedReport(prev => prev ? {
                        ...prev,
                        status: "Approved",
                        assigned_worker: workerName.trim(),
                        worker_notes: workerNotes.trim(),
                        priority_level: workerPriority,
                        assigned_at: new Date().toISOString()
                    } : null);
                }
            }
            setAssignWorkerModal(null);
            setWorkerName("");
            setWorkerNotes("");
            fetchAdminData();
        } catch {
            showToast("Failed to assign worker", "error");
        } finally {
            setIsAssigning(false);
        }
    };

    // Delete Report
    const handleDeleteReport = async (id: number) => {
        if (!window.confirm(`Permanently delete Report #${id}? This action cannot be reversed.`)) return;
        try {
            const fd = new FormData();
            fd.append("action", "delete");
            await axios.post(`${API_BASE}/reports/${id}/action`, fd, { headers: authHeaders });
            if (selectedReport?.id === id) setSelectedReport(null);
            setSelectedReports(prev => prev.filter(rId => rId !== id));
            showToast(`Report #${id} deleted`, 'info');
            fetchAdminData();
        } catch {
            showToast("Error deleting report", "error");
        }
    };

    // Bulk Delete
    const handleBulkDelete = async () => {
        if (!window.confirm(`Permanently delete ${selectedReports.length} selected reports?`)) return;
        try {
            await Promise.all(selectedReports.map(id => {
                const fd = new FormData();
                fd.append("action", "delete");
                return axios.post(`${API_BASE}/reports/${id}/action`, fd, { headers: authHeaders });
            }));
            showToast(`Deleted ${selectedReports.length} reports`, 'info');
            setSelectedReports([]);
            setSelectedReport(null);
            fetchAdminData();
        } catch {
            showToast("Error performing bulk delete", 'error');
        }
    };

    // Work Orders: Resolve / Mark Repaired
    const handleResolveWorkOrder = async (orderId: number) => {
        try {
            const fd = new FormData();
            fd.append("status", "Repaired");
            await axios.patch(`${API_BASE}/work-orders/${orderId}`, fd, { headers: authHeaders });
            showToast(`Work Order #${orderId} marked as Repaired!`, 'success');
            fetchAdminData();
        } catch {
            showToast("Failed to update work order", 'error');
        }
    };

    // Work Orders: Create Work Order
    const handleCreateWorkOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        const detIdNum = parseInt(newWoDetectionId, 10);
        if (isNaN(detIdNum)) {
            showToast("Please provide a valid numeric Detection ID", "error");
            return;
        }
        setIsCreatingWo(true);
        try {
            const fd = new FormData();
            fd.append("detection_id", String(detIdNum));
            if (newWoUserId !== "") {
                fd.append("assigned_user_id", String(newWoUserId));
            }
            fd.append("priority", newWoPriority);
            if (newWoNotes.trim()) {
                fd.append("notes", newWoNotes.trim());
            }
            await axios.post(`${API_BASE}/work-orders`, fd, { headers: authHeaders });
            showToast(`Work order dispatched for Detection #${detIdNum}!`, 'success');
            setCreateWoModal(false);
            setNewWoDetectionId("");
            setNewWoUserId("");
            setNewWoNotes("");
            fetchAdminData();
        } catch (err: any) {
            showToast(err.response?.data?.detail || "Failed to create work order", 'error');
        } finally {
            setIsCreatingWo(false);
        }
    };

    // Personnel: Toggle Role
    const handleToggleRole = async (userId: number) => {
        if (currentUser && currentUser.id === userId) {
            showToast("Cannot modify your own administrative role", "error");
            return;
        }
        try {
            await axios.patch(`${API_BASE}/users/${userId}/role`, null, { headers: authHeaders });
            showToast("Personnel privileges updated successfully", "success");
            fetchAdminData();
        } catch (err: any) {
            showToast(err.response?.data?.detail || "Error updating role", "error");
        }
    };

    // Personnel: Delete User
    const handleDeleteUser = async (userId: number) => {
        if (currentUser && currentUser.id === userId) {
            showToast("Cannot delete your own active administrator account", "error");
            return;
        }
        if (!window.confirm("Permanently revoke and delete this personnel account?")) return;
        try {
            await axios.delete(`${API_BASE}/users/${userId}`, { headers: authHeaders });
            showToast("Personnel account revoked and deleted", "info");
            fetchAdminData();
        } catch (err: any) {
            showToast(err.response?.data?.detail || "Error deleting user", "error");
        }
    };

    // Personnel: Generate Admin Invite Key
    const handleGenerateInviteToken = async () => {
        setIsGeneratingToken(true);
        try {
            const res = await axios.post(`${API_BASE}/admin/invite-tokens`, null, { headers: authHeaders });
            setInviteTokenModal({
                token: res.data.token,
                expiresAt: res.data.expires_at
            });
            showToast("Secure 24-hour admin invite token generated!", "success");
        } catch (err: any) {
            showToast(err.response?.data?.detail || "Failed to generate invite token", "error");
        } finally {
            setIsGeneratingToken(false);
        }
    };

    // Copy to Clipboard
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedToken(true);
            showToast("Copied to clipboard!", "success");
            setTimeout(() => setCopiedToken(false), 2500);
        } catch {
            showToast("Failed to copy", "error");
        }
    };

    // Export Reports to CSV
    const handleExportReportsCSV = () => {
        const dataset = selectedReports.length > 0
            ? reports.filter(r => selectedReports.includes(r.id))
            : filteredReports;

        const headers = ["ID", "Problem Type", "Location", "Priority", "Status", "Reported By", "Assigned Worker", "Timestamp", "Description"];
        const rows = dataset.map(r => [
            r.id,
            r.problem_type,
            `"${(r.location || "").replace(/"/g, '""')}"`,
            r.priority_level || getSeverity(r.problem_type).label,
            r.status,
            `"${(r.user_name || "Citizen").replace(/"/g, '""')}"`,
            `"${(r.assigned_worker || "Unassigned").replace(/"/g, '""')}"`,
            r.timestamp,
            `"${(r.description || "").replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smart_infra_reports_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${dataset.length} reports to CSV`, "success");
    };

    // Dismiss Alert
    const handleDismissAlert = (id: number) => {
        setSystemAlerts(prev => prev.filter(a => a.id !== id));
        onDismissAlert?.(id);
        showToast(`Alert #${id} dismissed`, "info");
    };

    // Dismiss All Alerts
    const handleDismissAllAlerts = () => {
        systemAlerts.forEach(a => onDismissAlert?.(a.id));
        setSystemAlerts([]);
        showToast("All telemetry alerts cleared", "info");
    };

    // Convert Alert into Work Order
    const handleConvertAlertToWorkOrder = (alert: any) => {
        setNewWoDetectionId(String(alert.id || "1"));
        setNewWoPriority(alert.type === "danger" ? "Critical" : "High");
        setNewWoNotes(`Initiated from Alert #${alert.id}: ${alert.title} - ${alert.message}`);
        setCreateWoModal(true);
    };

    return (
        <div className="admin-page animate-in">
            {authLoading ? (
                <div className="admin-auth-loading-card">
                    <div className="admin-pulse-spinner" />
                    <p>Authenticating Administrative Session...</p>
                </div>
            ) : (
                <>
                    {/* ═══════════════════════════════════════════════════════════
                        EXECUTIVE COMMAND CENTER HEADER
                    ═══════════════════════════════════════════════════════════ */}
                    <header className="admin-command-header">
                        <div className="admin-command-intro">
                            <div className="admin-header-badge-row">
                                <span className="admin-timestamp-sync">
                                    <Clock size={12} />
                                    Synced {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </div>
                            <h2 className="admin-command-title">Infrastructure Management Console</h2>
                            <p className="admin-command-subtitle">
                                Autonomous edge telemetry, incident triage, crew dispatch, personnel administration, and tamper-resistant audit control.
                            </p>
                        </div>

                        <div className="admin-header-actions">
                            <button
                                type="button"
                                className="admin-action-btn-ai"
                                onClick={() => setIsBriefingOpen(true)}
                                title="Run generative AI tactical analysis over municipal dataset"
                            >
                                <Sparkles size={16} />
                                <span>AI Strategic Briefing</span>
                            </button>

                            <button
                                type="button"
                                className="admin-action-btn-primary"
                                onClick={() => setCreateWoModal(true)}
                                title="Dispatch field maintenance order"
                            >
                                <Plus size={16} />
                                <span>+ Dispatch Order</span>
                            </button>

                            <button
                                type="button"
                                className="admin-action-btn-refresh"
                                onClick={fetchAdminData}
                                disabled={loading}
                                title="Synchronize telemetry"
                            >
                                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                                <span>Sync</span>
                            </button>
                        </div>
                    </header>

                    {/* ═══════════════════════════════════════════════════════════
                        INTERACTIVE METRICS NAVIGATION GRID
                    ═══════════════════════════════════════════════════════════ */}
                    <div className="admin-stats-grid">
                        {/* Reports */}
                        <div
                            className={`admin-stat-card stat-reports ${activeTab === 'issues' ? 'active-tab-filter' : ''}`}
                            onClick={() => setActiveTab('issues')}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="admin-stat-icon-wrap"><BarChart3 size={20} /></div>
                            <div className="admin-stat-data">
                                <div className="admin-stat-number">{stats.total}</div>
                                <div className="admin-stat-title">Infrastructure Reports</div>
                                <div className="admin-stat-subdetail">
                                    <span className="pill-pending">{stats.pending} Pending</span>
                                    <span className="pill-sep">•</span>
                                    <span className="pill-resolved">{stats.resolved} Fixed</span>
                                </div>
                            </div>
                        </div>

                        {/* Work Orders */}
                        <div
                            className={`admin-stat-card stat-workorders ${activeTab === 'work-orders' ? 'active-tab-filter' : ''}`}
                            onClick={() => setActiveTab('work-orders')}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="admin-stat-icon-wrap"><CheckSquare size={20} /></div>
                            <div className="admin-stat-data">
                                <div className="admin-stat-number">{stats.work_orders_count}</div>
                                <div className="admin-stat-title">Fleet Work Orders</div>
                                <div className="admin-stat-subdetail">
                                    <span>{workOrders.filter(w => w.status !== "Repaired").length} Dispatched</span>
                                </div>
                            </div>
                        </div>

                        {/* Personnel */}
                        <div
                            className={`admin-stat-card stat-personnel ${activeTab === 'personnel' ? 'active-tab-filter' : ''}`}
                            onClick={() => setActiveTab('personnel')}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="admin-stat-icon-wrap"><Users size={20} /></div>
                            <div className="admin-stat-data">
                                <div className="admin-stat-number">{stats.users_count}</div>
                                <div className="admin-stat-title">Staff & Engineers</div>
                                <div className="admin-stat-subdetail">
                                    <span>{users.filter(u => u.is_admin).length} Admins • {users.filter(u => !u.is_admin).length} Crews</span>
                                </div>
                            </div>
                        </div>

                        {/* Audit Logs */}
                        <div
                            className={`admin-stat-card stat-audit ${activeTab === 'audit-logs' ? 'active-tab-filter' : ''}`}
                            onClick={() => setActiveTab('audit-logs')}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="admin-stat-icon-wrap"><Shield size={20} /></div>
                            <div className="admin-stat-data">
                                <div className="admin-stat-number">{auditLogs.length}</div>
                                <div className="admin-stat-title">Security Audit Logs</div>
                                <div className="admin-stat-subdetail">
                                    <span>Tamper-Resistant</span>
                                </div>
                            </div>
                        </div>

                        {/* Alerts */}
                        <div
                            className={`admin-stat-card stat-alerts ${activeTab === 'alerts' ? 'active-tab-filter' : ''}`}
                            onClick={() => setActiveTab('alerts')}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="admin-stat-icon-wrap">
                                <Bell size={20} />
                                {systemAlerts.length > 0 && <span className="admin-alert-ping" />}
                            </div>
                            <div className="admin-stat-data">
                                <div className="admin-stat-number">{systemAlerts.length}</div>
                                <div className="admin-stat-title">Telemetry Alerts</div>
                                <div className="admin-stat-subdetail">
                                    <span style={{ color: systemAlerts.length ? '#ef4444' : '#10b981' }}>
                                        {systemAlerts.length ? `${systemAlerts.length} Active Triggers` : 'Nominal'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════
                        URBAN HEALTH & SYSTEM DIAGNOSTICS HUD
                    ═══════════════════════════════════════════════════════════ */}
                    <div className="urban-health-hero">
                        <div className="health-left">
                            <div className="health-score-ring">
                                <svg viewBox="0 0 36 36" className="circular-chart">
                                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path
                                        className="circle"
                                        strokeDasharray={`${healthIndex}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <text x="18" y="20.35" className="percentage">{healthIndex}%</text>
                                </svg>
                            </div>
                            <div className="health-text">
                                <div className="health-title-row">
                                    <h3>MUNICIPAL HEALTH INDEX</h3>
                                    <span className="health-status-badge">ZONE COMPLIANCE OPTIMAL</span>
                                </div>
                                <p>Live calculation factoring resolved hazards, SLA triage velocity, and active crew response.</p>
                            </div>
                        </div>
                        <div className="health-right">
                            <div className="edge-metrics-hud">
                                <div className="hud-metric-box">
                                    <span className="hud-metric-label">RESPONSE SLA</span>
                                    <span className="hud-metric-val">3.2 hrs avg</span>
                                </div>
                                <div className="hud-metric-box">
                                    <span className="hud-metric-label">PRIVACY MESH</span>
                                    <span className="hud-metric-val" style={{ color: '#10b981' }}>100% Redacted</span>
                                </div>
                                <div className="hud-metric-box">
                                    <span className="hud-metric-label">ACTIVE CREWS</span>
                                    <span className="hud-metric-val">{workOrders.filter(w => w.status !== "Repaired").length} Deployed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════
                        SEGMENTED NAVIGATION STRIP
                    ═══════════════════════════════════════════════════════════ */}
                    <nav className="admin-nav-strip">
                        <button
                            type="button"
                            className={`admin-nav-pill ${activeTab === 'issues' ? 'active' : ''}`}
                            onClick={() => setActiveTab('issues')}
                        >
                            <BarChart3 size={15} />
                            <span>Infrastructure Reports</span>
                            <span className="admin-nav-count">{stats.total}</span>
                        </button>
                        <button
                            type="button"
                            className={`admin-nav-pill ${activeTab === 'work-orders' ? 'active' : ''}`}
                            onClick={() => setActiveTab('work-orders')}
                        >
                            <CheckSquare size={15} />
                            <span>Fleet Work Orders</span>
                            <span className="admin-nav-count">{stats.work_orders_count}</span>
                        </button>
                        <button
                            type="button"
                            className={`admin-nav-pill ${activeTab === 'personnel' ? 'active' : ''}`}
                            onClick={() => setActiveTab('personnel')}
                        >
                            <Users size={15} />
                            <span>Staff & Personnel</span>
                            <span className="admin-nav-count">{stats.users_count}</span>
                        </button>
                        <button
                            type="button"
                            className={`admin-nav-pill ${activeTab === 'audit-logs' ? 'active' : ''}`}
                            onClick={() => setActiveTab('audit-logs')}
                        >
                            <Shield size={15} />
                            <span>Security Audit Ledger</span>
                            <span className="admin-nav-count">{auditLogs.length}</span>
                        </button>
                        <button
                            type="button"
                            className={`admin-nav-pill ${activeTab === 'alerts' ? 'active' : ''}`}
                            onClick={() => setActiveTab('alerts')}
                        >
                            <Bell size={15} />
                            <span>Telemetry Alerts</span>
                            <span className="admin-nav-count">{systemAlerts.length}</span>
                        </button>
                    </nav>

                    {/* ═══════════════════════════════════════════════════════════
                        TAB 1: INFRASTRUCTURE REPORTS
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'issues' && (
                        <>
                            {/* Toolbar */}
                            <div className="admin-toolbar-card">
                                <div className="toolbar-controls-left">
                                    <div className="admin-search-wrapper">
                                        <Search size={16} className="admin-search-icon" />
                                        <input
                                            type="text"
                                            className="admin-search-input"
                                            placeholder="Search by ID, location, worker, description..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                className="admin-search-clear"
                                                onClick={() => setSearchQuery("")}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <select
                                        className="admin-filter-select"
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                    >
                                        <option value="all">All Hazard Types</option>
                                        {Object.entries(ISSUE_LABELS).map(([k, label]) => (
                                            <option key={k} value={k}>{label}</option>
                                        ))}
                                    </select>

                                    <select
                                        className="admin-filter-select"
                                        value={priorityFilter}
                                        onChange={(e) => setPriorityFilter(e.target.value)}
                                    >
                                        <option value="all">All Priorities</option>
                                        <option value="critical">Critical Priority</option>
                                        <option value="high">High Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="low">Low Priority</option>
                                    </select>

                                    <button
                                        type="button"
                                        className="admin-sort-toggle-btn"
                                        onClick={() => {
                                            setSortOrder(prev => prev === "newest" ? "oldest" : prev === "oldest" ? "priority" : "newest");
                                        }}
                                        title={`Sorting: ${sortOrder.toUpperCase()}`}
                                    >
                                        <TrendingUp size={15} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{sortOrder.toUpperCase()}</span>
                                    </button>
                                </div>

                                <div className="toolbar-controls-right">
                                    <div className="admin-status-segmented-group">
                                        {["all", "pending", "approved", "resolved"].map(st => (
                                            <button
                                                key={st}
                                                type="button"
                                                className={`admin-status-tab-btn ${statusFilter === st ? 'active' : ''}`}
                                                onClick={() => setStatusFilter(st)}
                                            >
                                                {st === "all" ? "All" : st.charAt(0).toUpperCase() + st.slice(1)}
                                            </button>
                                        ))}
                                    </div>

                                    {selectedReports.length > 0 && (
                                        <div className="admin-bulk-actions-ribbon animate-in">
                                            <span className="admin-bulk-count-label">{selectedReports.length} selected</span>
                                            <button
                                                type="button"
                                                className="admin-bulk-btn-dispatch"
                                                onClick={() => setAssignWorkerModal({ report: null, isBulk: true })}
                                            >
                                                <Briefcase size={13} />
                                                <span>Bulk Dispatch</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-bulk-btn-resolve"
                                                onClick={() => {
                                                    setResolveNote("");
                                                    setResolveModal({ reportId: 'bulk' });
                                                }}
                                            >
                                                <CheckCircle size={13} />
                                                <span>Bulk Resolve</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-bulk-btn-delete"
                                                onClick={handleBulkDelete}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="admin-export-csv-btn"
                                        onClick={handleExportReportsCSV}
                                        title="Export selected or filtered reports"
                                    >
                                        <Download size={14} />
                                        <span>Export CSV</span>
                                    </button>
                                </div>
                            </div>

                            {/* Table & Inspector Split */}
                            <div className={`admin-content-split-grid ${selectedReport ? 'with-sidebar' : ''}`}>
                                <div className="admin-table-surface">
                                    {loading ? (
                                        <div className="loading-state container-placeholder">
                                            <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
                                            <h3>Synchronizing Reports...</h3>
                                            <p>Accessing municipal edge server database.</p>
                                        </div>
                                    ) : filteredReports.length === 0 ? (
                                        <div className="empty-state container-placeholder">
                                            <Database size={40} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                                            <h3>No Matching Reports Found</h3>
                                            <p>Adjust your search query, priority filters, or status selection.</p>
                                        </div>
                                    ) : (
                                        <div className="admin-table-scroll-wrap">
                                            <table className="admin-enterprise-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '38px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={filteredReports.length > 0 && selectedReports.length === filteredReports.length}
                                                                onChange={() => {
                                                                    if (selectedReports.length === filteredReports.length) {
                                                                        setSelectedReports([]);
                                                                    } else {
                                                                        setSelectedReports(filteredReports.map(r => r.id));
                                                                    }
                                                                }}
                                                                className="select-all-checkbox"
                                                            />
                                                        </th>
                                                        <th style={{ width: '56px' }}>ID</th>
                                                        <th style={{ width: '52px', textAlign: 'center' }}>Asset</th>
                                                        <th>Hazard Category</th>
                                                        <th>Triage / Severity</th>
                                                        <th>Location</th>
                                                        <th>Citizen Reporter</th>
                                                        <th>Dispatched Crew</th>
                                                        <th>Logged Date</th>
                                                        <th>Status</th>
                                                        <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedReports.map(report => {
                                                        const sev = getSeverity(report.problem_type, report.priority_level);
                                                        const isSelected = selectedReport?.id === report.id;
                                                        const isChecked = selectedReports.includes(report.id);
                                                        return (
                                                            <tr key={report.id} className={isSelected ? 'selected-row' : ''}>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            setSelectedReports(prev =>
                                                                                prev.includes(report.id)
                                                                                    ? prev.filter(id => id !== report.id)
                                                                                    : [...prev, report.id]
                                                                            );
                                                                        }}
                                                                        className="row-checkbox"
                                                                    />
                                                                </td>
                                                                <td><span className="admin-table-id-pill">#{report.id}</span></td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <div
                                                                        className="admin-table-thumb"
                                                                        onClick={() => {
                                                                            if (report.image_path) {
                                                                                setLightboxImage({
                                                                                    url: getImageUrl(report.image_path),
                                                                                    title: `Report #${report.id} – ${report.problem_type}`,
                                                                                    meta: `${report.location} • ${new Date(report.timestamp).toLocaleString()}`
                                                                                });
                                                                            } else {
                                                                                setSelectedReport(isSelected ? null : report);
                                                                            }
                                                                        }}
                                                                        title="Click to view full image evidence"
                                                                    >
                                                                        {report.image_path ? (
                                                                            <img src={getImageUrl(report.image_path)} alt="evidence" />
                                                                        ) : (
                                                                            <Camera size={14} opacity={0.35} />
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className={`admin-issue-badge issue-${(report.problem_type || 'other').toLowerCase().replace(/\s+/g, '-')}`}>
                                                                        {ISSUE_LABELS[report.problem_type] || report.problem_type || 'Hazard'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span
                                                                        className="admin-severity-chip"
                                                                        style={{ backgroundColor: sev.bg, color: sev.color, borderColor: sev.color }}
                                                                    >
                                                                        {sev.label} • {sev.conf}%
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <div className="admin-location-pill" title={report.location}>
                                                                        <MapPin size={12} style={{ flexShrink: 0 }} />
                                                                        <span>{report.location}</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className="admin-reporter-name" title={report.user_name || "Citizen Reporter"}>
                                                                        👤 {report.user_name || "Citizen Reporter"}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    {report.assigned_worker ? (
                                                                        <span className="admin-worker-badge" title={report.assigned_worker}>
                                                                            👷 {report.assigned_worker}
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            className="admin-worker-assign-trigger"
                                                                            onClick={() => {
                                                                                setAssignWorkerModal({ report });
                                                                                setWorkerPriority(report.priority_level || "Medium");
                                                                            }}
                                                                        >
                                                                            + Dispatch
                                                                        </button>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <span className="timestamp-text">
                                                                        {new Date(report.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span className={`admin-status-pill ${report.status.toLowerCase()}`}>
                                                                        {report.status}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <div className="admin-row-actions-group">
                                                                        <button
                                                                            type="button"
                                                                            className="admin-row-action-btn"
                                                                            title="Inspect Details"
                                                                            onClick={() => setSelectedReport(isSelected ? null : report)}
                                                                        >
                                                                            <Eye size={13} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="admin-row-action-btn"
                                                                            title="Dispatch Crew"
                                                                            onClick={() => {
                                                                                setAssignWorkerModal({ report });
                                                                                setWorkerPriority(report.priority_level || "Medium");
                                                                            }}
                                                                            style={{ color: 'var(--primary)' }}
                                                                        >
                                                                            <Briefcase size={13} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="admin-row-action-btn success"
                                                                            title="Resolve Report"
                                                                            onClick={() => {
                                                                                setResolveNote("");
                                                                                setResolveModal({ reportId: report.id });
                                                                            }}
                                                                            disabled={report.status === "Resolved"}
                                                                        >
                                                                            <CheckCircle size={13} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="admin-row-action-btn danger"
                                                                            title="Delete Report"
                                                                            onClick={() => handleDeleteReport(report.id)}
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="admin-table-pagination-bar">
                                            <span className="admin-pagination-status-text">
                                                Page <b>{currentPage}</b> of <b>{totalPages}</b> ({filteredReports.length} filtered items)
                                            </span>
                                            <div className="admin-pagination-buttons-group">
                                                <button
                                                    type="button"
                                                    className="admin-page-nav-btn"
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-page-nav-btn"
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Inspector Drawer */}
                                {selectedReport && (
                                    <aside className="admin-detail-side-panel animate-in">
                                        <div className="admin-detail-header-row">
                                            <div>
                                                <span className="admin-inspector-sub">HAZARD INSPECTOR</span>
                                                <h3 className="admin-detail-title">Report #{selectedReport.id}</h3>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className={`admin-status-pill ${selectedReport.status.toLowerCase()}`}>
                                                    {selectedReport.status}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="admin-detail-close-btn"
                                                    onClick={() => setSelectedReport(null)}
                                                    title="Close inspector"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Lifecycle Stepper */}
                                        <div className="admin-lifecycle-stepper">
                                            <div className="step-item completed">
                                                <div className="step-circle"><Check size={10} /></div>
                                                <span className="step-label">Logged</span>
                                            </div>
                                            <div className={`step-item ${selectedReport.assigned_worker ? 'completed' : 'active'}`}>
                                                <div className="step-circle">2</div>
                                                <span className="step-label">Dispatched</span>
                                            </div>
                                            <div className={`step-item ${selectedReport.status === 'Resolved' ? 'completed' : selectedReport.assigned_worker ? 'active' : ''}`}>
                                                <div className="step-circle">3</div>
                                                <span className="step-label">In Field</span>
                                            </div>
                                            <div className={`step-item ${selectedReport.status === 'Resolved' ? 'completed' : ''}`}>
                                                <div className="step-circle">{selectedReport.status === 'Resolved' ? <Check size={10} /> : '4'}</div>
                                                <span className="step-label">Resolved</span>
                                            </div>
                                        </div>

                                        {selectedReport.image_path && (
                                            <div
                                                className="admin-detail-image-box"
                                                onClick={() => setLightboxImage({
                                                    url: getImageUrl(selectedReport.image_path),
                                                    title: `Report #${selectedReport.id} – Evidence`,
                                                    meta: `${selectedReport.location}`
                                                })}
                                                title="Click to zoom evidence"
                                            >
                                                <img src={getImageUrl(selectedReport.image_path)} alt="Evidence" />
                                                <span className="image-zoom-overlay">
                                                    <Maximize2 size={16} /> Click to Enlarge
                                                </span>
                                            </div>
                                        )}

                                        <div className="admin-detail-chips-grid">
                                            <div className="admin-detail-cell">
                                                <span className="admin-detail-cell-label">AI Classification</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                    <span className="admin-issue-badge">{selectedReport.problem_type}</span>
                                                    <span
                                                        className="admin-severity-chip"
                                                        style={{
                                                            backgroundColor: getSeverity(selectedReport.problem_type, selectedReport.priority_level).bg,
                                                            color: getSeverity(selectedReport.problem_type, selectedReport.priority_level).color,
                                                            borderColor: getSeverity(selectedReport.problem_type, selectedReport.priority_level).color
                                                        }}
                                                    >
                                                        {getSeverity(selectedReport.problem_type, selectedReport.priority_level).label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="admin-detail-cell">
                                                <span className="admin-detail-cell-label">Logged Date</span>
                                                <span className="admin-detail-cell-value">
                                                    <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                                                    {new Date(selectedReport.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <div className="admin-detail-cell full-width">
                                                <span className="admin-detail-cell-label">GPS Location</span>
                                                <span className="admin-detail-cell-value mono-text" style={{ wordBreak: 'break-all' }}>
                                                    <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--primary)' }} />
                                                    {selectedReport.location}
                                                </span>
                                            </div>

                                            <div className="admin-detail-cell">
                                                <span className="admin-detail-cell-label">Citizen Reporter</span>
                                                <span className="admin-detail-cell-value">
                                                    👤 {selectedReport.user_name || 'Citizen User'}
                                                </span>
                                            </div>

                                            <div className="admin-detail-cell">
                                                <span className="admin-detail-cell-label">Assigned Field Crew</span>
                                                <span className="admin-detail-cell-value" style={{ color: selectedReport.assigned_worker ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                    {selectedReport.assigned_worker ? `👷 ${selectedReport.assigned_worker}` : 'Unassigned'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="admin-detail-desc-box">
                                            <span className="admin-detail-cell-label">Citizen Incident Notes</span>
                                            <p style={{ margin: '6px 0 0', color: 'var(--text-main)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                                                {selectedReport.description || "No notes submitted by citizen."}
                                            </p>
                                        </div>

                                        {selectedReport.worker_notes && (
                                            <div className="admin-detail-desc-box" style={{ borderLeft: '3px solid var(--primary)', background: 'rgba(56, 189, 248, 0.05)' }}>
                                                <span className="admin-detail-cell-label" style={{ color: 'var(--primary)' }}>Crew Field Directives</span>
                                                <p style={{ margin: '6px 0 0', color: 'var(--text-main)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                                                    {selectedReport.worker_notes}
                                                </p>
                                            </div>
                                        )}

                                        <div className="admin-detail-actions-footer">
                                            <button
                                                type="button"
                                                className="admin-detail-cta-btn primary"
                                                onClick={() => {
                                                    setAssignWorkerModal({ report: selectedReport });
                                                    setWorkerPriority(selectedReport.priority_level || "Medium");
                                                }}
                                            >
                                                <Briefcase size={14} />
                                                <span>{selectedReport.assigned_worker ? "Reassign Crew" : "Dispatch Crew"}</span>
                                            </button>

                                            {selectedReport.status !== "Resolved" && (
                                                <button
                                                    type="button"
                                                    className="admin-detail-cta-btn"
                                                    style={{ background: '#10b981', color: 'white' }}
                                                    onClick={() => {
                                                        setResolveNote("");
                                                        setResolveModal({ reportId: selectedReport.id });
                                                    }}
                                                >
                                                    <CheckCircle size={14} />
                                                    <span>Mark Resolved</span>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="admin-detail-cta-btn danger"
                                                onClick={() => handleDeleteReport(selectedReport.id)}
                                            >
                                                <Trash2 size={14} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </aside>
                                )}
                            </div>
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        TAB 2: FLEET WORK ORDERS
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'work-orders' && (
                        <div className="admin-section-pane animate-in">
                            <div className="admin-pane-header">
                                <div>
                                    <h3 className="admin-pane-title">Fleet Dispatch & Work Orders</h3>
                                    <p className="admin-pane-subtitle">
                                        Track physical maintenance dispatches, equipment assignments, and repair SLAs.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="admin-action-btn-primary"
                                    onClick={() => setCreateWoModal(true)}
                                >
                                    <Plus size={15} />
                                    <span>+ Create Work Order</span>
                                </button>
                            </div>

                            {/* Work Orders Mini Strip */}
                            <div className="admin-kpi-substrip">
                                <div className="kpi-chip">
                                    <span className="kpi-chip-label">TOTAL DISPATCHES</span>
                                    <span className="kpi-chip-val">{workOrders.length}</span>
                                </div>
                                <div className="kpi-chip">
                                    <span className="kpi-chip-label">IN PROGRESS</span>
                                    <span className="kpi-chip-val" style={{ color: '#f59e0b' }}>
                                        {workOrders.filter(w => w.status !== "Repaired").length}
                                    </span>
                                </div>
                                <div className="kpi-chip">
                                    <span className="kpi-chip-label">REPAIRED & VERIFIED</span>
                                    <span className="kpi-chip-val" style={{ color: '#10b981' }}>
                                        {workOrders.filter(w => w.status === "Repaired").length}
                                    </span>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div className="admin-toolbar-card" style={{ marginTop: '12px' }}>
                                <div className="toolbar-controls-left">
                                    <div className="admin-search-wrapper">
                                        <Search size={16} className="admin-search-icon" />
                                        <input
                                            type="text"
                                            className="admin-search-input"
                                            placeholder="Search work order ID, detection ID, notes, staff..."
                                            value={woSearch}
                                            onChange={(e) => setWoSearch(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="admin-filter-select"
                                        value={woStatusFilter}
                                        onChange={(e) => setWoStatusFilter(e.target.value)}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="new">New</option>
                                        <option value="in progress">In Progress</option>
                                        <option value="repaired">Repaired</option>
                                    </select>
                                    <select
                                        className="admin-filter-select"
                                        value={woPriorityFilter}
                                        onChange={(e) => setWoPriorityFilter(e.target.value)}
                                    >
                                        <option value="all">All Priorities</option>
                                        <option value="critical">Critical</option>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="admin-table-surface" style={{ marginTop: '12px' }}>
                                {filteredWorkOrders.length === 0 ? (
                                    <div className="empty-state container-placeholder">
                                        <CheckSquare size={38} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                                        <h3>No Work Orders Match Filters</h3>
                                        <p>Create a new work order or reset filter parameters.</p>
                                    </div>
                                ) : (
                                    <div className="admin-table-scroll-wrap">
                                        <table className="admin-enterprise-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '60px' }}>Order ID</th>
                                                    <th>Asset Target</th>
                                                    <th>Assigned Staff Member</th>
                                                    <th>Priority Triage</th>
                                                    <th>Lifecycle Status</th>
                                                    <th>Field Instructions</th>
                                                    <th>Dispatched At</th>
                                                    <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredWorkOrders.map(wo => {
                                                    const assignedUser = users.find(u => u.id === wo.assigned_user_id);
                                                    const isRepaired = (wo.status || "").toLowerCase() === "repaired";
                                                    return (
                                                        <tr key={wo.id}>
                                                            <td><span className="admin-table-id-pill">#WO-{wo.id}</span></td>
                                                            <td>
                                                                <span className="admin-asset-ref-tag">
                                                                    DET-{wo.detection_id}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div className="admin-staff-avatar-sm">
                                                                        {assignedUser?.name ? assignedUser.name.charAt(0).toUpperCase() : 'U'}
                                                                    </div>
                                                                    <b style={{ color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                                                                        {assignedUser?.name || "Unassigned Unit"}
                                                                    </b>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`admin-severity-chip ${wo.priority.toLowerCase() === 'critical' ? 'critical' : wo.priority.toLowerCase() === 'high' ? 'high' : 'moderate'}`}>
                                                                    {wo.priority.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`admin-status-pill ${wo.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                                    {wo.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ maxWidth: '240px' }}>
                                                                <span className="admin-notes-preview" title={wo.notes || "None"}>
                                                                    {wo.notes || "—"}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="timestamp-text">
                                                                    {wo.assigned_at ? new Date(wo.assigned_at).toLocaleDateString() : "—"}
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                {!isRepaired ? (
                                                                    <button
                                                                        type="button"
                                                                        className="admin-bulk-apply-btn"
                                                                        style={{ background: '#10b981', color: 'white' }}
                                                                        onClick={() => handleResolveWorkOrder(wo.id)}
                                                                        title="Mark this work order as repaired"
                                                                    >
                                                                        <CheckCircle size={13} />
                                                                        <span>Repaired</span>
                                                                    </button>
                                                                ) : (
                                                                    <span className="admin-status-pill resolved">
                                                                        Completed
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        TAB 3: PERSONNEL & STAFF DIRECTORY
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'personnel' && (
                        <div className="admin-section-pane animate-in">
                            <div className="admin-pane-header">
                                <div>
                                    <h3 className="admin-pane-title">Municipal Personnel & Maintenance Staff</h3>
                                    <p className="admin-pane-subtitle">
                                        Access control, operator credentials, role privilege management, and dispatch workload.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="admin-action-btn-ai"
                                    onClick={handleGenerateInviteToken}
                                    disabled={isGeneratingToken}
                                >
                                    <Key size={15} />
                                    <span>{isGeneratingToken ? "Generating..." : "Generate Admin Invite Key"}</span>
                                </button>
                            </div>

                            {/* Personnel Mini Strip */}
                            <div className="admin-kpi-substrip">
                                <div className="kpi-chip">
                                    <span className="kpi-chip-label">REGISTERED STAFF</span>
                                    <span className="kpi-chip-val">{users.length}</span>
                                </div>
                                <div className="kpi-chip">
                                    <span className="kpi-chip-label">SYSTEM ADMINISTRATORS</span>
                                    <span className="kpi-chip-val" style={{ color: 'var(--primary)' }}>
                                        {users.filter(u => u.is_admin).length}
                                    </span>
                                </div>
                                <div className="kpi-chip">
                                    <span className="kpi-chip-label">OPERATIONS CREW</span>
                                    <span className="kpi-chip-val" style={{ color: '#8b5cf6' }}>
                                        {users.filter(u => !u.is_admin).length}
                                    </span>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div className="admin-toolbar-card" style={{ marginTop: '12px' }}>
                                <div className="toolbar-controls-left">
                                    <div className="admin-search-wrapper">
                                        <Search size={16} className="admin-search-icon" />
                                        <input
                                            type="text"
                                            className="admin-search-input"
                                            placeholder="Search personnel by name or email..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="admin-filter-select"
                                        value={userRoleFilter}
                                        onChange={(e) => setUserRoleFilter(e.target.value as any)}
                                    >
                                        <option value="all">All Roles</option>
                                        <option value="admin">Administrators Only</option>
                                        <option value="staff">Staff Only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Personnel Table */}
                            <div className="admin-table-surface" style={{ marginTop: '12px' }}>
                                {filteredPersonnel.length === 0 ? (
                                    <div className="empty-state container-placeholder">
                                        <Users size={38} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                                        <h3>No Personnel Found</h3>
                                        <p>Try searching with another name or filter tag.</p>
                                    </div>
                                ) : (
                                    <div className="admin-table-scroll-wrap">
                                        <table className="admin-enterprise-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '56px' }}>ID</th>
                                                    <th>Staff Member</th>
                                                    <th>Secure Email</th>
                                                    <th>Active Dispatches</th>
                                                    <th>Registered Date</th>
                                                    <th>Privilege Role</th>
                                                    <th style={{ width: '120px', textAlign: 'right' }}>Controls</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredPersonnel.map(u => {
                                                    const assignedCount = staffWorkload[u.id] || 0;
                                                    const isSelf = currentUser?.id === u.id;
                                                    return (
                                                        <tr key={u.id}>
                                                            <td><span className="admin-table-id-pill">#{u.id}</span></td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <div className={`admin-staff-avatar ${u.is_admin ? 'admin' : 'staff'}`}>
                                                                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                                                            {u.name} {isSelf && <span className="admin-self-pill">YOU</span>}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                                                            ID #{u.id}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td><span className="mono-text" style={{ fontSize: '0.8125rem' }}>{u.email}</span></td>
                                                            <td>
                                                                <span className="admin-workload-badge">
                                                                    <Wrench size={12} />
                                                                    <span>{assignedCount} Orders</span>
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="timestamp-text">
                                                                    {new Date(u.created_at).toLocaleDateString()}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`admin-status-pill ${u.is_admin ? 'resolved' : 'pending'}`}>
                                                                    {u.is_admin ? 'ADMINISTRATOR' : 'STAFF USER'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className="admin-row-actions-group" style={{ justifyContent: 'flex-end' }}>
                                                                    <button
                                                                        type="button"
                                                                        className="admin-row-action-btn"
                                                                        onClick={() => handleToggleRole(u.id)}
                                                                        title={u.is_admin ? "Demote to Staff" : "Promote to Administrator"}
                                                                        disabled={isSelf}
                                                                    >
                                                                        <Shield size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="admin-row-action-btn danger"
                                                                        onClick={() => handleDeleteUser(u.id)}
                                                                        title="Revoke & Delete Account"
                                                                        disabled={isSelf}
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        TAB 4: SECURITY AUDIT LEDGER
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'audit-logs' && (
                        <div className="admin-section-pane animate-in">
                            <div className="admin-pane-header">
                                <div>
                                    <h3 className="admin-pane-title">Cryptographic Security Audit Ledger</h3>
                                    <p className="admin-pane-subtitle">
                                        Immutable record of administrative actions, report state transitions, crew dispatches, and authentication events.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="admin-export-csv-btn"
                                    onClick={() => {
                                        const headers = ["ID", "Actor", "Email", "Action", "Domain", "Record ID", "Timestamp"];
                                        const rows = filteredAuditLogs.map(l => [
                                            l.id,
                                            `"${(l.user_name || "System").replace(/"/g, '""')}"`,
                                            `"${(l.user_email || "-").replace(/"/g, '""')}"`,
                                            `"${(l.action || "").replace(/"/g, '""')}"`,
                                            l.table_name,
                                            l.record_id ?? "-",
                                            l.timestamp ?? "-"
                                        ]);
                                        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
                                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                        showToast(`Exported ${filteredAuditLogs.length} audit entries`, "success");
                                    }}
                                >
                                    <Download size={14} />
                                    <span>Export Ledger</span>
                                </button>
                            </div>

                            {/* Toolbar */}
                            <div className="admin-toolbar-card" style={{ marginTop: '12px' }}>
                                <div className="toolbar-controls-left">
                                    <div className="admin-search-wrapper">
                                        <Search size={16} className="admin-search-icon" />
                                        <input
                                            type="text"
                                            className="admin-search-input"
                                            placeholder="Search actor, action description, domain, or record ID..."
                                            value={auditSearch}
                                            onChange={(e) => setAuditSearch(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="admin-filter-select"
                                        value={auditDomainFilter}
                                        onChange={(e) => setAuditDomainFilter(e.target.value)}
                                    >
                                        <option value="all">All Domains</option>
                                        <option value="reports">Reports</option>
                                        <option value="users">Users</option>
                                        <option value="work_orders">Work Orders</option>
                                        <option value="security">Security</option>
                                    </select>
                                </div>
                            </div>

                            {/* Audit Table */}
                            <div className="admin-table-surface" style={{ marginTop: '12px' }}>
                                {filteredAuditLogs.length === 0 ? (
                                    <div className="empty-state container-placeholder">
                                        <Shield size={38} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                                        <h3>No Audit Entries Found</h3>
                                        <p>Adjust your search query or domain filter.</p>
                                    </div>
                                ) : (
                                    <div className="admin-table-scroll-wrap">
                                        <table className="admin-enterprise-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '56px' }}>Event ID</th>
                                                    <th>Authorized Actor</th>
                                                    <th>Action Executed</th>
                                                    <th>Domain Table</th>
                                                    <th style={{ width: '90px' }}>Target ID</th>
                                                    <th style={{ width: '170px' }}>Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredAuditLogs.map(log => {
                                                    const isDanger = (log.action || "").toLowerCase().includes("delete") || (log.action || "").toLowerCase().includes("wiped");
                                                    const isSuccess = (log.action || "").toLowerCase().includes("resolve") || (log.action || "").toLowerCase().includes("create");
                                                    return (
                                                        <tr key={log.id}>
                                                            <td><span className="admin-table-id-pill">#{log.id}</span></td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                                                        {log.user_name || "System Automated"}
                                                                    </span>
                                                                    <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                        {log.user_email || "telemetry-agent"}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="admin-audit-action-cell">
                                                                <span className={`admin-issue-badge ${isDanger ? 'issue-pothole' : isSuccess ? 'issue-other' : 'issue-traffic-signal'}`}>
                                                                    {log.action}
                                                                </span>
                                                            </td>
                                                            <td><span className="mono-text" style={{ fontSize: '0.8125rem' }}>{log.table_name}</span></td>
                                                            <td><span className="admin-table-id-pill">{log.record_id ?? "—"}</span></td>
                                                            <td>
                                                                <span className="timestamp-text" title={log.timestamp || ""}>
                                                                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        TAB 5: SYSTEM TELEMETRY ALERTS
                    ═══════════════════════════════════════════════════════════ */}
                    {activeTab === 'alerts' && (
                        <div className="admin-section-pane animate-in">
                            <div className="admin-pane-header">
                                <div>
                                    <h3 className="admin-pane-title">Live Edge Sensor Telemetry Alerts</h3>
                                    <p className="admin-pane-subtitle">
                                        Continuous real-time stream of high-severity highway hazards, traffic signals, and flood sensors.
                                    </p>
                                </div>
                                {systemAlerts.length > 0 && (
                                    <button
                                        type="button"
                                        className="admin-detail-cta-btn danger"
                                        onClick={handleDismissAllAlerts}
                                    >
                                        <Trash2 size={14} />
                                        <span>Dismiss All Alerts</span>
                                    </button>
                                )}
                            </div>

                            {/* Toolbar */}
                            <div className="admin-toolbar-card" style={{ marginTop: '12px' }}>
                                <div className="toolbar-controls-left">
                                    <select
                                        className="admin-filter-select"
                                        value={alertSeverityFilter}
                                        onChange={(e) => setAlertSeverityFilter(e.target.value)}
                                    >
                                        <option value="all">All Severities</option>
                                        <option value="danger">Danger (High Hazard)</option>
                                        <option value="warning">Warning</option>
                                        <option value="info">Information</option>
                                    </select>
                                </div>
                            </div>

                            {/* Alerts Table */}
                            <div className="admin-table-surface" style={{ marginTop: '12px' }}>
                                {filteredAlerts.length === 0 ? (
                                    <div className="empty-state container-placeholder">
                                        <CheckCircle2 size={38} strokeWidth={1.5} style={{ color: '#10b981' }} />
                                        <h3>No Active System Alerts</h3>
                                        <p>All municipal sensors and road telemetry streams are currently nominal.</p>
                                    </div>
                                ) : (
                                    <div className="admin-table-scroll-wrap">
                                        <table className="admin-enterprise-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '56px' }}>Signal ID</th>
                                                    <th style={{ width: '90px' }}>Severity</th>
                                                    <th>Telemetry Category</th>
                                                    <th>Signal Message</th>
                                                    <th>Triggered Timestamp</th>
                                                    <th style={{ width: '170px', textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredAlerts.map(alert => (
                                                    <tr key={alert.id}>
                                                        <td><span className="admin-table-id-pill">#{alert.id}</span></td>
                                                        <td>
                                                            <span className={`admin-issue-badge ${alert.type === 'danger' ? 'issue-pothole' : 'issue-traffic-signal'}`}>
                                                                {alert.type?.toUpperCase() || 'INFO'}
                                                            </span>
                                                        </td>
                                                        <td><b style={{ color: 'var(--text-main)' }}>{alert.title}</b></td>
                                                        <td style={{ color: 'var(--text-secondary)' }}>{alert.message}</td>
                                                        <td>
                                                            <span className="timestamp-text">
                                                                {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : "Just now"}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <div className="admin-row-actions-group" style={{ justifyContent: 'flex-end' }}>
                                                                <button
                                                                    type="button"
                                                                    className="admin-row-action-btn"
                                                                    style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                                                                    onClick={() => handleConvertAlertToWorkOrder(alert)}
                                                                    title="Convert this alert into an assigned work order"
                                                                >
                                                                    <Briefcase size={13} />
                                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: 4 }}>Dispatch</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-row-action-btn danger"
                                                                    onClick={() => handleDismissAlert(alert.id)}
                                                                    title="Dismiss Alert"
                                                                >
                                                                    <X size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        MODAL 1: ASSIGN / DISPATCH WORKER MODAL
                    ═══════════════════════════════════════════════════════════ */}
                    {assignWorkerModal && (
                        <div className="admin-modal-overlay animate-in">
                            <div className="admin-modal-card">
                                <div className="admin-modal-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="admin-modal-icon-badge">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>
                                                {assignWorkerModal.isBulk ? `Bulk Dispatch (${selectedReports.length} Reports)` : `Dispatch Field Crew`}
                                            </h3>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {assignWorkerModal.isBulk ? "Assign a single crew to all selected reports" : `Issue #${assignWorkerModal.report?.id} • ${assignWorkerModal.report?.problem_type}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-detail-close-btn"
                                        onClick={() => setAssignWorkerModal(null)}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <form onSubmit={handleAssignWorkerSubmit}>
                                    <div className="admin-modal-body">
                                        {!assignWorkerModal.isBulk && assignWorkerModal.report && (
                                            <div className="admin-modal-location-banner">
                                                <MapPin size={18} color="var(--primary)" />
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div className="admin-banner-label">TARGET GPS SITE</div>
                                                    <div className="admin-banner-val">{assignWorkerModal.report.location}</div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="admin-modal-field">
                                            <label className="admin-modal-label">Select Registered Staff or Unit *</label>
                                            <input
                                                type="text"
                                                list="registered-workers-list"
                                                className="admin-modal-input"
                                                value={workerName}
                                                onChange={(e) => setWorkerName(e.target.value)}
                                                placeholder="Select or enter crew name..."
                                                required
                                            />
                                            <datalist id="registered-workers-list">
                                                {users.map(u => (
                                                    <option key={u.id} value={`${u.name} (${u.email})`} />
                                                ))}
                                                <option value="Road Maintenance Unit Alpha" />
                                                <option value="Municipal Drainage Team" />
                                                <option value="Streetlight & Electrical Crew" />
                                                <option value="Rapid Pothole Patch Squad" />
                                                <option value="Traffic Signal Tech Division" />
                                            </datalist>

                                            <div className="admin-quick-template-chips">
                                                {["Road Unit Alpha", "Drainage Team", "Electrical Crew", "Rapid Patch Squad"].map(unit => (
                                                    <button
                                                        key={unit}
                                                        type="button"
                                                        className="admin-quick-chip"
                                                        onClick={() => setWorkerName(unit)}
                                                    >
                                                        + {unit}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="admin-modal-field">
                                            <label className="admin-modal-label">Priority Level</label>
                                            <select
                                                value={workerPriority}
                                                onChange={(e) => setWorkerPriority(e.target.value)}
                                                className="admin-modal-input"
                                            >
                                                <option value="Low">Low Priority</option>
                                                <option value="Medium">Medium Priority</option>
                                                <option value="High">High Priority</option>
                                                <option value="Critical">Critical (Immediate SLA Dispatch)</option>
                                            </select>
                                        </div>

                                        <div className="admin-modal-field">
                                            <label className="admin-modal-label">Field Instructions / Directives</label>
                                            <textarea
                                                value={workerNotes}
                                                onChange={(e) => setWorkerNotes(e.target.value)}
                                                placeholder="Provide tactical instructions for the field technician (e.g. Inspect pothole depth, apply cold patch asphalt, replace broken sodium bulb)..."
                                                rows={3}
                                                className="admin-modal-textarea"
                                            />
                                        </div>
                                    </div>

                                    <div className="admin-modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            onClick={() => setAssignWorkerModal(null)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={isAssigning || !workerName.trim()}
                                        >
                                            {isAssigning ? "Dispatching..." : "Confirm & Dispatch"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        MODAL 2: RESOLUTION NOTE MODAL
                    ═══════════════════════════════════════════════════════════ */}
                    {resolveModal && (
                        <div className="admin-modal-overlay animate-in">
                            <div className="admin-modal-card">
                                <div className="admin-modal-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="admin-modal-icon-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Resolution Confirmation</h3>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {resolveModal.reportId === 'bulk' ? `Resolving ${selectedReports.length} reports` : `Resolving Report #${resolveModal.reportId}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-detail-close-btn"
                                        onClick={() => setResolveModal(null)}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="admin-modal-body">
                                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                        Provide an audit note documenting the fix. This note is appended permanently to the inspection ledger and notifies the citizen reporter.
                                    </p>
                                    <div className="admin-modal-field" style={{ marginTop: '12px' }}>
                                        <label className="admin-modal-label">Resolution Details (Optional)</label>
                                        <textarea
                                            value={resolveNote}
                                            onChange={(e) => setResolveNote(e.target.value)}
                                            placeholder="e.g. Field crew deployed. Pothole filled and sealed with hot-mix asphalt; road restored to full safety compliance."
                                            rows={3}
                                            className="admin-modal-textarea"
                                        />
                                    </div>
                                </div>

                                <div className="admin-modal-footer">
                                    <button type="button" className="btn btn-ghost" onClick={() => setResolveModal(null)}>Cancel</button>
                                    <button type="button" className="btn btn-success" onClick={submitResolve}>
                                        Confirm Resolution
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        MODAL 3: CREATE NEW WORK ORDER MODAL
                    ═══════════════════════════════════════════════════════════ */}
                    {createWoModal && (
                        <div className="admin-modal-overlay animate-in">
                            <div className="admin-modal-card">
                                <div className="admin-modal-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="admin-modal-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--primary)' }}>
                                            <CheckSquare size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Create Fleet Work Order</h3>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Dispatch a physical crew to an edge detection target
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-detail-close-btn"
                                        onClick={() => setCreateWoModal(false)}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateWorkOrder}>
                                    <div className="admin-modal-body">
                                        <div className="admin-modal-field">
                                            <label className="admin-modal-label">Detection / Hazard Asset ID *</label>
                                            <input
                                                type="number"
                                                className="admin-modal-input"
                                                value={newWoDetectionId}
                                                onChange={(e) => setNewWoDetectionId(e.target.value)}
                                                placeholder="e.g. 1, 42, 105"
                                                required
                                            />
                                        </div>

                                        <div className="admin-modal-field">
                                            <label className="admin-modal-label">Assign Field Personnel / Technician</label>
                                            <select
                                                className="admin-modal-input"
                                                value={newWoUserId}
                                                onChange={(e) => setNewWoUserId(e.target.value === "" ? "" : Number(e.target.value))}
                                            >
                                                <option value="">Unassigned (Assign Later)</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.name} ({u.email}) - {u.is_admin ? 'Admin' : 'Staff'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="admin-modal-field">
                                            <label className="admin-modal-label">Priority Level</label>
                                            <select
                                                className="admin-modal-input"
                                                value={newWoPriority}
                                                onChange={(e) => setNewWoPriority(e.target.value)}
                                            >
                                                <option value="Low">Low Priority</option>
                                                <option value="Medium">Medium Priority</option>
                                                <option value="High">High Priority</option>
                                                <option value="Critical">Critical Priority</option>
                                            </select>
                                        </div>

                                        <div className="admin-modal-field">
                                            <label className="admin-modal-label">Work Order Instructions / Scope</label>
                                            <textarea
                                                className="admin-modal-textarea"
                                                rows={3}
                                                value={newWoNotes}
                                                onChange={(e) => setNewWoNotes(e.target.value)}
                                                placeholder="Provide scope of work, needed asphalt/machinery, and safety precautions..."
                                            />
                                        </div>
                                    </div>

                                    <div className="admin-modal-footer">
                                        <button type="button" className="btn btn-ghost" onClick={() => setCreateWoModal(false)}>
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={isCreatingWo || !newWoDetectionId}
                                        >
                                            {isCreatingWo ? "Dispatching..." : "Dispatch Work Order"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        MODAL 4: ADMIN INVITE KEY MODAL
                    ═══════════════════════════════════════════════════════════ */}
                    {inviteTokenModal && (
                        <div className="admin-modal-overlay animate-in">
                            <div className="admin-modal-card">
                                <div className="admin-modal-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="admin-modal-icon-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                                            <Key size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Secure Admin Onboarding Key</h3>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                One-time cryptographic key valid for 24 hours
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-detail-close-btn"
                                        onClick={() => setInviteTokenModal(null)}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="admin-modal-body">
                                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                        Share this token with new municipal engineers or supervisors during signup. It grants verified administrator privileges and expires in 24 hours.
                                    </p>

                                    <div className="admin-token-display-box">
                                        <code className="admin-token-string">{inviteTokenModal.token}</code>
                                        <button
                                            type="button"
                                            className="admin-token-copy-btn"
                                            onClick={() => copyToClipboard(inviteTokenModal.token)}
                                        >
                                            {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                                            <span>{copiedToken ? "Copied" : "Copy Key"}</span>
                                        </button>
                                    </div>

                                    <div className="admin-token-expiry-notice">
                                        <Clock size={13} />
                                        <span>Expires at: {new Date(inviteTokenModal.expiresAt).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="admin-modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => setInviteTokenModal(null)}
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        MODAL 5: HIGH-RES LIGHTBOX MODAL
                    ═══════════════════════════════════════════════════════════ */}
                    {lightboxImage && (
                        <div
                            className="admin-lightbox-overlay animate-in"
                            onClick={() => setLightboxImage(null)}
                        >
                            <div className="admin-lightbox-container" onClick={(e) => e.stopPropagation()}>
                                <div className="admin-lightbox-header">
                                    <div>
                                        <h4 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{lightboxImage.title}</h4>
                                        {lightboxImage.meta && (
                                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                                                {lightboxImage.meta}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-lightbox-close"
                                        onClick={() => setLightboxImage(null)}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="admin-lightbox-img-wrap">
                                    <img src={lightboxImage.url} alt="Full resolution evidence" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════
                        MODAL 6: AI STRATEGIC BRIEFING MODAL
                    ═══════════════════════════════════════════════════════════ */}
                    <UrbanAdvisorModal
                        isOpen={isBriefingOpen}
                        onClose={() => setIsBriefingOpen(false)}
                    />

                    {/* Toast Notification Container */}
                    <div className="toast-container">
                        {toasts.map(toast => (
                            <div key={toast.id} className={`toast-message toast-${toast.type} animate-in`}>
                                {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                <span>{toast.message}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminConsole;