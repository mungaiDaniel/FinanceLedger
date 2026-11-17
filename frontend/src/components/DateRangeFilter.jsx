const PRESETS = [
  { label: "This month", getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toISO(start), end: toISO(now) };
  }},
  { label: "Last 3 months", getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { start: toISO(start), end: toISO(now) };
  }},
  { label: "This year", getRange: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return { start: toISO(start), end: toISO(now) };
  }},
  { label: "All time", getRange: () => ({ start: "", end: "" }) },
];

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

export default function DateRangeFilter({ range, onChange, activePreset, onPresetChange }) {
  return (
    <div className="date-filter">
      <div className="preset-pills">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            className={`pill ${activePreset === preset.label ? "active" : ""}`}
            onClick={() => {
              onPresetChange(preset.label);
              onChange(preset.getRange());
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="custom-range">
        <input
          type="date"
          value={range.start}
          onChange={(e) => {
            onPresetChange(null);
            onChange({ ...range, start: e.target.value });
          }}
        />
        <span>to</span>
        <input
          type="date"
          value={range.end}
          onChange={(e) => {
            onPresetChange(null);
            onChange({ ...range, end: e.target.value });
          }}
        />
      </div>
    </div>
  );
}
