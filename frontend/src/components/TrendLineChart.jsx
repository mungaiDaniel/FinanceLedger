import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { formatKES, formatMonth } from "../api/format";
import { EmptyState } from "./CategoryPieChart";

const tooltipStyle = {
  backgroundColor: "#151F30",
  border: "1px solid #2A3A52",
  borderRadius: 8,
  color: "#F1F5F9",
};

export default function TrendLineChart({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState label="No trend data yet" />;
  }

  const formatted = data.map((d) => ({ ...d, monthLabel: formatMonth(d.month) }));

  return (
    <div className="chart-card">
      <h3>Income vs expenses over time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={formatted} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A3A52" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: "#A7B4C7" }} />
          <YAxis tick={{ fontSize: 12, fill: "#A7B4C7" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip formatter={(value) => formatKES(value)} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ color: "#A7B4C7" }} />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#58B982"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Income"
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#F08080"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Expenses"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
