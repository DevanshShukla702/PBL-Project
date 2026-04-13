import React, { useState, useEffect, useRef } from 'react';
import { geocodingApi } from '../services/api';
import type { LocationPoint, NominatimResult } from '../types/eta';

interface LocationSearchProps {
  label: string;
  value: LocationPoint | null;
  onChange: (point: LocationPoint | null) => void;
  onClickMap: () => void;
  isSelecting: boolean;
}

const LocationSearch: React.FC<LocationSearchProps> = ({ 
  label, 
  value, 
  onChange, 
  onClickMap,
  isSelecting
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && !query) {
      geocodingApi.reverse(value.lat, value.lon).then(res => {
        setQuery(res.display_name);
      }).catch(() => {
        setQuery(`${value.lat.toFixed(4)}, ${value.lon.toFixed(4)}`);
      });
    }
  }, [value, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text) {
      setResults([]);
      setShowDropdown(false);
      onChange(null);
      return;
    }

    setIsSearching(true);
    try {
      const data = await geocodingApi.search(text);
      setResults(data);
      setShowDropdown(true);
    } catch (err) {
      console.error("Geocoding failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (result: NominatimResult) => {
    setQuery(result.display_name);
    onChange({ lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
          />
          {isSearching && (
            <div className="absolute right-3 top-3.5">
              <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setQuery('');
            onClickMap();
          }}
          className={`px-4 rounded-xl border transition-all ${
            isSelecting 
            ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
            : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-700'
          }`}
          title="Select on Map"
        >
          <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {showDropdown && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar overflow-x-hidden origin-top">
          {results.map((result) => (
            <li
              key={result.place_id}
              className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer text-sm text-slate-300 transition-colors border-b border-slate-700/50 last:border-0 truncate"
              onClick={() => handleSelect(result)}
              title={result.display_name}
            >
              <div className="font-medium text-white truncate">{result.display_name.split(',')[0]}</div>
              <div className="text-xs text-slate-500 truncate">{result.display_name.substring(result.display_name.indexOf(',') + 1)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationSearch;
