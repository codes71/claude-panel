import { Box, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TokenConsumer } from "../types";
import { formatTokens } from "./TokenBadge";

const CATEGORY_COLORS: Record<string, string> = {
  Plugins: "#8B5CF6",
  "MCP Servers": "#38BDF8",
  "CLAUDE.md": "#34D399",
  Commands: "#FBBF24",
  Other: "#F87171",
};

interface TopConsumersChartProps {
  data: TokenConsumer[];
}

export default function TopConsumersChart({ data }: TopConsumersChartProps) {
  return (
    <Box sx={{ width: "100%", height: 300, minWidth: 0 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v) => formatTokens(v)}
            tick={{
              fill: "#8b8a94",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{
              fill: "#e0dfe4",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "#18181f",
              border: "1px solid #2a2a3a",
              borderRadius: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.75rem",
            }}
            formatter={(value) => [formatTokens(value as number), "tokens"]}
          />
          <Bar dataKey="tokens" radius={[0, 4, 4, 0]} barSize={24}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={CATEGORY_COLORS[entry.category] || "#8B5CF6"}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
