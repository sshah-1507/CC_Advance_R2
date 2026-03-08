from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal
from datetime import datetime
import uuid

class Location(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    type: Literal["warehouse", "port", "retail_center"]

class Carrier(BaseModel):
    id: str
    name: str
    reliability: float  # 0 to 1
    type: Literal["air", "sea", "land"]

class Shipment(BaseModel):
    shipment_id: str
    origin: str  # Name from CITY_COORDS
    destination: str # Name from CITY_COORDS
    current_location: str # Name from CITY_COORDS
    status: Literal["pending", "in_transit", "delivered", "delayed", "exception"]
    eta: datetime
    carrier_id: str
    priority: Literal["low", "medium", "high", "critical"]
    risk_score: float = 0.0
    value: float
    contents: str
    delay_minutes: int = 0

class Disruption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["weather", "strike", "congestion", "mechanical", "customs"]
    severity: Literal["low", "medium", "high", "critical"]
    location_id: Optional[str] = None
    shipment_id: Optional[str] = None
    description: str
    timestamp: datetime = Field(default_factory=datetime.now)
    resolved: bool = False

class Decision(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shipment_id: str
    disruption_id: str
    action: str
    reasoning: str
    impact_assessment: str
    projected_impact_metrics: Optional[Dict[str, str]] = None
    status: Literal["pending", "approved", "rejected", "executed"]
    agent_id: str
    timestamp: datetime = Field(default_factory=datetime.now)

class AgentStatus(BaseModel):
    id: str
    name: str
    role: str
    status: Literal["idle", "thinking", "acting", "learning"]
    last_action: Optional[str] = None

class Metrics(BaseModel):
    sla_shield_score: float
    active_disruptions: int
    breaches_prevented: int
    autonomous_actions: int
    human_escalations: int
    avg_resolution_time_minutes: float
