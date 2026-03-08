import os
import sys

# Ensure the parent directory is in sys.path so 'backend.x' imports work 
# even if uvicorn is launched directly from the backend/ directory.
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from datetime import datetime
from typing import List, Optional
import uvicorn

from backend.models import Location, Carrier, Shipment, Disruption, Decision, Metrics
from backend.engine import SwarmEngine
from backend.data_sim import CARRIERS, LOCATIONS

app = FastAPI(title="ChainGuard Swarm API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Engine Instance
engine = SwarmEngine()

from fastapi.encoders import jsonable_encoder

# WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send initial state
        await websocket.send_json(jsonable_encoder({
            "type": "initial_state",
            **engine.get_state()
        }))

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(jsonable_encoder(message))
            except Exception:
                pass

manager = ConnectionManager()

# Hook engine updates to broadcast
async def broadcast_cycle_complete(state):
    await manager.broadcast({
        "type": "cycle_complete",
        **state
    })

engine.cycle_callback = broadcast_cycle_complete

# REST Endpoints
@app.get("/metrics")
async def get_metrics():
    return engine.get_state()["metrics"]

@app.get("/shipments")
async def get_shipments():
    return engine.get_state()["shipments"]

@app.get("/shipments/{id}")
async def get_shipment(id: str):
    shp = next((s for s in engine.shipments if s.id == id), None)
    if not shp: raise HTTPException(status_code=404, detail="Shipment not found")
    return shp

@app.get("/disruptions")
async def get_disruptions():
    return engine.get_state()["disruptions"]

@app.get("/decisions")
async def get_decisions():
    return engine.get_state()["decisions"]

@app.get("/decisions/pending")
async def get_pending_decisions():
    return [d for d in engine.decisions if d.status == "pending"]

from pydantic import BaseModel

class ApprovalPayload(BaseModel):
    approved: bool
    approver_notes: Optional[str] = ""

@app.post("/decisions/{id}/approve")
async def approve_decision(id: str, payload: ApprovalPayload):
    for d in engine.decisions:
        if d.id == id:
            d.status = "approved" if payload.approved else "rejected"
            return {"status": "success", "decision_status": d.status}
    raise HTTPException(status_code=404, detail="Decision not found")

@app.post("/trigger-cycle")
async def trigger_cycle():
    asyncio.create_task(engine.run_cycle())
    return {"status": "cycle_started"}

@app.post("/inject-disruption")
async def inject_disruption(shipment_id: str, disruption_type: str = "congestion", severity: str = "medium"):
    try:
        await engine.inject_disruption(shipment_id, disruption_type, severity)
        return {"status": "injected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents/status")
async def get_agents_status():
    return engine.get_state()["swarm_status"]

@app.get("/carriers")
async def get_carriers():
    return [c.model_dump() for c in CARRIERS]

@app.get("/blockchain/status")
async def get_blockchain_status():
    return {
        "network": "Polygon Amoy",
        "contract": "0x742d35C...34F",
        "last_block": 124556,
        "status": "synchronized"
    }

@app.post("/chat")
async def chat(data: dict):
    user_msg = data.get("message", "")
    user_lower = user_msg.lower()
    
    # ── Gather live engine data ──────────────────────────────────────────────
    all_shps       = engine.shipments
    active_shps    = [s for s in all_shps if s.status != "delivered"]
    delayed_shps   = [s for s in active_shps if s.delay_minutes > 0 or s.status in ("delayed", "exception")]
    pending_decs   = [d for d in engine.decisions if d.status == "pending"]
    exec_decs      = [d for d in engine.decisions if d.status == "executed"]
    active_disrs   = [d for d in engine.disruptions if not d.resolved]
    
    # Build carrier performance from shipments
    from collections import defaultdict
    carrier_delay = defaultdict(lambda: {"name": "", "total": 0, "delayed": 0})
    carrier_map   = {c.id: c.name for c in CARRIERS}
    for s in all_shps:
        cid = s.carrier_id
        carrier_delay[cid]["name"]  = carrier_map.get(cid, cid)
        carrier_delay[cid]["total"] += 1
        if s.delay_minutes > 0 or s.status in ("delayed", "exception"):
            carrier_delay[cid]["delayed"] += 1

    # Sort carriers by delay rate (highest first)
    sorted_carriers = sorted(
        carrier_delay.values(),
        key=lambda x: x["delayed"] / max(x["total"], 1),
        reverse=True
    )

    # ── Rule-based responses using live data ─────────────────────────────────
    def rule_response():
        # Carrier questions
        if any(k in user_lower for k in ["carrier", "underperform", "reliability", "partner"]):
            lines = []
            for c in sorted_carriers[:5]:
                rate = c["delayed"] / max(c["total"], 1) * 100
                flag = "⚠️" if rate > 20 else "✅"
                lines.append(f"{flag} {c['name']}: {rate:.0f}% delay rate ({c['delayed']}/{c['total']} shipments)")
            return "Carrier Performance Report:\n" + "\n".join(lines)

        # Risk/high-risk shipments
        if any(k in user_lower for k in ["risk", "highest risk", "critical", "danger"]):
            risky = sorted([s for s in active_shps if s.risk_score > 0.3], key=lambda s: s.risk_score, reverse=True)[:5]
            if not risky:
                return "No high-risk shipments detected right now. All active shipments are within safe parameters."
            lines = [f"⚠️ {s.shipment_id}: risk {s.risk_score:.0%} | {s.status} | {s.origin} → {s.destination}" for s in risky]
            return f"Top {len(lines)} highest-risk shipments:\n" + "\n".join(lines)

        # Pending approvals / decisions
        if any(k in user_lower for k in ["pending", "approval", "approve", "decision", "intervention"]):
            if not pending_decs:
                return "No pending decisions at this time. The AI has fully resolved all current disruptions autonomously."
            lines = [f"🔴 {d.shipment_id}: {d.action} — awaiting your approval" for d in pending_decs[:5]]
            return f"You have {len(pending_decs)} decision(s) awaiting approval:\n" + "\n".join(lines)

        # Disruptions / alerts
        if any(k in user_lower for k in ["disruption", "alert", "active", "issue", "problem"]):
            if not active_disrs:
                return "No active disruptions detected in the network. All shipments are operating normally."
            lines = [f"🚨 {d.type.upper()} [{d.severity}] on {d.shipment_id} — {d.description}" for d in active_disrs[:5]]
            return f"{len(active_disrs)} active disruption(s):\n" + "\n".join(lines)

        # SLA breaches
        if any(k in user_lower for k in ["sla", "breach", "prevented", "saved"]):
            return (
                f"SLA Shield Status:\n"
                f"✅ {len(exec_decs)} breaches prevented by AI autonomous action\n"
                f"🔴 {len(pending_decs)} cases awaiting human approval\n"
                f"📦 {len(delayed_shps)} shipments currently delayed"
            )

        # Delayed shipments
        if any(k in user_lower for k in ["delay", "late", "behind", "slow"]):
            if not delayed_shps:
                return "No delayed shipments right now. Network is operating on schedule."
            top = delayed_shps[:5]
            lines = [f"🕐 {s.shipment_id}: {s.delay_minutes}min delay | {s.origin} → {s.destination} | {s.carrier_id}" for s in top]
            return f"{len(delayed_shps)} delayed shipments detected:\n" + "\n".join(lines)

        # General network status
        if any(k in user_lower for k in ["status", "overview", "summary", "network", "how many", "shipment"]):
            return (
                f"ChainGuard Network Status:\n"
                f"📦 {len(active_shps)} active shipments monitored\n"
                f"⚠️  {len(delayed_shps)} delayed\n"
                f"🚨 {len(active_disrs)} active disruptions\n"
                f"✅ {len(exec_decs)} AI-resolved interventions\n"
                f"🔴 {len(pending_decs)} awaiting your approval"
            )

        # Actions taken
        if any(k in user_lower for k in ["action", "taken", "last hour", "recent", "resolved"]):
            if not exec_decs:
                return "No actions have been taken yet. Inject a disruption from the What-If Playground to see the AI agent in action."
            lines = [f"✅ {d.shipment_id}: {d.action} executed" for d in exec_decs[:5]]
            return f"{len(exec_decs)} AI action(s) taken:\n" + "\n".join(lines)

        # Risk zones / locations
        if any(k in user_lower for k in ["zone", "mumbai", "delhi", "region", "hub", "location"]):
            zone_shipments = [s for s in delayed_shps if any(c in (s.origin + s.current_location + s.destination).lower() for c in user_lower.split())]
            if zone_shipments:
                lines = [f"⚠️ {s.shipment_id} at {s.current_location}: {s.delay_minutes}min delay" for s in zone_shipments[:5]]
                return "Shipments of concern in that zone:\n" + "\n".join(lines)
            return f"No critical shipments detected matching that location. All monitored zones appear stable."

        return None  # No rule matched

    # Try rule-based first
    rule_ans = rule_response()

    # If API key is available and working, try to get LLM enrichment
    if engine.agent_platform.api_key_configured:
        try:
            context_summary = (
                f"Active shipments: {len(active_shps)}, Delayed: {len(delayed_shps)}, "
                f"Active disruptions: {len(active_disrs)}, Pending approvals: {len(pending_decs)}, "
                f"AI-resolved actions: {len(exec_decs)}. "
                f"Underperforming carriers: {sorted_carriers[0]['name'] if sorted_carriers else 'none'}."
            )
            if rule_ans:
                context_summary += f"\n\nPre-computed data answer:\n{rule_ans}"

            prompt = (
                f"You are ChainGuard Swarm, a live supply chain AI operations assistant. "
                f"Current network context: {context_summary}\n\n"
                f"User question: '{user_msg}'\n\n"
                f"Respond in 1-3 concise sentences. Be specific using the numbers above. Do not make up data."
            )
            response = engine.agent_platform.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            return {"response": response.text, "timestamp": datetime.now().isoformat()}
        except Exception:
            pass  # Fall through to rule-based answer

    if rule_ans:
        return {"response": rule_ans, "timestamp": datetime.now().isoformat()}

    # Final catch-all: always give something useful
    return {
        "response": (
            f"I'm monitoring {len(active_shps)} active shipments across the network. "
            f"There are {len(active_disrs)} active disruptions and {len(pending_decs)} decisions awaiting your approval. "
            f"Try asking me about carriers, delays, risks, or pending approvals."
        ),
        "timestamp": datetime.now().isoformat()
    }


# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
