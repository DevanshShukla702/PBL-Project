import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import { HistoryPage } from './pages/HistoryPage';
import { checkHealth } from './services/api';
import { Coordinate } from './types';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [activePage, setActivePage] = useState<'dashboard' | 'history'>('dashboard');
  const [pendingTrip, setPendingTrip] = useState<{source: Coordinate, dest: Coordinate, autoPredict?: boolean} | null>(null);

  useEffect(() => {
    const checkEngine = async () => {
      try {
        const res = await checkHealth();
        if (res.engine_ready) setIsReady(true);
      } catch (err) {
        console.error("Engine offline");
      }
    };
    checkEngine();
    const iv = setInterval(checkEngine, 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center px-6 py-3 bg-white/85 backdrop-blur-md border-b border-[var(--border)] z-50 shrink-0">
        <div className="flex items-center gap-8">
          <a href="/" className="text-[20px] font-[800] text-[var(--primary)] shrink-0">CGEE</a>
          <nav className="flex gap-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <button 
              onClick={() => setActivePage('dashboard')}
              className={`hover:text-[var(--primary)] transition-colors ${activePage === 'dashboard' ? 'text-[var(--primary)]' : ''}`}
            >
              Trip Explorer
            </button>
            <button 
              onClick={() => setActivePage('history')}
              className={`hover:text-[var(--primary)] transition-colors ${activePage === 'history' ? 'text-[var(--primary)]' : ''}`}
            >
              Journey History
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-[13px] font-semibold text-[var(--text-secondary)]">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-[var(--success)] animate-[pulseRings_2s_infinite]' : 'bg-[var(--text-muted)]'}`}></div>
          {isReady ? 'Engine ready' : 'Initializing...'}
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden relative">
        {activePage === 'dashboard' ? (
          <Dashboard pendingTrip={pendingTrip} />
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 w-full">
            <HistoryPage 
              onNavigateToTrip={(source, dest, autoPredict) => {
                setPendingTrip({ source, dest, autoPredict });
                setActivePage('dashboard');
              }} 
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
