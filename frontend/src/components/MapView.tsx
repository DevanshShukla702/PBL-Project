import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { RouteResponse } from '../services/api';
import { Coordinate } from '../types';

L.Icon.Default.imagePath = "https://unpkg.com/leaflet@1.9.4/dist/images/";

interface MapViewProps {
  source: Coordinate | null;
  dest: Coordinate | null;
  routes: RouteResponse[];
  activeRouteIdx: number;
  onChangeSource: (c: Coordinate) => void;
  onChangeDest: (c: Coordinate) => void;
  onRouteSelect: (idx: number) => void;
}

const routeColors = ['#1A56DB', '#27272A', '#9333EA'];

const createCustomIcon = (color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="rounded-full flex items-center justify-center relative ${color === '#1A56DB' ? 'custom-src-marker' : 'custom-dst-marker'}" style="background-color: ${color}; width:20px; height:20px;">
           <div class="marker-inner-dot"></div>
         </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

function MapClickHandler({ source, dest, onChangeSource, onChangeDest }: any) {
  useMapEvents({
    async click(e) {
      if (source && dest) return;
      const target = !source ? 'src' : 'dst';
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      let label = "Map Point";

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await res.json();
        label = data.address ? (data.address.suburb || data.address.neighbourhood || data.address.road || data.display_name.split(',')[0]) : "Map Point";
      } catch (err) {}

      if (target === 'src') onChangeSource({ lat, lon, label });
      else onChangeDest({ lat, lon, label });
    }
  });
  return null;
}

function BoundsFitter({ routes, source, dest }: any) {
  const map = useMap();
  useEffect(() => {
    if (routes.length > 0) {
      const allLatLons: [number, number][] = [];
      routes.forEach((r: any) => {
        r.meta.route_geometry.forEach((p: any) => allLatLons.push([p.lat, p.lon]));
      });
      if(allLatLons.length) map.fitBounds(allLatLons, { padding: [40, 40] });
    } else if (source && dest) {
      map.fitBounds([[source.lat, source.lon], [dest.lat, dest.lon]], { padding: [60,60] });
    } else if (source) {
      map.setView([source.lat, source.lon], 13);
    } else if (dest) {
      map.setView([dest.lat, dest.lon], 13);
    }
  }, [routes, source, dest, map]);
  return null;
}

export default function MapView({ source, dest, routes, activeRouteIdx, onChangeSource, onChangeDest, onRouteSelect }: MapViewProps) {
  const [hint, setHint] = useState<string | null>("Click map to set start point");

  useEffect(() => {
    if (!source && !dest) setHint("Click map to set start point");
    else if (source && !dest) setHint("Click map to set destination");
    else setHint(null);
  }, [source, dest]);

  return (
    <div className="w-full h-full relative">
      {hint && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-[var(--shadow-lg)] font-bold text-[14px] text-[var(--text-primary)] z-[1000] anim-fadeUp pointer-events-none">
          {hint}
        </div>
      )}

      <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <MapClickHandler source={source} dest={dest} onChangeSource={onChangeSource} onChangeDest={onChangeDest} />
        <BoundsFitter routes={routes} source={source} dest={dest} />

        {source && <Marker position={[source.lat, source.lon]} icon={createCustomIcon('#1A56DB')} zIndexOffset={100}><Popup><span className="font-bold">Start:</span> {source.label}</Popup></Marker>}
        {dest && <Marker position={[dest.lat, dest.lon]} icon={createCustomIcon('#059669')} zIndexOffset={100}><Popup><span className="font-bold">End:</span> {dest.label}</Popup></Marker>}

        {routes.map((route, i) => {
          const color = routeColors[i] || '#0F172A';
          const positions: [number, number][] = route.meta.route_geometry.map(p => [p.lat, p.lon]);
          const isActive = i === activeRouteIdx;
          const incHtml = route.meta.incident 
            ? `<span style="color:#DC2626;font-weight:700">⚠ ${route.meta.incident_segments} incidents</span>` 
            : `<span style="color:#059669;font-weight:700">✓ Clear</span>`;

          return (
            <React.Fragment key={route.route_id}>
              <Polyline 
                positions={positions} 
                pathOptions={{ color, weight: 14, opacity: isActive ? 0.3 : 0, lineCap: 'round', className: isActive ? 'animate-[routeGlow_2s_infinite]' : '' }} 
                zIndexOffset={isActive ? 50 : 10}
              />
              <Polyline 
                positions={positions} 
                pathOptions={{ color, weight: isActive ? 5 : 3, opacity: isActive ? 1 : 0.4, lineCap: 'round' }}
                eventHandlers={{ click: () => onRouteSelect(i) }}
                zIndexOffset={isActive ? 60 : 20}
              >
                <Popup>
                  <div className="min-w-[160px] p-2">
                    <div className="font-[800] text-[14px] uppercase flex items-center gap-1.5 mb-2" style={{color}}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      {route.label}
                    </div>
                    <div className="text-[24px] font-[800] text-[var(--text-primary)] leading-none mb-2">
                      {Math.round(route.eta_minutes['1_hour'].estimate)} <span className="text-[14px] font-bold text-[var(--text-muted)]">min</span>
                    </div>
                    <div className="text-[13px] font-bold text-[var(--text-secondary)] flex justify-between items-center mt-2 border-t pt-2 border-[var(--border)]">
                      <span>{route.meta.distance_km} km</span>
                      <div dangerouslySetInnerHTML={{__html: incHtml}} />
                    </div>
                  </div>
                </Popup>
              </Polyline>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
