"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#4f46e5",
  "#0891b2",
  "#16a34a",
  "#ca8a04",
  "#dc2626",
  "#9333ea",
  "#0d9488",
];

export function DomainRadar({ data }: { data: { domain: string; avg: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid />
        <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 4]} tickCount={5} />
        <Radar
          name="Дундаж түвшин"
          dataKey="avg"
          stroke="#4f46e5"
          fill="#4f46e5"
          fillOpacity={0.4}
        />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrend({
  data,
  domainNames,
}: {
  data: Record<string, number | string>[];
  domainNames: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="Ерөнхий дундаж"
          stroke="#0f172a"
          strokeWidth={3}
          dot={{ r: 2 }}
          connectNulls
        />
        {domainNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={1.5}
            dot={false}
            connectNulls
            strokeDasharray="4 2"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PeriodComparisonBar({
  data,
  keys,
}: {
  data: Record<string, number | string>[];
  keys: [string, string];
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="domain" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey={keys[0]} fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey={keys[1]} fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const GROUP_COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#ca8a04", "#dc2626", "#9333ea"];

export function GroupCategoryComparisonBar({
  data,
  groupKeys,
}: {
  data: Record<string, number | string>[];
  groupKeys: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {groupKeys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={GROUP_COLORS[i % GROUP_COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReadinessYearComparisonBar({
  data,
  keys,
}: {
  data: Record<string, number | string>[];
  keys: [string, string];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: 0, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey={keys[0]} fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey={keys[1]} fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
