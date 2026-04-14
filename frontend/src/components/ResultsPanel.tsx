import React, { useState } from 'react';
import { RouteResponse } from '../services/api';
import { Coordinate } from '../types';

interface ETACardProps {
  horizon: '1 Hour Horizon' | '2 Hour Horizon' | '4 Hour Horizon';
  data: { estimate: number; lower_bound: number; upper_bound: number };
  confidence: number;
  colorClass: string;
}

function ETACard({ horizon, data, confidence, colorClass }: ETACardProps) {
  const p = Math.round(confidence * 100);
  let confClass = "bg-[#FEE2E2] text-[#991B1B]"; let inc = "↓"; let ct = "Low Certainty";
  if(confidence >= 0.85) { confClass = "bg-[#DCFCE7] text-[#15803D]"; inc = "✓"; ct = "High Certainty"; }
  else if(confidence >= 0.70) { confClass = "bg-[#FEF3C7] text-[#92400E]"; inc = "≈"; ct = "Medium Certainty"; }

  const w = Math.min(100, Math.max(0, ((data.estimate - data.lower_bound) / (data.upper_bound - data.lower_bound)) * 100));

  return (
    <div className={`card-base p-4 relative overflow-hidden ${colorClass}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{horizon}</div>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${confClass}`}>{inc} {ct} · {p}%</div>
      </div>
      <div className="text-[36px] font-[800] text-[var(--text-primary)] leading-none mb-3">
        {Math.round(data.estimate)} <span className="text-[16px] font-bold text-[var(--text-muted)] inline-block ml-1">min</span>
      </div>
      <div className="h-[6px] bg-[var(--bg-elevated)] rounded-full relative mb-1.5 hz-bar">
        <div className="absolute h-full rounded-full z-10 hz-fill" style={{width: `${w}%`}}></div>
        <div className="absolute w-[10px] h-[10px] bg-white border-2 rounded-full -top-[2px] z-20 -translate-x-1/2 hz-dot" style={{left: `${w}%`}}></div>
      </div>
      <div className="text-[12px] text-[var(--text-muted)] font-medium">{Math.round(data.lower_bound)} – {Math.round(data.upper_bound)} min deviation range</div>
    </div>
  );
}

interface ResultsPanelProps {
  isLoading: boolean;
  routes: RouteResponse[];
  activeIndex: number;
  onChangeActive: (idx: number) => void;
  source: Coordinate | null;
  dest: Coordinate | null;
}

export default function ResultsPanel({ isLoading, routes, activeIndex, onChangeActive, source, dest }: ResultsPanelProps) {
  const [isComparing, setIsComparing] = useState(false);
  const [showToast, setShowToast] = useState(false);

  if (isLoading) {
    return (
      <div className="mt-8">
        <div className="h-[72px] rounded-xl mb-3 anim-shimmer bg-gradient-to-r from-[#F1F5F9] via-[#E2E8F0] to-[#F1F5F9]"></div>
        <div className="h-[72px] rounded-xl mb-3 anim-shimmer bg-gradient-to-r from-[#F1F5F9] via-[#E2E8F0] to-[#F1F5F9]"></div>
        <div className="h-[72px] rounded-xl mb-3 anim-shimmer bg-gradient-to-r from-[#F1F5F9] via-[#E2E8F0] to-[#F1F5F9]"></div>
      </div>
    );
  }

  if(!routes || routes.length === 0) return null;

  const currentRoute = routes[activeIndex];
  const routeColors = ['#1A56DB', '#27272A', '#9333EA'];

  const handleShare = () => {
    const sName = source?.label || "Source point";
    const dName = dest?.label || "Destination point";
    const text = `CGEE™ Route Prediction\nFrom: ${sName} → To: ${dName}\nFastest Route: ${Math.round(currentRoute.eta_minutes['1_hour'].estimate)} min\nDistance: ${currentRoute.meta.distance_km} km | ${currentRoute.meta.incident ? currentRoute.meta.incident_segments : 0} incident segments\nPredicted via contextual graph ML (patent pending)`;
    navigator.clipboard.writeText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="mt-8 anim-scaleIn relative">
      <div className="flex justify-between items-center mb-4">
        <div className="font-bold text-[16px] text-[var(--text-primary)]">Select Route</div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors" onClick={() => setIsComparing(!isComparing)} title="Compare Routes" style={isComparing ? {borderColor: 'var(--primary)', color: 'var(--primary)'}: {}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </button>
          <button className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors" onClick={handleShare} title="Share">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        {routes.map((r, i) => (
          <div key={i} onClick={() => { onChangeActive(i); setIsComparing(false); }} className={`flex p-3 bg-white border rounded-xl cursor-pointer transition-transform hover:translate-x-0.5 shadow-[var(--shadow-sm)] relative overflow-hidden ${activeIndex === i ? 'border-[var(--border-focus)] bg-[var(--primary-light)]' : 'border-[var(--border)]'}`}>
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{background: routeColors[i]}}></div>
            <div className="flex-1 pl-3">
              <div className="font-bold text-[14px] text-[var(--text-primary)] mb-1">{r.label}</div>
              <div className="inline-flex px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[12px] font-bold text-[var(--text-secondary)]">{r.meta.distance_km} km</div>
            </div>
            <div className="text-right">
              <div className="text-[18px] font-[800] text-[var(--text-primary)] leading-none mb-1">{Math.round(r.eta_minutes['1_hour'].estimate)}<span className="text-[12px] font-bold ml-0.5">m</span></div>
              {r.meta.incident ? 
                <div className="inline-flex items-center gap-1 bg-[#FEE2E2] text-[#DC2626] rounded px-1.5 py-0.5 text-[11px] font-bold">⚠ {r.meta.incident_segments} zones</div> : 
                <div className="inline-flex items-center gap-1 bg-[#DCFCE7] text-[#059669] rounded px-1.5 py-0.5 text-[11px] font-bold">✓ Clear</div>
              }
            </div>
          </div>
        ))}
      </div>

      {isComparing ? (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-white shadow-sm mt-6 fade-in">
          <table className="w-full text-center text-[13px]">
            <thead>
              <tr>
                <th className="bg-[var(--bg-surface)] p-3 border-b text-left">Metric</th>
                {routes.map(r => <th key={r.route_id} className="bg-[var(--bg-surface)] p-3 border-b">{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr><td className="p-3 border-b text-left text-[var(--text-muted)] font-medium">1h ETA</td>{routes.map(r => <td key={r.route_id} className="p-3 border-b font-bold border-l">{Math.round(r.eta_minutes['1_hour'].estimate)}m</td>)}</tr>
              <tr><td className="p-3 border-b text-left text-[var(--text-muted)] font-medium">2h ETA</td>{routes.map(r => <td key={r.route_id} className="p-3 border-b font-bold border-l">{Math.round(r.eta_minutes['2_hour'].estimate)}m</td>)}</tr>
              <tr><td className="p-3 border-b text-left text-[var(--text-muted)] font-medium">Distance</td>{routes.map(r => <td key={r.route_id} className="p-3 border-b font-bold border-l">{r.meta.distance_km}km</td>)}</tr>
              <tr><td className="p-3 text-left text-[var(--text-muted)] font-medium">Incidents</td>{routes.map(r => <td key={r.route_id} className="p-3 font-bold border-l">{r.meta.incident ? `⚠ ${r.meta.incident_segments}` : `✓ 0`}</td>)}</tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="flex flex-col gap-3">
            <style>{`.hz-1::before{background:var(--primary)}.hz-2::before{background:var(--warning)}.hz-4::before{background:#0F766E}.hz-1 .hz-fill{background:var(--primary)}.hz-1 .hz-dot{border-color:var(--primary)}.hz-2 .hz-fill{background:var(--warning)}.hz-2 .hz-dot{border-color:var(--warning)}.hz-4 .hz-fill{background:#0F766E}.hz-4 .hz-dot{border-color:#0F766E}`}</style>
            <ETACard horizon="1 Hour Horizon" data={currentRoute.eta_minutes['1_hour']} confidence={currentRoute.confidence['1_hour']} colorClass="hz-1 anim-fadeUp delay-50" />
            <ETACard horizon="2 Hour Horizon" data={currentRoute.eta_minutes['2_hour']} confidence={currentRoute.confidence['2_hour']} colorClass="hz-2 anim-fadeUp delay-100" />
            <ETACard horizon="4 Hour Horizon" data={currentRoute.eta_minutes['4_hour']} confidence={currentRoute.confidence['4_hour']} colorClass="hz-4 anim-fadeUp delay-150" />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="border border-[var(--border)] rounded-[10px] p-3 text-center">
              <svg className="mx-auto text-[var(--text-muted)] mb-1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              <div className="text-[15px] font-bold text-[var(--text-primary)]">{currentRoute.meta.distance_km} km</div>
              <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Distance</div>
            </div>
            <div className="border border-[var(--border)] rounded-[10px] p-3 text-center">
              <svg className="mx-auto text-[var(--text-muted)] mb-1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <div className="text-[15px] font-bold text-[var(--text-primary)]">{currentRoute.meta.segments}</div>
              <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Graph Edges</div>
            </div>
          </div>

          {currentRoute.meta.incident ? (
            <div className="mt-4 border p-4 rounded-[10px] flex gap-4 bg-[#FFF7ED] border-[#FED7AA]">
              <svg className="text-[#EA580C] animate-[pulseRings_2s_infinite] shrink-0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div className="flex-1">
                <div className="font-bold text-[14px] text-[var(--text-primary)] mb-1">Traffic Events Detected</div>
                <div className="text-[13px] font-medium text-[var(--text-secondary)]">{currentRoute.meta.incident_segments} impacted segments requiring contextual modulation.</div>
                <div className="h-1 bg-[var(--bg-base)] border border-[#FED7AA] rounded-full mt-2 w-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FBBF24] to-[#DC2626]" style={{width: `${Math.min(100, currentRoute.meta.avg_incident_severity * 100)}%`}}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 border p-4 rounded-[10px] flex gap-4 bg-[#F0FDF4] border-[#BBF7D0]">
               <svg className="text-[var(--success)] shrink-0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
               <div>
                 <div className="font-bold text-[14px] text-[var(--text-primary)] mb-1">Clear Route</div>
                 <div className="text-[13px] font-medium text-[var(--text-secondary)]">No substantial graph frictions or incidents detected across geometry.</div>
               </div>
            </div>
          )}
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#0F172A] text-white px-5 py-3 rounded-lg font-bold text-[14px] shadow-[var(--shadow-lg)] z-[3000] flex items-center gap-2 anim-fadeUp">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}
