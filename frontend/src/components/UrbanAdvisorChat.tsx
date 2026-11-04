import React, { useState, useEffect, useRef } from 'react';
import { 
    Bot, Send, User, X, Minimize2, Sparkles, Terminal, 
    Camera, AlertTriangle, CloudRain, ShieldCheck, HelpCircle, 
    ChevronRight, ArrowRight, CheckCircle2 
} from 'lucide-react';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    tag?: 'ADVISORY' | 'GUIDE' | 'STATUS' | 'SAFETY';
    actionTab?: string;
    actionLabel?: string;
}

interface UrbanAdvisorChatProps {
    setActiveTab?: (tab: string) => void;
}

const UrbanAdvisorChat: React.FC<UrbanAdvisorChatProps> = ({ setActiveTab }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Hello! I am your Smart AI Advisor. I'm here to help you report road hazards, scan potholes with your camera, and track repair updates.",
            sender: 'ai',
            tag: 'GUIDE',
            timestamp: new Date()
        }
    ]);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const suggestions = [
        { label: "Report a Pothole", query: "How do I report a pothole or road issue?", tab: "Report" },
        { label: "Live Camera Scan", query: "How does the live camera detection work?", tab: "Webcam" },
        { label: "Upload Photo", query: "How do I scan an image from my phone?", tab: "Scanner" },
        { label: "What AI Detects", query: "What kind of road damage can Smart-Infra detect?", tab: undefined },
        { label: "Dashboard Graphs", query: "What do the dashboard graph charts show?", tab: "Dashboard" }
    ];

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isTyping, isOpen]);

    const handleSend = (textToUse?: string) => {
        const text = (textToUse || input).trim();
        if (!text) return;

        const userMsg: Message = {
            id: Date.now(),
            text,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        setTimeout(() => {
            const { response, tag, actionTab, actionLabel } = generateAdvisorResponse(text);
            const aiMsg: Message = {
                id: Date.now() + 1,
                text: response,
                sender: 'ai',
                tag,
                timestamp: new Date(),
                actionTab,
                actionLabel
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 800);
    };

    const generateAdvisorResponse = (query: string): { 
        response: string; 
        tag?: 'ADVISORY' | 'GUIDE' | 'STATUS' | 'SAFETY'; 
        actionTab?: string; 
        actionLabel?: string; 
    } => {
        const q = query.toLowerCase();

        if (q.includes('graph') || q.includes('chart') || q.includes('dashboard') || q.includes('analytics') || q.includes('telemetry')) {
            return {
                response: "The Infrastructure Command Dashboard visualizes 6 core analytics:\n1. 🕸️ Integrity Profile (Radar: Integrity, Precision, Flow, Safety, Depth)\n2. 📊 Object Classification Breakdown (Potholes, Cars, Trucks, Pedestrians)\n3. 📈 7-Day Ingestion vs Resolution Curve (Flagged hazards vs repaired defects)\n4. 🍩 Threat Severity & Risk Triage (Critical, Moderate, Low Risk, Traffic)\n5. ⏱️ Zonal SLA Benchmark (Actual hours vs contractual repair deadline)\n6. ⚡ Neural Detection Velocity (24h hourly anomaly distribution)",
                tag: 'STATUS',
                actionTab: 'Dashboard',
                actionLabel: 'Go to Dashboard'
            };
        }

        if (q.includes('report') || q.includes('submit') || q.includes('complaint')) {
            return {
                response: "To report a road issue: Click 'Report Pothole', upload a photo of the damaged road, specify the severity, and confirm your location. Your report will be instantly verified by our AI and forwarded to city road repair teams.",
                tag: 'GUIDE',
                actionTab: 'Report',
                actionLabel: 'Open Report Form'
            };
        }

        if (q.includes('camera') || q.includes('live') || q.includes('webcam') || q.includes('realtime') || q.includes('real time')) {
            return {
                response: "The Live Feed feature lets you mount your smartphone or dashcam while driving. Our Edge AI analyzes incoming video at 30 FPS, highlighting potholes and cracks in real-time with bounding boxes and confidence scores.",
                tag: 'GUIDE',
                actionTab: 'Webcam',
                actionLabel: 'Open Live Camera Feed'
            };
        }

        if (q.includes('upload') || q.includes('image') || q.includes('photo') || q.includes('scanner') || q.includes('scan')) {
            return {
                response: "You can drag and drop any road photo or dashcam snapshot into the 'Upload Issues' scanner. The AI model checks it in under 1 second for surface cracks, potholes, and depth estimations.",
                tag: 'GUIDE',
                actionTab: 'Scanner',
                actionLabel: 'Go to Photo Scanner'
            };
        }

        if (q.includes('detect') || q.includes('what kind') || q.includes('type') || q.includes('damage') || q.includes('crack')) {
            return {
                response: "Smart-Infra's neural network is trained to detect: \n• Potholes & deep craters\n• Longitudinal & alligator road cracks\n• Water puddles & surface leakages\n• Roadway debris and hazards\nAll with over 90%+ detection accuracy.",
                tag: 'ADVISORY'
            };
        }

        if (q.includes('track') || q.includes('my report') || q.includes('status')) {
            return {
                response: "You can check the status of all your submitted reports in the 'Report & Track' section. Statuses range from 'Pending Verification' to 'Work Scheduled' and 'Repair Completed'.",
                tag: 'STATUS',
                actionTab: 'Report',
                actionLabel: 'View My Reports'
            };
        }

        if (q.includes('weather') || q.includes('rain') || q.includes('heat') || q.includes('stress')) {
            return {
                response: "Extreme summer heat and monsoon water accumulation are the #1 cause of asphalt joint expansion and pothole formation. During heavy rains, drive cautiously as standing water often hides deep potholes.",

            };
        }

        if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
            return {
                response: "Hello! How can I assist your travel today? You can ask me how to report a pothole, start a live road scan, or check our detection capabilities.",

            };
        }

        return {
            response: "I'm your Smart-Infra AI assistant. You can use this platform to spot road damage with your camera, upload photos for instant AI analysis, and submit reports to help keep our city roads safe.",

        };
    };

    return (
        <div className="urban-advisor-citizen-root" style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999 }}>
            {/* FLOATING CHAT WINDOW */}
            {isOpen && (
                <div 
                    className="uac-window"
                    style={{
                        position: 'absolute',
                        bottom: '80px',
                        right: '0',
                        width: '420px',
                        height: '520px',
                        maxWidth: 'calc(100vw - 36px)',
                        maxHeight: 'calc(100vh - 110px)',
                        background: 'var(--bg-card, #1e1e1e)',
                        borderRadius: '24px',
                        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                        boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.45), 0 0 25px rgba(56, 189, 248, 0.18)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        animation: 'uac-pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px',
                        background: 'var(--bg-surface, #262626)',
                        borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: '#0a0f1e',
                                border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                padding: '2px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                            }}>
                                <img 
                                    src="/smart-infra-icon.png" 
                                    alt="Smart-Infra AI" 
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: '10px' }} 
                                />
                            </div>
                            <div>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '0.98rem',
                                    fontWeight: 800,
                                    color: 'var(--text-main, #ffffff)',
                                    letterSpacing: '-0.01em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    Smart AI Advisor
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{
                                        width: '7px',
                                        height: '7px',
                                        borderRadius: '50%',
                                        background: '#10b981',
                                        boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                                        display: 'inline-block'
                                    }} />
                                    <span style={{
                                        fontSize: '0.68rem',
                                        color: '#10b981',
                                        fontWeight: 700,
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase'
                                    }}>
                                        Online
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setIsOpen(false)}
                            title="Close Advisor"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--bg-hover, rgba(255, 255, 255, 0.08))',
                                border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                                color: 'var(--text-muted, #94a3b8)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Minimize2 size={16} />
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div 
                        ref={scrollContainerRef}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            background: 'var(--bg-body, #121212)'
                        }}
                    >
                        {messages.map((msg) => (
                            <div 
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    gap: '4px'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    maxWidth: '88%',
                                    flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                                }}>
                                    {msg.sender === 'ai' && (
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            background: '#181818',
                                            border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: '2px',
                                            padding: '1px',
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                                        }}>
                                            <img 
                                                src="/smart-infra-icon.png" 
                                                alt="AI" 
                                                style={{ 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    objectFit: 'contain', 
                                                    borderRadius: '6px',
                                                    display: 'block'
                                                }} 
                                            />
                                        </div>
                                    )}

                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '16px',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.55,
                                        background: msg.sender === 'user' 
                                            ? 'linear-gradient(135deg, #0284c7, #38bdf8)' 
                                            : 'var(--bg-card, #1e1e1e)',
                                        color: msg.sender === 'user' ? '#ffffff' : 'var(--text-main, #f1f5f9)',
                                        border: msg.sender === 'user'
                                            ? '1px solid rgba(56, 189, 248, 0.35)'
                                            : '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                                        borderTopRightRadius: msg.sender === 'user' ? '4px' : '16px',
                                        borderTopLeftRadius: msg.sender === 'ai' ? '4px' : '16px',
                                        boxShadow: msg.sender === 'user'
                                            ? '0 4px 14px rgba(56, 189, 248, 0.25)'
                                            : '0 2px 8px rgba(0, 0, 0, 0.25)',
                                        whiteSpace: 'pre-line'
                                    }}>
                                        {msg.text}

                                        {/* Action button if answer offers direct app navigation */}
                                        {msg.actionTab && setActiveTab && (
                                            <button
                                                onClick={() => {
                                                    setActiveTab(msg.actionTab!);
                                                    setIsOpen(false);
                                                }}
                                                style={{
                                                    marginTop: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '7px 14px',
                                                    borderRadius: '8px',
                                                    background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                                    border: 'none',
                                                    color: '#ffffff',
                                                    fontWeight: 700,
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)'
                                                }}
                                            >
                                                <span>{msg.actionLabel || 'Navigate'}</span>
                                                <ArrowRight size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <span style={{
                                    fontSize: '0.64rem',
                                    color: 'var(--text-muted, #94a3b8)',
                                    marginTop: '2px',
                                    padding: '0 4px',
                                    marginLeft: msg.sender === 'ai' ? '34px' : '0'
                                }}>
                                    {msg.sender === 'ai' ? 'Smart-Infra AI' : 'You'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}

                        {isTyping && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-card, #1e1e1e)', border: '1px solid var(--border, rgba(255, 255, 255, 0.08))', borderRadius: '12px', width: 'fit-content', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}>
                                <img src="/smart-infra-icon.png" alt="AI" style={{ width: '20px', height: '20px', borderRadius: '6px', objectFit: 'contain', background: '#0a0f1e', padding: '1px' }} />
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>Advisor is thinking...</span>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Suggestions Chips */}
                    <div style={{
                        padding: '10px 16px',
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        background: 'var(--bg-surface, #262626)',
                        borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))'
                    }}>
                        {suggestions.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(item.query)}
                                className="uac-suggestion-chip"
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '99px',
                                    background: 'var(--bg-card, #1e1e1e)',
                                    border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                                    color: 'var(--text-main, #f1f5f9)',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                                }}
                            >
                                <Sparkles size={11} color="#38bdf8" />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Input Bar */}
                    <div style={{
                        padding: '14px 16px',
                        background: 'var(--bg-surface, #262626)',
                        borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))'
                    }}>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                        >
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input 
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything about safety..."
                                    className="uac-input"
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-input, #181818)',
                                        border: '1.5px solid var(--border, rgba(255, 255, 255, 0.12))',
                                        borderRadius: '12px',
                                        padding: '11px 14px 11px 36px',
                                        color: 'var(--text-main, #ffffff)',
                                        fontSize: '0.88rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <Terminal size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#38bdf8' }} />
                            </div>

                            <button 
                                type="submit"
                                disabled={!input.trim()}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: input.trim() 
                                        ? 'linear-gradient(135deg, #0284c7, #38bdf8)' 
                                        : 'var(--bg-card, #1e1e1e)',
                                    color: input.trim() ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: input.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                    boxShadow: input.trim() ? '0 4px 14px rgba(56, 189, 248, 0.35)' : 'none',
                                    flexShrink: 0
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* FLOATING ACTION BUTTON (FAB) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                title="Smart-Infra AI Advisor"
                aria-label="Smart-Infra AI Advisor"
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: 'var(--bg-card, #1e1e1e)',
                    border: '1.5px solid var(--border, rgba(255, 255, 255, 0.15))',
                    color: 'var(--text-main, #ffffff)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35), 0 0 20px rgba(56, 189, 248, 0.25)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    padding: '3px',
                    overflow: 'visible'
                }}
            >
                {isOpen ? (
                    <X size={26} color="#38bdf8" />
                ) : (
                    <>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '12px',
                            background: '#0a0f1e',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img 
                                src="/smart-infra-icon.png" 
                                alt="Smart-Infra AI" 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain', 
                                    display: 'block' 
                                }} 
                            />
                        </div>
                        {/* Pulse dot */}
                        <span style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '-3px',
                            width: '13px',
                            height: '13px',
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '2.5px solid var(--bg-card, #1e1e1e)',
                            boxShadow: '0 0 8px #10b981'
                        }} />
                    </>
                )}
            </button>

            <style>{`
                .uac-suggestion-chip:hover {
                    border-color: #38bdf8 !important;
                    color: #38bdf8 !important;
                    background: rgba(56, 189, 248, 0.1) !important;
                    transform: translateY(-1px);
                }
                .uac-input:focus {
                    border-color: #38bdf8 !important;
                    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2) !important;
                }
                @keyframes uac-pop-in {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
};

export default UrbanAdvisorChat;
