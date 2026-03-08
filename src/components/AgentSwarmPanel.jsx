import { useEffect, useState } from 'react';

const AGENTS = [
  { key: 'sentinel',  label: 'Sentinel',   role: 'Anomaly Detection', color: '#00f5ff', icon: '🔍',
    states: ['scanning', 'idle'],    desc: (st) => st === 'scanning' ? 'Scanning telemetry streams' : 'Watching for anomalies' },
  { key: 'forecaster', label: 'Forecaster', role: 'Risk Prediction',  color: '#00ff88', icon: '📊',
    states: ['forecasting', 'idle'], desc: (st) => st === 'forecasting' ? 'Computing risk cascades' : 'Models on standby' },
  { key: 'strategist', label: 'Strategist', role: 'Decision Planning', color: '#ffd60a', icon: '🧠',
    states: ['strategizing', 'idle'], desc: (st) => st === 'strategizing' ? 'Evaluating interventions' : 'Ready to decide' },
  { key: 'executor',   label: 'Executor',   role: 'Action Execution',  color: '#ff6b00', icon: '⚡',
    states: ['executing', 'idle'],   desc: (st) => st === 'executing' ? 'Executing approved actions' : 'Awaiting approval' },
];

function AgentCard({ agent, status }) {
  const isActive = status?.status && status.status !== 'idle';
  const statusLabel = status?.status?.toUpperCase() ?? 'IDLE';
  const ops = status?.actions_taken ?? 0;

  return (
    <div
      className="flex-1 flex flex-col items-center p-3 rounded-lg transition-all duration-500"
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${agent.color}12, ${agent.color}06)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isActive ? agent.color + '35' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: isActive ? `0 0 24px ${agent.color}20` : 'none',
      }}
    >
      {/* Icon + Spinner */}
      <div
        className="relative w-12 h-12 rounded-full flex items-center justify-center text-xl mb-2 transition-all duration-500"
        style={{
          background: `${agent.color}15`,
          border: `2px solid ${isActive ? agent.color : agent.color + '30'}`,
          boxShadow: isActive ? `0 0 20px ${agent.color}50` : 'none',
          animation: isActive ? 'agentPulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        {agent.icon}
        {isActive && (
          <div
            className="absolute inset-0 rounded-full border-2 animate-spin"
            style={{ borderColor: `${agent.color}25`, borderTopColor: agent.color }}
          />
        )}
      </div>

      {/* Name */}
      <div className="text-xs font-bold tracking-widest uppercase" style={{ color: agent.color }}>
        {agent.label}
      </div>
      <div className="text-[10px] font-mono text-white/30 mb-2">{agent.role}</div>

      {/* Status badge */}
      <div
        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full mb-1"
        style={{
          background: isActive ? `${agent.color}20` : 'rgba(255,255,255,0.05)',
          color: isActive ? agent.color : 'rgba(255,255,255,0.25)',
          border: `1px solid ${isActive ? agent.color + '40' : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        {statusLabel}
      </div>

      {/* Description */}
      <div className="text-[10px] font-mono text-white/25 text-center leading-snug">
        {agent.desc(status?.status)}
      </div>

      {/* Op count */}
      {ops > 0 && (
        <div className="mt-2 text-[10px] font-mono" style={{ color: `${agent.color}60` }}>
          {ops} ops
        </div>
      )}
    </div>
  );
}

function FlowArrow({ active }) {
  return (
    <div className="w-8 flex-shrink-0 flex items-center justify-center self-center">
      <div className="relative w-full h-px overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'rgba(0,245,255,0.12)' }} />
        {active && (
          <div
            className="absolute h-full w-6"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.7), transparent)',
              animation: 'slideRight 1.2s linear infinite',
            }}
          />
        )}
      </div>
      <style>{`
        @keyframes slideRight {
          from { left: -24px; }
          to   { left: 100%; }
        }
      `}</style>
    </div>
  );
}

export default function AgentSwarmPanel({ swarmStatus }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const isAnyActive = swarmStatus && Object.values(swarmStatus).some(
    s => s?.status && s.status !== 'idle'
  );

  const cycles = swarmStatus?.orchestrator?.cycles ?? 0;
  const orchStatus = swarmStatus?.orchestrator?.status ?? 'idle';

  return (
    <div className="panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🎛️</span>
          <div>
            <h3 className="section-title">Agent Swarm Orchestrator</h3>
            <p className="text-[10px] font-mono text-white/25">
              Observe → Reason → Decide → Act
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/30">Cycle #{cycles}</span>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold"
            style={{
              background: isAnyActive ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isAnyActive ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: isAnyActive ? '#00f5ff' : 'rgba(255,255,255,0.25)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: isAnyActive ? '#00f5ff' : 'rgba(255,255,255,0.2)',
                animation: isAnyActive ? 'agentPulse 1s infinite' : 'none',
              }}
            />
            {isAnyActive ? 'PROCESSING' : 'MONITORING'}
          </div>
        </div>
      </div>

      {/* Agents */}
      <div className="flex items-stretch gap-2">
        {AGENTS.map((agent, idx) => (
          <div key={agent.key} className="flex items-center gap-2 flex-1">
            <AgentCard agent={agent} status={swarmStatus?.[agent.key]} />
            {idx < AGENTS.length - 1 && <FlowArrow active={isAnyActive} />}
          </div>
        ))}
      </div>
    </div>
  );
}
