import React from 'react';
import ETACard from './ETACard';
import type { RouteResult } from '../types/eta';

interface ResultsPanelProps {
  routes: RouteResult[];
  selectedRouteId: number;
  onSelectRoute: (id: number) => void;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ routes, selectedRouteId, onSelectRoute }) => {
  const selectedRoute = routes.find(r => r.route_id === selectedRouteId) || routes[0];

  const incidentLevel = (severity: number) => {
    if (severity < 0.4) return 'Low';
    if (severity <= 0.7) return 'Moderate';
    return 'Severe';
  };

  const incidentBadgeColor = (hasIncident: boolean, severity: number) => {
    if (!hasIncident) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (severity < 0.4) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    if (severity <= 0.7) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-700/50 pb-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Route Comparison</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{routes.length} route{routes.length > 1 ? 's' : ''} analyzed with multi-horizon predictions</p>
      </div>

      {/* Route Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {routes.map(route => {
          const isSelected = route.route_id === selectedRouteId;
          const eta1h = route.eta_minutes["1_hour"].estimate;
          return (
            <button
              key={route.route_id}
              onClick={() => onSelectRoute(route.route_id)}
              className={`flex-1 min-w-0 px-3 py-3 rounded-xl border transition-all duration-200 text-left ${
                isSelected 
                  ? 'bg-slate-700/60 border-slate-500/60 shadow-lg' 
                  : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-white/20"
                  style={{ backgroundColor: route.color, boxShadow: isSelected ? `0 0 10px ${route.color}` : 'none' }}
                />
                <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                  {route.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-extrabold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {Math.round(eta1h)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">min</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                <span>{route.meta.distance_km} km</span>
                {route.meta.incident && (
                  <span className="text-red-400 font-medium">• ⚠ {route.meta.incident_segments} inc</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Route Details */}
      {selectedRoute && (
        <>
          {/* ETA Cards */}
          <div className="grid grid-cols-1 gap-3">
            <ETACard 
              horizonLabel="1 Hour" 
              eta={selectedRoute.eta_minutes["1_hour"]} 
              confidence={selectedRoute.confidence["1_hour"]} 
            />
            <ETACard 
              horizonLabel="2 Hour" 
              eta={selectedRoute.eta_minutes["2_hour"]} 
              confidence={selectedRoute.confidence["2_hour"]} 
            />
            <ETACard 
              horizonLabel="4 Hour" 
              eta={selectedRoute.eta_minutes["4_hour"]} 
              confidence={selectedRoute.confidence["4_hour"]} 
            />
          </div>

          {/* Route Metadata */}
          <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/50 shadow-lg">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Route Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Distance</span>
                <span className="font-bold text-white text-base">{selectedRoute.meta.distance_km} km</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Segments</span>
                <span className="font-bold text-white text-base">{selectedRoute.meta.segments.toLocaleString()}</span>
              </div>
            </div>
            
            {/* Incident Panel */}
            <div className={`mt-5 p-4 rounded-xl border ${incidentBadgeColor(selectedRoute.meta.incident, selectedRoute.meta.avg_incident_severity)} transition-colors shadow-inner`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-2">
                  {selectedRoute.meta.incident ? (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {selectedRoute.meta.incident ? 'Incidents Detected' : 'Clear Route'}
                </span>
              </div>
              {selectedRoute.meta.incident && (
                <div className="text-xs opacity-90 mt-3 pt-3 border-t border-current/20 grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="block opacity-75 font-medium">Severity</span>
                    <span className="font-bold text-sm">
                      {incidentLevel(selectedRoute.meta.avg_incident_severity)}
                      <span className="opacity-75 text-xs font-normal ml-1">
                        ({(selectedRoute.meta.avg_incident_severity * 100).toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="block opacity-75 font-medium">Impacted Segments</span>
                    <span className="font-bold text-sm">{selectedRoute.meta.incident_segments}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsPanel;
