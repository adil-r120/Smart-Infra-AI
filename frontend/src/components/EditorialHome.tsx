import React, { useEffect, useRef, useState } from "react";
import { 
  Scan, Activity, Users, ArrowRight, Sparkles, X, CheckCircle2, 
  Shield, Eye, ChevronDown, MapPin, Cpu, FileText, BarChart3, 
  Layers, Radio, TrendingUp, AlertTriangle, ExternalLink, Zap,
  Check, XCircle, Clock, Server, Sliders, Database, Bot, Bell,
  ShieldCheck, Wrench, Navigation, CheckCircle, Sun, Moon, ArrowUp, ClipboardList
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./EditorialHome.css";

interface EditorialHomeProps {
  setActiveTab?: (tab: string) => void;
  theme?: string;
  toggleTheme?: () => void;
}

const COMPARISON_DATA = [
  {
    feature: "Hazard Detection & Inspection",
    traditional: "Manual patrols with visual inspection; slow, subjective, and prone to human error.",
    smartInfra: "Autonomous YOLOv8 neural network delivering real-time detection in <25ms per frame.",
    traditionalAdvantage: false,
  },
  {
    feature: "Road Network Coverage",
    traditional: "Less than 15% of municipal streets inspected per year due to vehicle and crew limits.",
    smartInfra: "100% continuous coverage as municipal patrol fleets, transit buses, and smartphones passively scan.",
    traditionalAdvantage: false,
  },
  {
    feature: "Deduplication & Centroid Tracking",
    traditional: "Multiple officers and citizens file redundant reports for the same defect, clogging queues.",
    smartInfra: "Integrated centroid tracking & spatial proximity algorithms auto-merge duplicate detections.",
    traditionalAdvantage: false,
  },
  {
    feature: "Geospatial Intelligence",
    traditional: "Static paper logs and disconnected spreadsheets without GPS spatial coordinates.",
    smartInfra: "Interactive GIS maps with live coordinate telemetry, severity-coded pins, and cluster heatmaps.",
    traditionalAdvantage: false,
  },
  {
    feature: "Citizen Reporting & Transparency",
    traditional: "Phone calls and slow web forms with zero feedback on repair ticket progress.",
    smartInfra: "Instant AI-assisted mobile photo scanning with automatic damage classification and real-time status tracking.",
    traditionalAdvantage: false,
  },
  {
    feature: "Work-Order Dispatch Turnaround",
    traditional: "14 to 30 days manual administrative lag before field maintenance crews receive orders.",
    smartInfra: "Instant automated dispatch prioritizing urgent road sections and logging repair history.",
    traditionalAdvantage: false,
  },
  {
    feature: "Infrastructure & Hardware Cost",
    traditional: "Specialized survey trucks costing upwards of $200k+ each with proprietary sensors.",
    smartInfra: "Lightweight edge deployment running on standard patrol dashcams, webcams, and mobile devices.",
    traditionalAdvantage: false,
  },
];

const DETAILED_FEATURES = [
  {
    icon: Scan,
    tag: "EDGE COMPUTER VISION",
    title: "YOLOv8 Real-Time Damage Segmentation",
    description: "Deep-learning models custom-trained to detect potholes, severe road cracks, surface fissures, and dangerous debris at 30+ frames per second.",
    specs: ["Sub-25ms inference latency", "Centroid tracker to prevent duplicates", "Multi-class surface damage scoring"],
  },
  {
    icon: Cpu,
    tag: "HARDWARE OPTIMIZATION",
    title: "Intel OpenVINO Acceleration",
    description: "Quantized model pipelines optimized for standard CPU hardware, enabling deployment on everyday municipal patrol vehicles without expensive dedicated GPUs.",
    specs: ["Intel OpenVINO runtime", "High throughput edge inference", "Low thermal & power footprint"],
  },
  {
    icon: MapPin,
    tag: "SPATIAL TELEMETRY",
    title: "Interactive GIS Density Heatmaps",
    description: "High-precision coordinate plotting using Leaflet GIS. Visualizes hazard severity clusters, incident densities, and calculates municipal road health scores.",
    specs: ["Severity-coded incident markers", "Dynamic risk density heatmaps", "Automated GPS coordinate tagging"],
  },
  {
    icon: FileText,
    tag: "PUBLIC ENGAGEMENT",
    title: "Citizen Incident Reporting Portal",
    description: "Streamlined public portal where city residents can photograph road defects, leverage automated AI damage verification, and track municipal repairs from submission to resolution.",
    specs: ["Instant AI photo validation", "Geotagged incident submission", "Live ticket resolution updates"],
  },
  {
    icon: ShieldCheck,
    tag: "GOVERNANCE & AUDIT",
    title: "Municipal Admin Dispatch Console",
    description: "Enterprise command center for city civil engineers and administrators to triage hazard reports, assign field maintenance crews, and manage verified repair lifecycles.",
    specs: ["Role-based access security", "Work-order lifecycle management", "Exportable audit logs & records"],
  },
  {
    icon: Bot,
    tag: "PREDICTIVE ADVISORY",
    title: "AI Urban Infrastructure Copilot",
    description: "LLM-powered municipal advisor providing civil repair cost estimations, urgent hazard priority rankings, and seasonal weather risk advisories.",
    specs: ["Smart repair cost forecasting", "Prioritized dispatch advisories", "Interactive voice & text assistant"],
  },
];

const PLATFORM_MODULES = [
  {
    id: "Webcam",
    title: "Live Camera AI Stream",
    subtitle: "Real-time edge inference engine",
    desc: "Stream and analyze live dashcam or webcam feeds with real-time bounding box segmentation and FPS telemetry.",
    icon: Radio,
    badge: "Edge Vision",
    actionText: "Launch Live Stream",
  },
  {
    id: "Scanner",
    title: "AI Upload & Defect Scanner",
    subtitle: "High-resolution offline analysis",
    desc: "Upload road imagery, dashcam footage, or municipal survey files for automated YOLOv8 inference and severity scoring.",
    icon: Scan,
    badge: "Inference Engine",
    actionText: "Launch Scanner",
  },
  {
    id: "Map",
    title: "GPS Telemetry Risk Map",
    subtitle: "Geospatial cluster visualization",
    desc: "Explore citywide hazard locations, severity density heatmaps, and street-level risk indexes.",
    icon: MapPin,
    badge: "GPS Telemetry",
    actionText: "Open GPS Map",
  },
  {
    id: "Dashboard",
    title: "Municipal Analytics Hub",
    subtitle: "Administrative intelligence",
    desc: "Inspect fleet telemetry, detection classification trends, and municipal road health indexes.",
    icon: BarChart3,
    badge: "Analytics",
    actionText: "View Dashboard",
  },
  {
    id: "Report",
    title: "Citizen Incident Reporter",
    subtitle: "Direct public participation",
    desc: "Submit community road defects with photo upload, AI verification, and live resolution tracking.",
    icon: FileText,
    badge: "Public Portal",
    actionText: "Report Defect",
  },
];

const PERFORMANCE_STATS = [
  { value: "< 25ms", label: "Inference Latency", sub: "YOLOv8 Edge Neural Engine" },
  { value: "99.2%", label: "Deduplication Accuracy", sub: "Centroid Spatial Clustering" },
  { value: "94%", label: "Road Health Index", sub: "Automated Integrity Scoring" },
  { value: "100%", label: "Autonomous Coverage", sub: "Passive Fleet Ingestion" },
];

const EditorialHome: React.FC<EditorialHomeProps> = ({ setActiveTab, theme, toggleTheme }) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Video autoplay assurance with fallback for browser policies
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    
    const playVideo = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay was deferred by browser policy:", err);
        });
      }
    };

    playVideo();

    // Fallback on first user interaction if deferred
    const handleFirstInteraction = () => {
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Smooth hardware-accelerated 3D parallax without React re-render overhead
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current || !rigRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      if (rigRef.current) {
        const tiltX = -(y * 9);
        const tiltY = x * 11;
        rigRef.current.style.transform = `perspective(1200px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateZ(0)`;
      }
    });
  };

  const handleMouseLeave = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (rigRef.current) {
      rigRef.current.style.transform = "";
    }
  };

  // Primary button navigation handler
  const handleExploreDashboard = () => {
    if (!setActiveTab) return;
    if (user?.is_admin) {
      setActiveTab("Dashboard");
    } else {
      setActiveTab("Webcam");
    }
  };

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const quickNavLinks = user?.is_admin
    ? [
        { id: "Dashboard", label: "Dashboard", icon: BarChart3, badge: "Analytics", color: "cyan" },
        { id: "Admin", label: "Admin Console", icon: Shield, badge: "Control", color: "rose" },
        { id: "Map", label: "GPS Map", icon: MapPin, badge: "GIS", color: "blue" },
        { id: "History", label: "Detection Log", icon: Clock, badge: "Logs", color: "indigo" },
        { id: "Configuration", label: "Settings", icon: Sliders, badge: "System", color: "purple" },
      ]
    : [
        { id: "Webcam", label: "Live Feed", icon: Radio, color: "emerald", isLive: true },
        { id: "Scanner", label: "AI Scanner", icon: Scan, color: "cyan" },
        { id: "MyReports", label: "My Reports", icon: ClipboardList, color: "blue" },
        { id: "Report", label: "Report Defect", icon: FileText, color: "amber" },
        { id: "Configuration", label: "Settings", icon: Sliders, color: "purple" },
      ];

  return (
    <div className="editorial-home-page editorial-home-container">
      {/* ── Fixed Full-Screen Background Video for the WHOLE Page ── */}
      <div className="home-global-video-backdrop">
        <video
          ref={videoRef}
          className="editorial-home-video"
          src="/AI_monitoring_system_scanning_city.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
        <div className="home-global-video-overlay" />
      </div>

      {/* ── Scrollable Content Layer ── */}
      <div className="home-page-scrollable-content">
        {/* ── Top Floating Quick Access Hub (Direct Access to all Sections) ── */}
        <header className="home-quick-access-bar" aria-label="Quick Section Navigation">
          <div className="home-quick-access-inner">
            <div className="home-quick-brand-pill">
              <span className="quick-radar-wrapper">
                <span className="quick-radar-ping" />
                <span className="quick-nav-pulse-dot" />
              </span>
              {/* <span className="quick-nav-pill-title">COMMAND HUB</span> */}
            </div>

            <div className="home-quick-nav-links">
              {quickNavLinks.map((link) => {
                const NavIcon = link.icon;
                return (
                  <button
                    key={link.id}
                    type="button"
                    className={`home-quick-nav-btn btn-accent-${link.color}`}
                    onClick={() => setActiveTab?.(link.id)}
                    title={`Open ${link.label}`}
                  >
                    <div className={`quick-btn-icon-wrap icon-accent-${link.color}`}>
                      <NavIcon size={14} className="quick-btn-icon" />
                    </div>
                    <span className="quick-btn-label">{link.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* ── Top Hero Section ── */}
        <section
          className="home-hero-section"
          ref={heroRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Subtle Left-Weighted Gradient Overlay for Hero Area */}
          <div className="home-cinematic-vignette" />

          {/* Left-Center 3D Perspective Hero Stage */}
          <div className="home-hero-stage">
            <div
              ref={rigRef}
              className="home-hero-3d-rig cinematic-float"
            >
              {/* Top Tech Category Beacon */}
              <div className="hero-badge-wrap">
                <span className="hero-mini-pill">
                  <span className="pulse-beacon" />
                  {/* <Eye size={12} className="beacon-icon" /> */}
                  <span>Smart-Infra: AI Infrastructure Monitoring System</span>
                </span>
              </div>

              {/* Main 3D Extruded Headline */}
              <h1 className="hero-headline" aria-label="Smarter Roads. Safer Cities.">
                <div className="headline-line line-1">
                  <span className="word-3d word-white word-1">SMARTER</span>{" "}
                  <span className="word-3d word-cyan word-2">ROADS.</span>
                </div>
                <div className="headline-line line-2">
                  <span className="word-3d word-white word-3">SAFER</span>{" "}
                  <span className="word-3d word-cyan word-4">CITIES.</span>
                </div>
              </h1>

              {/* Supporting Description */}
              <p className="hero-description">
                Autonomous computer vision detecting road damage, identifying surface fissures, 
                and delivering real-time geospatial intelligence to transform municipal street maintenance.
              </p>

              {/* Call to Action Buttons */}
              <div className="hero-cta-group">
                <button
                  className="hero-btn-primary"
                  onClick={handleExploreDashboard}
                  aria-label="Explore Dashboard"
                >
                  <span>{user?.is_admin ? "Explore Dashboard" : "Start Live Detection"}</span>
                  <ArrowRight size={16} className="btn-arrow" />
                </button>

                <button
                  className="hero-btn-secondary"
                  onClick={() => setShowHowItWorks(true)}
                  aria-label="Discover How It Works"
                >
                  <Sparkles size={15} className="btn-sparkle" />
                  <span>Discover How It Works</span>
                </button>
              </div>
            </div>
          </div>

          {/* Floating Scroll Prompt */}
          <button className="home-scroll-prompt" onClick={scrollToContent} aria-label="Scroll to learn more">
            <span className="scroll-prompt-text">Scroll to explore architecture & features</span>
            <ChevronDown size={14} className="scroll-prompt-arrow" />
          </button>
        </section>

        {/* ── Extended Content Below Hero (Transparent to let video run through) ── */}
        <div className="home-extended-content" ref={contentRef}>
          {/* Section 1: End-to-End Autonomous Pipeline */}
          <section className="home-section-container">
            <div className="section-header">
              <span className="section-kicker">END-TO-END WORKFLOW</span>
              <h2 className="section-title">Autonomous Infrastructure Pipeline</h2>
            </div>

            <div className="pipeline-steps-grid">
              <div className="pipeline-step-card">
                <div className="step-badge">STEP 01</div>
                <div className="step-icon-circle">
                  <Radio size={22} />
                </div>
                <h3 className="step-title">High-Speed Video Ingestion</h3>
                <p className="step-desc">
                  Passive capture from municipal fleet dashcams, public transit cameras, and mobile devices at 30+ frames per second.
                </p>
                <div className="step-meta">
                  <span className="meta-tag">30+ FPS</span>
                  <span className="meta-tag">Edge Stream</span>
                </div>
              </div>

              <div className="pipeline-step-card">
                <div className="step-badge">STEP 02</div>
                <div className="step-icon-circle">
                  <Scan size={22} />
                </div>
                <h3 className="step-title">YOLOv8 Segmentation & Bounding</h3>
                <p className="step-desc">
                  Custom neural models identify potholes, fissures, and surface damage with confidence scoring in sub-25ms inference.
                </p>
                <div className="step-meta">
                  <span className="meta-tag">&lt;25ms Inference</span>
                  <span className="meta-tag">Intel OpenVINO</span>
                </div>
              </div>

              <div className="pipeline-step-card">
                <div className="step-badge">STEP 03</div>
                <div className="step-icon-circle">
                  <MapPin size={22} />
                </div>
                <h3 className="step-title">Centroid Clustering & GIS Telemetry</h3>
                <p className="step-desc">
                  Centroid spatial tracking merges duplicate sightings of the same defect and tags coordinates onto Leaflet GIS heatmaps.
                </p>
                <div className="step-meta">
                  <span className="meta-tag">Zero Duplicates</span>
                  <span className="meta-tag">GIS Heatmaps</span>
                </div>
              </div>

              <div className="pipeline-step-card">
                <div className="step-badge">STEP 04</div>
                <div className="step-icon-circle">
                  <Wrench size={22} />
                </div>
                <h3 className="step-title">Municipal Work-Order Automation</h3>
                <p className="step-desc">
                  High-risk road segments trigger automated work orders for city public works teams with repair verification history.
                </p>
                <div className="step-meta">
                  <span className="meta-tag">Auto Dispatch</span>
                  <span className="meta-tag">Audit Trail</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Comprehensive Comparison Matrix */}
          <section className="home-section-container">
            <div className="section-header">
              <span className="section-kicker">COMPREHENSIVE COMPARISON</span>
              <h2 className="section-title">Traditional Municipal Systems VS Smart-Infra AI System</h2>
            </div>

            <div className="comparison-table-wrapper">
              <table className="comparison-matrix-table">
                <thead>
                  <tr>
                    <th className="th-feature">Functional Dimension</th>
                    <th className="th-traditional">Legacy Municipal Inspection</th>
                    <th className="th-smartinfra">
                      <div className="smartinfra-header-badge">
                        <Sparkles size={14} />
                        <span>Smart-Infra AI System</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_DATA.map((row, idx) => (
                    <tr key={idx} className="comparison-row">
                      <td className="td-feature">
                        <span className="feature-name">{row.feature}</span>
                      </td>
                      <td className="td-traditional">
                        <div className="cell-content">
                          <XCircle size={16} className="icon-cross" />
                          <span>{row.traditional}</span>
                        </div>
                      </td>
                      <td className="td-smartinfra">
                        <div className="cell-content">
                          <CheckCircle2 size={16} className="icon-check" />
                          <span>{row.smartInfra}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Deep-Dive Engineering Capabilities */}
          <section className="home-section-container">
            <div className="section-header">
              <span className="section-kicker">ENGINEERING CAPABILITIES</span>
              <h2 className="section-title">Core Architectural Modules</h2>
            </div>

            <div className="detailed-features-grid">
              {DETAILED_FEATURES.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div key={idx} className="detailed-feature-card">
                    <div className="feature-card-header">
                      <div className="feature-card-icon-box">
                        <IconComponent size={20} />
                      </div>
                      <span className="feature-card-tag">{item.tag}</span>
                    </div>
                    <h3 className="feature-card-title">{item.title}</h3>
                    <p className="feature-card-desc">{item.description}</p>
                    <div className="feature-card-specs">
                      {item.specs.map((spec, sIdx) => (
                        <div key={sIdx} className="feature-spec-item">
                          <Check size={12} className="spec-check-icon" />
                          <span>{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 4: Interactive Platform Modules */}
          <section id="home-portal-modules-section" className="home-section-container">
            <div className="section-header">
              <span className="section-kicker">EXPLORE PLATFORM INTERFACES</span>
              <h2 className="section-title">Direct Portal Access</h2>
            </div>

            <div className="portal-modules-grid">
              {PLATFORM_MODULES.map((mod, idx) => {
                const ModIcon = mod.icon;
                return (
                  <div
                    key={idx}
                    className="portal-module-card"
                    onClick={() => {
                      if (setActiveTab) {
                        // Check admin permissions for restricted tabs
                        if (mod.id === "Dashboard" && !user?.is_admin) {
                          setActiveTab("Webcam");
                        } else if (mod.id === "Scanner" && user?.is_admin) {
                          setActiveTab("Dashboard");
                        } else {
                          setActiveTab(mod.id);
                        }
                      }
                    }}
                  >
                    <div className="portal-card-top">
                      <div className="portal-icon-wrap">
                        <ModIcon size={24} />
                      </div>
                      <span className="portal-badge">{mod.badge}</span>
                    </div>
                    <h3 className="portal-title">{mod.title}</h3>
                    <div className="portal-subtitle">{mod.subtitle}</div>
                    <p className="portal-desc">{mod.desc}</p>
                    <div className="portal-action-link">
                      <span>{mod.actionText}</span>
                      <ArrowRight size={14} className="portal-arrow" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 5: Performance Metrics Banner */}
          <section className="home-section-container">
            <div className="stats-banner-card">
              <div className="stats-banner-grid">
                {PERFORMANCE_STATS.map((stat, idx) => (
                  <div key={idx} className="stat-banner-item">
                    <div className="stat-banner-number">{stat.value}</div>
                    <div className="stat-banner-label">{stat.label}</div>
                    <div className="stat-banner-sub">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 6: Call-to-Action Bottom Banner */}
          <section className="home-section-container">
            <div className="cta-banner-card">
              <div className="cta-banner-content">
                <span className="cta-banner-kicker">MUNICIPAL DEPLOYMENT READY</span>
                <h2 className="cta-banner-title">
                  Modernize Your City's Road Infrastructure Today
                </h2>
                <p className="cta-banner-desc">
                  Start scanning roads in real time with our edge AI computer vision pipeline. 
                  Zero expensive survey vehicles, instant GIS telemetry, and automated citizen engagement.
                </p>
                <div className="cta-banner-btn-group">
                  <button
                    className="hero-btn-primary"
                    onClick={() => {
                      if (setActiveTab) {
                        if (user?.is_admin) setActiveTab("Dashboard");
                        else setActiveTab("Webcam");
                      }
                    }}
                  >
                    <span>{user?.is_admin ? "Access Command Center" : "Launch Camera AI Stream"}</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    className="hero-btn-secondary"
                    onClick={() => {
                      if (setActiveTab) setActiveTab(user?.is_admin ? "Map" : "Scanner");
                    }}
                  >
                    <MapPin size={16} />
                    <span>{user?.is_admin ? "Open GIS Monitoring Map" : "Launch AI Road Scanner"}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: Comprehensive Platform Footer */}
          <footer className="home-footer-container">
            <div className="footer-top-grid">
              {/* Col 1: Brand & Overview */}
              <div className="footer-col brand-col">
                <div className="footer-brand-title">
                  <span className="footer-brand-name">
                    <span className="footer-brand-main">Smart-Infra</span> <span className="footer-brand-accent">AI</span>
                  </span>
                </div>
                <p className="footer-brand-text">
                  Autonomous municipal infrastructure monitoring and edge computer vision intelligence 
                  system engineered for city engineers, public works directors, and civic transparency.
                </p>
              </div>

              {/* Col 2: Platform Capabilities */}
              <div className="footer-col">
                <h4 className="footer-col-heading">
                  <span className="heading-pip" />
                  Capabilities
                </h4>
                <ul className="footer-links-list">
                  <li><a href="#pipeline" onClick={(e) => { e.preventDefault(); scrollToContent(); }}>Edge Computer Vision</a></li>
                  <li><a href="#comparison" onClick={(e) => { e.preventDefault(); scrollToContent(); }}>YOLOv8 Segmentation</a></li>
                  <li><a href="#gis" onClick={(e) => { e.preventDefault(); if (setActiveTab) setActiveTab(user?.is_admin ? "Map" : "Scanner"); }}>GIS Telemetry & Heatmaps</a></li>
                  <li><a href="#openvino" onClick={(e) => { e.preventDefault(); setShowHowItWorks(true); }}>Intel OpenVINO Acceleration</a></li>
                  <li><a href="#ai" onClick={(e) => { e.preventDefault(); setShowHowItWorks(true); }}>AI Infrastructure Copilot</a></li>
                </ul>
              </div>

              {/* Col 3: Municipal Portals */}
              <div className="footer-col">
                <h4 className="footer-col-heading">
                  <span className="heading-pip" />
                  Portals & Views
                </h4>
                <ul className="footer-links-list">
                  <li>
                    <button 
                      className="footer-link-btn" 
                      onClick={() => { if (setActiveTab) setActiveTab(user?.is_admin ? "Dashboard" : "Webcam"); }}
                    >
                      <Radio size={13} className="footer-btn-icon" />
                      <span>{user?.is_admin ? "Admin Dispatch Hub" : "Camera Detection Feed"}</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      className="footer-link-btn" 
                      onClick={() => { if (setActiveTab) setActiveTab(user?.is_admin ? "Map" : "Scanner"); }}
                    >
                      <MapPin size={13} className="footer-btn-icon" />
                      <span>Interactive GPS Heatmap</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      className="footer-link-btn" 
                      onClick={() => { if (setActiveTab) setActiveTab("Report"); }}
                    >
                      <FileText size={13} className="footer-btn-icon" />
                      <span>Citizen Incident Reporting</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      className="footer-link-btn" 
                      onClick={() => setShowHowItWorks(true)}
                    >
                      <Sparkles size={13} className="footer-btn-icon" />
                      <span>System Architecture Guide</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* Col 4: System Architecture & Security */}
              <div className="footer-col">
                <h4 className="footer-col-heading">
                  <span className="heading-pip" />
                  Edge Architecture
                </h4>
                <div className="footer-tech-card">
                  <div className="footer-tech-row">
                    <span className="tech-spec-label">Inference:</span>
                    <span className="tech-spec-value">&lt;25ms / frame</span>
                  </div>
                  <div className="footer-tech-row">
                    <span className="tech-spec-label">Backbone:</span>
                    <span className="tech-spec-value">YOLOv8 + OpenVINO</span>
                  </div>
                  <div className="footer-tech-row">
                    <span className="tech-spec-label">Security:</span>
                    <span className="tech-spec-value">Cryptographic Audit</span>
                  </div>
                  <div className="footer-tech-note">
                    Deployed on edge CPU runtimes with sub-25ms inference and cryptographic audit trail logging.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="footer-bottom-bar">
              <div className="footer-bottom-left">
                <span>© 2026 Smart-Infra AI, All rights reserved.</span>
              </div>

              <div className="footer-bottom-right">
                <button
                  type="button"
                  className="footer-scroll-top-btn"
                  onClick={() => {
                    const topElem = document.querySelector(".home-page-scrollable-content");
                    if (topElem) {
                      topElem.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  title="Scroll back to top"
                >
                  <ArrowUp size={14} />
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* ── "Discover How It Works" Futuristic Modal ── */}
      {showHowItWorks && (
        <div className="how-it-works-backdrop" onClick={() => setShowHowItWorks(false)}>
          <div
            className="how-it-works-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-kicker">AUTONOMOUS URBAN VISION</span>
                <h2 className="modal-title">How Smart-Infra Operates</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowHowItWorks(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-steps-grid">
              <div className="step-card">
                <div className="step-number">01</div>
                <div className="step-icon-wrap">
                  <Scan size={20} />
                </div>
                <h3 className="step-heading">Edge Neural Detection</h3>
                <p className="step-text">
                  High-frame-rate YOLOv8 models accelerated with Intel OpenVINO scan road
                  surfaces in real time (&lt;25ms latency), identifying potholes, surface fissures,
                  and hazardous debris.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">02</div>
                <div className="step-icon-wrap">
                  <Activity size={20} />
                </div>
                <h3 className="step-heading">Geospatial Telemetry</h3>
                <p className="step-text">
                  Incidents are GPS-tagged and projected onto interactive GIS heatmaps,
                  calculating road integrity health scores and clustering high-risk urban transit zones.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">03</div>
                <div className="step-icon-wrap">
                  <Shield size={20} />
                </div>
                <h3 className="step-heading">Municipal Dispatch</h3>
                <p className="step-text">
                  Automated work orders are routed directly to civil repair crews with status tracking,
                  closing the loop between citizen observation and infrastructure resolution.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-action-btn"
                onClick={() => {
                  setShowHowItWorks(false);
                  if (setActiveTab) setActiveTab(user?.is_admin ? "Map" : "Scanner");
                }}
              >
                <CheckCircle2 size={16} />
                <span>{user?.is_admin ? "View Monitoring GIS Map" : "Open Road Scanner"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorialHome;
