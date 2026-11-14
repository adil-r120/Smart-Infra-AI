import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { 
    Camera, MapPin, Send, CheckCircle, Navigation, Info, Upload, 
    X, AlertCircle, Loader, Calendar, Video, Download, ClipboardList, 
    Plus, Activity, Sparkles, ShieldCheck, Cpu, ArrowRight, CheckCheck,
    FileText, Clock, Wrench, RefreshCw, Layers, Mic, MicOff, Languages, Radio
} from "lucide-react";
import { API_BASE } from "../api/config";
import { useAuth } from "../context/AuthContext";
import MyReports from "../components/MyReports";
import "./ReportIssue.css";

const VOICE_LANGUAGES = [
    { code: "en-IN", label: "English (India)", flag: "🇮🇳" },
    { code: "en-US", label: "English (US)", flag: "🇺🇸" },
    { code: "hi-IN", label: "हिन्दी (Hindi)", flag: "🇮🇳" },
    { code: "mr-IN", label: "मराठी (Marathi)", flag: "🇮🇳" },
    { code: "ta-IN", label: "தமிழ் (Tamil)", flag: "🇮🇳" },
    { code: "te-IN", label: "తెలుగు (Telugu)", flag: "🇮🇳" },
    { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)", flag: "🇮🇳" },
    { code: "bn-IN", label: "বাংলা (Bengali)", flag: "🇮🇳" },
    { code: "es-ES", label: "Español (Spanish)", flag: "🇪🇸" },
];

const CATEGORIES = [
    { id: "pothole", label: "Pothole", icon: "🕳️" },
    { id: "broken_streetlight", label: "Streetlight", icon: "💡" },
    { id: "fallen_tree", label: "Fallen Tree", icon: "🌳" },
    { id: "flooding", label: "Flooding", icon: "🌊" },
    { id: "traffic_signal", label: "Traffic Signal", icon: "🚦" },
    { id: "garbage_dump", label: "Garbage Dump", icon: "🗑️" },
    { id: "road_damage", label: "Road Damage", icon: "🛣️" },
    { id: "other", label: "Other Hazard", icon: "📋" }
];

const CATEGORY_FORECAST: Record<string, { priority: string; class: string; text: string }> = {
    pothole: { priority: "High Priority", class: "priority-high", text: "⚡ Priority Code A-1 · Automated Work Order Generation" },
    broken_streetlight: { priority: "Medium Priority", class: "priority-medium", text: "💡 Priority Code B-2 · Nighttime Public Safety Routine" },
    fallen_tree: { priority: "Critical Priority", class: "priority-critical", text: "🚨 Priority Code A-0 · Roadway Obstruction Emergency" },
    flooding: { priority: "Critical Priority", class: "priority-critical", text: "🌊 Priority Code A-0 · Drainage & Flood Control Rapid Response" },
    traffic_signal: { priority: "High Priority", class: "priority-high", text: "🚦 Priority Code A-1 · Electrical & Traffic Signal Priority" },
    garbage_dump: { priority: "Medium Priority", class: "priority-medium", text: "🗑️ Priority Code B-1 · Municipal Sanitation Dispatch" },
    road_damage: { priority: "High Priority", class: "priority-high", text: "🛣️ Priority Code A-2 · Structural Asphalt Resurfacing" },
    other: { priority: "Standard Priority", class: "priority-medium", text: "📋 Standard Review · Municipal Engineering Assessment" },
};

interface ReportIssueProps {
    onReturn?: () => void;
    initialView?: "form" | "myreports";
}

const ReportIssue: React.FC<ReportIssueProps> = ({ onReturn, initialView = "form" }) => {
    const { token } = useAuth();
    const [view, setView] = useState<"form" | "myreports">(initialView);

    useEffect(() => {
        if (initialView) {
            setView(initialView);
        }
    }, [initialView]);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [location, setLocation] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [detectedIssue, setDetectedIssue] = useState<string | null>(null);
    const [locating, setLocating] = useState(false);
    const [errors, setErrors] = useState<{ file?: string; location?: string; category?: string; description?: string }>({});
    const [dragActive, setDragActive] = useState(false);
    const [webcamActive, setWebcamActive] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>(null);

    // ── Voice Dictation & Multilingual AI Parsing States ─────────────
    const [isListening, setIsListening] = useState(false);
    const [voiceLang, setVoiceLang] = useState(() => localStorage.getItem("si_voice_lang") || "en-IN");
    const [interimText, setInterimText] = useState("");
    const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    const parseVoiceTranscript = (text: string) => {
        const lower = text.toLowerCase();

        // 1. Category extraction
        let matchedCat: string | null = null;
        if (lower.includes("pothole") || lower.includes("crater") || lower.includes("gaddha") || lower.includes("hole") || lower.includes("cavity")) {
            matchedCat = "pothole";
        } else if (lower.includes("streetlight") || lower.includes("street light") || lower.includes("lamp") || lower.includes("andhera") || (lower.includes("light") && lower.includes("broken"))) {
            matchedCat = "broken_streetlight";
        } else if (lower.includes("tree") || lower.includes("branch") || lower.includes("trunk") || lower.includes("ped")) {
            matchedCat = "fallen_tree";
        } else if (lower.includes("flood") || lower.includes("water") || lower.includes("leak") || lower.includes("drain") || lower.includes("paani") || lower.includes("sewage")) {
            matchedCat = "flooding";
        } else if (lower.includes("signal") || lower.includes("traffic light") || lower.includes("red light")) {
            matchedCat = "traffic_signal";
        } else if (lower.includes("garbage") || lower.includes("trash") || lower.includes("waste") || lower.includes("kachra") || lower.includes("dump") || lower.includes("debris")) {
            matchedCat = "garbage_dump";
        } else if (lower.includes("crack") || lower.includes("fissure") || lower.includes("damage") || lower.includes("asphalt") || lower.includes("rough")) {
            matchedCat = "road_damage";
        }

        // 2. Location hints extraction (e.g. "near X", "at X", "on X", "opposite X")
        const locMatch = text.match(/\b(?:near|at|on|opposite|in front of|around|beside|across from)\s+([A-Za-z0-9\s,.-]+?)(?:\.|$|,|\b(?:and|with|there|it)\b)/i);
        let extractedLoc: string | null = null;
        if (locMatch && locMatch[1] && locMatch[1].trim().length > 3) {
            extractedLoc = locMatch[1].trim();
        }

        return { matchedCat, extractedLoc };
    };

    const stopVoiceListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore
            }
        }
        setIsListening(false);
        setInterimText("");
    };

    const toggleVoiceListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice Dictation is supported in Google Chrome, Microsoft Edge, and Safari on desktop and mobile.");
            return;
        }

        if (isListening) {
            stopVoiceListening();
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = voiceLang;

            recognition.onstart = () => {
                setIsListening(true);
                setInterimText("");
            };

            recognition.onresult = (event: any) => {
                let currentInterim = "";
                let finalTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        currentInterim += transcript;
                    }
                }

                if (currentInterim) {
                    setInterimText(currentInterim);
                }

                if (finalTranscript) {
                    const trimmed = finalTranscript.trim();
                    setDescription(prev => {
                        const cleanPrev = prev.trim();
                        if (!cleanPrev) return trimmed;
                        return `${cleanPrev} ${trimmed}`;
                    });
                    setInterimText("");

                    // Smart extraction
                    const { matchedCat, extractedLoc } = parseVoiceTranscript(trimmed);
                    const feedbackItems: string[] = [];

                    if (matchedCat && !selectedCategory) {
                        setSelectedCategory(matchedCat);
                        const catLabel = CATEGORIES.find(c => c.id === matchedCat)?.label;
                        feedbackItems.push(`Auto-categorized: ${catLabel}`);
                    }

                    if (extractedLoc && !location) {
                        setLocation(extractedLoc);
                        feedbackItems.push(`Auto-filled Location: "${extractedLoc}"`);
                    }

                    if (feedbackItems.length > 0) {
                        setVoiceFeedback(feedbackItems.join(" • "));
                        setTimeout(() => setVoiceFeedback(null), 5000);
                    }
                }
            };

            recognition.onerror = (event: any) => {
                console.warn("[Voice] Speech recognition error:", event.error);
                if (event.error === "not-allowed") {
                    setErrors(prev => ({ ...prev, description: "Microphone access denied. Please allow microphone permissions in your browser." }));
                }
                stopVoiceListening();
            };

            recognition.onend = () => {
                setIsListening(false);
                setInterimText("");
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error("[Voice] Initialization failed:", err);
            setIsListening(false);
        }
    };

    const handleVoiceLanguageChange = (newLang: string) => {
        setVoiceLang(newLang);
        localStorage.setItem("si_voice_lang", newLang);
        if (isListening) {
            stopVoiceListening();
            setTimeout(() => {
                toggleVoiceListening();
            }, 200);
        }
    };

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {}
            }
        };
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleExportDatabase = () => {
        window.open(`${API_BASE}/export`, '_blank');
    };

    const startWebcam = (e: React.MouseEvent) => {
        e.stopPropagation();
        setWebcamActive(true);
        setErrors(prev => ({ ...prev, file: undefined }));
        
        setTimeout(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: { ideal: 'environment' } } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(err => console.error("[CAM] Play error:", err));
                }
                streamRef.current = stream;
            } catch (err) {
                console.error("[CAM] getUserMedia failed:", err);
                setErrors(prev => ({ ...prev, file: 'Camera access denied or unavailable.' }));
                setWebcamActive(false);
            }
        }, 120);
    };

    const stopWebcam = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setWebcamActive(false);
    };

    const capturePhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                const capturedFile = new File([blob], `evidence_${Date.now()}.jpg`, { type: "image/jpeg" });
                setFile(capturedFile);
                setPreview(URL.createObjectURL(blob));
                stopWebcam();
            }
        }, "image/jpeg", 0.85);
    };

    useEffect(() => {
        return () => stopWebcam();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (!selected.type.startsWith('image/')) {
                setErrors(prev => ({ ...prev, file: 'Please select a valid image file (JPG, PNG, WEBP)' }));
                return;
            }
            if (selected.size > 10 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, file: 'Image size should be less than 10MB' }));
                return;
            }
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setErrors(prev => ({ ...prev, file: undefined }));
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setErrors(prev => ({ ...prev, location: 'Geolocation is not supported by your browser' }));
            return;
        }
        setLocating(true);
        setErrors(prev => ({ ...prev, location: undefined }));
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                setLocation(coords);
                setLocating(false);
            },
            () => {
                setErrors(prev => ({ ...prev, location: 'Unable to retrieve location. Please grant permission or type manually.' }));
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCategoryClick = (catId: string) => {
        setSelectedCategory(catId);
        setErrors(prev => ({ ...prev, category: undefined }));

        const category = CATEGORIES.find(c => c.id === catId);
        if (category) {
            setDescription(prev => {
                const val = prev.trim();
                if (val.length === 0) return `${category.label} - `;
                if (val.startsWith(`${category.label} -`)) return prev;
                return `${category.label} - ${val}`;
            });
        }
    };

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!file) {
            newErrors.file = 'Please upload or capture an image of the infrastructure issue';
        }
        if (!location.trim()) {
            newErrors.location = 'Please provide the street location or GPS coordinates';
        }
        if (!selectedCategory) {
            newErrors.category = 'Please select an issue category';
        }
        if (!description.trim()) {
            newErrors.description = 'Please describe the issue details';
        } else if (description.trim().length < 10) {
            newErrors.description = 'Description must be at least 10 characters long';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setErrors({});

        const formData = new FormData();
        formData.append("image", file!);
        formData.append("location", location);
        formData.append("report_type", selectedCategory!);
        formData.append("description", description);

        try {
            const res = await axios.post(`${API_BASE}/report`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                timeout: 30000
            });
            setSuccess(true);
            setDetectedIssue(res.data.detected_issue);
            setTicketId(res.data.report_id ? `#TKT-${res.data.report_id}` : `#TKT-${Math.floor(1000 + Math.random() * 9000)}`);
            resetForm();
        } catch (err: any) {
            console.error("Failed to submit report", err);

            let errorMsg = "Error submitting report. Please try again.";
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (Array.isArray(detail)) {
                    errorMsg = detail.map(d => d.msg || JSON.stringify(d)).join(", ");
                } else if (typeof detail === 'string') {
                    errorMsg = detail;
                }
            } else if (err.message) {
                errorMsg = err.message;
            }

            if (errorMsg.includes("AI Verification Failed")) {
                setErrors(prev => ({ 
                    ...prev, 
                    file: errorMsg,
                    description: `Submission rejected: ${errorMsg}` 
                }));
            } else {
                setErrors(prev => ({ ...prev, description: `Submission failed: ${errorMsg}` }));
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setPreview(null);
        setLocation("");
        setSelectedCategory(null);
        setDescription("");
        setErrors({});
        stopVoiceListening();
        setInterimText("");
        setVoiceFeedback(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            setFile(droppedFile);
            setPreview(URL.createObjectURL(droppedFile));
            setErrors(prev => ({ ...prev, file: undefined }));
        } else {
            setErrors(prev => ({ ...prev, file: 'Please drop a valid image file' }));
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreview(null);
        setErrors(prev => ({ ...prev, file: undefined }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="report-page-root animate-in">
            {/* ── Subheader Card with Segmented Controls ── */}
            <div className="report-header-card">
                <div className="report-header-info">
                    <div className="report-badge-strip">
                        <span className="report-badge-chip">
                            <Activity size={12} /> INFRASTRUCTURE PORTAL
                        </span>
                        <span className="report-status-pill">
                            <span className="report-pulse-dot" />  Active
                        </span>
                    </div>
                    <h2 className="report-header-title">
                        {view === "form" ? "Report Infrastructure Issue" : "Incident Lifecycle & Tracking"}
                    </h2>
                    <p className="report-header-subtitle">
                        {view === "form"
                            ? "Submit roadway hazards, damaged utilities, or surface defects for automated neural inspection and rapid work crew dispatch."
                            : "Monitor verified milestones, field crew work orders, and resolution confirmation across all reported issues."}
                    </p>
                </div>

                <div className="report-header-actions">
                    {/* View Segmented Switcher */}
                    <div className="report-toggle-group">
                        <button
                            type="button"
                            className={`report-toggle-btn ${view === 'form' ? 'active' : ''}`}
                            onClick={() => setView('form')}
                        >
                            <Plus size={15} />
                            <span>Report Issue</span>
                        </button>
                        <button
                            type="button"
                            className={`report-toggle-btn ${view === 'myreports' ? 'active' : ''}`}
                            onClick={() => setView('myreports')}
                        >
                            <ClipboardList size={15} />
                            <span>Reports & Tracker</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        className="report-export-btn"
                        onClick={handleExportDatabase}
                        title="Export infrastructure dataset to CSV"
                    >
                        <Download size={15} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* ── VIEW SWITCHING: FORM VS TRACKER ── */}
            {view === "myreports" ? (
                <div className="animate-in">
                    <MyReports onReportNew={() => setView("form")} />
                </div>
            ) : success ? (
                /* ── SUCCESS HOLOGRAPHIC TICKET SCREEN ── */
                <div className="report-success-screen">
                    <div className="report-success-orb">
                        <CheckCheck size={42} strokeWidth={2.5} />
                    </div>

                    <h2 className="report-success-title">Incident Successfully Registered</h2>
                    <p className="report-success-desc">
                        Your public report {ticketId && <strong>{ticketId}</strong>} has been logged into the municipal spatial database and forwarded to the appropriate maintenance department.
                    </p>

                    {/* AI Detection Result Banner */}
                    <div className="report-success-ai-box">
                        <div>
                            <div className="report-success-ai-label">Neural Classification</div>
                            <div className="report-success-ai-issue">
                                {detectedIssue || "Pavement Distress Detected"}
                            </div>
                        </div>
                        <span className="report-success-ai-confidence">
                            <Sparkles size={13} /> High Confidence
                        </span>
                    </div>

                    {/* 3 Step Milestone Forecast */}
                    <div className="report-success-steps-grid">
                        <div className="report-success-step-tile">
                            <div className="report-step-circle-num">1</div>
                            <div>
                                <div className="report-step-tile-title">AI Triage</div>
                                <div className="report-step-tile-desc">Damage classification & severity scoring complete.</div>
                            </div>
                        </div>
                        <div className="report-success-step-tile">
                            <div className="report-step-circle-num">2</div>
                            <div>
                                <div className="report-step-tile-title">Work Order</div>
                                <div className="report-step-tile-desc">Dispatched to regional engineering maintenance crew.</div>
                            </div>
                        </div>
                        <div className="report-success-step-tile">
                            <div className="report-step-circle-num">3</div>
                            <div>
                                <div className="report-step-tile-title">Resolution</div>
                                <div className="report-step-tile-desc">Field repair executed and verified with proof photos.</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="report-success-actions">
                        <button
                            type="button"
                            className="report-success-primary-btn"
                            onClick={() => { setSuccess(false); setView("myreports"); }}
                        >
                            <ClipboardList size={16} /> Track Resolution Steps
                        </button>
                        <button
                            type="button"
                            className="report-success-secondary-btn"
                            onClick={() => { setSuccess(false); resetForm(); setView("form"); }}
                        >
                            <Plus size={16} /> Report Another Issue
                        </button>
                        {onReturn && (
                            <button
                                type="button"
                                className="report-success-secondary-btn"
                                onClick={onReturn}
                            >
                                Dashboard Home
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                /* ── FORM SUBMISSION GRID ── */
                <form onSubmit={handleSubmit} className="report-form-grid">
                    {/* LEFT: EVIDENCE TERMINAL */}
                    <div className="report-media-column">
                        <div
                            className={`report-dropzone-frame ${dragActive ? 'drag-active' : ''} ${preview || webcamActive ? 'has-content' : ''}`}
                            onClick={() => !webcamActive && !preview && fileInputRef.current?.click()}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {/* Sci-Fi Corner Accents */}
                            <div className="hud-corner hud-corner-tl" />
                            <div className="hud-corner hud-corner-tr" />
                            <div className="hud-corner hud-corner-bl" />
                            <div className="hud-corner hud-corner-br" />

                            {webcamActive ? (
                                <div className="report-webcam-box" onClick={(e) => e.stopPropagation()}>
                                    <video ref={videoRef} autoPlay playsInline muted className="report-webcam-video" />
                                    <div className="report-scan-laser" />
                                    <div className="report-webcam-controls">
                                        <button
                                            type="button"
                                            className="report-cam-capture-btn"
                                            onClick={capturePhoto}
                                        >
                                            <Camera size={16} /> Capture Photo
                                        </button>
                                        <button
                                            type="button"
                                            className="report-cam-cancel-btn"
                                            onClick={stopWebcam}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : preview ? (
                                <div className="report-preview-container" onClick={(e) => e.stopPropagation()}>
                                    <img src={preview} alt="Evidence preview" className="report-preview-img" />
                                    <div
                                        className="report-preview-overlay"
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Click to select another photo"
                                    >
                                        <Upload size={16} /> Click or drop new photo to replace
                                    </div>
                                    <button
                                        type="button"
                                        className="report-preview-remove-btn"
                                        onClick={removeFile}
                                        title="Remove photo"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="report-empty-content">
                                    <div className="report-upload-orb">
                                        <Upload size={32} />
                                    </div>
                                    <h3 className="report-empty-title">
                                        {dragActive ? "Release Photo to Attach Evidence" : "Upload or Capture Roadway Evidence"}
                                    </h3>
                                    <p className="report-empty-desc">
                                        Drag & drop damage snapshots, or capture directly with your camera. Neural vision automatically determines distress category.
                                    </p>
                                    <div className="report-actions-row">
                                        <button
                                            type="button"
                                            className="report-browse-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            <Upload size={15} /> Choose Photo
                                        </button>
                                        <button
                                            type="button"
                                            className="report-cam-btn"
                                            onClick={startWebcam}
                                        >
                                            <Video size={15} /> Open Camera
                                        </button>
                                    </div>
                                    <div className="report-format-tags">
                                        <span className="report-format-chip">JPG</span>
                                        <span className="report-format-chip">PNG</span>
                                        <span className="report-format-chip">WEBP</span>
                                        <span className="report-format-chip">MAX 10MB</span>
                                    </div>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {errors.file && (
                            <div className="report-field-error">
                                <AlertCircle size={15} />
                                <span>{errors.file}</span>
                            </div>
                        )}

                        {/* AI Vision Feature Callout */}
                        <div className="report-ai-assistant-card">
                            <div className="report-ai-icon-wrap">
                                <Cpu size={20} />
                            </div>
                            <div>
                                <h4 className="report-ai-card-title">Neural Edge Verification</h4>
                                <p className="report-ai-card-desc">
                                    Our multi-class detector evaluates surface fissures, potholes, and physical hazards to assign severity weighting and coordinate municipal work crews.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: INCIDENT DETAILS FORM */}
                    <div className="report-form-card">
                        {/* Location Field */}
                        <div className="report-field-group">
                            <div className="report-field-header">
                                <label className="report-field-label">
                                    Exact Incident Location <span className="report-required-mark">*</span>
                                </label>
                                <span className="report-field-hint">Street, landmark, or GPS</span>
                            </div>
                            <div className="report-location-row">
                                <div className="report-input-icon-wrap">
                                    <MapPin size={18} className="report-input-icon" />
                                    <input
                                        type="text"
                                        placeholder="e.g. 5th Avenue & Main St, or click Locate Me"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className={`report-text-input ${errors.location ? 'input-error' : ''}`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="report-gps-btn"
                                    onClick={handleGetLocation}
                                    disabled={locating}
                                    title="Fetch current coordinates via browser GPS"
                                >
                                    {locating ? <Loader size={16} className="animate-spin" /> : <Navigation size={16} />}
                                    <span>{locating ? "Locating..." : "Locate Me"}</span>
                                </button>
                            </div>
                            {errors.location && (
                                <div className="report-field-error">
                                    <AlertCircle size={14} />
                                    <span>{errors.location}</span>
                                </div>
                            )}
                        </div>

                        {/* Issue Category Field */}
                        <div className="report-field-group">
                            <div className="report-field-header">
                                <label className="report-field-label">
                                    Issue Classification <span className="report-required-mark">*</span>
                                </label>
                                <span className="report-field-hint">Select primary anomaly</span>
                            </div>
                            <div className="report-categories-grid">
                                {CATEGORIES.map(cat => (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        className={`report-cat-tile ${selectedCategory === cat.id ? 'selected' : ''}`}
                                        onClick={() => handleCategoryClick(cat.id)}
                                    >
                                        <span className="report-cat-icon">{cat.icon}</span>
                                        <span>{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                            {errors.category && (
                                <div className="report-field-error">
                                    <AlertCircle size={14} />
                                    <span>{errors.category}</span>
                                </div>
                            )}

                            {/* Dynamic Severity / Forecast Chip */}
                            {selectedCategory && CATEGORY_FORECAST[selectedCategory] && (
                                <div className={`report-forecast-chip ${CATEGORY_FORECAST[selectedCategory].class}`}>
                                    <Sparkles size={14} />
                                    <span>{CATEGORY_FORECAST[selectedCategory].text}</span>
                                </div>
                            )}
                        </div>

                        {/* Description Textarea with Voice Dictation */}
                        <div className="report-field-group">
                            <div className="report-field-header">
                                <label className="report-field-label">
                                    Detailed Observation <span className="report-required-mark">*</span>
                                </label>
                                <span className="report-field-hint">
                                    {description.trim().length >= 10 ? (
                                        <span style={{ color: '#10b981', fontWeight: 800 }}>
                                            ✓ {description.trim().length} chars
                                        </span>
                                    ) : (
                                        `${description.trim().length} / 10 min chars`
                                    )}
                                </span>
                            </div>

                            {/* Voice Dictation & Multilingual AI Toolbar */}
                            <div className={`report-voice-panel ${isListening ? 'listening' : ''}`}>
                                <div className="report-voice-main">
                                    <button
                                        type="button"
                                        className={`report-voice-mic-btn ${isListening ? 'listening' : ''}`}
                                        onClick={toggleVoiceListening}
                                        title={isListening ? "Stop Voice Dictation" : "Start Voice Dictation"}
                                    >
                                        {isListening ? (
                                            <>
                                                <MicOff size={15} />
                                                <span className="report-voice-waves">
                                                    <span className="voice-wave-bar bar1" />
                                                    <span className="voice-wave-bar bar2" />
                                                    <span className="voice-wave-bar bar3" />
                                                </span>
                                                <span>Stop Listening</span>
                                            </>
                                        ) : (
                                            <>
                                                <Mic size={15} />
                                                <span>🎙️ Voice Dictation</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Language Selector */}
                                    <div className="report-voice-lang-wrap">
                                        <Languages size={13} className="report-voice-lang-icon" />
                                        <select
                                            value={voiceLang}
                                            onChange={(e) => handleVoiceLanguageChange(e.target.value)}
                                            className="report-voice-lang-select"
                                            title="Speech Recognition Language"
                                        >
                                            {VOICE_LANGUAGES.map(lang => (
                                                <option key={lang.code} value={lang.code}>
                                                    {lang.flag} {lang.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {description && (
                                        <button
                                            type="button"
                                            className="report-voice-clear-btn"
                                            onClick={() => setDescription("")}
                                            title="Clear Observation Text"
                                        >
                                            Clear Text
                                        </button>
                                    )}
                                </div>

                                {/* Live interim transcript feedback */}
                                {isListening && interimText && (
                                    <div className="report-voice-live-text animate-pulse">
                                        <Radio size={12} className="report-voice-live-dot" />
                                        <span>"{interimText}"</span>
                                    </div>
                                )}

                                {/* AI extraction feedback badge */}
                                {voiceFeedback && (
                                    <div className="report-voice-ai-feedback animate-in">
                                        <Sparkles size={13} />
                                        <span>{voiceFeedback}</span>
                                    </div>
                                )}
                            </div>

                            <textarea
                                placeholder="Describe condition, traffic impact, and surrounding landmarks... or click '🎙️ Voice Dictation' to speak."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className={`report-textarea ${errors.description ? 'input-error' : ''}`}
                            />
                            {errors.description && (
                                <div className="report-field-error">
                                    <AlertCircle size={14} />
                                    <span>{errors.description}</span>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="report-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader size={18} className="animate-spin" />
                                    <span>Processing & Registering Incident...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    <span>Submit Incident Report</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ReportIssue;
