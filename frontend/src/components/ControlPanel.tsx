import LocationSearch from "./LocationSearch";
import DateTimeSelector from "./DateTimeSelector";
import type { Location } from "../types/eta";

interface Props {
  source: Location | null;
  destination: Location | null;
  datetime: string;
  setSource: (loc: Location) => void;
  setDestination: (loc: Location) => void;
  setDatetime: (dt: string) => void;
  onPredict: () => void;
  loading: boolean;
  error: string;
}

export default function ControlPanel({
  source,
  destination,
  datetime,
  setSource,
  setDestination,
  setDatetime,
  onPredict,
  loading,
  error,
}: Props) {
  return (
    <div className="w-96 bg-gradient-to-br from-slate-800 to-slate-900 border-r border-slate-700 shadow-2xl overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2">
            ETA Predictor
          </h1>
          <p className="text-gray-400 text-sm">
            Predict travel time with real-time traffic analysis
          </p>
        </div>

        {/* Source Location */}
        <div className="mb-6">
          <LocationSearch label="Source Location" onSelect={setSource} />
          {source && (
            <div className="mt-3 p-3 bg-emerald-900/30 border border-emerald-500/50 rounded-lg">
              <p className="text-emerald-300 text-xs font-semibold mb-1">
                ✓ Source Selected
              </p>
              <p className="text-emerald-100 text-sm font-mono">
                {source.lat.toFixed(4)}, {source.lon.toFixed(4)}
              </p>
            </div>
          )}
        </div>

        {/* Destination Location */}
        <div className="mb-6">
          <LocationSearch
            label="Destination Location"
            onSelect={setDestination}
          />
          {destination && (
            <div className="mt-3 p-3 bg-emerald-900/30 border border-emerald-500/50 rounded-lg">
              <p className="text-emerald-300 text-xs font-semibold mb-1">
                ✓ Destination Selected
              </p>
              <p className="text-emerald-100 text-sm font-mono">
                {destination.lat.toFixed(4)}, {destination.lon.toFixed(4)}
              </p>
            </div>
          )}
        </div>

        {/* DateTime Selector */}
        <div className="mb-6">
          <DateTimeSelector value={datetime} onChange={setDatetime} />
          {datetime && (
            <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
              <p className="text-blue-300 text-xs font-semibold mb-1">
                ✓ Time Selected
              </p>
              <p className="text-blue-100 text-sm font-mono">
                {new Date(datetime).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/40 border border-red-500/50 rounded-lg">
            <p className="text-red-300 text-sm font-semibold mb-1">⚠️ Error</p>
            <p className="text-red-100 text-xs">{error}</p>
          </div>
        )}

        {/* Predict Button */}
        <button
          onClick={onPredict}
          disabled={loading || !source || !destination || !datetime}
          className="w-full relative overflow-hidden group mb-6"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300 group-disabled:opacity-30" />
          <div className="relative px-6 py-3 bg-slate-900 rounded-lg leading-none flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-white font-bold">Predicting...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">🚗</span>
                <span className="text-white font-bold">Predict ETA</span>
              </>
            )}
          </div>
        </button>

        {/* Info Box */}
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-gray-300 text-xs leading-relaxed">
            <span className="text-blue-400 font-semibold">💡 Tip:</span> Select
            source and destination locations on the map, choose a date/time, and
            click "Predict ETA" to see estimated travel time with confidence
            levels.
          </p>
        </div>
      </div>
    </div>
  );
}