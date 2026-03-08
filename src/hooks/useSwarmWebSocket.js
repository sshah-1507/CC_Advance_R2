import { useState, useEffect, useRef, useCallback } from 'react';

// Map backend severity string -> numeric 0-100 for UI components
const SEVERITY_MAP = { low: 25, medium: 50, high: 75, critical: 100 };

// Normalize a backend Disruption object to what DisruptionFeed.jsx expects
function normalizeDisruption(d) {
  if (!d) return null;
  return {
    ...d,
    id: d.id || `dis-${Math.random().toString(36).substr(2, 9)}`,
    disruption_type: (d.type || d.disruption_type || 'congestion').toUpperCase(),
    detected_at: d.timestamp || d.detected_at || new Date().toISOString(),
    severity: typeof d.severity === 'string'
      ? (SEVERITY_MAP[d.severity.toLowerCase()] ?? 50)
      : (d.severity ?? 50),
    shipment_id: d.shipment_id || 'UNKNOWN',
    description: d.description || 'System alert: anomaly detected in logistics node.',
  };
}

// Map backend action strings to the ACTION_COLORS keys DecisionLog expects
const ACTION_TYPE_MAP = {
  'Switch to Air Freight': 'EXPEDITE',
  'Prioritize Express':    'EXPEDITE',
  'Reroute via Hub':       'REROUTE',
  'Escalate to Human':     'NOTIFY_PARTNER',
};

// Normalize a backend Decision object to what DecisionLog.jsx expects
function normalizeDecision(d) {
  if (!d) return null;
  const action = d.action || d.action_type || 'REROUTE';
  return {
    ...d,
    id: d.id || `dec-${Math.random().toString(36).substr(2, 9)}`,
    action_type: ACTION_TYPE_MAP[action] || d.action_type || 'REROUTE',
    rationale: d.reasoning || d.rationale || 'AI strategic assessment in progress...',
    agent_name: d.agent_id || d.agent_name || 'swarm-strategist',
    confidence: d.confidence ?? 85,
    risk_level: (d.risk_level || (d.impact_assessment?.includes('critical') ? 'HIGH' : 'MEDIUM')).toUpperCase(),
    executed_at: d.timestamp || d.executed_at || new Date().toISOString(),
    requires_human_approval: d.status === 'pending',
    projected_changes: d.projected_changes || d.projected_impact_metrics || d.projected_impact || {},
  };
}

export function useSwarmWebSocket() {
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [disruptions, setDisruptions] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [swarmStatus, setSwarmStatus] = useState(null);
  const [lastCycle, setLastCycle] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('🔗 WebSocket connected');
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 20000);
        ws._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong') return;

          if (msg.type === 'initial_state' || msg.type === 'cycle_complete') {
            if (msg.metrics) setMetrics(msg.metrics);
            if (Array.isArray(msg.shipments)) setShipments(msg.shipments.filter(Boolean));
            if (Array.isArray(msg.disruptions)) setDisruptions(msg.disruptions.map(normalizeDisruption).filter(Boolean).slice(0, 50));
            if (Array.isArray(msg.decisions)) setDecisions(msg.decisions.map(normalizeDecision).filter(Boolean).slice(0, 50));
            if (msg.swarm_status) setSwarmStatus(msg.swarm_status);
            if (msg.type === 'cycle_complete') setLastCycle(msg);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        clearInterval(ws._pingInterval);
        console.log('🔌 WebSocket disconnected, reconnecting in 3s...');
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WS error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('WS connect error:', e);
      reconnectRef.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { connected, metrics, shipments, disruptions, decisions, swarmStatus, lastCycle };
}