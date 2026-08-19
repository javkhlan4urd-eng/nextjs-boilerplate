"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#ca8a04", "#dc2626", "#9333ea", "#0d9488"];

export default function GaraaDomainChart({ data }: { data: { domain: string; pct: number; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="domain" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value, _name, item) => [`${value}%`, `${item.payload.count} ажиглалт`]} />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
