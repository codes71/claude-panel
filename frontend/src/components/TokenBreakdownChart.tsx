import { Box, Typography } from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { TokenBreakdown } from "../types";
import { formatTokens } from "./TokenBadge";

const COLORS = ["#8B5CF6", "#38BDF8", "#34D399", "#FBBF24", "#F87171", "#FB923C"];

interface TokenBreakdownChartProps {
  data: TokenBreakdown[];
  total: number;
}

export default function TokenBreakdownChart({ data, total }: TokenBreakdownChartProps) {
  const chartData = data.map((d, i) => ({
    ...d,
    color: d.color || COLORS[i % COLORS.length],
  }));

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
      <Box sx={{ width: 180, height: 180, position: "relative", minWidth: 0 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="tokens"
              nameKey="category"
              stroke="none"
              paddingAngle={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#18181f",
                border: "1px solid #2a2a3a",
                borderRadius: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.75rem",
              }}
              formatter={(value) => formatTokens(value as number)}
            />
          </PieChart>
        </ResponsiveContainer>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <Typography
            variant="h4"
            sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, lineHeight: 1 }}
          >
            {formatTokens(total)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: "0.6rem" }}>
            total
          </Typography>
        </Box>
      </Box>
      <Box sx={{ flex: 1 }}>
        {chartData.map((item, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              py: 0.6,
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: item.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {item.category}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: "'JetBrains Mono', monospace", color: "text.secondary" }}
            >
              {formatTokens(item.tokens)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
