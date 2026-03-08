import { AlertTriangle, CheckCircle, Clock, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SEVERITY_CONFIG = {
  critical: { color: '#ff2d55', label: 'CRITICAL', weight: 4 },
  high:     { color: '#ff6b00', label: 'HIGH',     weight: 3 },
  medium:   { color: '#ffd60a', label: 'MEDIUM',   weight: 2 },
  low:      { color: '#00ff88', label: 'LOW',      weight: 1 },
};

const TYPE_ICONS = {
  weather:   '🌧️',
  strike:    '⚠️',
  congestion:'🚦',
  mechanical:'🔧',
  customs:   '📋',
};

export default function DisruptionFeed({ disruptions }) {
  const sorted = [...(disruptions || [])]
    .filter(Boolean)
    .sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      const aW = SEVERITY_CONFIG[a.severity]?.weight ?? 0;
      const bW = SEVERITY_CONFIG[b.severity]?.weight ?? 0;
      if (aW !== bW) return bW - aW;
      const timeA = new Date(a.timestamp || a.detected_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.detected_at || 0).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

  const activeCount = (disruptions || []).filter(d => d && !d.resolved).length;

  return (
    <div className="panel flex flex-col" style={{ height: '400px' }}>
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Radio size={12} className="text-neon-red" style={{ filter: 'drop-shadow(0 0 4px rgba(255,45,85,0.8))' }} />
          <span className="section-title">Disruption Feed</span>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#ff2d55', animation: 'agentPulse 1s infinite' }}
            />
          )}
          <span className="text-[10px] font-mono text-white/30">
            {activeCount > 0 ? `${activeCount} active` : 'All clear'}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 divide-y divide-white/4">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-white/20">
            <CheckCircle size={28} className="text-neon-green/40" />
            <p className="font-mono text-xs">No disruptions detected</p>
            <p className="font-mono text-[10px] text-white/15">Network operating normally</p>
          </div>
        )}

        {sorted.map(d => {
          if (!d) return null;
          const sev = SEVERITY_CONFIG[d.severity] ?? { color: '#ffd60a', label: String(d.severity || 'WARNING').toUpperCase() };
          const typeIcon = TYPE_ICONS[d.type] ?? '🚨';
          const ts = d.timestamp || d.detected_at;

          return (
            <div
              key={d.id}
              className="p-3 transition-all duration-200"
              style={{
                opacity: d.resolved ? 0.4 : 1,
                borderLeft: !d.resolved ? `2px solid ${sev.color}50` : '2px solid transparent',
                background: !d.resolved ? `${sev.color}04` : 'transparent',
              }}
            >
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">{typeIcon}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-mono font-bold text-white">{d.shipment_id}</span>

                    {/* Severity badge */}
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-px rounded"
                      style={{
                        background: `${sev.color}18`,
                        color: sev.color,
                        border: `1px solid ${sev.color}35`,
                      }}
                    >
                      {sev.label}
                    </span>

                    {/* Type badge */}
                    <span className="text-[10px] font-mono text-white/30 capitalize">{d.type}</span>
                  </div>

                  <p className="text-[11px] font-mono text-white/50 line-clamp-2 leading-relaxed">
                    {d.description}
                  </p>

                  {/* Severity bar */}
                  {!d.resolved && (
                    <div className="h-0.5 rounded-full bg-white/5 mt-1.5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width:      sev.label === 'CRITICAL' ? '95%' : sev.label === 'HIGH' ? '70%' : sev.label === 'MEDIUM' ? '45%' : '20%',
                          background: `linear-gradient(90deg, ${sev.color}60, ${sev.color})`,
                        }}
                      />
                    </div>
                  )}

                  {d.resolved && (
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle size={10} className="text-neon-green" />
                      <span className="text-[10px] font-mono text-neon-green/60">AI Resolved</span>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-[10px] text-white/20 font-mono flex-shrink-0 flex items-center gap-1">
                  <Clock size={9} />
                  {ts ? formatDistanceToNow(new Date(ts), { addSuffix: false }) : '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
