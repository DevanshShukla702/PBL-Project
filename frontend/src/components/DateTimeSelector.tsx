import React from 'react';

interface DateTimeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({ value, onChange }) => {
  const handleSetNow = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    onChange(now.toISOString().slice(0, 16));
  };

  return (
    <div className="relative">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner [color-scheme:dark]"
      />
      <button
        onClick={handleSetNow}
        className="absolute right-3 top-[10px] text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors text-white font-medium shadow-sm hover:shadow-md active:scale-95"
        title="Set to Current Time"
      >
        Now
      </button>
    </div>
  );
};

export default DateTimeSelector;
