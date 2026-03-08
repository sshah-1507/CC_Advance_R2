import React, { useState } from 'react';
import { Shield, Wifi, WifiOff, RefreshCw, Activity, Bell } from 'lucide-react';
import MetricsBar from './components/MetricsBar';
import AgentSwarmPanel from './components/AgentSwarmPanel';
import ShipmentMap from './components/ShipmentMap';
import DisruptionFeed from './components/DisruptionFeed';
import DecisionLog from './components/DecisionLog';
import ChatInterface from './components/ChatInterface';
import WhatIfPlayground from './components/WhatIfPlayground';
import AIInterventionPanel from './components/AIInterventionPanel';
import { useSwarmWebSocket } from './hooks/useSwarmWebSocket';
import api from './utils/api';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("UI Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#04080f]">
          <h2 className="text-neon-red font-display font-bold text-xl mb-4">CRITICAL SYSTEM ERROR</h2>
          <p className="text-white/40 font-mono text-xs mb-6">The Swarm UI encountered a runtime exception. Please refresh the dashboard.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan font-mono text-xs hover:bg-neon-cyan/30 transition">
            RESTART INTERFACE
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
      <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold font-mono" style={{ color: color || '#fff' }}>{value ?? '—'}</span>
    </div>
  );
}

function Header({ connected, metrics, onTriggerCycle }) {

  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async () => {
    setTriggering(true);
    try { await onTriggerCycle(); } catch (e) {}
    setTimeout(() => setTriggering(false), 2500);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'linear-gradient(180deg, rgba(4,8,15,0.98) 0%, rgba(7,12,24,0.95) 100%)',
        borderColor: 'rgba(0,245,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(0,245,255,0.05))',
                border: '1px solid rgba(0,245,255,0.3)',
                boxShadow: '0 0 20px rgba(0,245,255,0.15)',
              }}
            >
              <Shield size={18} className="text-neon-cyan" />
            </div>
            <div
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-neon-green"
              style={{ animation: 'agentPulse 2s ease-in-out infinite' }}
            />
          </div>
          <div>
            <h1 className="font-display text-sm font-bold tracking-widest neon-text-cyan">
              CHAINGUARD SWARM
            </h1>
            <p className="text-[10px] text-white/30 font-mono tracking-wide -mt-0.5">
              Autonomous Logistics Intelligence
            </p>
          </div>
        </div>

        {/* Live Stats Strip */}
        <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
          {metrics && (
            <>
              <StatPill label="SLA Score" value={`${metrics.sla_shield_score?.toFixed(0)}%`}
                color={metrics.sla_shield_score > 80 ? '#00ff88' : '#ffd60a'} />
              <StatPill label="Active Alerts" value={metrics.active_disruptions}
                color={metrics.active_disruptions > 0 ? '#ff6b00' : '#00ff88'} />
              <StatPill label="Pending Approvals" value={metrics.human_escalations}
                color={metrics.human_escalations > 0 ? '#ff2d55' : '#00ff88'} />
              <StatPill label="AI Actions" value={metrics.autonomous_actions} color="#00f5ff" />
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-white/25">
            <Activity size={10} className="text-neon-green/50" />
            {timeStr}
          </div>

          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all disabled:opacity-40"
            style={{
              background: triggering ? 'rgba(0,245,255,0.08)' : 'rgba(0,245,255,0.05)',
              border: '1px solid rgba(0,245,255,0.2)',
              color: 'rgba(0,245,255,0.7)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,245,255,0.12)'; e.currentTarget.style.color = '#00f5ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,245,255,0.05)'; e.currentTarget.style.color = 'rgba(0,245,255,0.7)'; }}
          >
            <RefreshCw size={11} className={triggering ? 'animate-spin' : ''} />
            {triggering ? 'Running…' : 'Run Cycle'}
          </button>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono"
            style={{
              background: connected ? 'rgba(0,255,136,0.06)' : 'rgba(255,45,85,0.06)',
              border: `1px solid ${connected ? 'rgba(0,255,136,0.2)' : 'rgba(255,45,85,0.2)'}`,
              color: connected ? '#00ff88' : '#ff2d55',
            }}
          >
            {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span>{connected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}


export default function App() {
  const { connected, metrics, shipments, disruptions, decisions, swarmStatus } = useSwarmWebSocket();
  const [activeDecision, setActiveDecision] = useState(null);

  const handleTriggerCycle = () => api.triggerCycle();

  return (
    <ErrorBoundary>
      <div className="min-h-screen relative z-10">
        <Header connected={connected} metrics={metrics} onTriggerCycle={handleTriggerCycle} />

        <main className="max-w-screen-2xl mx-auto px-6 py-5 space-y-4">

          {/* Metrics */}
          <MetricsBar metrics={metrics} />

          {/* Agent Swarm */}
          <AgentSwarmPanel swarmStatus={swarmStatus} />

          {/* Map + Disruptions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ShipmentMap shipments={shipments} disruptions={disruptions} />
            </div>
            <div>
              <DisruptionFeed disruptions={disruptions} />
            </div>
          </div>

          {/* Decision Log + Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DecisionLog
              decisions={decisions}
              onApprove={(decision) => setActiveDecision(decision)}
            />
            <ChatInterface />
          </div>

          {/* What-If Playground */}
          <WhatIfPlayground shipments={shipments} />

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] font-mono text-white/15 pb-4 pt-1">
            <span>ChainGuard Swarm v2.0 · Gemini AI · Polygon Amoy Testnet</span>
            <span>{shipments?.length || 0} shipments monitored</span>
          </div>
        </main>

        {activeDecision && (
          <AIInterventionPanel
            decision={activeDecision}
            onClose={() => setActiveDecision(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
