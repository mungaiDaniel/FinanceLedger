import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { formatKES } from "../api/format";
import { EmptyState } from "./CategoryPieChart";

const PALETTE = ["#58B982", "#6BAED6", "#E5B65A", "#F08080", "#AE93E7", "#62B6A7", "#E49B6F", "#B7C0CC"];
const tooltipStyle = { backgroundColor: "#151F30", border: "1px solid #2A3A52", borderRadius: 8, color: "#F1F5F9" };

export default function CategoryBarChart({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState label="No category comparison yet" />;
  }

  const sorted = [...data].sort((a, b) => b.total - a.total);

  return (
    <div className="chart-card">
      <h3>Category comparison</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A3A52" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: "#A7B4C7" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 12, fill: "#F1F5F9" }} />
          <Tooltip formatter={(value) => formatKES(value)} contentStyle={tooltipStyle} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, index) => (
              <Cell key={entry.category} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
