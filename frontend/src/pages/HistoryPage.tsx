import React, { useState, useEffect } from 'react';
import { 
  fetchHistory, 
  fetchFavourites, 
  deleteFavourite, 
  TripRecord, 
  FavouriteRecord 
} from '../services/historyApi';
import { Coordinate } from '../types';

interface HistoryPageProps {
  onNavigateToTrip: (source: Coordinate, dest: Coordinate, autoPredict?: boolean) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigateToTrip }) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'favourites'>('recent');
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [favourites, setFavourites] = useState<FavouriteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, favData] = await Promise.all([
        fetchHistory(),
        fetchFavourites()
      ]);
      setTrips(historyData);
      setFavourites(favData);
    } catch (e) {
      console.error("Failed to load history data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFav = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteFavourite(id);
      setFavourites(favourites.filter(f => f.id !== id));
    } catch (e) {
      console.error("Failed to delete fav");
    }
  };

  const handleAction = (item: TripRecord | FavouriteRecord, autoPredict: boolean) => {
    onNavigateToTrip(
      { lat: item.source_lat, lon: item.source_lon, label: item.source_label },
      { lat: item.dest_lat, lon: item.dest_lon, label: item.dest_label },
      autoPredict
    );
  };

  const getRelativeTime = (isoDate: string) => {
    const d = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins || 1} mins ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return `Yesterday`;
    return `${diffDays} days ago`;
  };

  const filterItems = (items: any[]) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => 
      (item.source_label && item.source_label.toLowerCase().includes(q)) ||
      (item.dest_label && item.dest_label.toLowerCase().includes(q))
    );
  };

  const filteredTrips = filterItems(trips);
  const filteredFavs = filterItems(favourites);

  return (
    <div className="max-w-4xl mx-auto p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Journey History</h1>
        <input 
          type="text" 
          placeholder="Search locations..."
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-700 mb-6">
        <button 
          className={`pb-3 px-2 font-medium text-sm transition-colors ${activeTab === 'recent' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent Trips
        </button>
        <button 
          className={`pb-3 px-2 font-medium text-sm transition-colors ${activeTab === 'favourites' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('favourites')}
        >
          Favourites
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 h-32"></div>
          ))
        ) : activeTab === 'recent' ? (
          filteredTrips.length > 0 ? (
            filteredTrips.map(trip => (
              <div key={trip.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3 text-slate-800 dark:text-white font-medium">
                    <span className="max-w-[200px] truncate">{trip.source_label || "Selected Pin"}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
                    <span className="max-w-[200px] truncate">{trip.dest_label || "Selected Pin"}</span>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">{getRelativeTime(trip.created_at)}</span>
                </div>
                
                <div className="flex space-x-6 text-sm text-slate-600 dark:text-slate-300 mb-4">
                  <div className="flex items-center space-x-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>{Math.round(trip.fastest_eta_minutes)} mins</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                    <span>{trip.distance_km?.toFixed(1)} km</span>
                  </div>
                  {(trip as any).incident && (
                    <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      <span>{(trip as any).incident_segments} incidents</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button onClick={() => handleAction(trip, false)} className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">
                    View on Map
                  </button>
                  <button onClick={() => handleAction(trip, true)} className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition-colors">
                    Predict ETA
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              No recent trips found for this session.
            </div>
          )
        ) : (
          filteredFavs.length > 0 ? (
            filteredFavs.map(fav => (
              <div key={fav.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="absolute top-4 right-4 flex space-x-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-full">
                    {fav.trip_count} trips
                  </span>
                  <button onClick={(e) => handleDeleteFav(fav.id, e)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Remove from favourites">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>

                <div className="flex items-center space-x-3 text-slate-800 dark:text-white font-medium mb-3 pr-24">
                  <span className="max-w-[200px] truncate">{fav.source_label || "Selected Pin"}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
                  <span className="max-w-[200px] truncate">{fav.dest_label || "Selected Pin"}</span>
                </div>
                
                <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  Last fastest ETA: <span className="font-semibold">{Math.round(fav.last_fastest_eta)} mins</span>
                  <span className="mx-2 text-slate-300 dark:text-slate-600">|</span> 
                  Added {getRelativeTime(fav.created_at)}
                </div>

                <div className="flex space-x-3">
                   <button onClick={() => handleAction(fav, false)} className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">
                    View on Map
                  </button>
                  <button onClick={() => handleAction(fav, true)} className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition-colors">
                    Predict ETA
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              No frequently travelled routes recorded yet.
            </div>
          )
        )}
      </div>
    </div>
  );
};
