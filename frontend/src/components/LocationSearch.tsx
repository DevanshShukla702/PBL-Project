import React from 'react';
import { Coordinate } from '../types';

interface LocationSearchProps {
  source: Coordinate | null;
  dest: Coordinate | null;
  onChangeSource: (c: Coordinate) => void;
  onChangeDest: (c: Coordinate) => void;
  onSwap: () => void;
}

const PRESETS = [
  { label: 'Bengaluru Center', lat: 12.9716, lon: 77.5946 },
  { label: 'Yelahanka', lat: 13.1007, lon: 77.5963 },
  { label: 'Koramangala', lat: 12.9279, lon: 77.6271 },
  { label: 'Indiranagar', lat: 12.9784, lon: 77.6408 },
  { label: 'Electronic City', lat: 12.8399, lon: 77.6770 }
];

export default function LocationSearch({ source, dest, onChangeSource, onChangeDest, onSwap }: LocationSearchProps) {
  
  const handleSelect = (val: string, type: 'src'|'dst') => {
    if(!val) return;
    const [lat, lon] = val.split(',').map(Number);
    if(type === 'src') onChangeSource({ lat, lon, label: 'Selected Preset' });
    else onChangeDest({ lat, lon, label: 'Selected Preset' });
  };

  const getVal = (c: Coordinate | null) => c ? `${c.lat},${c.lon}` : "";

  return (
    <div className="relative mb-6">
      <div className="absolute top-8 bottom-8 left-[15px] w-0.5 border-l-2 border-dashed border-[#CBD5E1] z-0"></div>
      
      <button 
        onClick={onSwap}
        className="absolute top-1/2 left-[3px] -translate-y-1/2 w-[26px] h-[26px] bg-white border border-[var(--border)] rounded-full flex items-center justify-center z-10 cursor-pointer shadow-[var(--shadow-sm)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-transform hover:rotate-180"
        title="Swap points"
      >
        ⇅
      </button>

      <div className="mb-4 relative z-10">
        <div className="flex items-center gap-2 text-[13px] font-bold mb-2 text-[var(--text-primary)] tracking-wide"><span className="text-[var(--primary)]">●</span> FROM</div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="10" r="3"/><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
          <select 
            className="input-base pl-9 border-l-[3px] border-l-[var(--primary)] appearance-none"
            value={getVal(source)}
            onChange={e => handleSelect(e.target.value, 'src')}
          >
            <option value="">Select a landmark or click map...</option>
            {PRESETS.map(p => <option key={p.label} value={`${p.lat},${p.lon}`}>{p.label}</option>)}
            {source && !PRESETS.find(p => p.lat === source.lat && p.lon === source.lon) && <option value={getVal(source)}>Map Selection</option>}
          </select>
        </div>
        {source && <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold bg-[var(--primary-light)] text-[var(--primary-dark)]">✓ {source.label || "Map Point"}</div>}
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 text-[13px] font-bold mb-2 text-[var(--text-primary)] tracking-wide"><span className="text-[var(--success)]">●</span> TO</div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="10" r="3"/><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
          <select 
            className="input-base pl-9 border-l-[3px] border-l-[var(--success)] appearance-none"
            value={getVal(dest)}
            onChange={e => handleSelect(e.target.value, 'dst')}
          >
            <option value="">Select a landmark or click map...</option>
            {PRESETS.map(p => <option key={p.label} value={`${p.lat},${p.lon}`}>{p.label}</option>)}
            {dest && !PRESETS.find(p => p.lat === dest.lat && p.lon === dest.lon) && <option value={getVal(dest)}>Map Selection</option>}
          </select>
        </div>
        {dest && <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold bg-[#D1FAE5] text-[#065F46]">✓ {dest.label || "Map Point"}</div>}
      </div>
    </div>
  );
}
