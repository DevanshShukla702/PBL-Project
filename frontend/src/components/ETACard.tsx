import React from 'react';
import type { HorizonETA } from '../types/eta';

interface ETACardProps {
  horizonLabel: string;
  eta: HorizonETA;
  confidence: number;
}

const ETACard: React.FC<ETACardProps> = ({ horizonLabel, eta, confidence }) => {
  return (
    <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 hover:border-blue-500/30 rounded-2xl p-4 transition-all duration-300 shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between group">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{horizonLabel} Horizon</h3>
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">
          {confidence.toFixed(1)}% conf
        </span>
      </div>
      
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-4xl font-extrabold text-white group-hover:text-blue-400 transition-colors tracking-tight">
          {Math.round(eta.estimate)}
        </span>
        <span className="text-sm font-medium text-slate-400 mb-1">min</span>
      </div>
      
      <div className="w-full bg-slate-900/80 rounded-full h-1.5 mb-3 overflow-hidden flex shadow-inner">
         <div className="bg-gradient-to-r from-blue-600 to-cyan-400 h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${confidence}%` }}></div>
      </div>
      
      <div className="flex justify-between items-center text-xs font-medium text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>{Math.round(eta.lower_bound)}m</span>
        <span className="text-slate-600">—</span>
        <span className="flex items-center gap-1.5">{Math.round(eta.upper_bound)}m<span className="w-2 h-2 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span></span>
      </div>
    </div>
  );
};

export default ETACard;
