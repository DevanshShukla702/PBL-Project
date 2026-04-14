import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import { checkHealth } from './services/api';

function App() {
  const [isReady, setIsReady] = useState(false);

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
          <a href="/" className="text-[20px] font-[800] text-[var(--primary)]">CGEE™</a>
          <span className="font-semibold text-[var(--text-primary)]">Trip Explorer</span>
        </div>
        <div className="flex items-center gap-3 text-[13px] font-semibold text-[var(--text-secondary)]">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-[var(--success)] animate-[pulseRings_2s_infinite]' : 'bg-[var(--text-muted)]'}`}></div>
          {isReady ? 'Engine ready' : 'Initializing...'}
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden relative">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
