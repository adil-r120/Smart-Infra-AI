import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal, Target, Zap, Save, RotateCcw,
  CheckCircle, Trash2, Sun, Moon, AlertTriangle, Cpu, MapPin,
  HelpCircle, ChevronDown, Shield, Eye, Fingerprint, Activity,
  Copy, Layers, Sparkles, Check
} from "lucide-react";
import axios from "axios";
import { API_BASE } from "../api/config";
import "./AiConfig.css";

interface Config {
  confidence: number;   // % — detector threshold
  iou: number;          // % — NMS overlap threshold
  imageSize: number;    // px — YOLO input size
  maxDetections: number;
  pollInterval: number; // seconds
  theme: "dark" | "light";
  gpsLat: number;
  gpsLng: number;
  gpsScatter: number;   // metres ×10
  privacyMode: boolean;
}

const DEFAULTS: Config = {
  confidence: 20,
  iou: 40,
  imageSize: 640,
  maxDetections: 50,
  pollInterval: 10,
  theme: "light",
  gpsLat: 12.9716,
  gpsLng: 77.5946,
  gpsScatter: 10,
  privacyMode: false,
};

const CITY_PRESETS = [
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Delhi", lat: 28.7041, lng: 77.1025 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
];

function load(): Config {
  try {
    const raw = localStorage.getItem("ai_config");
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function AiConfig({
  theme, toggleTheme, user
}: { theme: "dark" | "light"; toggleTheme: () => void; user: any }) {
  const [cfg, setCfg] = useState<Config>(load);
  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearDone, setClearDone] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("identity");

  const set = <K extends keyof Config>(k: K, v: Config[K]) =>
    setCfg(prev => ({ ...prev, [k]: v }));

  /* Persist on every change */
  useEffect(() => {
    localStorage.setItem("ai_config", JSON.stringify(cfg));
  }, [cfg]);

  const handleSave = () => {
    localStorage.setItem("ai_config", JSON.stringify(cfg));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleReset = () => {
    if (!window.confirm("Reset all AI parameters to factory defaults?")) return;
    setCfg(DEFAULTS);
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText("a84f3c9d-27b1-4e2d");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleClearDB = async () => {
    if (!window.confirm("Permanently delete ALL stored detections and images?\nThis cannot be undone.")) return;
    setClearing(true);
    try {
      const token = localStorage.getItem("si_token");
      await axios.delete(`${API_BASE}/detections`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setClearDone(true);
      window.dispatchEvent(new Event("detections_cleared"));
      setTimeout(() => setClearDone(false), 3000);
    } catch (err: any) {
      console.error("Clear database failed:", err);
      const detail = err.response?.data?.detail;
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert(detail || "Admin privileges required. Please ensure you are logged in as an administrator.");
      } else if (!err.response || err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
        alert(`Cannot reach backend server at ${API_BASE}.\n\nPlease ensure your Python backend is running:\n• Run 'npm run backend' in a terminal\n• Or launch: scripts\\start_silent.bat`);
      } else {
        alert(`Failed to clear database: ${detail || err.message || "Unknown error"}`);
      }
    } finally {
      setClearing(false);
    }
  };

  const handleTogglePrivacy = () => {
    const newVal = !cfg.privacyMode;
    set("privacyMode", newVal);
    localStorage.setItem("si_privacy_mode", String(newVal));
    window.dispatchEvent(new Event("storage"));
  };

  const navItems = [
    { id: "identity", label: "Identity & Workspace", Icon: Fingerprint },
    { id: "ai", label: "AI Vision & Detection", Icon: Eye },
    { id: "model", label: "Model & Inference", Icon: Cpu },
    { id: "telemetry", label: "GPS & Telemetry", Icon: MapPin },
    { id: "display", label: "Display & Theme", Icon: Sun },
    { id: "privacy", label: "Privacy & Control", Icon: Shield },
    { id: "danger", label: "Danger Zone", Icon: AlertTriangle, isDanger: true },
    { id: "faq", label: "Records & FAQ", Icon: HelpCircle },
  ];

  return (
    <div className="aiconfig-root animate-in">
      {/* ── Top Header Card ── */}
      <header className="aiconfig-header">
        <div className="aiconfig-header-info">
          <div className="aiconfig-badge-strip">
            <span className="aiconfig-badge-chip">
              <Activity size={12} /> SYSTEM ENGINE CONTROL
            </span>
            <span className="aiconfig-status-chip">
              <span className="aiconfig-pulse-dot" /> ACTIVE
            </span>
          </div>
          <h1 className="aiconfig-title">System &amp; AI Configuration</h1>
          <p className="aiconfig-subtitle">
            Configure edge computer vision scoring thresholds, GPS telemetry dispersion, and privacy parameters.
          </p>
        </div>

        <div className="aiconfig-header-actions">
          <button type="button" className="aiconfig-btn-secondary" onClick={handleReset}>
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            className={`aiconfig-btn-primary ${saved ? "saved" : ""}`}
            onClick={handleSave}
          >
            {saved ? <CheckCircle size={15} /> : <Save size={15} />}
            <span>{saved ? "Changes Saved!" : "Save Changes"}</span>
          </button>
        </div>
      </header>

      {/* ── Two-Column Control Center ── */}
      <div className="aiconfig-body">
        {/* Left Sub-Sidebar */}
        <aside className="aiconfig-nav-card">
          {navItems.map(({ id, label, Icon, isDanger }) => (
            <button
              key={id}
              type="button"
              className={`aiconfig-nav-btn ${activeTab === id ? "active" : ""} ${isDanger ? "danger-nav" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        {/* Right Main Content Panel */}
        <main>
          {/* TAB 1: IDENTITY */}
          {activeTab === "identity" && (
            <div className="aiconfig-section-card">
              <div className="aiconfig-section-header">
                <div className="aiconfig-section-title-wrap">
                  <div className="aiconfig-section-icon-wrap">
                    <Fingerprint size={18} />
                  </div>
                  <h2 className="aiconfig-section-title">Identity &amp; Workspace</h2>
                </div>
                <p className="aiconfig-section-subtitle">
                  Define your deployment workspace designation, project identification, and inference runtime tags.
                </p>
              </div>

              <div className="aiconfig-fields-stack">
                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Workspace Title</label>
                    <span className="aiconfig-field-desc">Shown across system alerts and telemetry exports</span>
                  </div>
                  <div className="aiconfig-field-control">
                    <input
                      type="text"
                      className="aiconfig-input-text"
                      defaultValue="Smart-Infra AI"
                      placeholder="Project Name"
                    />
                  </div>
                </div>

                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Deployment Tag</label>
                    <span className="aiconfig-field-desc">Unique identifier for telemetry stream routing</span>
                  </div>
                  <div className="aiconfig-field-control">
                    <input
                      type="text"
                      className="aiconfig-input-text"
                      defaultValue="smart-infra-edge-system"
                      placeholder="system-tag"
                    />
                  </div>
                </div>

                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Workspace Summary</label>
                    <span className="aiconfig-field-desc">Operational scope of spatial sensor array</span>
                  </div>
                  <div className="aiconfig-field-control">
                    <textarea
                      className="aiconfig-textarea"
                      rows={3}
                      defaultValue="Autonomous roadway surface intelligence platform featuring edge neural damage detection, pothole diagnostics, and spatial GIS telemetry mapping."
                    />
                  </div>
                </div>

                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Inference Runtime</label>
                    <span className="aiconfig-field-desc">Active edge computer vision hardware acceleration</span>
                  </div>
                  <div className="aiconfig-field-control">
                    <input
                      type="text"
                      className="aiconfig-input-text readonly"
                      readOnly
                      value="YOLOv8-Nano • PyTorch 2.0"
                    />
                  </div>
                </div>

                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Instance Reference ID</label>
                    <span className="aiconfig-field-desc">Cryptographic instance fingerprint</span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-copy-box">
                      <input
                        type="text"
                        className="aiconfig-input-text readonly"
                        readOnly
                        value="Smart Infra AI - Instance-ID: 566205-782014"
                      />
                      <button
                        type="button"
                        className="aiconfig-copy-btn"
                        onClick={handleCopyId}
                        title="Copy Instance ID"
                      >
                        {copiedId ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI VISION & DETECTION */}
          {activeTab === "ai" && (
            <div className="aiconfig-section-card">
              <div className="aiconfig-section-header">
                <div className="aiconfig-section-title-wrap">
                  <div className="aiconfig-section-icon-wrap">
                    <Eye size={18} />
                  </div>
                  <h2 className="aiconfig-section-title">AI Vision &amp; Detection</h2>
                </div>
                <p className="aiconfig-section-subtitle">
                  Calibrate neural confidence cutoffs and Non-Maximum Suppression (NMS) overlap thresholds.
                </p>
              </div>

              <div className="aiconfig-fields-stack">
                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Confidence Acceptance Threshold</label>
                    <span className="aiconfig-field-desc">
                      Minimum score required to register a detection. Recommended 15%–35% for roadway scans.
                    </span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-slider-row">
                      <div className="aiconfig-slider-track-wrap">
                        <input
                          type="range" min={5} max={95} step={1}
                          value={cfg.confidence}
                          className="aiconfig-range-input"
                          onChange={e => set("confidence", Number(e.target.value))}
                        />
                        <span className="aiconfig-slider-badge">{cfg.confidence}%</span>
                      </div>
                      <div className="aiconfig-slider-ticks">
                        <span>5% (Permissive)</span>
                        <span>20% (Default)</span>
                        <span>95% (Strict)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">IoU / NMS Overlap Threshold</label>
                    <span className="aiconfig-field-desc">
                      Suppresses duplicate overlapping bounding boxes across candidate proposals.
                    </span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-slider-row">
                      <div className="aiconfig-slider-track-wrap">
                        <input
                          type="range" min={10} max={90} step={5}
                          value={cfg.iou}
                          className="aiconfig-range-input"
                          onChange={e => set("iou", Number(e.target.value))}
                        />
                        <span className="aiconfig-slider-badge">{cfg.iou}%</span>
                      </div>
                      <div className="aiconfig-slider-ticks">
                        <span>10% (Merge Overlaps)</span>
                        <span>40% (Balanced)</span>
                        <span>90% (Keep Discrete)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MODEL & INFERENCE */}
          {activeTab === "model" && (
            <div className="aiconfig-section-card">
              <div className="aiconfig-section-header">
                <div className="aiconfig-section-title-wrap">
                  <div className="aiconfig-section-icon-wrap">
                    <Cpu size={18} />
                  </div>
                  <h2 className="aiconfig-section-title">Model &amp; Inference</h2>
                </div>
                <p className="aiconfig-section-subtitle">
                  Configure tensor input resolution dimensions and per-frame annotation bounds.
                </p>
              </div>

              <div className="aiconfig-fields-stack">
                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Tensor Input Resolution</label>
                    <span className="aiconfig-field-desc">
                      640 px provides optimal accuracy on desktop; 416 px accelerates frame throughput on low-power devices.
                    </span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-chips-wrap">
                      {[320, 416, 512, 640, 768].map(o => (
                        <button
                          key={o} type="button"
                          className={`aiconfig-chip-btn ${cfg.imageSize === o ? "active" : ""}`}
                          onClick={() => set("imageSize", o)}
                        >
                          {o} px {o === 640 ? "★" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Max Spatial Target Limits</label>
                    <span className="aiconfig-field-desc">
                      Hard ceiling on the maximum number of simultaneous targets tracked per frame.
                    </span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-slider-row">
                      <div className="aiconfig-slider-track-wrap">
                        <input
                          type="range" min={5} max={200} step={5}
                          value={cfg.maxDetections}
                          className="aiconfig-range-input"
                          onChange={e => set("maxDetections", Number(e.target.value))}
                        />
                        <span className="aiconfig-slider-badge">{cfg.maxDetections} OBJ</span>
                      </div>
                      <div className="aiconfig-slider-ticks">
                        <span>5 min</span>
                        <span>50 standard</span>
                        <span>200 max</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GPS & TELEMETRY */}
          {activeTab === "telemetry" && (
            <div className="aiconfig-section-card">
              <div className="aiconfig-section-header">
                <div className="aiconfig-section-title-wrap">
                  <div className="aiconfig-section-icon-wrap">
                    <MapPin size={18} />
                  </div>
                  <h2 className="aiconfig-section-title">GPS &amp; Telemetry</h2>
                </div>
                <p className="aiconfig-section-subtitle">
                  Configure spatial simulation coordinates, city centers, and map dispersion jitter.
                </p>
              </div>

              <div className="aiconfig-fields-stack">
                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Metropolitan City Presets</label>
                    <span className="aiconfig-field-desc">
                      Instantly align coordinate origin to regional road network hubs
                    </span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-chips-wrap">
                      {CITY_PRESETS.map(c => (
                        <button
                          key={c.name} type="button"
                          className={`aiconfig-chip-btn ${cfg.gpsLat === c.lat && cfg.gpsLng === c.lng ? "active" : ""
                            }`}
                          onClick={() => { set("gpsLat", c.lat); set("gpsLng", c.lng); }}
                        >
                          📍 {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Origin Coordinates</label>
                    <span className="aiconfig-field-desc">Base GPS center latitude and longitude</span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-coords-grid">
                      <div className="aiconfig-coord-tile">
                        <span className="aiconfig-coord-label">LAT</span>
                        <input
                          type="number" step="0.0001"
                          value={cfg.gpsLat}
                          onChange={e => set("gpsLat", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="aiconfig-coord-tile">
                        <span className="aiconfig-coord-label">LNG</span>
                        <input
                          type="number" step="0.0001"
                          value={cfg.gpsLng}
                          onChange={e => set("gpsLng", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">GIS Scatter Radius</label>
                    <span className="aiconfig-field-desc">
                      Random spatial dispersion radius for simulating multiple street-level detections.
                    </span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-slider-row">
                      <div className="aiconfig-slider-track-wrap">
                        <input
                          type="range" min={1} max={100} step={1}
                          value={cfg.gpsScatter}
                          className="aiconfig-range-input"
                          onChange={e => set("gpsScatter", Number(e.target.value))}
                        />
                        <span className="aiconfig-slider-badge">{cfg.gpsScatter} m</span>
                      </div>
                      <div className="aiconfig-slider-ticks">
                        <span>1 m (Precise)</span>
                        <span>10 m (Street)</span>
                        <span>100 m (Neighborhood)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DISPLAY & THEME */}
          {activeTab === "display" && (
            <div className="aiconfig-section-card">
              <div className="aiconfig-section-header">
                <div className="aiconfig-section-title-wrap">
                  <div className="aiconfig-section-icon-wrap">
                    <Sun size={18} />
                  </div>
                  <h2 className="aiconfig-section-title">Display &amp; Theme</h2>
                </div>
                <p className="aiconfig-section-subtitle">
                  Configure visual interface mode and telemetry polling query rates.
                </p>
              </div>

              <div className="aiconfig-fields-stack">
                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Interface Appearance</label>
                    <span className="aiconfig-field-desc">Choose between Light and Dark interface palettes</span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-theme-group">
                      <button
                        type="button"
                        className={`aiconfig-theme-card ${theme === "light" ? "active" : ""}`}
                        onClick={() => theme === "dark" && toggleTheme()}
                      >
                        <Sun size={16} /> Light Mode
                      </button>
                      <button
                        type="button"
                        className={`aiconfig-theme-card ${theme === "dark" ? "active" : ""}`}
                        onClick={() => theme === "light" && toggleTheme()}
                      >
                        <Moon size={16} /> Dark Mode
                      </button>
                    </div>
                  </div>
                </div>

                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Telemetry Refresh Interval</label>
                    <span className="aiconfig-field-desc">
                      Background database polling frequency for analytics and live monitoring updates.
                    </span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-slider-row">
                      <div className="aiconfig-slider-track-wrap">
                        <input
                          type="range" min={5} max={60} step={5}
                          value={cfg.pollInterval}
                          className="aiconfig-range-input"
                          onChange={e => set("pollInterval", Number(e.target.value))}
                        />
                        <span className="aiconfig-slider-badge">{cfg.pollInterval} s</span>
                      </div>
                      <div className="aiconfig-slider-ticks">
                        <span>5s (Realtime)</span>
                        <span>10s (Optimal)</span>
                        <span>60s (Eco Mode)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRIVACY & CONTROL */}
          {activeTab === "privacy" && (
            <div className="aiconfig-section-card">
              <div className="aiconfig-section-header">
                <div className="aiconfig-section-title-wrap">
                  <div className="aiconfig-section-icon-wrap">
                    <Shield size={18} />
                  </div>
                  <h2 className="aiconfig-section-title">Privacy &amp; Compliance</h2>
                </div>
                <p className="aiconfig-section-subtitle">
                  Automated edge obfuscation of Personal Identifiable Information (PII) including faces and license plates.
                </p>
              </div>

              <div className="aiconfig-fields-stack">
                <div className="aiconfig-field-row">
                  <div className="aiconfig-field-meta">
                    <label className="aiconfig-field-label">Automated PII Gaussian Redaction</label>
                    <span className="aiconfig-field-desc">
                      When enabled, the edge detector immediately applies a 51x51 Gaussian blur to detected pedestrians, faces, and vehicular registration markers prior to storage.
                    </span>
                  </div>
                  <div className="aiconfig-field-control">
                    <div className="aiconfig-toggle-wrapper">
                      <div
                        className={`aiconfig-toggle-track ${cfg.privacyMode ? "active" : ""}`}
                        onClick={handleTogglePrivacy}
                      >
                        <div className="aiconfig-toggle-thumb" />
                      </div>
                      <span className="aiconfig-toggle-status-text">
                        {cfg.privacyMode ? "Active (PII Obfuscation Enabled)" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DANGER ZONE */}
          {activeTab === "danger" && (
            <div className="aiconfig-section-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="aiconfig-section-header">
                <div className="aiconfig-section-title-wrap">
                  <div className="aiconfig-section-icon-wrap danger-icon">
                    <AlertTriangle size={18} />
                  </div>
                  <h2 className="aiconfig-section-title" style={{ color: '#ef4444' }}>Danger Zone</h2>
                </div>
                <p className="aiconfig-section-subtitle">
                  Administrative purge operations. These actions permanently modify the spatial database.
                </p>
              </div>

              <div className="aiconfig-danger-card">
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ef4444", marginBottom: 4 }}>
                    Purge All Stored Detections &amp; Snapshot Media
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: 520, lineHeight: 1.5 }}>
                    Permanently deletes all historical detection entries from the database, removes on-disk snapshot images, and resets monitoring map markers.
                  </p>
                </div>

                <button
                  type="button"
                  className="aiconfig-btn-danger"
                  onClick={handleClearDB}
                  disabled={clearing || clearDone || !user?.is_admin}
                  title={!user?.is_admin ? "Requires administrative credentials" : ""}
                >
                  {!user?.is_admin ? (
                    "Admin Privileges Required"
                  ) : clearing ? (
                    <span>Purging Telemetry...</span>
                  ) : clearDone ? (
                    <><CheckCircle size={15} /> Database Purged</>
                  ) : (
                    <><Trash2 size={15} /> Purge All Records</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: RECORDS & FAQ */}
          {activeTab === "faq" && (
            <div className="aiconfig-section-card">
              <div className="aiconfig-section-header">
                <div className="aiconfig-section-title-wrap">
                  <div className="aiconfig-section-icon-wrap">
                    <HelpCircle size={18} />
                  </div>
                  <h2 className="aiconfig-section-title">Records &amp; Technical FAQ</h2>
                </div>
                <p className="aiconfig-section-subtitle">
                  Frequently asked operational parameters and camera sensor tuning best practices.
                </p>
              </div>

              <div className="aiconfig-faq-stack">
                {[
                  {
                    q: "What confidence threshold is recommended for roadway scanning?",
                    a: "A threshold between 15% and 35% yields optimal results for pavement distress detection. Higher values eliminate false positives in clean asphalt, while lower values help catch hairline fractures and early-stage potholes."
                  },
                  {
                    q: "How does the IoU / NMS threshold prevent duplicate boxes?",
                    a: "Non-Maximum Suppression (NMS) evaluates overlap ratios between neighboring proposal boxes. A 40% setting merges redundant duplicate detections of the same pothole while keeping adjacent defects separate."
                  },
                  {
                    q: "Which input tensor resolution is best suited for edge CPUs?",
                    a: "640 px provides an ideal balance of boundary sharpness and inference latency on typical CPUs. On constrained single-board or mobile hardware, use 416 px for higher frame throughput."
                  },
                  {
                    q: "How does GPS simulation scatter detections across the map?",
                    a: "Each detected roadway anomaly is placed within a configurable scatter radius of your chosen city center coordinates. This realistically populates the Leaflet GIS heatmaps and incident tables."
                  },
                  {
                    q: "Does AI Privacy Guard affect detection throughput?",
                    a: "Privacy Guard operates asynchronously at the edge by running local Gaussian convolution kernels only on bounding coordinates classified as people or vehicles. Infrastructure classifications remain untouched."
                  },
                ].map((item, i) => (
                  <div key={i} className="aiconfig-faq-item">
                    <button
                      type="button"
                      className="aiconfig-faq-trigger"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          flexShrink: 0,
                          color: "var(--text-muted)"
                        }}
                      />
                    </button>
                    {openFaq === i && (
                      <div className="aiconfig-faq-body">{item.a}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
