"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#ca8a04", "#dc2626", "#9333ea", "#0d9488"];

export function DomainCoverageBar({
  data,
}: {
  data: { domain: string; withConclusion: number; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="domain" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="withConclusion" name="Дүгнэлт гарсан" fill="#16a34a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="total" name="Нийт СҮД" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryAchievedBar({
  data,
}: {
  data: { category: string; achieved: number; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="achieved" name="Эзэмшсэн" fill="#16a34a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="total" name="Нийт" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DomainDistributionBar({ data }: { data: { domain: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="domain" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
