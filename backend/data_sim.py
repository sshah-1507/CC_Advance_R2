import random
import uuid
from datetime import datetime, timedelta
from backend.models import Location, Carrier, Shipment, Disruption, Metrics

# Indian city coordinates as expected by ShipmentMap.jsx
CITY_COORDS = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 
    'Kolkata', 'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 
    'Lucknow', 'Nagpur', 'Indore', 'Bhopal', 'Chandigarh'
]

CARRIERS = [
    Carrier(id="car_1", name="SwiftAir Logistics", reliability=0.95, type="air"),
    Carrier(id="car_2", name="OceanBlue Shipping", reliability=0.88, type="sea"),
    Carrier(id="car_3", name="GlobalRoad Freight", reliability=0.90, type="land"),
    Carrier(id="car_4", name="ExpressWings", reliability=0.98, type="air"),
    Carrier(id="car_5", name="IntermodalSolutions", reliability=0.85, type="land"),
]

SHIPMENT_CONTENTS = [
    "Semiconductors", "Pharma Supplies", "Electric Motors", "Industrial Valves",
    "High-End Electronics", "Automotive Parts", "Specialized Chemicals", "Solar Panels"
]

def generate_initial_shipments(count=30):
    """Generate a clean set of healthy shipments. No delays, no disruptions at startup."""
    shipments = []
    
    for i in range(count):
        origin = random.choice(CITY_COORDS)
        dest = random.choice([l for l in CITY_COORDS if l != origin])
        carrier = random.choice(CARRIERS)
        
        eta = datetime.now() + timedelta(days=random.randint(2, 10), hours=random.randint(0, 23))
        
        shipments.append(Shipment(
            shipment_id=f"SHP-{1000 + i}",
            origin=origin,
            destination=dest,
            current_location=random.choice(CITY_COORDS),
            status="in_transit",
            eta=eta,
            carrier_id=carrier.id,
            priority=random.choice(["low", "medium", "high", "critical"]),
            risk_score=random.uniform(0.0, 0.2),  # All start with LOW risk
            value=random.uniform(5000, 500000),
            contents=random.choice(SHIPMENT_CONTENTS),
            delay_minutes=0  # No delays at startup
        ))
    return shipments

def generate_disruption(shipments):
    if not shipments: return None
    
    target_shipment = random.choice(shipments)
    dtype = random.choice(["weather", "strike", "congestion", "mechanical", "customs"])
    severity = random.choice(["low", "medium", "high", "critical"])
    
    return Disruption(
        id=str(uuid.uuid4()),
        type=dtype,
        severity=severity,
        location_id=target_shipment.current_location,
        shipment_id=target_shipment.shipment_id,
        description=f"Automated detection of {dtype} disruption for {target_shipment.shipment_id}.",
        timestamp=datetime.now(),
        resolved=False
    )

def calculate_metrics(shipments, disruptions, decisions):
    delayed = [s for s in shipments if s.status == "delayed" or s.delay_minutes > 30]
    active_disruptions = [d for d in disruptions if not d.resolved]
    executed_decisions = [d for d in decisions if d.status == "executed"]
    pending_decisions = [d for d in decisions if d.status == "pending"]
    
    total = len(shipments) if shipments else 1
    sla_score = 100 - (len(delayed) / total * 100) - (len(active_disruptions) * 2)
    sla_score = max(0, min(100, sla_score))
    
    return Metrics(
        sla_shield_score=round(sla_score, 1),
        active_disruptions=len(active_disruptions),
        breaches_prevented=len(executed_decisions) * 2 + random.randint(5, 15),
        autonomous_actions=len(executed_decisions),
        human_escalations=len(pending_decisions),
        avg_resolution_time_minutes=round(random.uniform(20, 120), 1)
    )

LOCATIONS = [] # Dummy to satisfy main.py import
