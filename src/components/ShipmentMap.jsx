import { useEffect, useRef } from 'react';

// We use vanilla Leaflet to avoid React-Leaflet SSR issues
export default function ShipmentMap({ shipments, disruptions }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Indian city coordinates
  const CITY_COORDS = {
    'Mumbai': [19.076, 72.878],
    'Delhi': [28.704, 77.102],
    'Bangalore': [12.972, 77.595],
    'Chennai': [13.083, 80.271],
    'Hyderabad': [17.385, 78.487],
    'Kolkata': [22.572, 88.363],
    'Pune': [18.524, 73.856],
    'Ahmedabad': [23.023, 72.572],
    'Surat': [21.170, 72.831],
    'Jaipur': [26.912, 75.787],
    'Lucknow': [26.847, 80.947],
    'Nagpur': [21.145, 79.088],
    'Indore': [22.719, 75.857],
    'Bhopal': [23.259, 77.413],
    'Chandigarh': [30.733, 76.779],
  };

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;
    
    // Wait for Leaflet to be available
    const initMap = () => {
      if (!window.L) {
        setTimeout(initMap, 100);
        return;
      }
      
      const L = window.L;
      const map = L.map(mapRef.current, {
        center: [22, 80],
        zoom: 5,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    const disruptedIds = new Set(
      (disruptions || []).filter(d => d && !d.resolved).map(d => d.shipment_id)
    );

    // Draw shipment lines and markers
    (shipments || []).slice(0, 30).forEach(shipment => {
      if (!shipment) return;
      const originCoords = CITY_COORDS[shipment.origin];
      const destCoords = CITY_COORDS[shipment.destination];
      const currentCoords = CITY_COORDS[shipment.current_location] || originCoords;

      if (!originCoords || !destCoords) return;

      const isDisrupted = disruptedIds.has(shipment.shipment_id);
      const isDelayed = shipment.delay_minutes > 30;
      
      const color = isDisrupted ? '#ff2d55' : isDelayed ? '#ff6b00' : '#00ff88';
      const opacity = isDisrupted ? 0.8 : 0.4;

      // Route line
      const line = L.polyline([originCoords, destCoords], {
        color: color,
        weight: isDisrupted ? 2 : 1,
        opacity,
        dashArray: isDisrupted ? null : '4 4',
      }).addTo(map);

      // Current position marker
      if (currentCoords) {
        const size = isDisrupted ? 12 : 8;
        const marker = L.circleMarker(currentCoords, {
          radius: size / 2,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: 'Exo 2', sans-serif; background: #080d1a; color: #fff; border: 1px solid #1a2744; padding: 8px; border-radius: 4px; min-width: 180px;">
            <div style="color: ${color}; font-weight: bold; font-size: 13px;">${shipment.shipment_id}</div>
            <div style="color: #aaa; font-size: 11px; margin-top: 4px;">
              ${shipment.origin} → ${shipment.destination}
            </div>
            <div style="margin-top: 4px; font-size: 11px;">
              ${shipment.delay_minutes > 0 ? `<span style="color: #ff6b00;">⚠ Delay: ${shipment.delay_minutes} min</span>` : '<span style="color: #00ff88;">✓ On time</span>'}
            </div>
            <div style="font-size: 11px; color: #888;">Carrier: ${shipment.carrier_id}</div>
          </div>
        `, { className: 'custom-popup' });

        markersRef.current[shipment.shipment_id] = marker;
      }
    });

    // Warehouse markers
    const WAREHOUSES = [
      { name: 'Mumbai Hub', coords: [19.076, 72.878] },
      { name: 'Delhi NCR', coords: [28.704, 77.102] },
      { name: 'Bangalore', coords: [12.972, 77.595] },
      { name: 'Chennai', coords: [13.083, 80.271] },
      { name: 'Hyderabad', coords: [17.385, 78.487] },
    ];

    WAREHOUSES.forEach(wh => {
      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#00f5ff20;border:2px solid #00f5ff;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:8px;">🏭</div>`,
        className: '',
        iconSize: [16, 16],
      });
      L.marker(wh.coords, { icon }).addTo(map)
        .bindTooltip(wh.name, { permanent: false });
    });

  }, [shipments, disruptions]);

  return (
    <div className="panel overflow-hidden" style={{ height: '380px' }}>
      <div className="flex items-center justify-between p-3 border-b border-neon-cyan/10">
        <h3 className="font-display text-xs font-bold text-neon-cyan tracking-widest uppercase">
          Live Shipment Network — India
        </h3>
        <div className="flex gap-3 text-xs font-mono">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-green inline-block" /> On Track</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-orange inline-block" /> Delayed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-red inline-block" /> Disrupted</span>
        </div>
      </div>
      <div ref={mapRef} style={{ height: 'calc(100% - 44px)', width: '100%' }} />
    </div>
  );
}
