import { useState } from 'react';
import LocationSearch from '../components/LocationSearch';
import DateTimeSelector from '../components/DateTimeSelector';
import ResultsPanel from '../components/ResultsPanel';
import MapView from '../components/MapView';
import { predictRouteETA, RouteResponse } from '../services/api';
import { Coordinate } from '../types';

export default function Dashboard() {
  const [source, setSource] = useState<Coordinate | null>(null);
  const [dest, setDest] = useState<Coordinate | null>(null);
  const [depTime, setDepTime] = useState<Date>(new Date());
  
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [activeRouteIdx, setActiveRouteIdx] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    if(!source || !dest) return;
    setIsLoading(true); setError(null);
    try {
      const data = await predictRouteETA({
        source, destination: dest, departure_time: depTime.toISOString()
      });
      if(data.routes && data.routes.length > 0) {
        setRoutes(data.routes);
        setActiveRouteIdx(0);
      } else {
        setError("No routes calculated");
      }
    } catch(err: any) {
      setError(err.message || "Failed to load routes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    const ts = source; setSource(dest); setDest(ts);
  };

  const currentRoute = routes[activeRouteIdx] || null;

  return (
    <div className="flex flex-col md:flex-row w-full h-full relative">
      <aside className="w-full md:w-[420px] bg-[var(--bg-base)] flex flex-col z-10 border-r border-[var(--border)] anim-slideInLeft md:shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[20px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              Plan Your Trip
            </h2>
            <button 
              className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[var(--border)] rounded-md text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all"
              onClick={() => { setSource(null); setDest(null); setRoutes([]); setError(null); setDepTime(new Date()); }}
            >
              Reset
            </button>
          </div>
          
          <hr className="border-[var(--border)] mb-6" />

          <LocationSearch 
            source={source} dest={dest} 
            onChangeSource={setSource} onChangeDest={setDest} 
            onSwap={handleSwap} 
          />

          <DateTimeSelector date={depTime} onChange={setDepTime} routes={routes} onPredict={handlePredict} />

          <button 
            className="w-full h-[52px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white font-bold rounded-lg flex items-center justify-center gap-2 mt-2 shadow-[0_4px_20px_rgba(26,86,219,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(26,86,219,0.4)] transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            disabled={!source || !dest || isLoading}
            onClick={handlePredict}
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Compute Intelligence'}
          </button>

          {error && <div className="text-[var(--danger)] text-sm font-semibold mt-4 bg-[#FEE2E2] p-3 rounded-md">{error}</div>}

          <ResultsPanel 
            isLoading={isLoading} 
            routes={routes} 
            activeIndex={activeRouteIdx} 
            onChangeActive={setActiveRouteIdx} 
            source={source}
            dest={dest}
          />
        </div>
      </aside>
      
      <main className="flex-1 relative z-0 h-[50vh] md:h-auto">
        <MapView 
          source={source} dest={dest} 
          routes={routes} activeRouteIdx={activeRouteIdx} 
          onChangeSource={setSource} onChangeDest={setDest} 
          onRouteSelect={setActiveRouteIdx}
        />
      </main>
    </div>
  );
}
