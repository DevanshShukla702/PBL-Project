import React, { useState } from 'react';
import MapView from '../components/MapView';
import LocationSearch from '../components/LocationSearch';
import DateTimeSelector from '../components/DateTimeSelector';
import ResultsPanel from '../components/ResultsPanel';
import { etaApi } from '../services/api';
import type { LocationPoint, PredictionResponse, RouteResult } from '../types/eta';

const Dashboard: React.FC = () => {
  const [source, setSource] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [datetime, setDatetime] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PredictionResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number>(1);
  const [selectingPoint, setSelectingPoint] = useState<'source' | 'destination' | null>(null);

  const handlePredict = async () => {
    if (!source || !destination || !datetime) {
      setError("Please select source, destination, and datetime.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedRouteId(1);
    
    try {
      const response = await etaApi.predictRoute({
        source,
        destination,
        datetime: new Date(datetime).toISOString()
      });

      if ('error' in response && !('routes' in response)) {
        setError((response as any).error || "Failed to compute routes.");
        return;
      }

      setResults(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message || "Failed to fetch ETA predictions.");
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (selectingPoint === 'source') {
      setSource({ lat, lon });
      setSelectingPoint(null);
    } else if (selectingPoint === 'destination') {
      setDestination({ lat, lon });
      setSelectingPoint(null);
    }
  };

  const selectedRoute: RouteResult | null = results
    ? results.routes.find(r => r.route_id === selectedRouteId) || results.routes[0]
    : null;

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#0F172A] text-slate-200">
      {/* Left Panel */}
      <div className="w-full md:w-[420px] h-full flex flex-col p-6 bg-[#1e293b] border-r border-slate-700 overflow-y-auto shrink-0 shadow-2xl z-10 custom-scrollbar">
        <h1 className="text-2xl font-bold mb-1 tracking-tight text-white flex items-center gap-2">
            <span className="bg-blue-500 w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
            CGEE™
        </h1>
        <p className="text-sm text-slate-400 mb-8 border-b border-slate-700 pb-4 font-medium tracking-wide">Contextual Graph ETA Engine</p>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Source</label>
            <LocationSearch 
              label="Source" 
              value={source} 
              onChange={setSource} 
              onClickMap={() => setSelectingPoint('source')}
              isSelecting={selectingPoint === 'source'}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destination</label>
            <LocationSearch 
              label="Destination" 
              value={destination} 
              onChange={setDestination} 
              onClickMap={() => setSelectingPoint('destination')}
              isSelecting={selectingPoint === 'destination'}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Departure Time</label>
            <DateTimeSelector value={datetime} onChange={setDatetime} />
          </div>

          <button
            onClick={handlePredict}
            disabled={!source || !destination || loading}
            className={`w-full py-3.5 px-4 rounded-xl font-medium transition-all duration-200 shadow-lg ${
              !source || !destination || loading 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing AI Model...
              </span>
            ) : 'Predict ETA'}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {results && !loading && (
          <div className="mt-8 transition-all duration-500 ease-in-out">
            <ResultsPanel 
              routes={results.routes} 
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
            />
          </div>
        )}
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 relative h-[50vh] md:h-full w-full pointer-events-auto">
        {selectingPoint && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg shadow-blue-900/50 flex items-center gap-2 font-medium animate-bounce pointer-events-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Click on the map to select {selectingPoint}
          </div>
        )}
        <MapView 
          source={source} 
          destination={destination} 
          routes={results?.routes || []}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          onMapClick={handleMapClick}
        />
      </div>
    </div>
  );
};

export default Dashboard;
