import React, { useState, useEffect } from "react";
import {
    LifeBuoy, PhoneCall, Phone, AlertTriangle, Ambulance,
    Flame, Zap, MapPin, Copy, Check, Share2, ExternalLink,
    Navigation, Shield, Car, AlertOctagon, ArrowRight
} from "lucide-react";
import "./RoadEmergency.css";

interface RoadEmergencyProps {
    onNavigateToReport?: () => void;
}

interface Helpline {
    id: string;
    title: string;
    subtitle: string;
    number: string;
    category: "critical" | "medical" | "highway" | "municipal" | "utility";
    icon: React.ComponentType<{ size?: number; className?: string }>;
    description: string;
}

const HELPLINES: Helpline[] = [
    {
        id: "national_sos",
        title: "National Emergency Response (ERSS)",
        subtitle: "Police, Disaster & Rapid Response",
        number: "112",
        category: "critical",
        icon: AlertOctagon,
        description: "Unified 24x7 pan-India emergency number for immediate police intervention and disaster distress."
    },
    {
        id: "medical_ambulance",
        title: "Emergency Ambulance & Trauma",
        subtitle: "Road Accident Critical Care",
        number: "108",
        category: "medical",
        icon: Ambulance,
        description: "Dispatches trauma ambulances and paramedics with emergency life-support directly to highway & city accident sites."
    },
    {
        id: "highway_nhai",
        title: "NHAI Highway Emergency Help",
        subtitle: "National Highways & Expressways",
        number: "1033",
        category: "highway",
        icon: Car,
        description: "Ministry of Road Transport (MoRTH) toll-free emergency service for towing, crane clearance, and highway debris."
    },
    {
        id: "municipal_disaster",
        title: "Municipal Disaster Control Room",
        subtitle: "Road Cave-ins & Open Manholes",
        number: "1916",
        category: "municipal",
        icon: Shield,
        description: "Direct line to city corporation emergency engineering squads for water main ruptures, sinkholes, and structural hazards."
    },
    {
        id: "traffic_police",
        title: "Traffic Police Helpline",
        subtitle: "Gridlock & Roadway Accidents",
        number: "1095",
        category: "critical",
        icon: PhoneCall,
        description: "City traffic management room for reporting severe pileups, road blockades, and signal outages."
    },
    {
        id: "power_hazard",
        title: "Electrical Gridline Hazard",
        subtitle: "Fallen Live Wires & Transformers",
        number: "1912",
        category: "utility",
        icon: Zap,
        description: "Emergency electricity board dispatch for exposed street cables, sparking transformers, and fallen high-voltage lines."
    },
    {
        id: "fire_rescue",
        title: "Fire & Road Rescue Squad",
        subtitle: "Vehicle Extraction & Hazards",
        number: "101",
        category: "critical",
        icon: Flame,
        description: "Hydraulic vehicle cutters, chemical road spill mitigation, and fallen tree clearance squads."
    },
    {
        id: "towing_service",
        title: "24x7 Roadside Recovery & Towing",
        subtitle: "Mechanical Breakdown Dispatch",
        number: "1800-102-1800",
        category: "highway",
        icon: LifeBuoy,
        description: "Authorized heavy-duty flatbed towing, flat tyre assistance, and vehicle crane extraction."
    }
];

const SAFETY_PROTOCOLS = [
    {
        title: "Waterlogged Road / Submerged Crater",
        desc: "If floodwater is above the wheel rim, never attempt to cross. Do not restart an engine that stalled in water to prevent hydraulic lock. Turn on hazard blinkers and call 1916.",
        icon: AlertTriangle
    },
    {
        title: "Major Asphalt Cave-In / Open Trench",
        desc: "Park at least 25 meters upstream of the hole. Turn on double hazard lights. Place reflective warning triangles. Call 1033 on highways or 112 on city arterial roads.",
        icon: AlertOctagon
    },
    {
        title: "Fallen Live High-Voltage Cable",
        desc: "Stay inside your vehicle — the rubber tires act as insulators. Never step onto the ground near a cable. Call 1912 immediately and warn pedestrians to maintain a 15-meter radius.",
        icon: Zap
    },
    {
        title: "Accident Collision & Vehicle Fire",
        desc: "Turn off vehicle ignition immediately. Check passengers for trauma without moving injured necks unless fire is present. Call 108 for medical trauma and 112 for police.",
        icon: Flame
    }
];

const RoadEmergency: React.FC<RoadEmergencyProps> = ({ onNavigateToReport }) => {
    const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
    const [copiedSos, setCopiedSos] = useState(false);
    const [locationText, setLocationText] = useState<string>("Locating via GPS...");
    const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);

    const fetchGps = () => {
        if (!navigator.geolocation) {
            setLocationText("GPS not supported on this browser.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = parseFloat(pos.coords.latitude.toFixed(5));
                const lng = parseFloat(pos.coords.longitude.toFixed(5));
                setGpsCoords({ lat, lng });
                setLocationText(`Lat: ${lat}, Lng: ${lng}`);
                setLocating(false);
            },
            () => {
                setLocationText("Location permission denied. Please allow GPS access.");
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    useEffect(() => {
        fetchGps();
    }, []);

    const handleCopyNumber = (num: string) => {
        navigator.clipboard.writeText(num);
        setCopiedNumber(num);
        setTimeout(() => setCopiedNumber(null), 2500);
    };

    const getSosMessage = () => {
        if (gpsCoords) {
            return `🚨 ROADWAY DISTRESS SOS: I require immediate road assistance.\n📍 Coordinates: ${gpsCoords.lat}, ${gpsCoords.lng}\n🗺️ Live Map: https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}\nSent via Smart-Infra AI Emergency Portal.`;
        }
        return `🚨 ROADWAY DISTRESS SOS: I require immediate emergency assistance on the roadway. Sent via Smart-Infra AI Emergency Portal.`;
    };

    const handleCopySosMessage = () => {
        navigator.clipboard.writeText(getSosMessage());
        setCopiedSos(true);
        setTimeout(() => setCopiedSos(false), 3000);
    };

    const handleShareWhatsapp = () => {
        const text = encodeURIComponent(getSosMessage());
        window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    };

    return (
        <div className="emergency-root animate-in">
            {/* ── Top Emergency Header Banner ── */}
            <div className="emergency-hero-card">
                <div className="emergency-hero-orb" />
                <div className="emergency-hero-content">
                    <div className="emergency-badge-strip">
                        <span className="emergency-badge-chip">
                            <LifeBuoy size={14} className="emergency-spin" />
                            <span>24x7 Road Rescue Network</span>
                        </span>
                        <span className="emergency-status-live">
                            <span className="emergency-dot" />
                            <span>Emergency Gateways Active</span>
                        </span>
                    </div>

                    <h1 className="emergency-title">
                        Roadside Emergency & Helplines
                    </h1>
                    <p className="emergency-subtitle">
                        Direct toll-free speed-dials to National Highways (1033), Municipal Disaster Control (1916), Police (112), and Trauma Paramedics (108).
                    </p>
                </div>

                {/* ── Location SOS Card ── */}
                <div className="emergency-sos-box">
                    <div className="emergency-sos-header">
                        <div className="emergency-sos-label">
                            <MapPin size={16} />
                            <span>Your Live Distress GPS</span>
                        </div>
                        <button
                            type="button"
                            className="emergency-refresh-gps-btn"
                            onClick={fetchGps}
                            disabled={locating}
                            title="Refresh GPS Coordinates"
                        >
                            <Navigation size={13} className={locating ? "animate-spin" : ""} />
                            <span>{locating ? "Locating..." : "Refresh GPS"}</span>
                        </button>
                    </div>

                    <div className="emergency-sos-coords">
                        <code>{locationText}</code>
                    </div>

                    <div className="emergency-sos-actions">
                        <button
                            type="button"
                            className="emergency-sos-copy-btn"
                            onClick={handleCopySosMessage}
                        >
                            {copiedSos ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedSos ? "SOS Copied!" : "Copy SOS SMS"}</span>
                        </button>
                        <button
                            type="button"
                            className="emergency-sos-wa-btn"
                            onClick={handleShareWhatsapp}
                        >
                            <Share2 size={14} />
                            <span>Share Location</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Emergency Quick Dials Grid ── */}
            <div className="emergency-section-header">
                <div>
                    <h2 className="emergency-section-title">Emergency Toll-Free Helplines</h2>
                    <p className="emergency-section-desc">Tap "Call Now" to trigger phone dialer directly from mobile devices</p>
                </div>
            </div>

            <div className="emergency-grid">
                {HELPLINES.map((item) => {
                    const IconComponent = item.icon;
                    const isCopied = copiedNumber === item.number;

                    return (
                        <div key={item.id} className={`emergency-card cat-${item.category}`}>
                            <div className="emergency-card-top">
                                <div className="emergency-card-icon-wrap">
                                    <IconComponent size={22} />
                                </div>
                                <div className="emergency-card-meta">
                                    <div className="emergency-card-title">{item.title}</div>
                                    <div className="emergency-card-subtitle">{item.subtitle}</div>
                                </div>
                            </div>

                            <p className="emergency-card-desc">{item.description}</p>

                            <div className="emergency-card-footer">
                                <div className="emergency-card-number-box">
                                    <span className="emergency-number">{item.number}</span>
                                    <button
                                        type="button"
                                        className="emergency-icon-btn"
                                        onClick={() => handleCopyNumber(item.number)}
                                        title="Copy Phone Number"
                                    >
                                        {isCopied ? <Check size={15} style={{ color: '#10b981' }} /> : <Copy size={15} />}
                                    </button>
                                </div>

                                <a
                                    href={`tel:${item.number}`}
                                    className="emergency-call-btn"
                                    title={`Call ${item.title}`}
                                >
                                    <Phone size={15} />
                                    <span>Call Now</span>
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Rapid Nearby Services Finder ── */}
            <div className="emergency-nearby-banner">
                <div className="emergency-nearby-left">
                    <h3 className="emergency-nearby-title">Need Nearby Physical Facilities?</h3>
                    <p className="emergency-nearby-desc">
                        Instantly open GPS mapping to route to the nearest emergency trauma center, 24-hour fuel pump, or local police station.
                    </p>
                </div>
                <div className="emergency-nearby-btns">
                    <a
                        href="https://www.google.com/maps/search/Trauma+Center+Hospital+near+me/"
                        target="_blank"
                        rel="noreferrer"
                        className="emergency-nearby-pill"
                    >
                        <Ambulance size={15} />
                        <span>Nearest Trauma Hospital</span>
                        <ExternalLink size={12} />
                    </a>
                    <a
                        href="https://www.google.com/maps/search/Police+Station+near+me/"
                        target="_blank"
                        rel="noreferrer"
                        className="emergency-nearby-pill"
                    >
                        <Shield size={15} />
                        <span>Nearest Police Station</span>
                        <ExternalLink size={12} />
                    </a>
                    <a
                        href="https://www.google.com/maps/search/24+hour+Petrol+Pump+near+me/"
                        target="_blank"
                        rel="noreferrer"
                        className="emergency-nearby-pill"
                    >
                        <Car size={15} />
                        <span>24x7 Fuel & EV Station</span>
                        <ExternalLink size={12} />
                    </a>
                </div>
            </div>

            {/* ── Emergency Safety Protocols ── */}
            <div className="emergency-section-header" style={{ marginTop: 24 }}>
                <div>
                    <h2 className="emergency-section-title">Critical Roadside Triage Protocols</h2>
                    <p className="emergency-section-desc">Immediate actions mandated for public roadway hazards</p>
                </div>
            </div>

            <div className="emergency-safety-grid">
                {SAFETY_PROTOCOLS.map((protocol, idx) => {
                    const ProtoIcon = protocol.icon;
                    return (
                        <div key={idx} className="emergency-safety-card">
                            <div className="emergency-safety-icon-wrap">
                                <ProtoIcon size={20} />
                            </div>
                            <div className="emergency-safety-info">
                                <h4 className="emergency-safety-title">{protocol.title}</h4>
                                <p className="emergency-safety-desc">{protocol.desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Non-Urgent Return to Hazard Reporting ── */}
            {onNavigateToReport && (
                <div className="emergency-nonurgent-card">
                    <div>
                        <div className="emergency-nonurgent-title">Not an immediate life-safety emergency?</div>
                        <div className="emergency-nonurgent-desc">
                            Report non-critical potholes, broken streetlights, or drainage fissures with photo evidence for municipal repair scheduling.
                        </div>
                    </div>
                    <button
                        type="button"
                        className="emergency-nonurgent-btn"
                        onClick={onNavigateToReport}
                    >
                        <span>Report Road Damage</span>
                        <ArrowRight size={15} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default RoadEmergency;
