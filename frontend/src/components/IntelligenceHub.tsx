import React, { useState, useEffect } from 'react';
import { Activity, Wind, Droplets, Sun, Moon, Cloud, CloudLightning, Snowflake, TrendingDown, Gauge, CloudRain } from 'lucide-react';

interface WeatherData {
    temp: number;
    humidity: number;
    wind: number;
    uv: number;
    stress: string;
    stressLevel: number;
    lifeImpact: string;
    condition: string;
    icon: any;
}

interface Detection {
    class: string;
    confidence: number;
    lat?: number;
    lng?: number;
}

interface IntelligenceHubProps {
    detections?: Detection[];
    systemStats?: {
        potholes: number;
        cracks: number;
        health: string;
        riskLevel: string;
    };
}

const IntelligenceHub: React.FC<IntelligenceHubProps> = () => {
    const [weather, setWeather] = useState<WeatherData>({
        temp: 24,
        humidity: 45,
        wind: 10,
        uv: 4.2,
        stress: 'NORMAL',
        stressLevel: 30,
        lifeImpact: '-0.2%',
        condition: 'Clear',
        icon: Sun
    });

    // REAL-TIME WEATHER FETCHING
    useEffect(() => {
        const fetchRealWeather = async (lat: number, lon: number) => {
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,is_day,weather_code&daily=uv_index_max&timezone=auto`);
                const data = await response.json();
                const currentTemp = data.current.temperature_2m;
                const currentHumidity = data.current.relative_humidity_2m;
                const currentWind = data.current.wind_speed_10m;
                const currentUV = data.daily?.uv_index_max?.[0] || 5.0;
                const weatherCode = data.current.weather_code;
                const isDay = data.current.is_day === 1;

                // WMO Weather interpretation codes
                let condition = 'Clear';
                let WeatherIcon = isDay ? Sun : Moon;
                
                if (weatherCode <= 1) { condition = 'Clear'; WeatherIcon = isDay ? Sun : Moon; }
                else if (weatherCode <= 3) { condition = 'Cloudy'; WeatherIcon = Cloud; }
                else if (weatherCode <= 49) { condition = 'Foggy'; WeatherIcon = Wind; }
                else if (weatherCode <= 69) { condition = 'Rainy'; WeatherIcon = CloudRain; }
                else if (weatherCode <= 79) { condition = 'Snow'; WeatherIcon = Snowflake; }
                else if (weatherCode <= 99) { condition = 'Storm'; WeatherIcon = CloudLightning; }

                let stress = 'LOW';
                let stressLevel = 20;
                if (currentTemp > 35 || currentHumidity > 80 || currentWind > 40 || weatherCode >= 95) {
                    stress = 'CRITICAL'; stressLevel = 90;
                } else if (currentTemp > 30 || currentHumidity > 70 || currentWind > 25 || (weatherCode >= 61 && weatherCode <= 69)) {
                    stress = 'HIGH'; stressLevel = 70;
                } else if (currentTemp > 25) {
                    stress = 'MODERATE'; stressLevel = 45;
                }

                const impact = (stressLevel / 20).toFixed(1);
                setWeather({
                    temp: currentTemp, humidity: currentHumidity, wind: currentWind, uv: currentUV,
                    stress: stress, stressLevel: stressLevel, lifeImpact: `-${impact}%`,
                    condition: condition, icon: WeatherIcon
                });
            } catch (error) {
                console.error("Weather sync failed", error);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchRealWeather(pos.coords.latitude, pos.coords.longitude),
                () => fetchRealWeather(28.6139, 77.2090)
            );
        } else {
            fetchRealWeather(28.6139, 77.2090);
        }
    }, []);

    const Metric = ({ icon: Icon, label, value, color, percent }: any) => (
        <div 
            className="resilience-metric-compact" 
            style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                padding: '14px 16px', 
                background: 'var(--bg-surface)', 
                borderRadius: '12px', 
                border: '1px solid var(--border)', 
                flex: 1, 
                minWidth: '135px',
                transition: 'all 0.2s ease',
                position: 'relative'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: `${color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color
                    }}>
                        <Icon size={13} />
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {label}
                    </span>
                </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: 8, letterSpacing: '-0.02em' }}>
                {value}
            </div>
            <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ 
                    width: `${Math.min(100, Math.max(8, percent))}%`, 
                    height: '100%', 
                    background: color, 
                    borderRadius: 999,
                    boxShadow: `0 0 8px ${color}66`,
                    transition: 'width 0.8s ease'
                }} />
            </div>
        </div>
    );

    return (
        <div className="intelligence-hub" style={{ marginTop: '8px', marginBottom: '24px' }}>
            <div 
                className="stat-card" 
                style={{ 
                    padding: '22px 24px', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--bg-card)', 
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Top cyan gradient hairline */}
                <div 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
                        opacity: 0.8
                    }} 
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: '10px', 
                            background: 'rgba(56, 189, 248, 0.1)', 
                            color: '#38bdf8', 
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 0 12px rgba(56, 189, 248, 0.15)'
                        }}>
                            <Gauge size={19} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.2 }}>
                                Environmental Resilience HUD
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                Atmospheric thermal stress impact on asphalt degradation
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: 'var(--success)'
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />
                            <span>SYNCHRONIZED</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {weather.condition}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    <Metric icon={weather.icon} label="Surface Temp" value={`${weather.temp}°C`} color="#38bdf8" percent={weather.temp * 2} />
                    <Metric icon={Droplets} label="Humidity" value={`${weather.humidity}%`} color="#06b6d4" percent={weather.humidity} />
                    <Metric icon={Wind} label="Wind Speed" value={`${weather.wind} km/h`} color="#a78bfa" percent={weather.wind * 2} />
                    <Metric icon={Activity} label="Thermal Stress" value={weather.stress} color={weather.stress === 'CRITICAL' ? 'var(--danger)' : weather.stress === 'HIGH' ? '#f59e0b' : 'var(--success)'} percent={weather.stressLevel} />
                    <Metric icon={Sun} label="Solar Index" value={`UV ${weather.uv}`} color="#f59e0b" percent={weather.uv * 10} />
                    <Metric icon={TrendingDown} label="Aging Rate" value={weather.lifeImpact} color="#fb7185" percent={weather.stressLevel / 2} />
                </div>
            </div>
        </div>
    );
};

export default IntelligenceHub;
