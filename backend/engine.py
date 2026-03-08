import asyncio
import random
from datetime import datetime
from typing import List
from backend.models import Shipment, Disruption, Decision
from backend.data_sim import generate_initial_shipments, calculate_metrics
from backend.agents_llm_integration import SwarmAgentPlatform
import uuid


class SwarmEngine:
    def __init__(self):
        self.shipments: List[Shipment] = generate_initial_shipments()
        self.disruptions: List[Disruption] = []
        self.decisions: List[Decision] = []
        self.swarm_cycles = 0
        self.orchestrator_status = "idle"
        self.agent_states = {
            "sentinel":   {"status": "idle", "actions_taken": 0},
            "forecaster":  {"status": "idle", "actions_taken": 0},
            "strategist":  {"status": "idle", "actions_taken": 0},
            "executor":    {"status": "idle", "actions_taken": 0},
        }
        self.is_running = False
        self.cycle_callback = None
        self.agent_platform = SwarmAgentPlatform()

    def get_state(self):
        return {
            "metrics": calculate_metrics(self.shipments, self.disruptions, self.decisions),
            "shipments": [s.model_dump() for s in self.shipments],
            "disruptions": [d.model_dump() for d in self.disruptions],
            "decisions": [d.model_dump() for d in self.decisions],
            "swarm_status": {
                **self.agent_states,
                "orchestrator": {
                    "cycles": self.swarm_cycles,
                    "status": self.orchestrator_status,
                }
            }
        }

    async def run_cycle(self):
        if self.is_running:
            return
        self.is_running = True
        self.swarm_cycles += 1
        self.orchestrator_status = "running"

        try:
            # ── 1. SENTINEL  (Observe) ──────────────────────────────────────
            self.agent_states["sentinel"]["status"] = "scanning"
            if self.cycle_callback:
                await self.cycle_callback(self.get_state())
            await asyncio.sleep(0.8)

            disrupted_ids = {
                d.shipment_id for d in self.disruptions
                if not d.resolved and d.shipment_id
            }
            affected_shipments = [
                s for s in self.shipments if s.shipment_id in disrupted_ids
            ]
            self.agent_states["sentinel"]["actions_taken"] += len(affected_shipments)
            self.agent_states["sentinel"]["status"] = "idle"

            # ── 2. FORECASTER  (Reason) ─────────────────────────────────────
            self.agent_states["forecaster"]["status"] = "forecasting"
            if self.cycle_callback:
                await self.cycle_callback(self.get_state())
            await asyncio.sleep(1.0)

            new_decisions = []
            for shp in affected_shipments:
                # Skip if ANY decision already exists for this shipment (pending/approved/executed)
                already_has_decision = any(
                    dec.shipment_id == shp.shipment_id and dec.status in ("pending", "approved", "executed")
                    for dec in self.decisions
                )
                if already_has_decision:
                    continue

                related_d = next(
                    (d for d in self.disruptions
                     if d.shipment_id == shp.shipment_id and not d.resolved),
                    None
                )
                if not related_d:
                    continue

                # ── Severity determines routing ──────────────────────────────
                # Low / Medium  → AI auto-resolves (no human needed)
                # High / Critical → requires human Approve / Reject
                severity = related_d.severity
                requires_human = severity in ("high", "critical")

                try:
                    strategy_dict = await self.agent_platform.generate_decision_chain(
                        shipment_data=shp.model_dump(),
                        disruption_msg=related_d.description
                    )

                    initial_status = "pending" if requires_human else "approved"
                    decision = Decision(
                        id=str(uuid.uuid4()),
                        shipment_id=shp.shipment_id,
                        disruption_id=related_d.id,
                        action=strategy_dict["action"],
                        reasoning=strategy_dict["reasoning"],
                        impact_assessment=strategy_dict["impact_assessment"],
                        projected_impact_metrics=strategy_dict["projected_impact"],
                        status=initial_status,
                        agent_id="swarm-strategist"
                    )
                    new_decisions.append(decision)
                    self.decisions.insert(0, decision)
                    self.agent_states["forecaster"]["actions_taken"] += 1
                except Exception as e:
                    print(f"LLM chain error for {shp.shipment_id}: {e}")
                    continue

            self.agent_states["forecaster"]["status"] = "idle"

            # ── 3. STRATEGIST  (Decide) ─────────────────────────────────────
            self.agent_states["strategist"]["status"] = "strategizing"
            if self.cycle_callback:
                await self.cycle_callback(self.get_state())
            await asyncio.sleep(1.0)
            self.agent_states["strategist"]["actions_taken"] += len(new_decisions)
            self.agent_states["strategist"]["status"] = "idle"

            # ── 4. EXECUTOR  (Act) ──────────────────────────────────────────
            # Executes decisions that are:
            #   a) explicitly approved by human (high/critical),  OR
            #   b) auto-approved by AI (low/medium severity).
            self.agent_states["executor"]["status"] = "executing"
            if self.cycle_callback:
                await self.cycle_callback(self.get_state())
            await asyncio.sleep(0.8)

            for dec in self.decisions:
                if dec.status == "approved":
                    dec.status = "executed"
                    self.agent_states["executor"]["actions_taken"] += 1
                    for s in self.shipments:
                        if s.shipment_id == dec.shipment_id:
                            s.status = "in_transit"
                            s.risk_score = max(0.0, s.risk_score * 0.15)
                            s.delay_minutes = 0
                    for d in self.disruptions:
                        if d.shipment_id == dec.shipment_id and not d.resolved:
                            d.resolved = True

            self.agent_states["executor"]["status"] = "idle"
            self.orchestrator_status = "idle"

            if self.cycle_callback:
                await self.cycle_callback(self.get_state())

        finally:
            self.is_running = False
            self.orchestrator_status = "idle"

    async def inject_disruption(self, shipment_id: str, dtype: str, severity: str):
        """Called from the API when the operator injects a disruption via the Playground."""
        shp = next((s for s in self.shipments if s.shipment_id == shipment_id), None)
        if not shp:
            print(f"inject_disruption: shipment {shipment_id!r} not found")
            return

        # ── Deduplicate: skip if an active disruption already exists for this shipment ──
        already_active = any(
            d.shipment_id == shipment_id and not d.resolved
            for d in self.disruptions
        )
        if already_active:
            print(f"inject_disruption: active disruption already exists for {shipment_id}, skipping.")
            return

        # Update shipment state to reflect the disruption
        shp.status = "exception"
        shp.delay_minutes = random.randint(30, 180)
        shp.risk_score = min(1.0, shp.risk_score + 0.4)

        valid_types = ["weather", "strike", "congestion", "mechanical", "customs"]
        valid_severities = ["low", "medium", "high", "critical"]
        norm_severity = severity.lower() if severity.lower() in valid_severities else "medium"

        d = Disruption(
            type=dtype.lower() if dtype.lower() in valid_types else "congestion",
            severity=norm_severity,
            location_id=shp.current_location,
            shipment_id=shp.shipment_id,
            description=(
                f"Operator-injected {dtype} disruption ({norm_severity} severity) affecting "
                f"{shp.shipment_id} en route via {shp.current_location}. "
                f"{'High-severity alert: human intervention required.' if norm_severity in ('high', 'critical') else 'AI agent will auto-resolve.'}"
            ),
            timestamp=datetime.now()
        )
        self.disruptions.insert(0, d)
        asyncio.create_task(self.run_cycle())
