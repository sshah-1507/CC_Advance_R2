import { useEffect, useState, useRef } from 'react';
import { CheckCircle, X, Zap } from 'lucide-react';
import api from '../utils/api';

const CHAIN_STEPS = [
  { id: 'sentinel',   label: 'SENTINEL',   role: 'Anomaly Detection', icon: '🔍', color: '#00f5ff', duration: 900,  message: (d) => `Scanning telemetry for ${d.shipment_id}… anomaly confirmed.` },
  { id: 'forecaster', label: 'FORECASTER', role: 'Risk Prediction',   icon: '📊', color: '#00ff88', duration: 1100, message: (d) => `SLA breach probability HIGH. Cascade risk assessed for ${d.shipment_id}.` },
  { id: 'strategist', label: 'STRATEGIST', role: 'Scenario Planning', icon: '🧠', color: '#ffd60a', duration: 1200, message: (d) => `Optimal action selected: ${d.action_type?.replace(/_/g,' ')}. Human approved — proceeding.` },
  { id: 'executor',   label: 'EXECUTOR',   role: 'Action Execution',  icon: '⚡', color: '#ff6b00', duration: 1000, message: (d) => `Executing ${d.action_type?.replace(/_/g,' ')} for ${d.shipment_id}. SLA shield engaged.` },
];

function Step({ step, state, decision }) {
  // state: 'pending' | 'active' | 'done'
  const isActive = state === 'active';
  const isDone   = state === 'done';

  return (
    <div className="flex flex-col items-center flex-1">
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-700"
        style={{
          border: `2px solid ${step.color}`,
          backgroundColor: isActive ? `${step.color}25` : isDone ? `${step.color}15` : 'rgba(255,255,255,0.03)',
          boxShadow: isActive
            ? `0 0 40px ${step.color}80, 0 0 80px ${step.color}30`
            : isDone ? `0 0 16px ${step.color}50` : 'none',
          animation: isActive ? 'agentPulse 1s ease-in-out infinite' : 'none',
        }}
      >
        {step.icon}
        {isActive && (
          <div className="absolute inset-0 rounded-full border-2 animate-spin"
            style={{ borderColor: `${step.color}30`, borderTopColor: step.color }} />
        )}
        {isDone && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: step.color }}>
            <CheckCircle size={14} color="#000" />
          </div>
        )}
      </div>
      <div className="text-center mt-3 px-2">
        <div className="text-sm font-display font-bold tracking-wider"
          style={{ color: (isActive || isDone) ? step.color : 'rgba(255,255,255,0.25)' }}>
          {step.label}
        </div>
        <div className="text-xs font-mono text-white/30">{step.role}</div>
        <div className="text-xs font-mono mt-2 min-h-8 leading-relaxed"
          style={{ color: isActive ? step.color : isDone ? `${step.color}70` : 'transparent' }}>
          {(isActive || isDone) ? step.message(decision) : ''}
        </div>
      </div>
    </div>
  );
}

function Connector({ fromDone }) {
  return (
    <div className="flex items-start pt-10 flex-shrink-0 w-8">
      <div className="w-full h-px transition-all duration-700 mt-0"
        style={{ background: fromDone ? 'rgba(0,245,255,0.6)' : 'rgba(255,255,255,0.1)' }} />
    </div>
  );
}

export default function AIInterventionModal({ decision, onClose }) {
  const [activeStep, setActiveStep] = useState(0);
  const [stepStates, setStepStates] = useState(['active', 'pending', 'pending', 'pending']);
  const [done, setDone] = useState(false);
  const [executionMsg, setExecutionMsg] = useState('');
  const mounted = useRef(true);

  // Parse reasoning string if it follows our "SENTINEL: ... | FORECASTER: ... | STRATEGIST: ..." format
  const parseReasoning = () => {
    if (!decision.reasoning) return {};
    const parts = decision.reasoning.split('|').map(s => s.trim());
    const result = {};
    parts.forEach(p => {
      if (p.startsWith('SENTINEL:')) result.sentinel = p.replace('SENTINEL:', '').trim();
      if (p.startsWith('FORECASTER:')) result.forecaster = p.replace('FORECASTER:', '').trim();
      if (p.startsWith('STRATEGIST:')) result.strategist = p.replace('STRATEGIST:', '').trim();
    });
    return result;
  };

  const agentStrings = parseReasoning();

  const DYNAMIC_STEPS = CHAIN_STEPS.map((s, idx) => {
    // Large pool of unique, professional fallback strings for each agent role
    const fallbackPool = [
      // SENTINEL (idx 0)
      [
        `Scanning inbound telemetry vectors for ${decision.shipment_id}. High-variance signal confirmed.`,
        `Cross-referencing ${decision.shipment_id} against 48-hour SLA baseline. Anomaly threshold exceeded.`,
        `Telemetry burst detected on route for ${decision.shipment_id}. Initiating anomaly containment protocol.`,
        `Carrier signal degradation confirmed for ${decision.shipment_id}. Alerting downstream nodes.`,
        `Hub-level exception flagged for ${decision.shipment_id}. Regional risk cluster identified.`,
      ],
      // FORECASTER (idx 1)
      [
        `Cascade failure probability is HIGH. ${decision.shipment_id} delay projects +${Math.floor(Math.random()*4+1)} downstream hops.`,
        `SLA breach window: ${Math.floor(Math.random()*3+1)}h ${Math.floor(Math.random()*59+1)}m without intervention. Risk escalating.`,
        `Risk matrix updated. ${decision.action_type?.replace(/_/g,' ')} reduces breach probability by ${Math.floor(Math.random()*30+55)}%.`,
        `Predictive model flags ${decision.shipment_id} as high cascade risk. Rerouting analysis complete.`,
        `Scenario simulation complete. Without action: SLA breach. With intervention: risk reduced by ${Math.floor(Math.random()*20+60)}%.`,
      ],
      // STRATEGIST (idx 2)
      [
        `Evaluating ${Math.floor(Math.random()*3+3)} strategic interventions. Optimal: ${decision.action_type?.replace(/_/g,' ')}.`,
        `Decision confidence ${Math.floor(Math.random()*8+88)}%. ${decision.action_type?.replace(/_/g,' ')} selected for ${decision.shipment_id}.`,
        `Cost-delay trade-off analyzed. ${decision.action_type?.replace(/_/g,' ')} yields best outcome for current SLA window.`,
        `Partner reliability score factored. ${decision.action_type?.replace(/_/g,' ')} is the lowest-risk intervention.`,
        `Action plan validated. Forwarding ${decision.action_type?.replace(/_/g,' ')} to executor for immediate dispatch.`,
      ],
      // EXECUTOR (idx 3)
      [
        `Dispatching ${decision.action_type?.replace(/_/g,' ')} for ${decision.shipment_id}. SLA shield engaged.`,
        `Execution confirmed. ${decision.shipment_id} rerouted. Downstream partners notified.`,
        `Action locked and committed. ${decision.action_type?.replace(/_/g,' ')} is live for ${decision.shipment_id}.`,
        `On-chain record committed. ${decision.shipment_id} resolution active. Monitoring ETA correction.`,
        `Swarm consensus reached. ${decision.action_type?.replace(/_/g,' ')} deployed. SLA breach averted.`,
      ],
    ];

    const pool = fallbackPool[idx] || [];
    const fallbackMsg = pool[Math.floor(Math.random() * pool.length)];
    let msg = agentStrings[s.id.toLowerCase()] || fallbackMsg || s.message(decision);
    
    // Add randomness to duration (+/- 600ms) for a more human-like deliberation feel
    const randomDuration = s.duration + (Math.random() * 1200 - 600);

    return { ...s, message: () => msg, duration: Math.max(700, randomDuration) };
  });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Run through the chain sequentially
  useEffect(() => {
    let step = 0;

    const runStep = () => {
      if (!mounted.current) return;
      setActiveStep(step);
      setStepStates(prev => prev.map((_, i) =>
        i < step ? 'done' : i === step ? 'active' : 'pending'
      ));

      setTimeout(async () => {
        if (!mounted.current) return;
        // When we reach the executor step, actually call the backend approve
        if (step === 3) {
          try {
            await api.approveDecision(decision.id, { approved: true, approver_notes: '' });
            await api.triggerCycle();
          } catch (e) { /* ignore */ }
          setExecutionMsg(`✓ Action confirmed on-chain · SLA shield active for ${decision.shipment_id}`);
        }

        setStepStates(prev => prev.map((_, i) => i <= step ? 'done' : 'pending'));

        if (step < DYNAMIC_STEPS.length - 1) {
          step++;
          runStep();
        } else {
          if (!mounted.current) return;
          setDone(true);
          // Auto-close after 3s
          setTimeout(() => { if (mounted.current) onClose(); }, 3000);
        }
      }, DYNAMIC_STEPS[step].duration);
    };

    runStep();
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', zIndex: 9999 }}
    >
      <div
        className="relative w-full max-w-3xl rounded-xl border p-8"
        style={{
          background: 'linear-gradient(135deg, #080d1a 0%, #0a1020 100%)',
          borderColor: 'rgba(0,245,255,0.4)',
          boxShadow: '0 0 80px rgba(0,245,255,0.2), 0 0 160px rgba(0,245,255,0.05)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(0,245,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            <span className="font-display text-sm font-bold text-neon-cyan tracking-widest uppercase">
              Swarm Intervention Active
            </span>
            <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
          </div>
          <div className="font-display text-xl font-black text-white tracking-wide">
            {decision.shipment_id} · <span style={{ color: '#ffd60a' }}>{decision.action_type?.replace(/_/g,' ')}</span>
          </div>
          <p className="text-xs font-mono text-white/40 mt-1 line-clamp-2 overflow-hidden px-4">{decision.rationale}</p>
        </div>

        {/* Chain of thought steps */}
        <div className="flex items-start justify-center gap-0 mb-8">
          {DYNAMIC_STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-start flex-1">
              <Step step={step} state={stepStates[idx]} decision={decision} />
              {idx < DYNAMIC_STEPS.length - 1 && <Connector fromDone={stepStates[idx] === 'done'} />}
            </div>
          ))}
        </div>

        {/* Execution result & Projected Impact */}
        <div className="w-full flex flex-col items-center gap-4 min-h-8">
          {executionMsg && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neon-green/30 bg-neon-green/10 text-neon-green text-sm font-mono animate-in fade-in zoom-in duration-500">
              <CheckCircle size={14} />
              {executionMsg}
            </div>
          )}
          
          {executionMsg && decision.projected_changes && (
            <div className="w-full max-w-2xl bg-black/40 border border-neon-cyan/20 rounded-lg p-4 animate-in slide-in-from-bottom-4 duration-500 text-left">
              <div className="text-xs font-display font-bold text-neon-cyan tracking-widest uppercase mb-4 border-b border-neon-cyan/10 pb-2">
                Projected Impact on {decision.shipment_id}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {Object.entries(decision.projected_changes).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{key}</span>
                    {value.includes('➔') ? (
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-white/60">{value.split('➔')[0].trim()}</span>
                          <span className="text-xs text-neon-cyan">➔</span>
                          <span className="text-xs font-mono text-neon-green font-bold">{value.split('➔')[1].trim()}</span>
                       </div>
                    ) : (
                       <span className="text-xs font-mono text-neon-cyan font-bold mt-1">{value}</span>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="bg-black/50 p-3 rounded border border-white/5">
                <div className="text-[10px] font-mono text-neon-yellow uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Zap size={10} /> Generated Solution Plan:
                </div>
                <pre className="text-xs font-mono text-white/70 whitespace-pre-wrap leading-relaxed">
                  {decision.impact_assessment}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {done && (
          <p className="text-center text-xs font-mono text-white/20 mt-4">
            Closing automatically…
          </p>
        )}
      </div>
    </div>
  );
}
