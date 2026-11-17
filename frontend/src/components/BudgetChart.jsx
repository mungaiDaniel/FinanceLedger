import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatKES } from "../api/format";
import { EmptyState } from "./CategoryPieChart";

const tooltipStyle = { backgroundColor: "#151F30", border: "1px solid #2A3A52", borderRadius: 8, color: "#F1F5F9" };

export default function BudgetChart({ budgets }) {
  if (!budgets?.length) return <EmptyState label="No budgets for this month" detail="Add a category budget to compare planned and actual spending." />;
  return <div className="chart-card budget-chart"><h3>Budget vs actual</h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={budgets} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A3A52" vertical={false} />
        <XAxis dataKey="category_name" tick={{ fontSize: 11, fill: "#A7B4C7" }} />
        <YAxis tick={{ fontSize: 12, fill: "#A7B4C7" }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
        <Tooltip formatter={(value) => formatKES(value)} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="planned" name="Planned" fill="#6BAED6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="actual" name="Actual" fill="#58B982" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
