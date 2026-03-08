import { Shield, AlertTriangle, Zap, TrendingUp, Users, Clock } from 'lucide-react';

const METRIC_CONFIGS = [
  {
    key: 'sla_shield_score', icon: Shield, label: 'SLA Shield Score', unit: '%',
    format: v => v?.toFixed(1),
    color: v => v > 80 ? '#00ff88' : v > 60 ? '#ffd60a' : '#ff2d55',
    bg:    v => v > 80 ? 'rgba(0,255,136,0.07)' : v > 60 ? 'rgba(255,214,10,0.07)' : 'rgba(255,45,85,0.07)',
  },
  {
    key: 'active_disruptions', icon: AlertTriangle, label: 'Active Disruptions', unit: '',
    format: v => v ?? 0,
    color: v => v > 3 ? '#ff2d55' : v > 0 ? '#ff6b00' : '#00ff88',
    bg:    v => v > 3 ? 'rgba(255,45,85,0.07)' : v > 0 ? 'rgba(255,107,0,0.07)' : 'rgba(0,255,136,0.07)',
  },
  {
    key: 'breaches_prevented', icon: Zap, label: 'Breaches Prevented', unit: '',
    format: v => v ?? 0,
    color: () => '#00f5ff',
    bg:    () => 'rgba(0,245,255,0.07)',
  },
  {
    key: 'autonomous_actions', icon: TrendingUp, label: 'Auto-Actions', unit: '',
    format: v => v ?? 0,
    color: () => '#00f5ff',
    bg:    () => 'rgba(0,245,255,0.07)',
  },
  {
    key: 'human_escalations', icon: Users, label: 'Human Reviews', unit: '',
    format: v => v ?? 0,
    color: v => v > 0 ? '#ff6b00' : '#00ff88',
    bg:    v => v > 0 ? 'rgba(255,107,0,0.07)' : 'rgba(0,255,136,0.07)',
  },
  {
    key: 'avg_resolution_time_minutes', icon: Clock, label: 'Avg Resolution', unit: 'min',
    format: v => v?.toFixed(0) ?? '—',
    color: v => (v && v < 40) ? '#00ff88' : '#ffd60a',
    bg:    v => (v && v < 40) ? 'rgba(0,255,136,0.07)' : 'rgba(255,214,10,0.07)',
  },
];

function MetricCard({ config, metrics }) {
  const raw = metrics?.[config.key];
  const value = config.format(raw);
  const color = config.color(raw);
  const bg    = config.bg(raw);
  const Icon  = config.icon;

  // Progress bar fill for SLA shield
  const showBar = config.key === 'sla_shield_score' && raw != null;
  const barPct  = Math.min(100, Math.max(0, raw));

  return (
    <div
      className="panel flex flex-col gap-2 px-4 py-3 transition-all duration-300"
      style={{ background: bg, borderColor: `${color}20` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/35">{config.label}</span>
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}25` }}
        >
          <Icon size={13} style={{ color }} />
        </div>
      </div>

      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold leading-none" style={{ color, fontFamily: 'Inter, system-ui' }}>
          {value}
        </span>
        {config.unit && (
          <span className="text-xs font-mono mb-0.5" style={{ color: `${color}70` }}>{config.unit}</span>
        )}
      </div>

      {showBar && (
        <div className="h-1 rounded-full bg-white/5">
          <div
            className="h-1 rounded-full transition-all duration-700"
            style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
          />
        </div>
      )}
    </div>
  );
}

export default function MetricsBar({ metrics }) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="panel h-20 bg-white/2" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {METRIC_CONFIGS.map(cfg => (
        <MetricCard key={cfg.key} config={cfg} metrics={metrics} />
      ))}
    </div>
  );
}
