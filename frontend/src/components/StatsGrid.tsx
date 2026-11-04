import { Stats } from "../types";
import { ChartBar, AlertTriangle, Truck, Users, AlertOctagon, Activity } from "lucide-react";
import StatCard from "./common/StatCard";

const HEALTH_COLOR = (score: number) =>
    score >= 75 ? "var(--success)" : score >= 50 ? "#f59e0b" : "var(--danger)";

interface StatsGridProps {
    stats: Stats | null;
}

function StatsGrid({ stats }: StatsGridProps) {
    const health = stats?.road_health_score ?? 0;
    const dangerCount = stats?.total_danger ?? 0;

    return (
        <div>
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                        AI Infrastructure Telemetry
                    </h3>
                    <span style={{
                        fontSize: "0.65rem", padding: "2px 8px", borderRadius: 999,
                        background: "rgba(16,185,129,0.12)", color: "var(--success)",
                        border: "1px solid rgba(16,185,129,0.3)", fontWeight: 800,
                        display: "inline-flex", alignItems: "center", gap: 5
                    }}>
                        {/* <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />
                        LIVE STREAM */}
                    </span>
                </div>
            </div>

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {/* 1. Detections */}
                <StatCard
                    title="Total Detections"
                    value={(stats?.total_detections ?? 0).toLocaleString()}
                    subtitle="Infrastructure events"
                    badge="Overview"
                    icon={<ChartBar size={19} />}
                    color="#38bdf8"
                />

                {/* 2. Potholes */}
                <StatCard
                    title="Potholes"
                    value={(stats?.total_potholes ?? 0).toLocaleString()}
                    subtitle="Surface anomalies"
                    badge="ANOMALY"
                    badgeColor="#f97316"
                    icon={<AlertTriangle size={19} />}
                    color="#f97316"
                />

                {/* 3. Vehicles */}
                <StatCard
                    title="Cars & Trucks"
                    value={((stats?.total_cars ?? 0) + (stats?.total_trucks ?? 0)).toLocaleString()}
                    subtitle="Traffic flow count"
                    badge="FLOW"
                    icon={<Truck size={19} />}
                    color="#06b6d4"
                />

                {/* 4. People */}
                <StatCard
                    title="Pedestrians"
                    value={(stats?.total_people ?? 0).toLocaleString()}
                    subtitle="Pedestrian density"
                    badge="URBAN"
                    icon={<Users size={19} />}
                    color="#a78bfa"
                />

                {/* 5. Danger Alerts */}
                <StatCard
                    title="Danger Alerts"
                    value={dangerCount.toLocaleString()}
                    subtitle={dangerCount > 0 ? "Requires attention" : "Zero active threats"}
                    badge={dangerCount > 0 ? "CRITICAL" : "CLEAR"}
                    badgeColor={dangerCount > 0 ? "var(--danger)" : "var(--success)"}
                    icon={<AlertOctagon size={19} />}
                    color={dangerCount > 0 ? "var(--danger)" : "var(--success)"}
                />

                {/* 6. Road health */}
                <StatCard
                    title="System Health"
                    value={`${health}%`}
                    subtitle={health >= 75 ? "Optimal condition" : health >= 50 ? "Moderate wear" : "Degraded pavement"}
                    badge={health >= 75 ? "OPTIMAL" : health >= 50 ? "FAIR" : "POOR"}
                    badgeColor={HEALTH_COLOR(health)}
                    icon={<Activity size={19} />}
                    color={HEALTH_COLOR(health)}
                    progress={{ value: health, max: 100, color: HEALTH_COLOR(health) }}
                />
            </div>
        </div>
    );
}

export default StatsGrid;
