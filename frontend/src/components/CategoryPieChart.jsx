import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatKES } from "../api/format";

const PALETTE = ["#58B982", "#6BAED6", "#E5B65A", "#F08080", "#AE93E7", "#62B6A7", "#E49B6F", "#B7C0CC"];
const tooltipStyle = { backgroundColor: "#151F30", border: "1px solid #2A3A52", borderRadius: 8, color: "#F1F5F9" };

export default function CategoryPieChart({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState label="No categorized spending yet" />;
  }

  return (
    <div className="chart-card">
      <h3>Spend by category</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.category} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatKES(value)} contentStyle={tooltipStyle} />
          <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ color: "#A7B4C7" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EmptyState({ label, detail = "Upload a statement to see this chart fill in." }) {
  return (
    <div className="chart-card empty-state">
      <h3>{label}</h3>
      <p>{detail}</p>
    </div>
  );
}
