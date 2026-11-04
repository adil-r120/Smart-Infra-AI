import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Stats } from '../types';

interface TrendChartsProps {
    stats: Stats | null;
}

const TrendCharts: React.FC<TrendChartsProps> = ({ stats }) => {
    if (!stats) return null;

    // Transform hourly stats into Recharts format
    const hourlyStats = stats.hourly_stats || {};
    const data = Object.keys(hourlyStats).sort().map(hour => ({
        name: hour,
        detections: hourlyStats[hour] || 0,
    }));

    const maxDetections = Math.max(...data.map(d => d.detections), 0);
    const avgDetections = (data.reduce((a, b) => a + b.detections, 0) / (data.length || 1)).toFixed(1);

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "var(--text-main)", textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                        ⚡ Neural Detection Velocity (24h)
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Temporal analysis of urban anomaly density
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Flow</p>
                        <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#38bdf8' }}>
                            {maxDetections}
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.6 }}>/hr</span>
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Flow</p>
                        <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--success)' }}>
                            {avgDetections}
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ height: 260, minHeight: 260, width: '100%', flex: 1 }}>
                <ResponsiveContainer width="100%" height={260} debounce={50}>
                    <BarChart data={data} barSize={22}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            stroke="var(--text-muted)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            interval={3}
                            tick={{ fill: 'var(--text-muted)', fontWeight: 700 }}
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: 'var(--text-muted)', fontWeight: 700 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }}
                            contentStyle={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                fontSize: '11px',
                                boxShadow: 'var(--shadow-premium)',
                                padding: '10px 14px'
                            }}
                            itemStyle={{ color: '#38bdf8', fontWeight: 800 }}
                            labelStyle={{ color: 'var(--text-main)', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}
                        />
                        <Bar
                            dataKey="detections"
                            fill="#38bdf8"
                            radius={[6, 6, 0, 0]}
                            animationDuration={1200}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TrendCharts;
