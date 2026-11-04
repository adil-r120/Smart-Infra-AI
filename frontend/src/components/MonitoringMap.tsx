import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "../leaflet-init";
import L from "leaflet";
// @ts-ignore
import "leaflet.heat";
// @ts-ignore
import "leaflet.markercluster";
import { DBEntry } from "../types";
import { API_BASE } from "../api/config";
import {
    MapPin, Signal, Layers, RefreshCw,
    Satellite, Map as MapIcon, AlertTriangle,
    Eye, EyeOff, Activity, Download, Maximize, Minimize,
    Search, Plus, Minus, Route, ShieldAlert,
    Copy, Check, Sparkles, Navigation, Crosshair,
    ExternalLink, X, Car, User, Wrench,
    ChevronRight, ChevronLeft, ArrowUpRight, Flame,
    SlidersHorizontal, CheckCircle2, Clock
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type HeatPoint = [number, number, number];
type GoogleMapType = "roadmap" | "satellite" | "terrain";
type FeedFilter = "all" | "critical" | "pothole" | "vehicle" | "person";

interface UserLocation {
    lat: number;
    lng: number;
    accuracy: number;
}

// ── Google Maps Tile Provider URLs ─────────────────────────────────────────────
const GOOGLE_TILES = {
    roadmap: {
        url: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>',
        label: "Roadmap",
    },
    satellite: {
        url: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> Imagery',
        label: "Satellite",
    },
    terrain: {
        url: "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> Terrain',
        label: "Terrain",
    },
    traffic: {
        url: "https://{s}.google.com/vt/lyrs=traffic&x={x}&y={y}&z={z}",
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Traffic</a>',
        label: "Live Traffic",
    },
};

// ── Constants & Helpers ───────────────────────────────────────────────────────
const VEHICLE_TYPES = new Set(["car", "truck", "bus", "motorcycle"]);

const CLASS_CONFIG: Record<string, { label: string; color: string; iconSvg: string }> = {
    pothole: {
        label: "Pothole",
        color: "#ea4335", // Google Red
        iconSvg: `<path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" fill="#ea4335"/>`,
    },
    car: {
        label: "Vehicle",
        color: "#1a73e8", // Google Blue
        iconSvg: `<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="#1a73e8"/>`,
    },
    truck: {
        label: "Vehicle",
        color: "#1a73e8",
        iconSvg: `<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#1a73e8"/>`,
    },
    person: {
        label: "Pedestrian",
        color: "#9334e9", // Google Purple
        iconSvg: `<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#9334e9"/>`,
    },
};

// ── Google Maps Teardrop Marker Factory ─────────────────────────────────────────
function makeGoogleMarkerIcon(type: string, confidence: number, isSelected: boolean) {
    const cfg = CLASS_CONFIG[type] || CLASS_CONFIG["pothole"];
    const isCritical = confidence >= 0.75;
    const pinColor = isCritical ? "#ea4335" : confidence >= 0.45 ? "#f97316" : cfg.color;
    const scale = isSelected ? 1.25 : 1;

    const pinHtml = `
        <div class="gmap-pin-container ${isCritical ? "is-critical" : ""} ${isSelected ? "is-selected" : ""}" style="transform: scale(${scale});">
            ${isCritical ? '<div class="gmap-pin-pulse"></div>' : ""}
            <svg class="gmap-pin-svg" viewBox="0 0 32 42" width="32" height="42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="16" cy="40" rx="6.5" ry="2" fill="rgba(0,0,0,0.35)" filter="blur(1px)"/>
                <path d="M16 0C7.163 0 0 7.163 0 16c0 10.74 14.28 24.28 15.14 25.08a1.2 1.2 0 0 0 1.72 0C17.72 40.28 32 26.74 32 16c0-8.837-7.163-16-16-16z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.8"/>
                <circle cx="16" cy="15" r="9.5" fill="#ffffff" />
                <g transform="translate(4, 3) scale(1)">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        ${cfg.iconSvg}
                    </svg>
                </g>
            </svg>
        </div>
    `;

    return L.divIcon({
        className: "gmap-custom-marker",
        html: pinHtml,
        iconSize: [32 * scale, 42 * scale],
        iconAnchor: [(16 * scale), (42 * scale)],
        popupAnchor: [0, -(42 * scale)],
    });
}

// ── Google Maps Pulsing Blue Location Dot ──────────────────────────────────────
const GOOGLE_YOU_ICON = L.divIcon({
    className: "gmap-you-marker",
    html: `
        <div class="gmap-you-container">
            <div class="gmap-you-halo"></div>
            <div class="gmap-you-dot"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// ── Controller Sub-Components ──────────────────────────────────────────────────
function MapCameraController({
    targetCoords,
    targetZoom
}: {
    targetCoords: [number, number] | null;
    targetZoom?: number;
}) {
    const map = useMap();
    useEffect(() => {
        if (targetCoords) {
            map.flyTo(targetCoords, targetZoom || 16, { duration: 1.2 });
        }
    }, [targetCoords, targetZoom, map]);
    return null;
}

// ── Auto-Resizer to fix white/blank tiles on sidebar toggle & resize ───────────
function MapAutoResizer({ isSidebarOpen }: { isSidebarOpen: boolean }) {
    const map = useMap();

    useEffect(() => {
        const fire = () => {
            try {
                map.invalidateSize({ animate: false });
            } catch {}
        };

        fire();
        const t1 = setTimeout(fire, 60);
        const t2 = setTimeout(fire, 180);
        const t3 = setTimeout(fire, 320);
        const t4 = setTimeout(fire, 600);
        const t5 = setTimeout(fire, 1000);

        const container = map.getContainer();
        const parent = container?.parentElement;
        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(() => fire());
            if (container) ro.observe(container);
            if (parent) ro.observe(parent);
        }

        window.addEventListener("resize", fire);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
            clearTimeout(t5);
            if (ro) ro.disconnect();
            window.removeEventListener("resize", fire);
        };
    }, [map, isSidebarOpen]);

    return null;
}

function FlyToUser({ loc }: { loc: UserLocation | null }) {
    const map = useMap();
    const didFly = useRef(false);
    useEffect(() => {
        if (loc && !didFly.current) {
            map.flyTo([loc.lat, loc.lng], 15, { duration: 1.8 });
            didFly.current = true;
        }
    }, [loc, map]);
    return null;
}

// ── Google Maps Navigation Controls ───────────────────────────────────────────
function GoogleNavControls({
    userLoc,
    onLocateMe
}: {
    userLoc: UserLocation | null;
    onLocateMe: () => void;
}) {
    const map = useMap();

    return (
        <div className="gmap-floating-controls">
            <button
                type="button"
                className="gmap-control-btn gmap-locate-btn"
                onClick={onLocateMe}
                title="Show Your GPS Location"
            >
                <Crosshair size={18} />
            </button>

            <div className="gmap-zoom-group">
                <button
                    type="button"
                    className="gmap-control-btn gmap-zoom-btn"
                    onClick={() => map.zoomIn()}
                    title="Zoom in"
                >
                    <Plus size={18} />
                </button>
                <div className="gmap-zoom-divider" />
                <button
                    type="button"
                    className="gmap-control-btn gmap-zoom-btn"
                    onClick={() => map.zoomOut()}
                    title="Zoom out"
                >
                    <Minus size={18} />
                </button>
            </div>
        </div>
    );
}

// ── Google Heatmap Layer ───────────────────────────────────────────────────────
function GoogleHeatLayer({ points }: { points: HeatPoint[] }) {
    const map = useMap();
    useEffect(() => {
        if (!points.length) return;
        let heat: any = null;
        let timer: any = null;
        const initHeat = () => {
            const size = map.getSize();
            if (size.x > 0 && size.y > 0) {
                heat = (L as any).heatLayer(points, {
                    radius: 36,
                    blur: 24,
                    maxZoom: 17,
                    max: 1.0,
                    gradient: {
                        0.2: "#4285f4",
                        0.4: "#34a853",
                        0.7: "#fbbc04",
                        1.0: "#ea4335"
                    },
                });
                heat.addTo(map);
            } else {
                timer = setTimeout(initHeat, 100);
            }
        };
        initHeat();
        return () => {
            if (timer) clearTimeout(timer);
            if (heat) map.removeLayer(heat);
        };
    }, [map, points]);
    return null;
}

// ── Clustered Marker Layer ────────────────────────────────────────────────────
function GoogleClusterLayer({
    items,
    selectedId,
    onSelect
}: {
    items: DBEntry[];
    selectedId: number | null;
    onSelect: (item: DBEntry, coords: [number, number]) => void;
}) {
    const map = useMap();
    const groupRef = useRef<any>(null);

    useEffect(() => {
        const group = (L as any).markerClusterGroup({
            maxClusterRadius: 45,
            animate: true,
            chunkedLoading: true,
            showCoverageOnHover: false,
            iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: `
                        <div class="gmap-cluster-bubble">
                            <span class="gmap-cluster-count">${count}</span>
                        </div>
                    `,
                    className: "gmap-cluster-marker",
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                });
            },
        });
        groupRef.current = group;
        map.addLayer(group);
        return () => { map.removeLayer(group); };
    }, [map]);

    useEffect(() => {
        const group = groupRef.current;
        if (!group) return;
        group.clearLayers();

        items.forEach((d) => {
            const type = d.object_type || "pothole";
            const conf = d.confidence ?? 0;
            const isCritical = conf >= 0.75;
            const isSelected = selectedId === d.id;

            const cfg = CLASS_CONFIG[type] || CLASS_CONFIG["pothole"];
            const severityLabel = isCritical ? "Critical Hazard" : conf >= 0.45 ? "Moderate Attention" : "Nominal Priority";
            const severityBg = isCritical ? "#ea4335" : conf >= 0.45 ? "#f97316" : "#34a853";

            const scatterLat = d.latitude + (Math.sin(d.id * 123.45) * 0.04);
            const scatterLng = d.longitude + (Math.cos(d.id * 678.90) * 0.04);

            const icon = makeGoogleMarkerIcon(type, conf, isSelected);
            const imageUrl = d.image ? `${API_BASE.replace('/api', '')}/results/${d.image}` : null;
            const imageHtml = imageUrl
                ? `<div class="gmap-infowindow-media"><img src="${imageUrl}" alt="Hazard Scan" /></div>`
                : "";

            const marker = L.marker([scatterLat, scatterLng], { icon });

            marker.on("click", () => {
                onSelect(d, [scatterLat, scatterLng]);
            });

            marker.bindPopup(`
                <div class="gmap-infowindow">
                    ${imageHtml}
                    <div class="gmap-infowindow-content">
                        <div class="gmap-iw-header">
                            <div class="gmap-iw-title">${cfg.label} Detection</div>
                            <span class="gmap-iw-badge" style="background:${severityBg}">${(conf * 100).toFixed(0)}% Match</span>
                        </div>
                        <div class="gmap-iw-sub">Status: <strong>${severityLabel}</strong></div>
                        <div class="gmap-iw-meta">
                            <div class="gmap-iw-row">
                                <span class="gmap-iw-lbl">Location</span>
                                <span class="gmap-iw-val mono">${scatterLat.toFixed(5)}, ${scatterLng.toFixed(5)}</span>
                            </div>
                            <div class="gmap-iw-row">
                                <span class="gmap-iw-lbl">Detected</span>
                                <span class="gmap-iw-val">${d.timestamp || "Live stream"}</span>
                            </div>
                            <div class="gmap-iw-row">
                                <span class="gmap-iw-lbl">Target ID</span>
                                <span class="gmap-iw-val mono">#SCAN-${d.id}</span>
                            </div>
                        </div>

                        <div class="gmap-iw-actions">
                            <button class="gmap-iw-btn primary" onclick="window.location.hash='#work-orders'; window.dispatchEvent(new CustomEvent('map-action', {detail: {type: 'work-order', id: ${d.id}}}));">
                                Dispatch Repair
                            </button>
                            <a class="gmap-iw-btn secondary" href="https://www.google.com/maps/dir/?api=1&destination=${scatterLat},${scatterLng}" target="_blank" rel="noreferrer">
                                Directions
                            </a>
                        </div>
                    </div>
                </div>
            `, {
                maxWidth: 300,
                className: "gmap-popup-container",
            });

            group.addLayer(marker);
        });
    }, [items, selectedId, onSelect]);

    return null;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS = {
    get: <T,>(key: string, fallback: T): T => {
        try {
            const v = localStorage.getItem(key);
            return v !== null ? JSON.parse(v) : fallback;
        } catch { return fallback; }
    },
    set: (key: string, value: unknown) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
    },
};

// ── Main Split View Component ─────────────────────────────────────────────────
export default function MonitoringMap() {
    const [detections, setDetections] = useState<DBEntry[]>([]);
    const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
    const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
    const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "live" | "error">("idle");
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const mapWrapperRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Map Configuration
    const [mapType, setMapType] = useState<GoogleMapType>(() => LS.get("gmap_type", "roadmap"));
    const [showTraffic, setShowTraffic] = useState<boolean>(() => LS.get("gmap_traffic", true));
    const [showHeatmap, setShowHeatmap] = useState<boolean>(() => LS.get("gmap_heatmap", false));
    const [showTrail, setShowTrail] = useState<boolean>(() => LS.get("gmap_trail", false));
    const [showUserLoc, setShowUserLoc] = useState<boolean>(() => LS.get("gmap_userloc", true));
    const [layersOpen, setLayersOpen] = useState(false);

    // Split View Side Feed States
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => LS.get("split_sidebar_open", true));
    const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
    const [feedSearch, setFeedSearch] = useState<string>("");
    const [selectedHazardId, setSelectedHazardId] = useState<number | null>(null);
    const [targetCamera, setTargetCamera] = useState<[number, number] | null>(null);

    // Google Geocoding Search
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Persistence
    useEffect(() => { LS.set("gmap_type", mapType); }, [mapType]);
    useEffect(() => { LS.set("gmap_traffic", showTraffic); }, [showTraffic]);
    useEffect(() => { LS.set("gmap_heatmap", showHeatmap); }, [showHeatmap]);
    useEffect(() => { LS.set("gmap_trail", showTrail); }, [showTrail]);
    useEffect(() => { LS.set("gmap_userloc", showUserLoc); }, [showUserLoc]);
    useEffect(() => { LS.set("split_sidebar_open", isSidebarOpen); }, [isSidebarOpen]);

    // Geolocation watcher
    useEffect(() => {
        if (!navigator.geolocation) {
            setGpsStatus("error");
            setGpsError("GPS not supported.");
            return;
        }
        setGpsStatus("acquiring");
        const id = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLoc({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
                setGpsStatus("live");
                setGpsError(null);
            },
            (err) => {
                setGpsStatus("error");
                setGpsError(err.code === 1 ? "Location denied." : "GPS unavailable.");
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
        return () => navigator.geolocation.clearWatch(id);
    }, []);

    // Load backend detection records
    const loadData = useCallback(async () => {
        setRefreshing(true);
        try {
            const token = localStorage.getItem("si_token");
            const res = await fetch(`${API_BASE}/map-data`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data: DBEntry[] = await res.json();
            setDetections(data);
            setHeatPoints(
                data
                    .filter((d) => (d.object_type || "pothole") === "pothole")
                    .map((d) => [d.latitude, d.longitude, d.confidence] as HeatPoint)
            );
            setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } catch {
            console.warn("Backend data stream currently offline");
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, [loadData]);

    // Filter detections for Feed & Map
    const filteredDetections = useMemo(() => {
        return detections.filter((d) => {
            const type = d.object_type || "pothole";
            const conf = d.confidence ?? 0;

            if (feedFilter === "critical" && conf < 0.75) return false;
            if (feedFilter === "pothole" && type !== "pothole") return false;
            if (feedFilter === "vehicle" && !VEHICLE_TYPES.has(type)) return false;
            if (feedFilter === "person" && type !== "person") return false;

            if (feedSearch.trim()) {
                const query = feedSearch.toLowerCase();
                const idMatch = `#scan-${d.id}`.includes(query) || `${d.id}`.includes(query);
                const typeMatch = type.toLowerCase().includes(query);
                if (!idMatch && !typeMatch) return false;
            }

            return true;
        });
    }, [detections, feedFilter, feedSearch]);

    // Counts
    const counts = useMemo(() => {
        return {
            total: detections.length,
            critical: detections.filter(d => (d.confidence ?? 0) >= 0.75).length,
            potholes: detections.filter(d => (d.object_type || "pothole") === "pothole").length,
            vehicles: detections.filter(d => VEHICLE_TYPES.has(d.object_type || "")).length,
            people: detections.filter(d => d.object_type === "person").length,
        };
    }, [detections]);

    // Simulated Patrol Route Polyline
    const patrolTrail = useMemo(() => {
        if (!showTrail || detections.length < 2) return [];
        return detections.slice(0, 35).map(d => [
            d.latitude + (Math.sin(d.id * 123.45) * 0.04),
            d.longitude + (Math.cos(d.id * 678.90) * 0.04)
        ] as [number, number]);
    }, [detections, showTrail]);

    // Map Search
    const handleGoogleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                setTargetCamera([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            } else {
                alert("Location not found on Google Maps.");
            }
        } catch (err) {
            console.error("Geocoding error", err);
        } finally {
            setIsSearching(false);
        }
    };

    // When card in right feed is clicked: focus camera on map
    const handleCardFocus = (item: DBEntry) => {
        setSelectedHazardId(item.id);
        const lat = item.latitude + (Math.sin(item.id * 123.45) * 0.04);
        const lng = item.longitude + (Math.cos(item.id * 678.90) * 0.04);
        setTargetCamera([lat, lng]);
    };

    // When marker on map is clicked: scroll right feed to that card
    const handleMarkerSelect = (item: DBEntry, coords: [number, number]) => {
        setSelectedHazardId(item.id);
        setTargetCamera(coords);
        if (!isSidebarOpen) setIsSidebarOpen(true);

        const el = cardRefs.current[item.id];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    };

    // Dispatch Work Order Event
    const handleDispatchWorkOrder = (id: number) => {
        window.location.hash = "#work-orders";
        window.dispatchEvent(new CustomEvent("map-action", {
            detail: { type: "work-order", id }
        }));
    };

    // Copy coords
    const handleCopyCoords = (lat: number, lng: number, id: number) => {
        navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Export CSV
    const exportCSV = () => {
        if (!detections.length) return;
        const rows = [
            ["id", "type", "confidence", "latitude", "longitude", "timestamp"],
            ...detections.map(d => [
                d.id,
                d.object_type || "pothole",
                ((d.confidence ?? 0) * 100).toFixed(1) + "%",
                (d.latitude + (Math.sin(d.id * 123.45) * 0.04)).toFixed(6),
                (d.longitude + (Math.cos(d.id * 678.90) * 0.04)).toFixed(6),
                d.timestamp || ""
            ])
        ];
        const csv = rows.map(r => r.join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `smart-infra-hazards-${Date.now()}.csv`;
        a.click();
    };

    // Fullscreen Toggle
    const toggleFullscreen = () => {
        if (!mapWrapperRef.current) return;
        if (!document.fullscreenElement) {
            mapWrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
        }
    };

    const mapCenter: [number, number] = userLoc ? [userLoc.lat, userLoc.lng] : [12.9716, 77.5946];
    const currentBaseTile = GOOGLE_TILES[mapType] || GOOGLE_TILES.roadmap;

    return (
        <div className={`split-map-root ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`} ref={mapWrapperRef}>
            {/* ══════════════════════════════════════════════════════════════════
                LEFT SIDE: CLEAN GOOGLE MAP CANVAS
            ══════════════════════════════════════════════════════════════════ */}
            <div className="split-map-canvas">
                {/* ── Top-Left: Google Search & Quick Pill Filter ── */}
                <div className="gmap-floating-search-container">
                    <form className="gmap-search-card" onSubmit={handleGoogleSearch}>
                        <div className="gmap-search-icon-box">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search Google Maps or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="gmap-search-input"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="gmap-search-clear"
                                onClick={() => setSearchQuery("")}
                                title="Clear"
                            >
                                <X size={15} />
                            </button>
                        )}
                        {isSearching && (
                            <RefreshCw size={14} className="gmap-spin text-blue-500 mr-2" />
                        )}
                        <div className="gmap-search-divider" />
                        <button
                            type="submit"
                            className="gmap-search-submit-btn"
                            title="Jump to location"
                        >
                            <Navigation size={16} className="text-blue-600" />
                        </button>
                    </form>

                    {/* Google Category Chips */}
                    <div className="gmap-chips-bar">
                        <button
                            type="button"
                            className={`gmap-chip ${showTraffic ? "active traffic-active" : ""}`}
                            onClick={() => setShowTraffic(!showTraffic)}
                            title="Toggle Real-Time Google Traffic"
                        >
                            <span className="gmap-traffic-dot" />
                            <span>Traffic</span>
                        </button>

                        <button
                            type="button"
                            className={`gmap-chip ${showHeatmap ? "active chip-heat" : ""}`}
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            title="Toggle Density Heatmap"
                        >
                            <Sparkles size={13} />
                            <span>Heatmap</span>
                        </button>

                        <button
                            type="button"
                            className={`gmap-chip ${showTrail ? "active chip-trail" : ""}`}
                            onClick={() => setShowTrail(!showTrail)}
                            title="Toggle Patrol Route Trail"
                        >
                            <Route size={13} />
                            <span>Patrol Trail</span>
                        </button>
                    </div>
                </div>

                {/* ── Top-Right: Map Telemetry Pill & Sidebar Toggle ── */}
                <div className="gmap-top-actions">
                    <div className={`gmap-status-pill ${gpsStatus}`}>
                        <Signal size={12} className={gpsStatus === "acquiring" ? "gmap-spin" : ""} />
                        <span>
                            {gpsStatus === "live"
                                ? `GPS ±${Math.round(userLoc?.accuracy || 0)}m`
                                : gpsStatus === "acquiring"
                                ? "Locating…"
                                : gpsError || "Standby"}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="gmap-action-btn"
                        onClick={loadData}
                        disabled={refreshing}
                        title="Sync Detections"
                    >
                        <RefreshCw size={14} className={refreshing ? "gmap-spin" : ""} />
                    </button>

                    <button
                        type="button"
                        className="gmap-action-btn"
                        onClick={exportCSV}
                        disabled={!detections.length}
                        title="Export CSV"
                    >
                        <Download size={14} />
                    </button>

                    <button
                        type="button"
                        className="gmap-action-btn"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                    </button>

                    {/* Sidebar Collapse/Expand Toggle */}
                    <button
                        type="button"
                        className={`gmap-action-btn split-sidebar-toggle-btn ${isSidebarOpen ? "is-open" : ""}`}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        title={isSidebarOpen ? "Hide Hazard Feed" : "Show Hazard Feed"}
                    >
                        {isSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* ── Bottom-Left: Google Maps Layer Switcher ── */}
                <div
                    className="gmap-layer-box"
                    onMouseEnter={() => setLayersOpen(true)}
                    onMouseLeave={() => setLayersOpen(false)}
                >
                    <button
                        type="button"
                        className="gmap-layer-thumbnail-btn"
                        onClick={() => setLayersOpen(!layersOpen)}
                        title="Google Maps Layers"
                    >
                        <div className={`gmap-layer-preview ${mapType === "satellite" ? "preview-map" : "preview-satellite"}`}>
                            <div className="gmap-layer-preview-overlay">
                                <Layers size={12} />
                                <span>Layers</span>
                            </div>
                        </div>
                    </button>

                    {layersOpen && (
                        <div className="gmap-layers-panel">
                            <div className="gmap-layers-section-title">Map types</div>
                            <div className="gmap-layer-types-grid">
                                <button
                                    type="button"
                                    className={`gmap-type-card ${mapType === "roadmap" ? "selected" : ""}`}
                                    onClick={() => setMapType("roadmap")}
                                >
                                    <div className="gmap-type-thumb thumb-roadmap" />
                                    <span>Default</span>
                                </button>
                                <button
                                    type="button"
                                    className={`gmap-type-card ${mapType === "satellite" ? "selected" : ""}`}
                                    onClick={() => setMapType("satellite")}
                                >
                                    <div className="gmap-type-thumb thumb-satellite" />
                                    <span>Satellite</span>
                                </button>
                                <button
                                    type="button"
                                    className={`gmap-type-card ${mapType === "terrain" ? "selected" : ""}`}
                                    onClick={() => setMapType("terrain")}
                                >
                                    <div className="gmap-type-thumb thumb-terrain" />
                                    <span>Terrain</span>
                                </button>
                            </div>

                            <div className="gmap-layers-divider" />
                            <div className="gmap-layers-section-title">Map details</div>

                            <div className="gmap-layers-toggle-list">
                                <label className="gmap-layer-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={showTraffic}
                                        onChange={(e) => setShowTraffic(e.target.checked)}
                                    />
                                    <div className="gmap-row-content">
                                        <span className="gmap-row-label">Live Traffic</span>
                                        <span className="gmap-row-desc">Color-coded road congestion</span>
                                    </div>
                                </label>

                                <label className="gmap-layer-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={showHeatmap}
                                        onChange={(e) => setShowHeatmap(e.target.checked)}
                                    />
                                    <div className="gmap-row-content">
                                        <span className="gmap-row-label">Hazard Heatmap</span>
                                        <span className="gmap-row-desc">Density concentration</span>
                                    </div>
                                </label>

                                <label className="gmap-layer-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={showTrail}
                                        onChange={(e) => setShowTrail(e.target.checked)}
                                    />
                                    <div className="gmap-row-content">
                                        <span className="gmap-row-label">Patrol Trail</span>
                                        <span className="gmap-row-desc">Historical patrol polyline</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Bottom-Center: Live Traffic Indicator ── */}
                {showTraffic && (
                    <div className="gmap-traffic-legend">
                        <span className="gmap-traffic-legend-title">Live traffic</span>
                        <div className="gmap-traffic-bar">
                            <span className="gmap-tf-fast">Fast</span>
                            <div className="gmap-tf-gradient" />
                            <span className="gmap-tf-slow">Slow</span>
                        </div>
                    </div>
                )}

                {/* ── Leaflet Google Map Container ── */}
                <div className="gmap-viewport">
                    <MapContainer
                        center={mapCenter}
                        zoom={15}
                        maxZoom={22}
                        scrollWheelZoom={true}
                        zoomControl={false}
                        style={{ height: "100%", width: "100%" }}
                    >
                        {/* Base Google Maps Tiles */}
                        <TileLayer
                            key={mapType}
                            url={currentBaseTile.url}
                            subdomains={currentBaseTile.subdomains}
                            attribution={currentBaseTile.attribution}
                            maxZoom={22}
                            maxNativeZoom={20}
                            keepBuffer={6}
                        />

                        {/* Google Traffic Overlay */}
                        {showTraffic && (
                            <TileLayer
                                url={GOOGLE_TILES.traffic.url}
                                subdomains={GOOGLE_TILES.traffic.subdomains}
                                attribution={GOOGLE_TILES.traffic.attribution}
                                maxZoom={22}
                                maxNativeZoom={20}
                                opacity={0.88}
                                zIndex={300}
                                keepBuffer={6}
                            />
                        )}

                        <MapAutoResizer isSidebarOpen={isSidebarOpen} />
                        <FlyToUser loc={userLoc} />
                        <MapCameraController targetCoords={targetCamera} targetZoom={17} />

                        {/* Floating Zoom & Location Controls */}
                        <GoogleNavControls
                            userLoc={userLoc}
                            onLocateMe={() => {
                                if (userLoc) setTargetCamera([userLoc.lat, userLoc.lng]);
                            }}
                        />

                        {showHeatmap && <GoogleHeatLayer points={heatPoints} />}

                        <GoogleClusterLayer
                            items={filteredDetections}
                            selectedId={selectedHazardId}
                            onSelect={handleMarkerSelect}
                        />

                        {showTrail && patrolTrail.length > 1 && (
                            <Polyline
                                positions={patrolTrail}
                                pathOptions={{
                                    color: "#1a73e8",
                                    weight: 4,
                                    opacity: 0.85,
                                    dashArray: "8 10",
                                }}
                            />
                        )}

                        {showUserLoc && userLoc && (
                            <>
                                <Circle
                                    center={[userLoc.lat, userLoc.lng]}
                                    radius={userLoc.accuracy}
                                    pathOptions={{
                                        color: "#1a73e8",
                                        fillColor: "#1a73e8",
                                        fillOpacity: 0.14,
                                        weight: 1.5,
                                    }}
                                />
                                <Marker position={[userLoc.lat, userLoc.lng]} icon={GOOGLE_YOU_ICON} zIndexOffset={1000} />
                            </>
                        )}
                    </MapContainer>
                </div>

                {/* Attribution */}
                <div className="gmap-bottom-attribution">
                    <span className="gmap-logo-text">Google</span>
                    <span className="gmap-attr-divider">·</span>
                    <span>Map data ©{new Date().getFullYear()} Google</span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                RIGHT SIDE: LIVE HAZARD CARDS & INCIDENT FEED
            ══════════════════════════════════════════════════════════════════ */}
            <div className="split-feed-sidebar">
                {/* ── Feed Header ── */}
                <div className="split-feed-header">
                    <div className="split-feed-title-row">
                        <div className="split-feed-title-box">
                            <h3 className="split-feed-title">Road Incidents & Hazards</h3>
                            <span className="split-feed-subtitle">
                                {filteredDetections.length} active targets · {counts.critical} critical
                            </span>
                        </div>
                        <button
                            type="button"
                            className="split-feed-collapse-btn"
                            onClick={() => setIsSidebarOpen(false)}
                            title="Collapse sidebar to expand map"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="split-feed-tabs">
                        <button
                            type="button"
                            className={`split-tab ${feedFilter === "all" ? "active" : ""}`}
                            onClick={() => setFeedFilter("all")}
                        >
                            All ({counts.total})
                        </button>
                        <button
                            type="button"
                            className={`split-tab tab-critical ${feedFilter === "critical" ? "active" : ""}`}
                            onClick={() => setFeedFilter("critical")}
                        >
                            Critical ({counts.critical})
                        </button>
                        <button
                            type="button"
                            className={`split-tab ${feedFilter === "pothole" ? "active" : ""}`}
                            onClick={() => setFeedFilter("pothole")}
                        >
                            Potholes ({counts.potholes})
                        </button>
                        <button
                            type="button"
                            className={`split-tab ${feedFilter === "vehicle" ? "active" : ""}`}
                            onClick={() => setFeedFilter("vehicle")}
                        >
                            Vehicles ({counts.vehicles})
                        </button>
                        <button
                            type="button"
                            className={`split-tab ${feedFilter === "person" ? "active" : ""}`}
                            onClick={() => setFeedFilter("person")}
                        >
                            People ({counts.people})
                        </button>
                    </div>

                    {/* Quick Search */}
                    <div className="split-feed-search-box">
                        <Search size={14} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by #SCAN ID or type..."
                            value={feedSearch}
                            onChange={(e) => setFeedSearch(e.target.value)}
                            className="split-feed-search-input"
                        />
                        {feedSearch && (
                            <button
                                type="button"
                                className="split-feed-search-clear"
                                onClick={() => setFeedSearch("")}
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Feed List ── */}
                <div className="split-feed-list">
                    {filteredDetections.length === 0 ? (
                        <div className="split-empty-state">
                            <CheckCircle2 size={36} className="text-green-500 mb-2" />
                            <h4>No Hazards Matching Filter</h4>
                            <p>All road sectors in this category are nominal or clear.</p>
                            <button
                                type="button"
                                className="split-clear-filters-btn"
                                onClick={() => { setFeedFilter("all"); setFeedSearch(""); }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        filteredDetections.map((d) => {
                            const type = d.object_type || "pothole";
                            const conf = d.confidence ?? 0;
                            const isCritical = conf >= 0.75;
                            const isSelected = selectedHazardId === d.id;
                            const cfg = CLASS_CONFIG[type] || CLASS_CONFIG["pothole"];
                            const severityLabel = isCritical ? "Critical" : conf >= 0.45 ? "Moderate" : "Low Risk";
                            const severityColor = isCritical ? "#ea4335" : conf >= 0.45 ? "#f97316" : "#34a853";

                            const scatterLat = d.latitude + (Math.sin(d.id * 123.45) * 0.04);
                            const scatterLng = d.longitude + (Math.cos(d.id * 678.90) * 0.04);
                            const imageUrl = d.image ? `${API_BASE.replace('/api', '')}/results/${d.image}` : null;

                            return (
                                <div
                                    key={d.id}
                                    ref={(el) => { cardRefs.current[d.id] = el; }}
                                    className={`split-hazard-card ${isSelected ? "is-selected" : ""} ${isCritical ? "is-critical-border" : ""}`}
                                    onClick={() => handleCardFocus(d)}
                                >
                                    {/* Card Header */}
                                    <div className="split-card-top">
                                        <div className="split-card-title-group">
                                            <div className="split-card-type-icon" style={{ color: cfg.color }}>
                                                {type === "pothole" ? <AlertTriangle size={15} /> :
                                                 VEHICLE_TYPES.has(type) ? <Car size={15} /> : <User size={15} />}
                                            </div>
                                            <div className="split-card-headings">
                                                <div className="split-card-title">{cfg.label} Hazard</div>
                                                <span className="split-card-id mono">#SCAN-{d.id}</span>
                                            </div>
                                        </div>

                                        <div className="split-card-badge-box">
                                            <span
                                                className="split-card-severity-badge"
                                                style={{ backgroundColor: `${severityColor}18`, color: severityColor, borderColor: `${severityColor}40` }}
                                            >
                                                {severityLabel} • {(conf * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Media Preview (if photo available) */}
                                    {imageUrl && (
                                        <div className="split-card-image-wrapper">
                                            <img src={imageUrl} alt="Hazard detection" loading="lazy" />
                                            <div className="split-card-image-tag">AI Camera Scan</div>
                                        </div>
                                    )}

                                    {/* Location & Time Info */}
                                    <div className="split-card-meta-grid">
                                        <div className="split-card-meta-item">
                                            <span className="split-meta-lbl">Coordinates</span>
                                            <div className="split-meta-val-row">
                                                <span className="split-meta-val mono">
                                                    {scatterLat.toFixed(4)}, {scatterLng.toFixed(4)}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="split-copy-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyCoords(scatterLat, scatterLng, d.id);
                                                    }}
                                                    title="Copy GPS coordinates"
                                                >
                                                    {copiedId === d.id ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="split-card-meta-item">
                                            <span className="split-meta-lbl">Detected</span>
                                            <span className="split-meta-val">
                                                <Clock size={11} className="inline mr-1 text-gray-400" />
                                                {d.timestamp || "Live stream"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="split-card-actions">
                                        <button
                                            type="button"
                                            className="split-btn primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDispatchWorkOrder(d.id);
                                            }}
                                            title="Assign maintenance crew"
                                        >
                                            <Wrench size={13} />
                                            <span>Dispatch Repair</span>
                                        </button>

                                        <button
                                            type="button"
                                            className="split-btn secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCardFocus(d);
                                            }}
                                            title="Zoom directly to this marker on the map"
                                        >
                                            <Crosshair size={13} />
                                            <span>Focus Map</span>
                                        </button>

                                        <a
                                            className="split-btn icon-only"
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${scatterLat},${scatterLng}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title="Get Directions in Google Maps"
                                        >
                                            <ArrowUpRight size={14} />
                                        </a>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                SPLIT VIEW CSS STYLING
            ══════════════════════════════════════════════════════════════════ */}
            <style>{`
                .split-map-root {
                    display: flex;
                    width: 100%;
                    height: calc(100vh - 72px);
                    background: var(--bg-body, #f8f9fa);
                    font-family: 'Roboto', 'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif;
                    overflow: hidden;
                    position: relative;
                }

                /* ── Left Map Canvas ── */
                .split-map-canvas {
                    flex: 1;
                    position: relative;
                    height: 100%;
                    min-width: 0;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .gmap-viewport {
                    width: 100%;
                    height: 100%;
                }

                .gmap-viewport .leaflet-container {
                    width: 100%;
                    height: 100%;
                    background: #e5e3df;
                    font-family: inherit;
                }

                /* ── Floating Google Search ── */
                .gmap-floating-search-container {
                    position: absolute;
                    top: 14px;
                    left: 14px;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    max-width: calc(100% - 28px);
                }

                .gmap-search-card {
                    display: flex;
                    align-items: center;
                    width: 360px;
                    max-width: 100%;
                    height: 46px;
                    background: #ffffff;
                    border-radius: 23px;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
                    padding: 0 8px 0 16px;
                }

                .gmap-search-icon-box {
                    display: flex;
                    align-items: center;
                    margin-right: 8px;
                    color: #5f6368;
                }

                .gmap-search-input {
                    flex: 1;
                    height: 100%;
                    border: none;
                    outline: none;
                    font-size: 0.92rem;
                    color: #202124;
                    background: transparent;
                }

                .gmap-search-clear {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #70757a;
                    padding: 5px;
                }

                .gmap-search-divider {
                    width: 1px;
                    height: 22px;
                    background: #dadce0;
                    margin: 0 6px;
                }

                .gmap-search-submit-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 7px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    color: #1a73e8;
                }

                .gmap-chips-bar {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .gmap-chips-bar::-webkit-scrollbar { display: none; }

                .gmap-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 6px 11px;
                    border-radius: 16px;
                    border: 1px solid #dadce0;
                    background: #ffffff;
                    color: #3c4043;
                    font-size: 0.76rem;
                    font-weight: 500;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
                    white-space: nowrap;
                    transition: all 0.15s ease;
                }

                .gmap-chip.active {
                    background: #e8f0fe;
                    color: #1a73e8;
                    border-color: #1a73e8;
                    font-weight: 600;
                }

                .gmap-chip.traffic-active {
                    background: #e6f4ea;
                    color: #137333;
                    border-color: #34a853;
                }

                .gmap-traffic-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #34a853;
                }

                /* ── Top-Right Action Controls ── */
                .gmap-top-actions {
                    position: absolute;
                    top: 14px;
                    right: 14px;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .gmap-status-pill {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 6px 11px;
                    background: #ffffff;
                    border-radius: 18px;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.16);
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: #5f6368;
                }
                .gmap-status-pill.live {
                    color: #137333;
                    background: #e6f4ea;
                }

                .gmap-action-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 1px solid #dadce0;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #5f6368;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .gmap-action-btn:hover {
                    background: #f8f9fa;
                    color: #1a73e8;
                    transform: translateY(-1px);
                }

                .split-sidebar-toggle-btn.is-open {
                    background: #1a73e8;
                    color: #ffffff;
                    border-color: #1a73e8;
                }

                /* ── Bottom-Left Layer Switcher ── */
                .gmap-layer-box {
                    position: absolute;
                    bottom: 22px;
                    left: 18px;
                    z-index: 1000;
                }

                .gmap-layer-thumbnail-btn {
                    padding: 0;
                    background: none;
                    border: none;
                    cursor: pointer;
                }

                .gmap-layer-preview {
                    width: 64px;
                    height: 64px;
                    border-radius: 10px;
                    border: 2px solid #ffffff;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                    position: relative;
                }

                .preview-satellite {
                    background: url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/4488/3044') center/cover no-repeat;
                }
                .preview-map {
                    background: url('https://a.tile.openstreetmap.org/13/4488/3044.png') center/cover no-repeat;
                }

                .gmap-layer-preview-overlay {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(0, 0, 0, 0.65);
                    padding: 2px 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 3px;
                    color: #ffffff;
                    font-size: 0.65rem;
                    font-weight: 600;
                }

                .gmap-layers-panel {
                    position: absolute;
                    bottom: 74px;
                    left: 0;
                    width: 260px;
                    background: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .gmap-layers-section-title {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #70757a;
                    text-transform: uppercase;
                }

                .gmap-layer-types-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 6px;
                }

                .gmap-type-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    background: none;
                    border: 2px solid transparent;
                    border-radius: 6px;
                    padding: 3px;
                    cursor: pointer;
                    font-size: 0.7rem;
                    color: #3c4043;
                }
                .gmap-type-card.selected {
                    border-color: #1a73e8;
                    color: #1a73e8;
                    font-weight: 700;
                }
                .gmap-type-thumb {
                    width: 100%;
                    height: 42px;
                    border-radius: 4px;
                }
                .thumb-roadmap { background: #e8eaed; border: 1px solid #dadce0; }
                .thumb-satellite { background: #202124; }
                .thumb-terrain { background: #b4d5b6; }

                .gmap-layers-divider { height: 1px; background: #e8eaed; }
                .gmap-layers-toggle-list { display: flex; flex-direction: column; gap: 6px; }

                .gmap-layer-checkbox-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 0.76rem;
                    font-weight: 600;
                }

                /* ── Floating Navigation Controls ── */
                .gmap-floating-controls {
                    position: absolute;
                    bottom: 22px;
                    right: 18px;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }

                .gmap-control-btn {
                    width: 38px;
                    height: 38px;
                    background: #ffffff;
                    border: none;
                    border-radius: 8px;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #5f6368;
                    cursor: pointer;
                }
                .gmap-control-btn:hover { background: #f1f3f4; color: #202124; }

                .gmap-zoom-group {
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
                    overflow: hidden;
                }
                .gmap-zoom-btn { width: 38px; height: 38px; border-radius: 0; box-shadow: none; }
                .gmap-zoom-divider { height: 1px; background: #dadce0; margin: 0 5px; }

                /* ── Traffic Legend ── */
                .gmap-traffic-legend {
                    position: absolute;
                    bottom: 22px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1000;
                    background: #ffffff;
                    border-radius: 18px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                    padding: 5px 14px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.72rem;
                }
                .gmap-traffic-bar { display: flex; align-items: center; gap: 6px; }
                .gmap-tf-fast { color: #137333; font-weight: 600; font-size: 0.68rem; }
                .gmap-tf-slow { color: #c5221f; font-weight: 600; font-size: 0.68rem; }
                .gmap-tf-gradient {
                    width: 80px; height: 5px; border-radius: 4px;
                    background: linear-gradient(to right, #34a853, #fbbc04, #ea4335, #7f1d1d);
                }

                /* ── Marker Pin Styles ── */
                .gmap-custom-marker { background: transparent; border: none; }
                .gmap-pin-container { position: relative; width: 32px; height: 42px; cursor: pointer; transition: transform 0.15s ease; }
                .gmap-pin-container:hover { transform: translateY(-4px) scale(1.15) !important; }
                .gmap-pin-pulse {
                    position: absolute; width: 32px; height: 32px; left: 0; top: 0;
                    border-radius: 50%; background: rgba(234, 67, 53, 0.4);
                    animation: gmap-pulse-anim 2s infinite ease-out; z-index: -1;
                }
                @keyframes gmap-pulse-anim {
                    0% { transform: scale(0.9); opacity: 0.9; }
                    100% { transform: scale(1.7); opacity: 0; }
                }

                .gmap-you-marker { background: transparent; border: none; }
                .gmap-you-container { position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
                .gmap-you-halo {
                    position: absolute; width: 36px; height: 36px; border-radius: 50%;
                    background: rgba(66, 133, 244, 0.28); animation: gmap-halo 2s infinite ease-out;
                }
                @keyframes gmap-halo { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(1.5); opacity: 0; } }
                .gmap-you-dot { width: 14px; height: 14px; border-radius: 50%; background: #1a73e8; border: 2px solid #ffffff; }

                /* ── Marker Clusters ── */
                .gmap-cluster-marker { background: transparent; border: none; }
                .gmap-cluster-bubble {
                    width: 38px; height: 38px; border-radius: 50%; background: #1a73e8;
                    border: 2.5px solid #ffffff; box-shadow: 0 3px 8px rgba(26, 115, 232, 0.45);
                    display: flex; align-items: center; justify-content: center;
                }
                .gmap-cluster-count { color: #ffffff; font-weight: 700; font-size: 0.8rem; }

                /* ── InfoWindow ── */
                .gmap-popup-container .leaflet-popup-content-wrapper {
                    background: #ffffff !important; border-radius: 12px !important;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25) !important;
                    padding: 0 !important; overflow: hidden !important; color: #202124 !important;
                }
                .gmap-popup-container .leaflet-popup-tip { background: #ffffff !important; }
                .gmap-popup-container .leaflet-popup-content { margin: 0 !important; width: 280px !important; }
                .gmap-infowindow { display: flex; flex-direction: column; }
                .gmap-infowindow-media { width: 100%; height: 120px; background: #000; overflow: hidden; }
                .gmap-infowindow-media img { width: 100%; height: 100%; object-fit: cover; }
                .gmap-infowindow-content { padding: 12px 14px; }
                .gmap-iw-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
                .gmap-iw-title { font-size: 0.94rem; font-weight: 700; color: #202124; }
                .gmap-iw-badge { color: #ffffff; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
                .gmap-iw-sub { font-size: 0.72rem; color: #5f6368; margin-bottom: 8px; }
                .gmap-iw-meta { background: #f8f9fa; border-radius: 6px; padding: 6px 8px; display: flex; flex-direction: column; gap: 3px; margin-bottom: 10px; }
                .gmap-iw-row { display: flex; justify-content: space-between; font-size: 0.72rem; }
                .gmap-iw-lbl { color: #70757a; }
                .gmap-iw-val { color: #202124; font-weight: 600; }
                .gmap-iw-val.mono { font-family: monospace; color: #1a73e8; }
                .gmap-iw-actions { display: flex; gap: 6px; }
                .gmap-iw-btn {
                    flex: 1; padding: 7px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 700;
                    text-align: center; cursor: pointer; text-decoration: none; border: none;
                }
                .gmap-iw-btn.primary { background: #1a73e8; color: #ffffff; }
                .gmap-iw-btn.secondary { background: #f1f3f4; color: #1a73e8; }

                /* ── Bottom Right Google Attribution ── */
                .gmap-bottom-attribution {
                    position: absolute; bottom: 4px; right: 80px; z-index: 999;
                    background: rgba(255, 255, 255, 0.75); padding: 2px 6px;
                    border-radius: 3px; font-size: 0.62rem; color: #5f6368; display: flex; gap: 4px;
                }
                .gmap-logo-text { font-weight: 900; color: #4285f4; }

                /* ══════════════════════════════════════════════════════════════
                   RIGHT SIDEBAR: HAZARD FEED & TRIAGE LIST
                ══════════════════════════════════════════════════════════════ */
                .split-feed-sidebar {
                    width: 440px;
                    height: 100%;
                    background: #ffffff;
                    border-left: 1px solid #e0e0e0;
                    display: flex;
                    flex-direction: column;
                    z-index: 1001;
                    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    flex-shrink: 0;
                }

                .split-map-root.sidebar-collapsed .split-feed-sidebar {
                    width: 0;
                    min-width: 0;
                    max-width: 0;
                    border-left: none;
                    opacity: 0;
                    pointer-events: none;
                    box-shadow: none;
                    overflow: hidden;
                }

                /* Header */
                .split-feed-header {
                    padding: 14px 16px 10px;
                    border-bottom: 1px solid #f1f3f4;
                    background: #ffffff;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .split-feed-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .split-feed-title {
                    font-size: 1.02rem;
                    font-weight: 800;
                    color: #202124;
                    margin: 0;
                    letter-spacing: -0.01em;
                }

                .split-feed-subtitle {
                    font-size: 0.72rem;
                    color: #5f6368;
                    font-weight: 500;
                }

                .split-feed-collapse-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #f1f3f4;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #5f6368;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .split-feed-collapse-btn:hover {
                    background: #e8eaed;
                    color: #202124;
                }

                /* Tabs */
                .split-feed-tabs {
                    display: flex;
                    gap: 5px;
                    overflow-x: auto;
                    scrollbar-width: none;
                    padding-bottom: 2px;
                }
                .split-feed-tabs::-webkit-scrollbar { display: none; }

                .split-tab {
                    padding: 5px 10px;
                    border-radius: 8px;
                    border: 1px solid #e8eaed;
                    background: #f8f9fa;
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: #5f6368;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.15s;
                }
                .split-tab:hover {
                    background: #f1f3f4;
                    color: #202124;
                }
                .split-tab.active {
                    background: #1a73e8;
                    color: #ffffff;
                    border-color: #1a73e8;
                }
                .split-tab.tab-critical.active {
                    background: #ea4335;
                    border-color: #ea4335;
                }

                /* Search */
                .split-feed-search-box {
                    display: flex;
                    align-items: center;
                    background: #f1f3f4;
                    border-radius: 8px;
                    padding: 6px 10px;
                    gap: 8px;
                }

                .split-feed-search-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    outline: none;
                    font-size: 0.78rem;
                    color: #202124;
                }
                .split-feed-search-clear {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #70757a;
                    display: flex;
                }

                /* Card List */
                .split-feed-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    background: #f8f9fa;
                }

                /* Empty state */
                .split-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    text-align: center;
                    color: #5f6368;
                }
                .split-empty-state h4 {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #202124;
                    margin: 4px 0;
                }
                .split-empty-state p {
                    font-size: 0.75rem;
                    margin: 0 0 16px;
                }
                .split-clear-filters-btn {
                    padding: 6px 14px;
                    background: #1a73e8;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.74rem;
                    font-weight: 700;
                    cursor: pointer;
                }

                /* Hazard Card */
                .split-hazard-card {
                    background: #ffffff;
                    border-radius: 12px;
                    border: 1px solid #e8eaed;
                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .split-hazard-card:hover {
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                    border-color: #bdc1c6;
                }

                .split-hazard-card.is-selected {
                    border-color: #1a73e8;
                    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.3), 0 4px 14px rgba(0, 0, 0, 0.12);
                    background: #fdfefe;
                }

                .split-hazard-card.is-critical-border {
                    border-left: 4px solid #ea4335;
                }

                .split-card-top {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                }

                .split-card-title-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .split-card-type-icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                    background: #f8f9fa;
                    border: 1px solid #e8eaed;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .split-card-title {
                    font-size: 0.88rem;
                    font-weight: 800;
                    color: #202124;
                    line-height: 1.2;
                }

                .split-card-id {
                    font-size: 0.7rem;
                    color: #1a73e8;
                    font-weight: 600;
                }

                .split-card-severity-badge {
                    font-size: 0.68rem;
                    font-weight: 800;
                    padding: 3px 8px;
                    border-radius: 12px;
                    border: 1px solid transparent;
                }

                /* Photo Preview */
                .split-card-image-wrapper {
                    position: relative;
                    width: 100%;
                    height: 130px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #000000;
                }
                .split-card-image-wrapper img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.25s ease;
                }
                .split-hazard-card:hover .split-card-image-wrapper img {
                    transform: scale(1.04);
                }
                .split-card-image-tag {
                    position: absolute;
                    bottom: 6px;
                    left: 6px;
                    background: rgba(0, 0, 0, 0.65);
                    color: #ffffff;
                    font-size: 0.64rem;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                /* Meta Grid */
                .split-card-meta-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 8px 10px;
                }

                .split-card-meta-item {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .split-meta-lbl {
                    font-size: 0.64rem;
                    color: #70757a;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .split-meta-val-row {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .split-meta-val {
                    font-size: 0.74rem;
                    color: #202124;
                    font-weight: 600;
                }

                .split-meta-val.mono {
                    font-family: monospace;
                    font-size: 0.72rem;
                    color: #1a73e8;
                }

                .split-copy-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #5f6368;
                    display: flex;
                    align-items: center;
                    padding: 2px;
                }
                .split-copy-btn:hover { color: #1a73e8; }

                /* Action Row */
                .split-card-actions {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                    padding-top: 4px;
                    border-top: 1px solid #f1f3f4;
                }

                .split-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    padding: 7px 12px;
                    border-radius: 8px;
                    font-size: 0.74rem;
                    font-weight: 700;
                    cursor: pointer;
                    border: none;
                    text-decoration: none;
                    transition: all 0.15s ease;
                }

                .split-btn.primary {
                    flex: 1.2;
                    background: #1a73e8;
                    color: #ffffff;
                    box-shadow: 0 1px 3px rgba(26, 115, 232, 0.35);
                }
                .split-btn.primary:hover {
                    background: #1557b0;
                    box-shadow: 0 2px 6px rgba(26, 115, 232, 0.5);
                }

                .split-btn.secondary {
                    flex: 1;
                    background: #f1f3f4;
                    color: #3c4043;
                }
                .split-btn.secondary:hover {
                    background: #e8eaed;
                    color: #1a73e8;
                }

                .split-btn.icon-only {
                    padding: 7px 9px;
                    background: #f1f3f4;
                    color: #5f6368;
                }
                .split-btn.icon-only:hover {
                    background: #e8eaed;
                    color: #1a73e8;
                }

                /* ── Animations ── */
                .gmap-spin {
                    animation: gmap-spin-anim 1s linear infinite;
                }
                @keyframes gmap-spin-anim {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* ── Dark Mode Adaptations ── */
                .dark-theme .split-map-root,
                [data-theme="dark"] .split-map-root {
                    background: #121212;
                    color: #f1f5f9;
                }

                .dark-theme .split-feed-sidebar,
                [data-theme="dark"] .split-feed-sidebar {
                    background: #1a1a1a;
                    border-left-color: rgba(255, 255, 255, 0.08);
                }

                .dark-theme .split-feed-header,
                [data-theme="dark"] .split-feed-header {
                    background: #1a1a1a;
                    border-bottom-color: rgba(255, 255, 255, 0.08);
                }

                .dark-theme .split-feed-title,
                [data-theme="dark"] .split-feed-title {
                    color: #ffffff;
                }

                .dark-theme .split-feed-list,
                [data-theme="dark"] .split-feed-list {
                    background: #121212;
                }

                .dark-theme .split-hazard-card,
                [data-theme="dark"] .split-hazard-card {
                    background: #1e1e1e;
                    border-color: rgba(255, 255, 255, 0.08);
                }

                .dark-theme .split-card-title,
                [data-theme="dark"] .split-card-title {
                    color: #ffffff;
                }

                .dark-theme .split-card-meta-grid,
                [data-theme="dark"] .split-card-meta-grid {
                    background: #161616;
                }

                .dark-theme .split-meta-val,
                [data-theme="dark"] .split-meta-val {
                    color: #e2e8f0;
                }

                .dark-theme .split-btn.secondary,
                [data-theme="dark"] .split-btn.secondary,
                .dark-theme .split-btn.icon-only,
                [data-theme="dark"] .split-btn.icon-only {
                    background: #2a2a2a;
                    color: #e2e8f0;
                }

                .dark-theme .split-feed-search-box,
                [data-theme="dark"] .split-feed-search-box {
                    background: #262626;
                }

                .dark-theme .split-feed-search-input,
                [data-theme="dark"] .split-feed-search-input {
                    color: #ffffff;
                }

                .dark-theme .split-tab,
                [data-theme="dark"] .split-tab {
                    background: #262626;
                    border-color: rgba(255, 255, 255, 0.08);
                    color: #94a3b8;
                }
            `}</style>
        </div>
    );
}
