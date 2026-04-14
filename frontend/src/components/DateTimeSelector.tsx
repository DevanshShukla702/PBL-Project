import React from 'react';
import { RouteResponse } from '../services/api';

interface DateTimeSelectorProps {
  date: Date;
  onChange: (d: Date) => void;
  routes: RouteResponse[];
  onPredict: () => void;
}

export default function DateTimeSelector({ date, onChange, routes, onPredict }: DateTimeSelectorProps) {
  
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);

  const handleSetNow = () => onChange(new Date());

  const addHours = (h: number) => {
    const d = new Date();
    d.setHours(d.getHours() + h);
    onChange(d);
    setTimeout(onPredict, 50); // Re-run
  };

  return (
    <div className="mb-4">
      <div className="text-[13px] font-bold mb-2 text-[var(--text-muted)] tracking-wide">DEPARTURE TIME</div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <input 
            type="datetime-local" 
            className="input-base pl-9 border-l border-l-[var(--border)]" 
            value={localISOTime}
            onChange={e => onChange(new Date(e.target.value))}
          />
        </div>
        <button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white px-4 rounded-lg font-bold text-[13px] transition-colors" onClick={handleSetNow}>Now</button>
      </div>

      {routes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 anim-fadeIn">
          <button onClick={() => addHours(0)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors active:bg-[var(--primary)] active:text-white">
            Leave Now &middot; {Math.round(routes[0].eta_minutes['1_hour'].estimate)}m
          </button>
          <button onClick={() => addHours(1)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors active:bg-[var(--primary)] active:text-white" title="Uses 1h XGBoost Model">
            In 1 hr &middot; {Math.round(routes[0].eta_minutes['1_hour'].estimate * 1.05)}m
          </button>
          <button onClick={() => addHours(4)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full text-[12px] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors active:bg-[var(--primary)] active:text-white" title="Uses 4h XGBoost Model">
            In 4 hr &middot; {Math.round(routes[0].eta_minutes['4_hour'].estimate)}m
          </button>
        </div>
      )}
    </div>
  );
}
