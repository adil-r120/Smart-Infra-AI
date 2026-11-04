import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/Sidebar";
import StatsGrid from "../components/StatsGrid";
import AiScanner from "../components/AiScanner";
import MonitoringMap from "../components/MonitoringMap";
import AiConfig from "../components/AiConfig";
import DetectionLog from "../components/DetectionLog";
import AnalyticsSection from "../components/AnalyticsSection";
import AdminConsole from "../components/AdminConsole";
import ReportIssue from "./ReportIssue";
import IntelligenceHub from "../components/IntelligenceHub";
import MyReports from "../components/MyReports";
import EditorialHome from "../components/EditorialHome";
import UrbanAdvisorChat from "../components/UrbanAdvisorChat";
import { Detection, DetectionResult, DBEntry, Stats } from "../types";
import { AlertTriangle, X, Activity, Camera, Database, Sun, Moon, RefreshCw, ShieldAlert, Scan, Download, Eye, Crosshair, Radio, Zap, Maximize, Minimize, Trash2, WifiOff, Shield, Bell, Video, Play, Pause, Layers, Menu, Check, Upload, Settings, User as UserIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import { API_BASE } from "../api/config";
import "./Dashboard.css";

const CLASS_BOX_COLORS = new Map<string, string>([
    ["pothole", "#c72c07ff"],
    ["car", "#38bdf8"],
    ["truck", "#f59e0b"],
    ["bus", "#f97316"],
    ["motorcycle", "#06b6d4"],
    ["person", "#a78bfa"],
    ["bicycle", "#84cc16"],
    ["garbage", "#10b981"],
    ["leakage", "#0284c7"],
    ["crack", "#ec4899"],
    ["danger", "#dc2626"],
]);

const DANGER_CLASSES = new Set(["gun", "weapon", "knife", "Scissors", "pistol", "violence", "danger"]);
const PRIVACY_CLASSES = new Set(["person", "car", "motorcycle", "bus", "truck", "face"]);



const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [userAvatar, setUserAvatar] = useState<string | null>(() => {
        const key = `si_user_avatar_${user?.id || user?.email || "default"}`;
        return localStorage.getItem(key);
    });
    const [customName, setCustomName] = useState<string>(() => {
        const key = `si_user_custom_name_${user?.id || user?.email || "default"}`;
        return localStorage.getItem(key) || user?.name || "";
    });
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [editNameInput, setEditNameInput] = useState("");
    const [nameSavedFeedback, setNameSavedFeedback] = useState(false);
    const avatarFileInputRef = useRef<HTMLInputElement>(null);

    const PRESET_AVATARS = ["🤖", "🛡️", "⚡", "👷", "🎯", "🏙️", "🕵️", "🚀"];

    useEffect(() => {
        if (user) {
            const avatarKey = `si_user_avatar_${user.id || user.email || "default"}`;
            const savedAvatar = localStorage.getItem(avatarKey);
            setUserAvatar(savedAvatar || null);

            const nameKey = `si_user_custom_name_${user.id || user.email || "default"}`;
            const savedName = localStorage.getItem(nameKey);
            const initialName = savedName || user.name || user.email?.split("@")[0] || "User";
            setCustomName(initialName);
            setEditNameInput(initialName);
        }
    }, [user]);

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadFile = e.target.files?.[0];
        if (!uploadFile) return;
        if (!uploadFile.type.startsWith("image/")) {
            alert("Please choose a valid image file (PNG, JPG, WebP, etc.)");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const size = 160;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    const minSide = Math.min(img.width, img.height);
                    const sx = (img.width - minSide) / 2;
                    const sy = (img.height - minSide) / 2;
                    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                    const dataUrl = canvas.toDataURL("image/webp", 0.9);
                    setUserAvatar(dataUrl);
                    const key = `si_user_avatar_${user?.id || user?.email || "default"}`;
                    localStorage.setItem(key, dataUrl);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(uploadFile);
    };

    const handleSelectPresetAvatar = (icon: string) => {
        setUserAvatar(icon);
        const key = `si_user_avatar_${user?.id || user?.email || "default"}`;
        localStorage.setItem(key, icon);
    };

    const handleRemoveAvatar = () => {
        setUserAvatar(null);
        const key = `si_user_avatar_${user?.id || user?.email || "default"}`;
        localStorage.removeItem(key);
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
    };

    const handleSaveCustomName = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = editNameInput.trim();
        if (!trimmed) return;
        setCustomName(trimmed);
        const key = `si_user_custom_name_${user?.id || user?.email || "default"}`;
        localStorage.setItem(key, trimmed);
        setNameSavedFeedback(true);
        setTimeout(() => setNameSavedFeedback(false), 2000);
    };

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    // Separate states for Upload Issues (image scanner) and Live Feed (webcam / IP camera)
    const [scannerResult, setScannerResult] = useState<DetectionResult | null>(null);
    const [webcamResult, setWebcamResult] = useState<DetectionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem("si_active_tab");
        const validTabs = ["Home", "Dashboard", "Scanner", "Map", "History", "Admin", "Report", "MyReports", "Configuration", "Webcam"];
        if (saved && validTabs.includes(saved)) {
            // Non-admin cannot access admin-only tabs
            if (!user?.is_admin && (saved === "Dashboard" || saved === "Admin" || saved === "History" || saved === "Map")) {
                return "Home";
            }
            // Admin cannot access user-only tabs (Scanner, Webcam, Report, MyReports)
            if (user?.is_admin && (saved === "Home" || saved === "Scanner" || saved === "Webcam" || saved === "Report" || saved === "MyReports")) {
                return "Dashboard";
            }
            return saved;
        }
        return user?.is_admin ? "Dashboard" : "Home";
    });

    useEffect(() => {
        if (!user?.is_admin && (activeTab === "Dashboard" || activeTab === "Admin" || activeTab === "History" || activeTab === "Map")) {
            setActiveTab("Home");
        } else if (user?.is_admin && (activeTab === "Home" || activeTab === "Scanner" || activeTab === "Webcam" || activeTab === "Report" || activeTab === "MyReports")) {
            setActiveTab("Dashboard");
        } else {
            localStorage.setItem("si_active_tab", activeTab);
        }
    }, [activeTab, user]);

    const [stats, setStats] = useState<Stats | null>(null);
    const [mapData, setMapData] = useState<DBEntry[]>([]);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraSource, setCameraSource] = useState<string>(() => localStorage.getItem("si_camera_source") || "");
    const [theme, setTheme] = useState<"dark" | "light">(() => {
        const saved = localStorage.getItem("si_theme_mode");
        const v2 = localStorage.getItem("si_palette_charcoal_v2");
        if (!v2) {
            localStorage.setItem("si_palette_charcoal_v2", "true");
            localStorage.setItem("si_theme_mode", "dark");
            localStorage.setItem("si_theme", "dark");
            return "dark";
        }
        return saved === "light" ? "light" : "dark";
    });
    const [isDragging, setIsDragging] = useState(false);
    const [scannerStatus, setScannerStatus] = useState<string | null>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('si_sidebar_open');
            if (saved !== null) return saved === 'true';
            return window.innerWidth >= 1024;
        }
        return true;
    });

    const handleToggleSidebar = () => {
        setSidebarOpen(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('si_sidebar_open', String(next));
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 300);
            }
            return next;
        });
    };
    const [dashRefreshing, setDashRefreshing] = useState(false);
    const [webcamPlaying, setWebcamPlaying] = useState(false);
    const [visualMode, setVisualMode] = useState<"Normal" | "Thermal" | "Infrared" | "Neural">("Normal");
    const [detectionHistory, setDetectionHistory] = useState<Detection[]>([]);
    const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
    const [frameCount, setFrameCount] = useState(0);
    const [webcamTime, setWebcamTime] = useState("00:00");
    const [webcamError, setWebcamError] = useState<string | null>(null);
    const [ipCamActive, setIpCamActive] = useState(false);
    // ⚑ Ref mirrors ipCamActive so polling closures always read the live value
    const ipCamActiveRef = useRef(false);
    const [pollInterval, setPollInterval] = useState<1000 | 2000 | 5000>(2000);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem("si_privacy_mode") === "true");
    const [sessionStats, setSessionStats] = useState({ potholes: 0, vehicles: 0, people: 0 });
    const webcamTimerRef = useRef<any>(null);
    const webcamSecondsRef = useRef(0);
    const webcamContainerRef = useRef<HTMLDivElement>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const ipCamImgRef = useRef<HTMLImageElement>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const webcamCanvasRef = useRef<HTMLCanvasElement>(null);

    const getAuthConfig = () => {
        const token = localStorage.getItem("si_token");
        return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    };

    const fetchStats = async () => {
        try {
            const cfg = getAuthConfig();
            const res = await axios.get(`${API_BASE}/stats`, cfg);
            setStats(res.data);
        } catch (err) { console.error("Stats fetch failed", err); }
    };

    const fetchMapData = async () => {
        try {
            const cfg = getAuthConfig();
            const res = await axios.get(`${API_BASE}/map-data`, cfg);
            setMapData(res.data);
        } catch { console.error("Map data fetch failed"); }
    };

    const [showNotifications, setShowNotifications] = useState(false);

    const dismissedAlertsRef = useRef<Set<number>>(new Set());

    const fetchAlerts = async () => {
        try {
            const res = await axios.get(`${API_BASE}/alerts`, getAuthConfig());
            // Filter out locally-dismissed items (for camera alerts which have no server-side read tracking)
            // Citizen DB notifications are filtered by is_read server-side, so show them all
            const filtered = res.data.filter((a: any) => {
                if (a.is_read) return false;           // already read on server
                return !dismissedAlertsRef.current.has(a.id);
            });
            setAlerts(filtered);
        } catch (err) {
        }
    };

    const handleDismissAlert = async (id: number) => {
        dismissedAlertsRef.current.add(id);
        setAlerts(prev => prev.filter(a => a.id !== id));
        try { await axios.post(`${API_BASE}/notifications/${id}/read`, {}, getAuthConfig()); } catch { }
    };

    const handleClearAllAlerts = async () => {
        alerts.forEach(a => dismissedAlertsRef.current.add(a.id));
        setAlerts([]);
        setShowNotifications(false);
        try { await axios.post(`${API_BASE}/notifications/clear`, {}, getAuthConfig()); } catch { }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showNotifications && !target.closest('.notifications-dropdown') && !target.closest('.theme-toggle-compact')) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications]);

    useEffect(() => {
        localStorage.setItem("si_theme_mode", theme);
        localStorage.setItem("si_theme", theme);
        document.documentElement.classList.remove("light-theme", "dark-theme");
        document.documentElement.classList.add(`${theme}-theme`);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("si_privacy_mode", String(privacyMode));
    }, [privacyMode]);

    useEffect(() => {
        localStorage.setItem("si_camera_source", cameraSource);
    }, [cameraSource]);

    useEffect(() => {
        fetchStats(); fetchMapData(); fetchAlerts();

        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const isDev = window.location.port === "5173" || window.location.port === "5174";
        const wsHost = isDev ? `${window.location.hostname}:8000` : window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => console.log("[WS] Connected to Smart-Infra Backend");
        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (
                    message.type === "new_detection" ||
                    message.type === "new_report" ||
                    message.type === "report_updated" ||
                    message.type === "notification"
                ) {
                    fetchStats(); fetchMapData(); fetchAlerts();
                }
            } catch (err) { console.error("[WS] Message parsing error", err); }
        };

        const interval = setInterval(() => {
            fetchStats(); fetchAlerts(); fetchMapData();
        }, 15000); // poll every 15s so notifications appear promptly

        return () => {
            clearInterval(interval);
            if (socket.readyState === WebSocket.CONNECTING) {
                socket.onopen = () => socket.close();
            } else {
                socket.close();
            }
        };
    }, []);

    const drawDetections = () => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img || !scannerResult) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        console.log("[SCANNER] Drawing detections:", scannerResult);

        // Set canvas internal resolution to match the element size
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            console.warn("[SCANNER] Image natural dimensions not ready");
            return;
        }

        const naturalRatio = img.naturalWidth / img.naturalHeight;
        const containerRatio = img.clientWidth / img.clientHeight;
        let renderedW, renderedH;

        if (naturalRatio > containerRatio) {
            renderedW = img.clientWidth;
            renderedH = img.clientWidth / naturalRatio;
        } else {
            renderedH = img.clientHeight;
            renderedW = img.clientHeight * naturalRatio;
        }

        const offsetX = (img.clientWidth - renderedW) / 2;
        const offsetY = (img.clientHeight - renderedH) / 2;
        const scaleX = renderedW / img.naturalWidth;
        const scaleY = renderedH / img.naturalHeight;

        const allDets: Detection[] = [
            ...(scannerResult.potholes ?? []),
            ...(scannerResult.objects ?? []),
            ...(scannerResult.infra_detections ?? [])
        ];

        if (allDets.length === 0) {
            console.log("[SCANNER] No objects detected to draw.");
        }

        allDets.forEach((det: Detection) => {
            const [x1, y1, x2, y2] = det.bbox;
            const rx1 = x1 * scaleX + offsetX;
            const ry1 = y1 * scaleY + offsetY;
            const rw = (x2 - x1) * scaleX;
            const rh = (y2 - y1) * scaleY;
            const color = CLASS_BOX_COLORS.get(det.class.toLowerCase()) || "#f97316";
            const label = `${det.class.toUpperCase()} (${Math.round(det.confidence * 100)}%)`;

            console.log(`[SCANNER] Rendering ${det.class} at [${rx1}, ${ry1}, ${rw}, ${rh}]`);

            if (privacyMode && PRIVACY_CLASSES.has(det.class.toLowerCase())) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(rx1, ry1, rw, rh);
                ctx.clip();
                ctx.filter = 'blur(15px)';
                ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, offsetX, offsetY, renderedW, renderedH);
                ctx.restore();
                ctx.fillStyle = "rgba(0,0,0,0.4)";
                ctx.fillRect(rx1, ry1, rw, rh);
            }

            // Outer Bounding Box
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.lineJoin = "round";
            ctx.strokeRect(rx1, ry1, rw, rh);

            // Cybernetic Corner Brackets
            const cornerSize = Math.min(10, rw / 4, rh / 4);
            ctx.lineWidth = 4;
            // Top-left
            ctx.beginPath();
            ctx.moveTo(rx1, ry1 + cornerSize);
            ctx.lineTo(rx1, ry1);
            ctx.lineTo(rx1 + cornerSize, ry1);
            ctx.stroke();
            // Top-right
            ctx.beginPath();
            ctx.moveTo(rx1 + rw - cornerSize, ry1);
            ctx.lineTo(rx1 + rw, ry1);
            ctx.lineTo(rx1 + rw, ry1 + cornerSize);
            ctx.stroke();
            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(rx1, ry1 + rh - cornerSize);
            ctx.lineTo(rx1, ry1 + rh);
            ctx.lineTo(rx1 + cornerSize, ry1 + rh);
            ctx.stroke();
            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(rx1 + rw - cornerSize, ry1 + rh);
            ctx.lineTo(rx1 + rw, ry1 + rh);
            ctx.lineTo(rx1 + rw, ry1 + rh - cornerSize);
            ctx.stroke();

            // Premium Label Drawing
            const fontSize = 11;
            ctx.font = `bold ${fontSize}px 'JetBrains Mono', 'Inter', -apple-system, sans-serif`;
            const textContent = label;
            const textMetrics = ctx.measureText(textContent);
            const textWidth = textMetrics.width;
            const labelPaddingX = 6;
            const labelPaddingY = 3;
            const labelHeight = fontSize + (labelPaddingY * 2);

            // Draw label background pill
            ctx.fillStyle = color;
            const labelY = ry1 - labelHeight < 0 ? ry1 : ry1 - labelHeight;

            ctx.beginPath();
            const radius = 4;
            ctx.roundRect(rx1, labelY, textWidth + (labelPaddingX * 2), labelHeight, radius);
            ctx.fill();

            // Draw label text
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(textContent, rx1 + labelPaddingX, labelY + labelPaddingY);
        });
    };

    useEffect(() => {
        if (scannerResult) {
            drawDetections();
            setTimeout(drawDetections, 100);
            setTimeout(drawDetections, 500);
        }
    }, [scannerResult]);

    const startDetection = async (targetFile?: File) => {
        const fileToUpload = targetFile || file;
        if (!fileToUpload) return;
        setLoading(true);
        setScannerStatus("Analyzing Image...");
        const formData = new FormData();
        formData.append("file", fileToUpload);
        try {
            const response = await axios.post(`${API_BASE}/detect`, formData, getAuthConfig());
            if (response.data.error) {
                setScannerStatus(`Error: ${response.data.error}`);
            } else {
                setScannerResult(response.data);
                setScannerStatus("Scan Complete");

                // Optimistic stats update
                const phs = (response.data.potholes ?? []);
                const objs = (response.data.objects ?? []);
                const count = phs.length + objs.length;

                if (count > 0) {
                    const cars = objs.filter((d: Detection) => d.class.toLowerCase() === 'car').length;
                    const trucks = objs.filter((d: Detection) => d.class.toLowerCase() === 'truck' || d.class.toLowerCase() === 'bus').length;
                    const bikes = objs.filter((d: Detection) => d.class.toLowerCase() === 'motorcycle' || d.class.toLowerCase() === 'bicycle').length;
                    const people = objs.filter((d: Detection) => d.class.toLowerCase() === 'person').length;
                    const danger = objs.filter((d: Detection) => d.is_danger).length;

                    setStats(prev => {
                        if (!prev) return prev;
                        const now = new Date();
                        const hourKey = `${String(now.getHours()).padStart(2, '0')}:00`;
                        const newHourly = { ...prev.hourly_stats };
                        newHourly[hourKey] = (newHourly[hourKey] || 0) + count;

                        // Dynamic Health Score: 100 - (potholes * 5), min 0
                        const phCount = phs.length;
                        const healthImpact = phCount * 5;
                        const newHealth = Math.max(0, 100 - healthImpact);

                        return {
                            ...prev,
                            total_potholes: prev.total_potholes + phCount,
                            total_cars: prev.total_cars + cars,
                            total_trucks: prev.total_trucks + trucks,
                            total_bikes: prev.total_bikes + bikes,
                            total_people: prev.total_people + people,
                            total_danger: prev.total_danger + danger,
                            total_detections: prev.total_detections + count,
                            road_health_score: newHealth,
                            hourly_stats: newHourly
                        };
                    });
                }
                fetchStats();
            }
        } catch (err: any) {
            console.error("[SCANNER] Request failed:", err);
            const msg = err.response?.data?.detail
                || err.response?.data?.message
                || (err.response?.status === 413 ? "File too large (max 25MB)"
                    : err.response?.status === 401 ? "Session expired. Please log in again."
                        : "Server Connection Error");
            setScannerStatus(msg);
        }
        finally { setLoading(false); }
    };

    const handleRefresh = async () => {
        setDashRefreshing(true);
        try {
            await Promise.all([fetchStats(), fetchMapData(), fetchAlerts()]);
        } finally { setDashRefreshing(false); }
    };

    const processFile = async (selected: File) => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setScannerResult(null);
        await startDetection(selected);
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) processFile(selected);
    };

    const handleCameraToggle = async () => {
        try {
            if (!cameraActive) {
                await axios.post(`${API_BASE}/start-camera?source=${cameraSource}`, null, getAuthConfig());
                setCameraActive(true);
                setWebcamPlaying(true);
                setActiveTab("Webcam");
            } else {
                await axios.post(`${API_BASE}/stop-camera`, null, getAuthConfig());
                setCameraActive(false);
                setWebcamPlaying(false);
            }
        } catch (err) { console.error(err); setWebcamPlaying(false); }
    };

    const startWebcam = async () => {
        try {
            if (cameraSource && cameraSource.startsWith("http")) {
                console.log("[WEBCAM] Starting IP Camera via direct URL...");
                ipCamActiveRef.current = true;
                setIpCamActive(true);
            } else {
                ipCamActiveRef.current = false;
                setIpCamActive(false);
                console.log("[WEBCAM] Requesting user media...");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    webcamStreamRef.current = stream;
                    // Add a small delay for stable playing
                    setTimeout(() => {
                        videoRef.current?.play().catch(e => console.error("[WEBCAM] Play error:", e));
                    }, 100);
                    console.log("[WEBCAM] Stream active");
                }
            }
        } catch (err: any) {
            console.error("[WEBCAM] Permission or device error:", err);
            setWebcamPlaying(false);
            setWebcamError(
                err?.name === "NotAllowedError"
                    ? "Camera access denied. Please allow camera permissions in your browser and try again."
                    : err?.name === "NotFoundError"
                        ? "No camera device found. Please connect a camera and try again."
                        : "Unable to access camera. Ensure you are on localhost or HTTPS."
            );
        }
    };

    const stopWebcam = () => {
        if (webcamStreamRef.current) {
            webcamStreamRef.current.getTracks().forEach(track => track.stop());
            webcamStreamRef.current = null;
        }
        if (ipCamImgRef.current) {
            ipCamImgRef.current.src = "";
        }
        ipCamActiveRef.current = false;
        setIpCamActive(false);
        if (webcamTimerRef.current) clearInterval(webcamTimerRef.current);
        webcamSecondsRef.current = 0;
        setWebcamTime("00:00");
        setFrameCount(0);
        setWebcamResult(null);
    };

    const toggleFullscreen = () => {
        if (!webcamContainerRef.current) return;
        if (!document.fullscreenElement) {
            webcamContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
        }
    };

    const clearDetectionHistory = () => {
        setDetectionHistory([]);
        setSessionStats({ potholes: 0, vehicles: 0, people: 0 });
    };

    const startWebcamTimer = () => {
        if (webcamTimerRef.current) clearInterval(webcamTimerRef.current);
        webcamSecondsRef.current = 0;
        webcamTimerRef.current = setInterval(() => {
            webcamSecondsRef.current += 1;
            const m = String(Math.floor(webcamSecondsRef.current / 60)).padStart(2, '0');
            const s = String(webcamSecondsRef.current % 60).padStart(2, '0');
            setWebcamTime(`${m}:${s}`);
        }, 1000);
    };

    const captureSnapshot = () => {
        const targetElement = ipCamActive ? ipCamImgRef.current : videoRef.current;
        if (!targetElement || !webcamPlaying) return;
        if (ipCamActive && !(targetElement as HTMLImageElement).naturalWidth) return;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = ipCamActive ? (targetElement as HTMLImageElement).naturalWidth || 1280 : (targetElement as HTMLVideoElement).videoWidth || 1280;
            canvas.height = ipCamActive ? (targetElement as HTMLImageElement).naturalHeight || 720 : (targetElement as HTMLVideoElement).videoHeight || 720;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(targetElement, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            setSnapshotDataUrl(dataUrl);
            // auto-download
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `smart-infra-snap-${Date.now()}.jpg`;
            a.click();
        } catch (err) {
            console.error(err);
            setWebcamError("Snapshot failed. If using an IP Camera, it may be blocking capture due to CORS.");
        }
    };

    const captureAndDetect = async () => {
        // Use ref so this closure always reads the real-time value, not a stale snapshot
        const isIpCam = ipCamActiveRef.current;
        const targetElement = isIpCam ? ipCamImgRef.current : videoRef.current;
        if (!targetElement) return;
        // Wait until the IP cam image has loaded at least one frame
        if (isIpCam && !(targetElement as HTMLImageElement).naturalWidth) return;
        // For webcam video, wait until it has enough data to render a frame
        if (!isIpCam) {
            const vid = targetElement as HTMLVideoElement;
            if (vid.readyState < 2 || vid.videoWidth === 0 || vid.videoHeight === 0) return;
        }
        try {
            const canvas = document.createElement("canvas");
            canvas.width = isIpCam ? (targetElement as HTMLImageElement).naturalWidth || 1280 : (targetElement as HTMLVideoElement).videoWidth || 1280;
            canvas.height = isIpCam ? (targetElement as HTMLImageElement).naturalHeight || 720 : (targetElement as HTMLVideoElement).videoHeight || 720;
            if (canvas.width === 0 || canvas.height === 0) return; // nothing to capture yet
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(targetElement, 0, 0);
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const formData = new FormData();
                formData.append("file", blob, "frame.jpg");
                try {
                    const response = await axios.post(`${API_BASE}/detect`, formData, getAuthConfig());
                    setWebcamResult(response.data);

                    const newDets: Detection[] = [...(response.data.potholes ?? []), ...(response.data.objects ?? [])];
                    if (newDets.length > 0) {
                        setDetectionHistory(prev => [...newDets, ...prev].slice(0, 12));
                        // accumulate session stats
                        const ph = (response.data.potholes ?? []).length;
                        const veh = (response.data.objects ?? []).filter((d: Detection) => ['car', 'truck', 'bus', 'motorcycle'].includes(d.class)).length;
                        const ppl = (response.data.objects ?? []).filter((d: Detection) => d.class === 'person').length;
                        setSessionStats(prev => ({ potholes: prev.potholes + ph, vehicles: prev.vehicles + veh, people: prev.people + ppl }));

                        // Optimistic stats update for velocity chart
                        setStats(prev => {
                            if (!prev) return prev;
                            const now = new Date();
                            const hourKey = `${String(now.getHours()).padStart(2, '0')}:00`;
                            const newHourly = { ...prev.hourly_stats };
                            newHourly[hourKey] = (newHourly[hourKey] || 0) + (ph + veh + ppl);

                            const cars = (response.data.objects ?? []).filter((d: Detection) => d.class.toLowerCase() === 'car').length;
                            const trucks = (response.data.objects ?? []).filter((d: Detection) => d.class.toLowerCase() === 'truck' || d.class.toLowerCase() === 'bus').length;
                            const bikes = (response.data.objects ?? []).filter((d: Detection) => d.class.toLowerCase() === 'motorcycle').length;

                            // Dynamic Health Score for webcam
                            const healthImpact = ph * 5;
                            const newHealth = Math.max(0, 100 - healthImpact);

                            return {
                                ...prev,
                                total_potholes: prev.total_potholes + ph,
                                total_cars: prev.total_cars + cars,
                                total_trucks: prev.total_trucks + trucks,
                                total_bikes: prev.total_bikes + bikes,
                                total_people: prev.total_people + ppl,
                                total_detections: prev.total_detections + (ph + veh + ppl),
                                road_health_score: newHealth,
                                hourly_stats: newHourly
                            };
                        });
                    }
                } catch (err) { console.error(err); }
            }, "image/jpeg", 0.7);
        } catch (err) {
            console.error(err);
            if (!webcamError) setWebcamError("AI capture failed. If using an IP Camera, it may be blocking local AI polling due to strict cross-origin (CORS) rules.");
        }
    };

    useEffect(() => {
        let interval: any;
        if (activeTab === "Webcam" && webcamPlaying) {
            setWebcamError(null);
            startWebcam();
            startWebcamTimer();
            interval = setInterval(() => {
                captureAndDetect();
                setFrameCount(prev => prev + 1);
            }, pollInterval);
        } else {
            stopWebcam();
        }
        return () => {
            if (interval) clearInterval(interval);
            stopWebcam();
        };
    }, [activeTab, webcamPlaying, pollInterval]);

    const drawWebcamDetections = () => {
        const canvas = webcamCanvasRef.current;
        const targetElement = ipCamActive ? ipCamImgRef.current : videoRef.current;
        if (!canvas || !targetElement || !webcamResult || !webcamPlaying) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        console.log("[WEBCAM] Drawing detections:", webcamResult);

        canvas.width = ipCamActive ? (targetElement as HTMLImageElement).naturalWidth || 1280 : (targetElement as HTMLVideoElement).videoWidth || 1280;
        canvas.height = ipCamActive ? (targetElement as HTMLImageElement).naturalHeight || 720 : (targetElement as HTMLVideoElement).videoHeight || 720;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const allDets: Detection[] = [...(webcamResult.potholes ?? []), ...(webcamResult.objects ?? [])];
        allDets.forEach((det: Detection) => {
            const [x1, y1, x2, y2] = det.bbox;
            const rw = x2 - x1;
            const rh = y2 - y1;
            const color = CLASS_BOX_COLORS.get((det.class || "").toLowerCase()) || "#f97316";
            const label = `${det.class.toUpperCase()} ${Math.round(det.confidence * 100)}%`;
            const cornerLen = Math.min(16, rw * 0.2, rh * 0.2);

            // Privacy Redaction Overlay
            if (privacyMode && PRIVACY_CLASSES.has(det.class.toLowerCase())) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(x1, y1, rw, rh);
                ctx.clip();
                ctx.filter = 'blur(20px)';
                ctx.drawImage(targetElement, 0, 0, canvas.width, canvas.height);
                ctx.restore();

                // HUD Redaction Overlay
                ctx.fillStyle = "rgba(0,0,0,0.6)";
                ctx.fillRect(x1, y1, rw, rh);

                ctx.strokeStyle = "#fff";
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(x1, y1, rw, rh);
                ctx.setLineDash([]);
            }

            // Dim bounding box fill
            ctx.fillStyle = `${color}18`;
            ctx.fillRect(x1, y1, rw, rh);

            // Main border
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.strokeRect(x1, y1, rw, rh);

            // Corner brackets — all 4 corners
            ctx.strokeStyle = color;
            ctx.lineWidth = 6;
            ctx.beginPath();
            // TL
            ctx.moveTo(x1, y1 + cornerLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cornerLen, y1);
            // TR
            ctx.moveTo(x2 - cornerLen, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + cornerLen);
            // BL
            ctx.moveTo(x1, y2 - cornerLen); ctx.lineTo(x1, y2); ctx.lineTo(x1 + cornerLen, y2);
            // BR
            ctx.moveTo(x2 - cornerLen, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - cornerLen);
            ctx.stroke();

            // Label pill
            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            const textW = ctx.measureText(label).width;
            const padX = 6, padY = 4, labelH = 18;
            const bgX = Math.max(0, Math.min(x1, canvas.width - textW - padX * 2));
            const bgY = y1 > labelH + 4 ? y1 - labelH - 2 : y2 + 2;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(bgX, bgY, textW + padX * 2, labelH, 4);
            ctx.fill();

            ctx.fillStyle = "#fff";
            ctx.fillText(label, bgX + padX, bgY + labelH - padY);
        });
    };

    useEffect(() => {
        if (activeTab === "Webcam" && webcamResult) drawWebcamDetections();
    }, [webcamResult, activeTab]);

    const handleSampleSelect = async (samplePath: string) => {
        try {
            setLoading(true);
            setScannerStatus("Loading Sample Image...");
            const fullUrl = samplePath.startsWith("http")
                ? samplePath
                : samplePath.startsWith("/")
                    ? samplePath
                    : `${API_BASE}/${samplePath.replace(/^\/?/, '')}`;
            const res = await fetch(fullUrl);
            if (!res.ok) {
                throw new Error(`Failed to load sample image (HTTP ${res.status})`);
            }
            const blob = await res.blob();
            const filename = samplePath.split("/").pop() || "sample_road.jpg";
            const sampleFile = new File([blob], filename, { type: blob.type || "image/jpeg" });
            processFile(sampleFile);
        } catch (e: any) {
            console.error("Failed to load sample", e);
            setScannerStatus(e.message || "Failed to load sample image");
            setLoading(false);
        }
    };

    const handleResetScanner = () => {
        setFile(null);
        setPreview(null);
        setScannerResult(null);
        setScannerStatus(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleDetectionsChange = (newDetections: any[]) => {
        if (newDetections.length > 0) {
            const newAlerts = newDetections.map((d: any) => ({
                id: Date.now() + Math.random(),
                type: d.class === 'pothole' ? 'pothole' : 'structural',
                severity: d.class === 'pothole' ? 'high' : 'medium',
                message: `${(d.class || 'Structural').toUpperCase()} detected (Confidence: ${(d.confidence * 100).toFixed(0)}%)`,
                timestamp: new Date().toISOString(),
                location: 'Neural Scanner',
                status: 'pending'
            }));
            setAlerts(prev => {
                const now = Date.now();
                const filteredNewAlerts = newAlerts.filter((newA: any) => {
                    const isDuplicate = prev.some(p =>
                        p.type === newA.type &&
                        p.message === newA.message &&
                        (now - new Date(p.timestamp).getTime() < 10000)
                    );
                    return !isDuplicate;
                });
                if (filteredNewAlerts.length === 0) return prev;
                return [...filteredNewAlerts, ...prev].slice(0, 20);
            });
        }
    };

    const renderScannerComponent = () => (
        <AiScanner
            result={scannerResult}
            loading={loading}
            scannerStatus={scannerStatus}
            isDragging={isDragging}
            preview={preview}
            file={file}
            fileInputRef={fileInputRef}
            imageRef={imageRef}
            canvasRef={canvasRef}
            onFileChange={onFileChange}
            handleDragOver={(e: any) => { e.preventDefault(); setIsDragging(true); }}
            handleDragLeave={() => setIsDragging(false)}
            handleDrop={(e: any) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            drawDetections={drawDetections}
            resetScanner={handleResetScanner}
            onDetectionsChange={handleDetectionsChange}
            onSelectSample={handleSampleSelect}
        />
    );

    return (
        <div className={`dashboard-root ${theme}-theme ${activeTab === 'Home' && !user?.is_admin ? 'is-home-tab' : ''}`}>

            <header className="top-full-header" style={{ flexShrink: 0, zIndex: 999 }}>
                <div className="header-left-group">
                    <button
                        className="mobile-sidebar-toggle"
                        onClick={handleToggleSidebar}
                        title={sidebarOpen ? "Close Navigation" : "Open Navigation"}
                        type="button"
                        aria-label="Toggle Navigation"
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                    <Logo size="medium" showText={true} />
                </div>

                <div className="header-right-group">
                    {!user?.is_admin && (
                        <button
                            className={`theme-toggle-compact ${activeTab === 'Webcam' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('Webcam'); setWebcamPlaying(true); setWebcamError(null); }}
                            title="Live Feed"
                        >
                            <Camera size={18} />
                        </button>
                    )}
                    <button
                        className="theme-toggle-compact"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        title="Toggle Theme"
                    >
                        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <div style={{ position: 'relative' }}>
                        <button
                            className={`theme-toggle-compact ${showNotifications ? 'active' : ''}`}
                            title="Notifications"
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={18} />
                            {alerts.length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    minWidth: alerts.length > 9 ? 16 : 8,
                                    height: alerts.length > 9 ? 16 : 8,
                                    background: '#ef4444',
                                    borderRadius: '50%',
                                    border: '1.5px solid var(--bg-card)',
                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.5rem',
                                    fontWeight: 900,
                                    color: '#fff',
                                    lineHeight: 1,
                                    padding: alerts.length > 9 ? '0 2px' : 0
                                }}>
                                    {alerts.length > 9 ? '9+' : alerts.length > 1 ? alerts.length : ''}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="notifications-dropdown glass-card animate-in" style={{
                                position: 'absolute',
                                top: '48px',
                                right: '0',
                                width: '320px',
                                maxHeight: '400px',
                                zIndex: 100,
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                background: 'var(--bg-card)',
                                boxShadow: 'var(--shadow-premium)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("dashboard.alerts.recent", "Recent Alerts")}</h4>
                                    {alerts.length > 0 && (
                                        <button
                                            onClick={handleClearAllAlerts}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            {t("dashboard.alerts.clearAll", "Clear All")}
                                        </button>
                                    )}
                                </div>

                                <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {alerts.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            <Bell size={24} style={{ opacity: 0.2, marginBottom: 8 }} />
                                            <p>{t("dashboard.alerts.noNotifications", "No new notifications")}</p>
                                        </div>
                                    ) : (
                                        alerts.map(alert => (
                                            <div key={alert.id} className="notification-item" style={{
                                                padding: '10px',
                                                borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.03)',
                                                borderLeft: `3px solid ${alert.type === 'danger' ? '#ef4444' :
                                                    alert.type === 'success' ? '#10b981' :
                                                        alert.type === 'info' ? '#3b82f6' : '#f97316'
                                                    }`,
                                                position: 'relative'
                                            }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 2 }}>{alert.title}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{alert.message}</div>
                                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <button
                                                        onClick={() => handleDismissAlert(alert.id)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="header-user-profile">
                        <input
                            type="file"
                            ref={avatarFileInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            style={{ display: "none" }}
                        />
                        <div
                            className="header-avatar-wrap clickable"
                            onClick={() => setShowProfileModal(true)}
                            title="Click to edit profile icon & settings"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") setShowProfileModal(true);
                            }}
                        >
                            <div className="header-avatar-circle">
                                {userAvatar ? (
                                    userAvatar.startsWith("data:image") ? (
                                        <img src={userAvatar} alt="Profile" className="header-avatar-img" />
                                    ) : (
                                        <span className="header-avatar-preset-icon">{userAvatar}</span>
                                    )
                                ) : (
                                    user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : "U"
                                )}
                                <div className="header-avatar-hover-overlay" title="Edit Profile Icon">
                                    <Camera size={12} />
                                </div>
                            </div>
                            <span className="header-user-status" />
                        </div>
                        <div
                            className="header-user-name-clickable"
                            onClick={() => setShowProfileModal(true)}
                            title="Click to edit profile or open settings"
                        >
                            <span className="header-user-name">
                                {customName || user?.name || user?.email?.split('@')[0] || "User"}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Profile & Avatar Editor Modal ── */}
            {showProfileModal && (
                <div className="profile-modal-backdrop" onClick={() => setShowProfileModal(false)}>
                    <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="profile-modal-header">
                            <div className="profile-modal-title-group">
                                <h3 className="profile-modal-title">Edit Profile & Avatar</h3>
                                <p className="profile-modal-subtitle">{user?.email || "Signed in user"}</p>
                            </div>
                            <button
                                className="profile-modal-close-btn"
                                onClick={() => setShowProfileModal(false)}
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="profile-modal-body">
                            {/* Avatar Preview & Actions */}
                            <div className="profile-modal-avatar-section">
                                <div
                                    className="profile-modal-avatar-preview"
                                    onClick={() => avatarFileInputRef.current?.click()}
                                    title="Click to upload new image"
                                >
                                    {userAvatar ? (
                                        userAvatar.startsWith("data:image") ? (
                                            <img src={userAvatar} alt="Avatar Preview" className="profile-modal-avatar-img" />
                                        ) : (
                                            <span className="profile-modal-avatar-preset">{userAvatar}</span>
                                        )
                                    ) : (
                                        <span className="profile-modal-avatar-initial">
                                            {customName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                                        </span>
                                    )}
                                    <div className="profile-modal-avatar-badge">
                                        <Camera size={14} />
                                    </div>
                                </div>

                                <div className="profile-modal-avatar-cta-group">
                                    <button
                                        type="button"
                                        className="profile-modal-btn primary"
                                        onClick={() => avatarFileInputRef.current?.click()}
                                    >
                                        <Upload size={14} />
                                        <span>Upload Photo</span>
                                    </button>
                                    {userAvatar && (
                                        <button
                                            type="button"
                                            className="profile-modal-btn danger"
                                            onClick={handleRemoveAvatar}
                                        >
                                            <Trash2 size={14} />
                                            <span>Reset to Default</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Preset Avatar Gallery */}
                            <div className="profile-modal-presets-section">
                                <label className="profile-modal-section-label">Or Choose an Avatar Icon</label>
                                <div className="profile-modal-presets-grid">
                                    {PRESET_AVATARS.map((icon, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className={`profile-preset-chip ${userAvatar === icon ? "active" : ""}`}
                                            onClick={() => handleSelectPresetAvatar(icon)}
                                            title={`Select ${icon}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Display Name Edit */}
                            <form className="profile-modal-name-section" onSubmit={handleSaveCustomName}>
                                <label className="profile-modal-section-label">Display Name</label>
                                <div className="profile-modal-name-row">
                                    <input
                                        type="text"
                                        className="profile-modal-name-input"
                                        value={editNameInput}
                                        onChange={(e) => setEditNameInput(e.target.value)}
                                        placeholder="Enter your name"
                                        maxLength={40}
                                    />
                                    <button
                                        type="submit"
                                        className={`profile-modal-save-btn ${nameSavedFeedback ? "saved" : ""}`}
                                    >
                                        <Check size={14} />
                                        <span>{nameSavedFeedback ? "Saved!" : "Save"}</span>
                                    </button>
                                </div>
                            </form>

                            <div className="profile-modal-divider" />

                            {/* Settings Shortcut */}
                            <div className="profile-modal-footer">
                                <button
                                    type="button"
                                    className="profile-modal-settings-link"
                                    onClick={() => {
                                        setActiveTab("Configuration");
                                        setShowProfileModal(false);
                                    }}
                                >
                                    <Settings size={16} />
                                    <span>Open System Settings & AI Config</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="tab-container">
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={(tab) => {
                        setActiveTab(tab);
                        if (typeof window !== 'undefined' && window.innerWidth <= 900) {
                            setSidebarOpen(false);
                        }
                    }}
                    cameraActive={cameraActive}
                    handleCameraToggle={handleCameraToggle}
                    isOpen={sidebarOpen}
                    toggleSidebar={handleToggleSidebar}
                    closeSidebar={() => setSidebarOpen(false)}
                />

                <div className="main-content-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    <div className={`tab-content-wrapper ${activeTab === "Home" && !user?.is_admin ? "home-tab-wrapper" : ""}`}>
                        {activeTab === "Dashboard" && user?.is_admin && (
                            <div className="animate-in dashboard-home">
                                <div className="dashboard-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '3px 10px',
                                                borderRadius: '999px',
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                letterSpacing: '0.06em',
                                                background: 'rgba(56, 189, 248, 0.1)',
                                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                                color: '#38bdf8'
                                            }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8', animation: 'pulseDot 2s infinite' }} />
                                                LIVE
                                            </span>
                                            
                                        </div>
                                        <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
                                            {t("dashboard.home.title", "Dashboard")}
                                        </h1>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                            Real-time municipal edge monitoring, pavement resilience telemetry, and structural analytics.
                                        </p>
                                    </div>
                                    <div className="dashboard-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <button 
                                            className="dash-action-btn" 
                                            onClick={handleRefresh} 
                                            disabled={dashRefreshing}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '9px 18px',
                                                borderRadius: '12px',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-main)',
                                                fontWeight: 700,
                                                fontSize: '0.85rem',
                                                cursor: dashRefreshing ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                boxShadow: 'var(--shadow-sm)'
                                            }}
                                        >
                                            <RefreshCw size={16} className={dashRefreshing ? "animate-spin" : ""} style={{ color: '#38bdf8' }} />
                                            <span>{dashRefreshing ? 'Syncing...' : t("dashboard.actions.refresh", "Refresh")}</span>
                                        </button>
                                    </div>
                                </div>
                                <StatsGrid stats={stats} />

                                <IntelligenceHub
                                    detections={[
                                        ...(scannerResult?.potholes ?? []),
                                        ...(scannerResult?.objects ?? []),
                                        ...(webcamResult?.potholes ?? []),
                                        ...(webcamResult?.objects ?? [])
                                    ]}
                                    systemStats={{
                                        potholes: stats?.total_potholes || 0,
                                        cracks: stats?.total_detections || 0,
                                        health: `${stats?.road_health_score || 94}%`,
                                        riskLevel: stats && stats.road_health_score < 70 ? 'HIGH' : 'LOW'
                                    }}
                                />

                                <div style={{ marginTop: 32 }}>
                                    <AnalyticsSection stats={stats} />
                                </div>
                            </div>
                        )}

                        {activeTab === "Home" && !user?.is_admin && (
                            <EditorialHome
                                setActiveTab={(tab) => {
                                    setActiveTab(tab);
                                    setSidebarOpen(false);
                                }}
                                theme={theme}
                                toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            />
                        )}

                        {activeTab === "Scanner" && !user?.is_admin && (
                            <div className="animate-in dashboard-home" style={{ padding: '24px' }}>
                                {renderScannerComponent()}
                            </div>
                        )}

                        {activeTab === "Map" && user?.is_admin && (
                            <div className="animate-in dashboard-home" style={{ padding: '24px' }}>
                                <div className="dashboard-header">
                                    <div>
                                        <h1 className="dashboard-title">{t("dashboard.map.title", "Monitoring Map")}</h1>
                                    </div>
                                </div>
                                <div style={{ marginTop: '24px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                                    <MonitoringMap />
                                </div>
                            </div>
                        )}
                        {activeTab === "History" && <DetectionLog />}
                        {activeTab === "Admin" && <AdminConsole />}
                        {activeTab === "Report" && !user?.is_admin && <ReportIssue onReturn={() => setActiveTab("Home")} />}
                        {activeTab === "MyReports" && !user?.is_admin && <ReportIssue initialView="myreports" onReturn={() => setActiveTab("Home")} />}
                        {activeTab === "Configuration" && (
                            <AiConfig theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} user={user} />
                        )}

                        {activeTab === "Webcam" && !user?.is_admin && (
                            <div className="animate-in dashboard-home livefeed-page-root" style={{ padding: '24px' }}>
                                {/* ── Header Bar ── */}
                                <div className="livefeed-header-bar">
                                    <div className="livefeed-header-left">
                                        <div className={`livefeed-header-badge ${webcamPlaying ? "active" : ""}`}>
                                            <Camera size={22} />
                                        </div>
                                        <div>
                                            <h2 className="livefeed-title">
                                                {t("dashboard.liveFeed.title", "AI Live Detection Feed")}
                                                <span className={`livefeed-status-pill ${webcamPlaying ? "online" : "offline"}`}>
                                                    <span className="livefeed-pulse-orb" />
                                                    {webcamPlaying ? (ipCamActive ? "IP FEED ONLINE" : "ONLINE") : "OFFLINE"}
                                                </span>
                                            </h2>
                                            <p className="livefeed-subtitle">
                                                AI Powered Surface Monitoring
                                            </p>
                                        </div>
                                    </div>

                                    <div className="livefeed-header-actions">
                                        {webcamPlaying && (
                                            <button className="livefeed-btn-action" onClick={captureSnapshot} title="Save Snapshot">
                                                <Download size={14} />
                                                <span>{t("dashboard.liveFeed.snapshotBtn", "Snapshot")}</span>
                                            </button>
                                        )}

                                        <div className="livefeed-stream-input-wrap">
                                            <input
                                                type="text"
                                                value={cameraSource}
                                                onChange={(e) => setCameraSource(e.target.value)}
                                                placeholder="IP Camera Stream URL (e.g. http://......"
                                                className="livefeed-ip-input"
                                            />

                                            <button
                                                className={`livefeed-btn-stream ${webcamPlaying && ipCamActive ? 'active' : ''}`}
                                                onClick={() => {
                                                    if (webcamPlaying && ipCamActive) {
                                                        setWebcamPlaying(false);
                                                    } else {
                                                        if (!cameraSource.trim()) {
                                                            alert("Please provide the server link.");
                                                            return;
                                                        }
                                                        if (webcamPlaying) {
                                                            setWebcamPlaying(false);
                                                            setTimeout(() => setWebcamPlaying(true), 300);
                                                        } else {
                                                            setWebcamPlaying(true);
                                                        }
                                                        clearDetectionHistory();
                                                    }
                                                }}
                                            >
                                                <Radio size={14} />
                                                <span>{webcamPlaying && ipCamActive ? "STOP IP" : "START IP"}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Telemetry & Frequency Toolbar ── */}
                                <div className="livefeed-telemetry-bar">
                                    <div className="livefeed-rate-group">
                                        <span className="livefeed-bar-label">
                                            <Zap size={12} /> {t("dashboard.scanner.rate", "SCAN RATE")}
                                        </span>
                                        <div className="livefeed-rate-pills">
                                            {([1000, 2000, 5000] as const).map(ms => (
                                                <button
                                                    key={ms}
                                                    className={`livefeed-rate-btn ${pollInterval === ms ? 'active' : ''}`}
                                                    onClick={() => setPollInterval(ms)}
                                                >
                                                    {ms === 1000 ? "1.0s (FAST)" : ms === 2000 ? "2.0s (NORMAL)" : "5.0s (ECO)"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="livefeed-stat-chips">
                                        <div className="livefeed-stat-chip chip-potholes">
                                            <div className="livefeed-stat-icon-wrap">⚠️</div>
                                            <div className="livefeed-stat-body">
                                                <span className="livefeed-stat-val">{sessionStats.potholes}</span>
                                                <span className="livefeed-stat-lbl">{t("dashboard.stats.potholes", "Potholes")}</span>
                                            </div>
                                        </div>
                                        <div className="livefeed-stat-chip chip-vehicles">
                                            <div className="livefeed-stat-icon-wrap">🚗</div>
                                            <div className="livefeed-stat-body">
                                                <span className="livefeed-stat-val">{sessionStats.vehicles}</span>
                                                <span className="livefeed-stat-lbl">{t("dashboard.stats.vehicles", "Vehicles")}</span>
                                            </div>
                                        </div>
                                        <div className="livefeed-stat-chip chip-people">
                                            <div className="livefeed-stat-icon-wrap">👤</div>
                                            <div className="livefeed-stat-body">
                                                <span className="livefeed-stat-val">{sessionStats.people}</span>
                                                <span className="livefeed-stat-lbl">{t("dashboard.stats.people", "People")}</span>
                                            </div>
                                        </div>
                                        <div className="livefeed-stat-chip chip-total">
                                            <div className="livefeed-stat-icon-wrap">🎯</div>
                                            <div className="livefeed-stat-body">
                                                <span className="livefeed-stat-val">{detectionHistory.length}</span>
                                                <span className="livefeed-stat-lbl">Active Targets</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Camera error alert ── */}
                                {webcamError && (
                                    <div className="wcam-error-card">
                                        <WifiOff size={20} />
                                        <div style={{ flex: 1 }}>
                                            <p className="wcam-error-title">{t("dashboard.camera.unavailable", "Camera Unavailable")}</p>
                                            <p className="wcam-error-desc">{webcamError}</p>
                                        </div>
                                        <button className="wcam-error-close" onClick={() => setWebcamError(null)} title="Dismiss">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* ── Cyber Viewport Frame ── */}
                                <div
                                    ref={webcamContainerRef}
                                    className="webcam-hud-container livefeed-viewport-container"
                                    style={{ position: 'relative', minHeight: '380px' }}
                                >
                                    {/* Fullscreen button */}
                                    <button
                                        className="wcam-fullscreen-btn"
                                        onClick={toggleFullscreen}
                                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
                                    >
                                        {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
                                    </button>

                                    {/* Video / IP element */}
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={`live-video-feed webcam-feed-video${visualMode === 'Thermal' ? ' feed-filter-thermal'
                                            : visualMode === 'Infrared' ? ' feed-filter-infrared'
                                                : visualMode === 'Neural' ? ' feed-filter-neural'
                                                    : ''
                                            }`}
                                        style={{ width: '100%', height: 'auto', display: webcamPlaying && !ipCamActive ? 'block' : 'none' }}
                                    />
                                    {ipCamActive && webcamPlaying && (
                                        <img
                                            ref={ipCamImgRef}
                                            src={`${API_BASE}/proxy-stream?url=${encodeURIComponent(cameraSource)}`}
                                            crossOrigin="anonymous"
                                            className={`live-video-feed webcam-feed-video${visualMode === 'Thermal' ? ' feed-filter-thermal'
                                                : visualMode === 'Infrared' ? ' feed-filter-infrared'
                                                    : visualMode === 'Neural' ? ' feed-filter-neural'
                                                        : ''
                                                }`}
                                            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                                            alt="IP Camera Feed"
                                            onError={() => {
                                                console.error("[WEBCAM] IP Camera stream failed to load.");
                                                setWebcamPlaying(false);
                                                setWebcamError("Failed to connect to IP Camera. The URL may be offline or invalid.");
                                                if (isFullscreen) document.exitFullscreen().catch(() => { });
                                            }}
                                        />
                                    )}

                                    {/* Real-time Detection Overlay Canvas */}
                                    <canvas
                                        ref={webcamCanvasRef}
                                        className="webcam-overlay-canvas"
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
                                    />

                                    {/* Active HUD Cockpit Overlay */}
                                    {webcamPlaying && (
                                        <div className="webcam-hud-overlay-pro livefeed-hud-overlay">
                                            {/* Tactical Reticle in Center */}
                                            <div className="livefeed-reticle">
                                                <div className="livefeed-reticle-ring" />
                                                <div className="livefeed-reticle-cross-h" />
                                                <div className="livefeed-reticle-cross-v" />
                                            </div>

                                            {/* Digital Scan Laser Line */}
                                            <div className="livefeed-scan-laser" />

                                            {/* Sci-Fi Corner Brackets */}
                                            <div className="hud-corner hud-corner-tl" />
                                            <div className="hud-corner hud-corner-tr" />
                                            <div className="hud-corner hud-corner-bl" />
                                            <div className="hud-corner hud-corner-br" />

                                            {/* Top HUD Edge Bar */}
                                            <div className="hud-edge-bar">
                                                <div className="hud-chip-group">
                                                    <div className="hud-micro-chip status-live">
                                                        <span className="status-dot active" /> REC &bull; LIVE
                                                    </div>
                                                    <div className="hud-micro-chip glow-data">
                                                        <Radio size={11} /> {webcamTime}
                                                    </div>
                                                    <div className="hud-micro-chip glow-data">
                                                        <Zap size={11} /> {frameCount} FPS
                                                    </div>
                                                    <div className="hud-micro-chip hud-health-chip">
                                                        <Activity size={11} /> Infra Health: {stats ? stats.road_health_score : 100}%
                                                    </div>
                                                </div>

                                                {/* Visual Mode Selector Capsule */}
                                                <div className="hud-mode-selector-strip">
                                                    {(['Normal', 'Thermal', 'Infrared', 'Neural'] as const).map(m => (
                                                        <button
                                                            key={m}
                                                            className={`mode-btn-small ${visualMode === m ? 'active' : ''}`}
                                                            onClick={() => setVisualMode(m)}
                                                        >
                                                            {m}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Bottom HUD Edge Bar */}
                                            <div className="hud-edge-bar" style={{ marginTop: 'auto' }}>
                                                <div className="hud-intelligence-line">
                                                    <span className="hud-intel-box">
                                                        <Eye size={11} /> MODE: {visualMode.toUpperCase()}
                                                    </span>
                                                    <span className="hud-intel-box">
                                                        <Crosshair size={11} /> TARGETS: {detectionHistory.length}
                                                    </span>
                                                </div>
                                                <div className="hud-action-strip">
                                                    <button className="hud-action-btn-pro" onClick={captureSnapshot}>
                                                        <Download size={12} /> {t("dashboard.camera.snapshot", "SNAPSHOT")}
                                                    </button>
                                                    <button className="hud-action-btn-pro danger" onClick={() => setWebcamPlaying(false)}>
                                                        <X size={12} /> {t("dashboard.camera.endScan", "END SCAN")}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Standby Radar Display */}
                                    {!webcamPlaying && (
                                        <div className="premium-standby-overlay livefeed-standby-screen">
                                            <div className="livefeed-standby-radar">
                                                <div className="radar-circle radar-c1" />
                                                <div className="radar-circle radar-c2" />
                                                <div className="radar-circle radar-c3" />
                                                <div className="radar-sweep-arm" />
                                                <div className="radar-center-orb">
                                                    <Camera size={28} />
                                                </div>
                                            </div>

                                            <div className="standby-content">
                                                <p className="standby-status">{t("dashboard.camera.offline", "Live Detection Sensor")}</p>
                                                <p className="standby-desc">
                                                    {t("dashboard.camera.offlineDesc", "Select a live capture source to stream.")}
                                                </p>
                                                <div className="livefeed-standby-actions">
                                                    <button
                                                        className="livefeed-standby-btn primary"
                                                        onClick={() => {
                                                            setCameraSource("");
                                                            setWebcamPlaying(true);
                                                            clearDetectionHistory();
                                                        }}
                                                    >
                                                        <Camera size={16} />
                                                        <span>{t("dashboard.camera.activateWebcam", "Activate Web Camera")}</span>
                                                    </button>
                                                    <button
                                                        className="livefeed-standby-btn secondary"
                                                        onClick={() => {
                                                            if (!cameraSource.trim()) {
                                                                alert("Please provide the IP stream URL in the input box above.");
                                                                return;
                                                            }
                                                            setWebcamPlaying(true);
                                                            clearDetectionHistory();
                                                        }}
                                                    >
                                                        <Radio size={16} />
                                                        <span>{t("dashboard.camera.activateUrl", "Activate IP Camera Feed")}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Live Detection History Panel ── */}
                                {detectionHistory.length > 0 && (
                                    <div className="livefeed-detection-panel">
                                        <div className="livefeed-panel-header">
                                            <div className="livefeed-panel-title">
                                                <Database size={14} />
                                                <span>{t("dashboard.log.title", "Live Detection Telemetry")}</span>
                                                <span className="livefeed-panel-badge">
                                                    {detectionHistory.length}
                                                </span>
                                            </div>

                                            <button
                                                onClick={clearDetectionHistory}
                                                title={t("dashboard.log.clearTitle", "Clear log")}
                                                className="livefeed-panel-clear-btn"
                                            >
                                                <Trash2 size={12} />
                                                <span>{t("dashboard.log.clear", "Clear Log")}</span>
                                            </button>
                                        </div>

                                        <div className="livefeed-cards-grid">
                                            {detectionHistory.map((d, i) => {
                                                const color = CLASS_BOX_COLORS.get(d.class) || '#f97316';
                                                const isHigh = d.confidence >= 0.7;
                                                const isMed = d.confidence >= 0.4 && d.confidence < 0.7;
                                                const confidenceStatus = isHigh ? "High" : isMed ? "Medium" : "Low";
                                                const statusColor = isHigh ? "#10b981" : isMed ? "#f59e0b" : "#ef4444";
                                                const icon = d.class === 'person' ? '👤' : d.class === 'pothole' ? '🕳️' : '🚗';

                                                return (
                                                    <div
                                                        key={i}
                                                        className="livefeed-detection-card"
                                                        style={{ borderLeftColor: color }}
                                                    >
                                                        <div className="livefeed-card-header">
                                                            <span className="livefeed-card-class">
                                                                <span className="livefeed-class-emoji">{icon}</span>
                                                                {d.class}
                                                            </span>
                                                            <span
                                                                className="livefeed-card-pill"
                                                                style={{
                                                                    color: statusColor,
                                                                    backgroundColor: `${statusColor}18`,
                                                                    borderColor: `${statusColor}33`
                                                                }}
                                                            >
                                                                {confidenceStatus}
                                                            </span>
                                                        </div>

                                                        <div className="livefeed-card-body">
                                                            <div className="livefeed-card-score-row">
                                                                <span className="livefeed-card-pct">
                                                                    {Math.round(d.confidence * 100)}%
                                                                </span>
                                                                <span className="livefeed-card-conf-label">
                                                                    {t("dashboard.log.confidence", "confidence")}
                                                                </span>
                                                            </div>

                                                            <div className="livefeed-card-meter">
                                                                <div
                                                                    className="livefeed-card-meter-fill"
                                                                    style={{
                                                                        width: `${d.confidence * 100}%`,
                                                                        backgroundColor: color,
                                                                        boxShadow: `0 0 8px ${color}80`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Citizen Urban AI Advisor — Regular Users Only (Hidden for Admins) */}
            <UrbanAdvisorChat setActiveTab={setActiveTab} />
        </div>
    );
};

export default Dashboard;
