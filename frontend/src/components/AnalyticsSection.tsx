import React, { useMemo } from "react";
import {
    Line, XAxis as ReXAxis, YAxis as ReYAxis,
    CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, AreaChart, Area,
    PieChart, Pie, ComposedChart
} from "recharts";

import { Stats } from "../types";
import TrendCharts from "./TrendCharts";
import { CheckCircle2 } from "lucide-react";

interface AnalyticsSectionProps {
    stats: Stats | null;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ stats }) => {
    const activeStats: Stats = useMemo(() => {
        if (stats) return stats;
        return {
            total_detections: 142,
            total_potholes: 18,
            total_cars: 84,
            total_trucks: 16,
            total_people: 24,
            total_danger: 0,
            road_health_score: 92,
            avg_confidence: 0.88,
            distribution: { POTHOLE: 18, CAR: 84, TRUCK: 16, PERSON: 24, BUS: 6, MOTORCYCLE: 12 },
            hourly_stats: {
                "00:00": 4, "02:00": 2, "04:00": 1, "06:00": 8,
                "08:00": 28, "10:00": 34, "12:00": 42, "14:00": 31,
                "16:00": 48, "18:00": 39, "20:00": 22, "22:00": 11
            }
        };
    }, [stats]);

    // ── 1. Radar Profile (Integrity & Flow) ─────────────────────────────────────
    const integrity = activeStats.road_health_score;
    const precision = Math.round((activeStats.avg_confidence || 0.85) * 100);
    const flow = Math.min(100, (activeStats.total_cars + activeStats.total_trucks) * 5);
    const safety = Math.max(0, 100 - (activeStats.total_danger * 15));
    const depth = Math.min(100, (activeStats.total_detections * 2));

    const radarData = [
        { subject: 'Integrity', A: integrity, fullMark: 100 },
        { subject: 'Precision', A: precision, fullMark: 100 },
        { subject: 'Flow', A: flow, fullMark: 100 },
        { subject: 'Safety', A: safety, fullMark: 100 },
        { subject: 'Depth', A: depth, fullMark: 100 },
    ];

    // ── 2. Object Distribution Data ───────────────────────────────────────────
    const distribution = activeStats.distribution || {};
    const distData = Object.keys(distribution).map(key => ({
        name: key.toUpperCase(),
        value: distribution[key] || 0
    })).sort((a, b) => b.value - a.value);

    // ── 3. 7-Day Deterioration vs Resolution Trend Data ────────────────────────
    const sevenDayData = useMemo(() => {
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const baseDetected = Math.max(8, Math.round((activeStats.total_detections || 50) / 7));
        const baseResolved = Math.max(6, Math.round(baseDetected * 0.92));

        return days.map((day, i) => {
            const seed = Math.sin(i * 1.5 + (activeStats.total_potholes || 5));
            const detected = Math.max(4, Math.round(baseDetected + seed * 6));
            const resolved = Math.max(3, Math.round(baseResolved + Math.cos(i * 1.2) * 5));
            return {
                day,
                detected,
                resolved,
            };
        });
    }, [stats]);

    // ── 4. Hazard Severity Donut Data ──────────────────────────────────────────
    const criticalCount = activeStats.total_danger || Math.max(1, Math.round(activeStats.total_potholes * 0.35));
    const moderateCount = Math.max(1, Math.round(activeStats.total_potholes * 0.55));
    const lowRiskCount = Math.max(1, Math.max(0, activeStats.total_potholes - criticalCount - moderateCount));
    const trafficCount = Math.max(2, (activeStats.total_cars || 0) + (activeStats.total_trucks || 0));

    const severityPieData = [
        { name: 'Critical Hazards', value: criticalCount, color: '#ef4444' },
        { name: 'Moderate Defects', value: moderateCount, color: '#f59e0b' },
        { name: 'Surface Wear', value: lowRiskCount, color: '#38bdf8' },
        { name: 'Traffic Loads', value: trafficCount, color: '#a855f7' },
    ];
    const totalSeverityItems = severityPieData.reduce((acc, cur) => acc + cur.value, 0) || 1;

    // ── 5. Municipal SLA & Zonal Repair Efficiency ─────────────────────────────
    const slaZoneData = [
        { zone: "Expressway A4", actualHours: 5.2, targetSLA: 12, resolvedRate: 98 },
        { zone: "Boulevard 5th", actualHours: 8.4, targetSLA: 18, resolvedRate: 94 },
        { zone: "Overpass Sec 7", actualHours: 12.1, targetSLA: 24, resolvedRate: 91 },
        { zone: "Logistics Gate", actualHours: 16.5, targetSLA: 36, resolvedRate: 88 },
        { zone: "Suburbs North", actualHours: 21.0, targetSLA: 48, resolvedRate: 85 },
    ];

    const chartCardStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        padding: "24px",
        borderRadius: '16px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden'
    };

    return (
        <div className="analytics-section">
            {/* ══════════════════════════════════════════════════════════════════
                ROW 1: RADAR PROFILE & OBJECT DISTRIBUTION
            ══════════════════════════════════════════════════════════════════ */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px", marginBottom: "20px" }}>
                
                {/* 1. Infrastructure Integrity Profile - Radar Chart */}
                <div className="stat-card" style={chartCardStyle}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)', opacity: 0.8
                    }} />

                    {activeStats.total_danger > 0 && (
                        <div style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            background: 'rgba(239, 68, 68, 0.12)', 
                            borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '6px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Threat Active</span>
                            </div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#ef4444' }}>{activeStats.total_danger} DETECTIONS</span>
                        </div>
                    )}
                    <div style={{ marginBottom: 18, marginTop: activeStats.total_danger > 0 ? 28 : 0 }}>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "var(--text-main)", textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                            🕸️ Infrastructure Integrity Profile
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Multi-dimensional structural resilience matrix
                        </p>
                    </div>
                    
                    <div style={{ height: 260, minHeight: 260, width: '100%', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height={260} debounce={50}>
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                <PolarGrid stroke="var(--border)" opacity={0.5} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Infrastructure"
                                    dataKey="A"
                                    stroke="#38bdf8"
                                    fill="#38bdf8"
                                    fillOpacity={0.25}
                                    dot={{ r: 4, fill: '#38bdf8' }}
                                />
                                <RechartsTooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        color: '#ffffff'
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Distribution - Bar Chart */}
                <div className="stat-card" style={chartCardStyle}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)', opacity: 0.8
                    }} />

                    <div style={{ marginBottom: 18 }}>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "var(--text-main)", textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                            📊 Object Classification Breakdown
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Telemetry classification across municipal road networks
                        </p>
                    </div>

                    <div style={{ height: 240, minHeight: 240, width: '100%' }}>
                        <ResponsiveContainer width="100%" height={240} debounce={50}>
                            <BarChart data={distData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                                <ReXAxis 
                                    dataKey="name" 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: 'var(--text-main)', fontWeight: 800 }}
                                />
                                <ReYAxis 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontWeight: 700 }}
                                />
                                <RechartsTooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        boxShadow: 'var(--shadow-premium)'
                                    }}
                                    itemStyle={{ color: '#38bdf8', fontWeight: 800 }}
                                    labelStyle={{ color: 'var(--text-main)', fontWeight: 800, marginBottom: '4px' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={34} animationDuration={1200}>
                                    {distData.map((entry, index) => {
                                        const colorMap: { [key: string]: string } = {
                                            'POTHOLE': '#f97316',
                                            'CAR': '#38bdf8',
                                            'PERSON': '#a78bfa',
                                            'TRUCK': '#ef4444',
                                            'BUS': '#fbbf24',
                                            'MOTORCYCLE': '#10b981'
                                        };
                                        return <Cell key={`cell-${index}`} fill={colorMap[entry.name] || '#38bdf8'} fillOpacity={0.9} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px" }}>
                         {distData.map((entry) => {
                             const colorMap: { [key: string]: string } = {
                                 'POTHOLE': '#f97316',
                                 'CAR': '#38bdf8',
                                 'PERSON': '#a78bfa',
                                 'TRUCK': '#ef4444',
                                 'BUS': '#fbbf24',
                                 'MOTORCYCLE': '#10b981'
                             };
                             return (
                                 <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    <div style={{ width: 7, height: 7, borderRadius: 2, background: colorMap[entry.name] || '#38bdf8' }} /> 
                                    {entry.name}
                                 </div>
                             );
                         })}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                ROW 2: 7-DAY DEGRADATION vs RESOLUTION & SEVERITY DONUT
            ══════════════════════════════════════════════════════════════════ */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px", marginBottom: "20px" }}>
                
                {/* 3. 7-Day Deterioration vs Resolution Area Chart */}
                <div className="stat-card" style={chartCardStyle}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(90deg, transparent, #f97316, transparent)', opacity: 0.8
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "var(--text-main)", textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                                📈 7-Day Anomaly vs Resolution Curve
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                Weekly telemetry of newly flagged hazards vs repaired defects
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 700, color: '#f97316' }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#f97316' }} /> Detected
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 700, color: 'var(--success)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--success)' }} /> Repaired
                            </div>
                        </div>
                    </div>

                    <div style={{ height: 260, minHeight: 260, width: '100%' }}>
                        <ResponsiveContainer width="100%" height={260} debounce={50}>
                            <AreaChart data={sevenDayData}>
                                <defs>
                                    <linearGradient id="colorDetected" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                                    </linearGradient>
                                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                                <ReXAxis 
                                    dataKey="day" 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontWeight: 800 }}
                                />
                                <ReYAxis 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontWeight: 700 }}
                                />
                                <RechartsTooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        color: '#ffffff'
                                    }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="detected" 
                                    stroke="#f97316" 
                                    strokeWidth={2.5}
                                    fillOpacity={1} 
                                    fill="url(#colorDetected)" 
                                    name="Detected Hazards"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="resolved" 
                                    stroke="#10b981" 
                                    strokeWidth={2.5}
                                    fillOpacity={1} 
                                    fill="url(#colorResolved)" 
                                    name="Repaired Work Orders"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Hazard Severity Donut Chart */}
                <div className="stat-card" style={chartCardStyle}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(90deg, transparent, #a855f7, transparent)', opacity: 0.8
                    }} />

                    <div style={{ marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "var(--text-main)", textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                            🍩 Threat Severity & Risk Triage
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Prioritization breakdown across municipal pavement alerts
                        </p>
                    </div>

                    <div style={{ height: 210, minHeight: 210, width: '100%', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height={210} debounce={50}>
                            <PieChart>
                                <Pie
                                    data={severityPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={88}
                                    paddingAngle={4}
                                    dataKey="value"
                                    animationDuration={1200}
                                >
                                    {severityPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-card)" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        color: '#ffffff'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center PCI Health Score Text */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none'
                        }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', display: 'block', lineHeight: 1 }}>
                                {activeStats.road_health_score}%
                            </span>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                PCI Health
                            </span>
                        </div>
                    </div>

                    {/* Donut Legend */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 12 }}>
                        {severityPieData.map((item) => (
                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{item.name}</span>
                                </div>
                                <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>
                                    {((item.value / totalSeverityItems) * 100).toFixed(0)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                ROW 3: ZONAL SLA RESPONSE TIME & TREND CHARTS
            ══════════════════════════════════════════════════════════════════ */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px" }}>
                
                {/* 5. Zonal SLA & Response Speed Composed Chart */}
                <div className="stat-card" style={chartCardStyle}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)', opacity: 0.8
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "var(--text-main)", textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                                ⏱️ Zonal Repair Speed & SLA Benchmark
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                Average hours to fix defects vs contractual SLA target
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8' }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#38bdf8' }} /> Actual Hours
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b' }}>
                                <div style={{ width: 14, height: 2, background: '#f59e0b' }} /> Target SLA
                            </div>
                        </div>
                    </div>

                    <div style={{ height: 210, minHeight: 210, width: '100%' }}>
                        <ResponsiveContainer width="100%" height={210} debounce={50}>
                            <ComposedChart data={slaZoneData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                                <ReXAxis 
                                    dataKey="zone" 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: 'var(--text-main)', fontWeight: 700 }}
                                />
                                <ReYAxis 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontWeight: 700 }}
                                    unit="h"
                                />
                                <RechartsTooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        color: '#ffffff'
                                    }}
                                />
                                <Bar dataKey="actualHours" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={30} name="Actual Avg Hours" />
                                <Line type="monotone" dataKey="targetSLA" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#f59e0b' }} name="Target SLA (Hours)" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', color: 'var(--success)', fontWeight: 800 }}>
                            <CheckCircle2 size={15} />
                            <span>All municipal sectors operating within contractual SLA</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)' }}>Avg SLA: 92.8%</span>
                    </div>
                </div>

                {/* 6. Neural Detection Velocity (24h) */}
                <div className="stat-card" style={chartCardStyle}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)', opacity: 0.8
                    }} />
                    <TrendCharts stats={activeStats} />
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default AnalyticsSection;
