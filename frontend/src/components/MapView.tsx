import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LocationPoint, RouteResult } from '../types/eta';

// Fix for default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;

const sourceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const incidentIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="background:#EF4444;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 0 12px rgba(239,68,68,0.7);animation:bounce 1s infinite">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
           </svg>
         </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

interface MapViewProps {
  source: LocationPoint | null;
  destination: LocationPoint | null;
  routes: RouteResult[];
  selectedRouteId: number;
  onSelectRoute: (id: number) => void;
  onMapClick: (lat: number, lon: number) => void;
}

const MapEvents: React.FC<{ onMapClick: (lat: number, lon: number) => void }> = ({ onMapClick }) => {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const FitBounds: React.FC<{ routes: RouteResult[] }> = ({ routes }) => {
  const map = useMap();
  useEffect(() => {
    const allPoints: [number, number][] = [];
    routes.forEach(r => {
      r.meta.route_geometry.forEach(p => allPoints.push([p.lat, p.lon]));
    });
    if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60] });
    }
  }, [routes, map]);
  return null;
};

const getSeverityColor = (severity: number): string => {
  if (severity < 0.4) return '#FACC15';
  if (severity <= 0.7) return '#F97316';
  return '#EF4444';
};

const MapView: React.FC<MapViewProps> = ({ source, destination, routes, selectedRouteId, onSelectRoute, onMapClick }) => {
  const defaultLat = parseFloat(import.meta.env.VITE_DEFAULT_MAP_LAT || '12.9716');
  const defaultLon = parseFloat(import.meta.env.VITE_DEFAULT_MAP_LON || '77.5946');
  const defaultZoom = parseInt(import.meta.env.VITE_DEFAULT_MAP_ZOOM || '12', 10);

  // Sort routes so selected is on top (rendered last)
  const sortedRoutes = [...routes].sort((a, b) => {
    if (a.route_id === selectedRouteId) return 1;
    if (b.route_id === selectedRouteId) return -1;
    return 0;
  });

  return (
    <div className="h-full w-full" style={{ height: '100%', width: '100%' }}>
      <MapContainer 
        center={[defaultLat, defaultLon]} 
        zoom={defaultZoom} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
          className="map-tiles"
        />
        
        {source && <Marker position={[source.lat, source.lon]} icon={sourceIcon} />}
        {destination && <Marker position={[destination.lat, destination.lon]} icon={destIcon} />}

        {sortedRoutes.map((route) => {
          const isSelected = route.route_id === selectedRouteId;
          const routeColor = route.color;
          const eta1h = route.eta_minutes["1_hour"].estimate;

          return (
            <React.Fragment key={route.route_id}>
              {/* Outer glow for ALL routes — brighter for selected */}
              <Polyline
                positions={route.meta.route_geometry.map(p => [p.lat, p.lon])}
                color={routeColor}
                weight={isSelected ? 16 : 12}
                opacity={isSelected ? 0.35 : 0.2}
                lineCap="round"
              />

              {/* Main route polyline — solid, vibrant, always visible */}
              <Polyline
                positions={route.meta.route_geometry.map(p => [p.lat, p.lon])}
                color={routeColor}
                weight={isSelected ? 7 : 5}
                opacity={isSelected ? 1.0 : 0.85}
                lineCap="round"
                eventHandlers={{ click: () => onSelectRoute(route.route_id) }}
              >
                <Popup>
                  <div style={{fontWeight:'bold', fontSize:'13px', color: route.color}}>
                    {route.label}
                  </div>
                  <div style={{fontSize:'12px', marginTop:'2px'}}>
                    ETA: <b>{Math.round(eta1h)} min</b> &nbsp;|&nbsp; 
                    {route.meta.distance_km} km &nbsp;|&nbsp;
                    {route.meta.segments} segments
                  </div>
                  {route.meta.incident && (
                    <div style={{fontSize:'11px', color: '#EF4444', marginTop:'3px'}}>
                      ⚠ {route.meta.incident_segments} incident zone{route.meta.incident_segments > 1 ? 's' : ''} 
                      &nbsp;(severity: {(route.meta.avg_incident_severity * 100).toFixed(0)}%)
                    </div>
                  )}
                </Popup>
              </Polyline>
            </React.Fragment>
          );
        })}

        {routes.length > 0 && <FitBounds routes={routes} />}
        <MapEvents onMapClick={onMapClick} />
      </MapContainer>

      {/* Map Legend */}
      {routes.length > 0 && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/60 shadow-2xl">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">Routes</div>
          {routes.map(route => {
            const isSelected = route.route_id === selectedRouteId;
            const eta1h = route.eta_minutes["1_hour"].estimate;
            return (
              <button
                key={route.route_id}
                onClick={() => onSelectRoute(route.route_id)}
                className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-all mb-1 ${
                  isSelected 
                    ? 'bg-slate-700/60 ring-1 ring-slate-500/50' 
                    : 'hover:bg-slate-800/60'
                }`}
              >
                <div 
                  className="w-4 h-1 rounded-full flex-shrink-0" 
                  style={{ 
                    backgroundColor: route.color,
                    height: isSelected ? '4px' : '2px',
                    boxShadow: isSelected ? `0 0 8px ${route.color}` : 'none'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                    {route.label}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {Math.round(eta1h)}m • {route.meta.distance_km}km
                    {route.meta.incident && (
                      <span className="text-red-400 ml-1">• ⚠ {route.meta.incident_segments}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MapView;
