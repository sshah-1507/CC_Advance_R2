import { Zap, Clock, CheckCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import api from '../utils/api';

const ACTION_COLORS = {
  REROUTE: '#00f5ff',
  REALLOCATE_INVENTORY: '#00ff88',
  EXPEDITE: '#ffd60a',
  NOTIFY_PARTNER: '#ff6b00',
  APPLY_PENALTY: '#ff2d55',
};

const RISK_COLORS = {
  LOW: '#00ff88',
  MEDIUM: '#ffd60a',
  HIGH: '#ff6b00',
  CRITICAL: '#ff2d55',
};

/** Parse "SENTINEL: ... | FORECASTER: ... | STRATEGIST: ..." into parts */
function parseReasoning(reasoning) {
  if (!reasoning) return { sentinel: '', forecaster: '', strategist: '' };
  const parts = reasoning.split('|').map(s => s.trim());
  const result = { sentinel: '', forecaster: '', strategist: '' };
  parts.forEach(p => {
    if (p.startsWith('SENTINEL:'))   result.sentinel   = p.replace('SENTINEL:', '').trim();
    if (p.startsWith('FORECASTER:')) result.forecaster = p.replace('FORECASTER:', '').trim();
    if (p.startsWith('STRATEGIST:')) result.strategist = p.replace('STRATEGIST:', '').trim();
  });
  return result;
}

export default function DecisionLog({ decisions, onApprove }) {
  const [approving, setApproving] = useState(null);

  const handleApprove = async (decision, approved) => {
    const id = decision.id;
    setApproving(id);
    try {
      if (approved && onApprove) {
        await onApprove(decision);
      } else {
        await api.approveDecision(id, { approved, approver_notes: '' });
        await api.triggerCycle();
      }
    } catch (e) {
      console.error(e);
    }
    setApproving(null);
  };

  const sorted = [...(decisions || [])].sort((a, b) => {
    const timeA = new Date(a?.timestamp || a?.executed_at || 0).getTime();
    const timeB = new Date(b?.timestamp || b?.executed_at || 0).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

  return (
    <div className="panel flex flex-col" style={{ height: '420px' }}>
      <div className="flex items-center justify-between p-3 border-b border-neon-cyan/10 flex-shrink-0">
        <h3 className="font-display text-xs font-bold text-neon-cyan tracking-widest uppercase">
          Agent Decision Log
        </h3>
        <span className="text-xs font-mono text-white/40">
          {decisions?.length || 0} actions
        </span>
      </div>

      <div className="overflow-y-auto flex-1 divide-y divide-white/5">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <Zap size={32} className="mb-2 text-neon-cyan/30" />
            <p className="font-mono text-sm">Awaiting disruption signals…</p>
            <p className="font-mono text-xs text-white/20 mt-1">Inject a disruption from the Playground to begin</p>
          </div>
        )}

        {sorted.map((d, idx) => {
          if (!d) return null;
          const actionColor = ACTION_COLORS[d.action_type] || '#00f5ff';
          const riskColor   = RISK_COLORS[d.risk_level] || '#ffd60a';
          const isApproving = approving === d.id;
          const isExecuted  = d.status === 'executed';
          const isPending   = d.status === 'pending';
          const parts       = parseReasoning(d.reasoning);

          return (
            <div
              key={d.id || idx}
              className="p-3 transition-all chat-message"
              style={{
                borderLeft: isExecuted
                  ? '2px solid rgba(0,255,136,0.4)'
                  : isPending
                  ? '2px solid rgba(255,107,0,0.5)'
                  : '2px solid transparent',
                background: isExecuted ? 'rgba(0,255,136,0.02)' : 'transparent',
              }}
            >
              {/* Row 1: Shipment ID + badges + timestamp */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-white">{d.shipment_id}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-mono font-bold"
                    style={{ backgroundColor: `${actionColor}20`, color: actionColor, border: `1px solid ${actionColor}40` }}
                  >
                    {d.action_type?.replace(/_/g, ' ')}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ backgroundColor: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}30` }}
                  >
                    {d.risk_level}
                  </span>
                  {/* Status badge */}
                  {isExecuted && (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)' }}>
                      <ShieldCheck size={10} /> AI RESOLVED
                    </span>
                  )}
                  {isPending && (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(255,107,0,0.12)', color: '#ff6b00', border: '1px solid rgba(255,107,0,0.3)' }}>
                      <UserCheck size={10} /> AWAITING APPROVAL
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/25 font-mono flex items-center gap-1 flex-shrink-0">
                  <Clock size={9} />
                  {(() => {
                    const ts = d.timestamp || d.executed_at;
                    if (!ts) return 'just now';
                    const date = new Date(ts);
                    return isNaN(date.getTime()) ? 'just now' : formatDistanceToNow(date, { addSuffix: true });
                  })()}
                </span>
              </div>

              {/* Row 2: AI Chain-of-Thought breakdown */}
              <div className="space-y-1 mt-1 mb-2">
                {parts.sentinel && (
                  <div className="flex gap-2 items-start">
                    <span className="text-[10px] font-mono font-bold flex-shrink-0 pt-0.5" style={{ color: '#00f5ff' }}>🔍 SENTINEL</span>
                    <p className="text-xs font-mono text-white/60 leading-snug">{parts.sentinel}</p>
                  </div>
                )}
                {parts.forecaster && (
                  <div className="flex gap-2 items-start">
                    <span className="text-[10px] font-mono font-bold flex-shrink-0 pt-0.5" style={{ color: '#00ff88' }}>📊 FORECASTER</span>
                    <p className="text-xs font-mono text-white/60 leading-snug">{parts.forecaster}</p>
                  </div>
                )}
                {parts.strategist && (
                  <div className="flex gap-2 items-start">
                    <span className="text-[10px] font-mono font-bold flex-shrink-0 pt-0.5" style={{ color: '#ffd60a' }}>🧠 STRATEGIST</span>
                    <p className="text-xs font-mono text-white/60 leading-snug">{parts.strategist}</p>
                  </div>
                )}
                {/* Fallback: show raw reasoning if it didn't parse */}
                {!parts.sentinel && !parts.forecaster && !parts.strategist && d.reasoning && (
                  <p className="text-xs font-mono text-white/50 leading-snug">{d.reasoning}</p>
                )}
              </div>

              {/* Row 3: Meta + action bar */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-white/25">by {d.agent_id || 'swarm-strategist'}</span>
                  <span className="text-xs font-mono text-neon-cyan/40">{d.confidence}% conf</span>
                </div>

                {/* Action: Approved (auto-resolved) */}
                {isExecuted && (
                  <div className="flex items-center gap-1 text-xs font-mono"
                    style={{ color: '#00ff88' }}>
                    <CheckCircle size={12} />
                    <span>Executed · SLA breach averted</span>
                  </div>
                )}

                {/* Action: Pending — human intervention required */}
                {isPending && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(d, true)}
                      disabled={isApproving}
                      className="px-3 py-1 rounded text-xs font-mono font-bold bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30 transition disabled:opacity-50"
                    >
                      {isApproving ? '…' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleApprove(d, false)}
                      disabled={isApproving}
                      className="px-3 py-1 rounded text-xs font-mono bg-neon-red/20 text-neon-red border border-neon-red/30 hover:bg-neon-red/30 transition disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
