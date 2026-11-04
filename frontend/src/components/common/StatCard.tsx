import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  badge?: string;
  badgeColor?: string;
  progress?: { value: number; max?: number; color?: string };
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = '#38bdf8',
  trend,
  badge,
  badgeColor,
  progress,
  onClick
}: StatCardProps) {
  const activeBadgeColor = badgeColor || color;

  return (
    <div
      className="stat-card-v2 upgraded-stat-card"
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '18px 16px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: 'var(--shadow-sm)',
        minHeight: '150px',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden'
      }}
    >
      {/* Top subtle glow highlight line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: 0.8
        }}
      />

      {/* Header Row: Icon + Badge / Trend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div
          className="stat-icon-wrapper"
          style={{
            color,
            background: `${color}14`,
            border: `1px solid ${color}33`,
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${color}1a`
          }}
        >
          {icon}
        </div>

        {badge && (
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '2px 8px',
              borderRadius: 999,
              background: `${activeBadgeColor}14`,
              color: activeBadgeColor,
              border: `1px solid ${activeBadgeColor}33`,
              textTransform: 'uppercase'
            }}
          >
            {badge}
          </span>
        )}

        {trend && !badge && (
          <span className={`stat-trend ${trend}`} style={{ fontSize: '0.85rem', fontWeight: 800 }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>

      {/* Body: Value, Title, Subtitle */}
      <div>
        <div
          style={{
            fontSize: '1.75rem',
            fontWeight: 900,
            color: 'var(--text-main)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: 4
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 2
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              opacity: 0.85,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Optional Progress Track (e.g. for PCI Health) */}
      {progress && (
        <div
          style={{
            height: 5,
            background: 'var(--bg-surface)',
            borderRadius: 999,
            marginTop: 10,
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, (progress.value / (progress.max || 100)) * 100)}%`,
              background: progress.color || color,
              borderRadius: 999,
              transition: 'width 1s ease-in-out',
              boxShadow: `0 0 10px ${progress.color || color}66`
            }}
          />
        </div>
      )}
    </div>
  );
}
