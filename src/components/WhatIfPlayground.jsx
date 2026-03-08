import { useState } from 'react';
import { Zap, Play, ChevronDown } from 'lucide-react';
import api from '../utils/api';

const DISRUPTION_TYPES = [
  { value: 'weather',    label: 'Weather Delay',     icon: '🌧️', color: '#00f5ff',  desc: 'Severe weather impacting route transit' },
  { value: 'congestion', label: 'Road Congestion',   icon: '🚦', color: '#ffd60a', desc: 'Traffic / port congestion causing delays' },
  { value: 'strike',     label: 'Labor Strike',      icon: '⚠️', color: '#ff2d55', desc: 'Worker strikes disrupting hub operations' },
  { value: 'mechanical', label: 'Vehicle Breakdown',  icon: '🔧', color: '#ff6b00', desc: 'Mechanical failure of carrier vehicle' },
  { value: 'customs',    label: 'Customs Hold',       icon: '📋', color: '#9d7ee0', desc: 'Border inspection or documentation issue' },
];

const SEVERITY_BANDS = [
  { min: 0,  max: 35, label: 'Low',      api: 'low',      color: '#00ff88' },
  { min: 35, max: 60, label: 'Medium',   api: 'medium',   color: '#ffd60a' },
  { min: 60, max: 80, label: 'High',     api: 'high',     color: '#ff6b00' },
  { min: 80, max: 101,label: 'Critical', api: 'critical', color: '#ff2d55' },
];

const getSeverityBand = n => SEVERITY_BANDS.find(b => n >= b.min && n < b.max) ?? SEVERITY_BANDS[1];

export default function WhatIfPlayground({ shipments }) {
  const [selectedType, setSelectedType] = useState(DISRUPTION_TYPES[0]);
  const [selectedShipment, setSelectedShipment] = useState('');
  const [severity, setSeverity] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const activeShipments = (shipments || [])
    .filter(Boolean)
    .filter(s => ['in_transit', 'created', 'delayed'].includes((s.status || '').toLowerCase()))
    .slice(0, 40);

  const band = getSeverityBand(severity);

  const handleInject = async () => {
    if (!selectedShipment) return;
    setLoading(true);
    setResult(null);
    try {
      const b = getSeverityBand(severity) || SEVERITY_BANDS[1];
      await api.injectDisruption(selectedShipment, selectedType?.value || 'congestion', b.api);
      setResult({ 
        type: 'success', 
        message: `✓ ${selectedType?.label || 'Disruption'} injected into ${selectedShipment} at ${(b.label || 'medium').toLowerCase()} severity. AI swarm is responding — check the Decision Log.` 
      });
    } catch (e) {
      setResult({ type: 'error', message: '✕ Failed to inject disruption. Ensure the backend is running.' });
    }
    setLoading(false);
  };

  return (
    <div className="panel p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,214,10,0.1)', border: '1px solid rgba(255,214,10,0.25)' }}
        >
          <Zap size={14} className="text-neon-yellow" />
        </div>
        <div>
          <h3 className="section-title">What-If Disruption Playground</h3>
          <p className="text-[10px] font-mono text-white/25">
            Inject disruptions to test swarm responses. Low/Medium → AI auto-resolves. High/Critical → requires your approval.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Col 1: Disruption Type */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-white/35 block mb-2">
            Disruption Type
          </label>
          <div className="space-y-1.5">
            {DISRUPTION_TYPES.map(t => {
              const active = selectedType.value === t.value && selectedType.label === t.label;
              return (
                <button
                  key={t.label}
                  onClick={() => setSelectedType(t)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-200"
                  style={{
                    background: active ? `${t.color}12` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? t.color + '40' : 'rgba(255,255,255,0.06)'}`,
                    color: active ? t.color : 'rgba(255,255,255,0.4)',
                    boxShadow: active ? `0 0 12px ${t.color}15` : 'none',
                  }}
                >
                  <span className="text-lg flex-shrink-0">{t.icon}</span>
                  <div>
                    <div className="text-xs font-mono font-bold">{t.label}</div>
                    <div className="text-[10px] font-mono opacity-60 mt-0.5">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Col 2: Target + Severity */}
        <div className="space-y-4">
          {/* Shipment Selector */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-white/35 block mb-2">
              Target Shipment
            </label>
            <div className="relative">
              <select
                value={selectedShipment}
                onChange={e => setSelectedShipment(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono pr-8 appearance-none rounded-md transition-all"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(0,245,255,0.15)',
                  color: selectedShipment ? '#fff' : 'rgba(255,255,255,0.3)',
                }}
              >
                <option value="">Select a shipment…</option>
                {activeShipments.map(s => (
                  <option key={s.shipment_id} value={s.shipment_id}>
                    {s.shipment_id} — {s.origin} → {s.destination}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Severity Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-white/35">
                Severity Level
              </label>
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                style={{
                  background: `${band.color}18`,
                  color: band.color,
                  border: `1px solid ${band.color}35`,
                }}
              >
                {band.label.toUpperCase()} · {severity}/100
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={severity}
              onChange={e => setSeverity(Number(e.target.value))}
              className="w-full"
              style={{
                accentColor: band.color,
                background: `linear-gradient(90deg, ${band.color} ${severity}%, rgba(255,255,255,0.08) ${severity}%)`,
              }}
            />
            <div className="flex justify-between text-[10px] font-mono text-white/20 mt-1">
              <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
            </div>
          </div>

          {/* Routing note */}
          <div
            className="p-3 rounded-md text-[10px] font-mono leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-white/50 font-bold mb-1">Routing Logic</div>
            <div className="text-white/30">
              {band.api === 'low' || band.api === 'medium'
                ? '🤖 AI agent will auto-resolve this disruption without human approval.'
                : '👤 This severity requires your Approve / Reject in the Decision Log.'}
            </div>
          </div>
        </div>

        {/* Col 3: O-R-D-A Flow + Action */}
        <div className="flex flex-col justify-between gap-4">
          {/* Expected Flow */}
          <div
            className="p-4 rounded-md flex-1"
            style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.1)' }}
          >
            <div className="text-[10px] font-mono font-bold text-neon-cyan/70 mb-3 uppercase tracking-widest">Expected O-R-D-A Flow</div>
            <div className="space-y-2.5">
              {[
                { step: 'Observe',  icon: '🔍', desc: 'Sentinel detects anomaly in telemetry' },
                { step: 'Reason',   icon: '📊', desc: 'Forecaster predicts cascade risk' },
                { step: 'Decide',   icon: '🧠', desc: 'Strategist selects optimal fix' },
                { step: 'Act',      icon: '⚡', desc: band.api === 'high' || band.api === 'critical' ? 'Executor awaits your approval' : 'Executor auto-resolves' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-xs flex-shrink-0">{item.icon}</span>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-white/60">{item.step}: </span>
                    <span className="text-[10px] font-mono text-white/30">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inject Button */}
          <div>
            <button
              onClick={handleInject}
              disabled={!selectedShipment || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md font-bold text-sm tracking-wide uppercase transition-all duration-200"
              style={{
                background: selectedShipment
                  ? `linear-gradient(135deg, ${selectedType.color}25, ${selectedType.color}10)`
                  : 'rgba(255,255,255,0.04)',
                border:       `2px solid ${selectedShipment ? selectedType.color + '50' : 'rgba(255,255,255,0.08)'}`,
                color:        selectedShipment ? selectedType.color : 'rgba(255,255,255,0.25)',
                boxShadow:    selectedShipment && !loading ? `0 0 24px ${selectedType.color}20` : 'none',
                cursor:       !selectedShipment ? 'not-allowed' : 'pointer',
              }}
            >
              <Play size={15} />
              {loading ? 'Injecting…' : 'Inject Disruption'}
            </button>

            {result && (
              <div
                className="mt-3 p-3 rounded-md text-[11px] font-mono leading-relaxed fade-in"
                style={{
                  background: result.type === 'success' ? 'rgba(0,255,136,0.06)' : 'rgba(255,45,85,0.06)',
                  border:     `1px solid ${result.type === 'success' ? 'rgba(0,255,136,0.2)' : 'rgba(255,45,85,0.2)'}`,
                  color:      result.type === 'success' ? '#00ff88' : '#ff2d55',
                }}
              >
                {result.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
