"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

const TEST_COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#ca8a04"];
const LEVEL_COLORS: Record<string, string> = {
  "Маш сайн": "#16a34a",
  "Хангалттай": "#ca8a04",
  "Дэмжлэг хэрэгтэй": "#dc2626",
};

export function TestAverageBar({ data }: { data: { test: string; avg: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="test" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 3]} tickCount={4} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={TEST_COLORS[i % TEST_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LevelDistributionBar({ data }: { data: { level: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="level" width={110} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.level} fill={LEVEL_COLORS[d.level] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
