import { Box, Card, CardContent, Typography, Grid, Snackbar, Alert } from "@mui/material";
import { alpha } from "@mui/material/styles";
import TokenIcon from "@mui/icons-material/DataUsage";
import ExtensionIcon from "@mui/icons-material/Extension";
import DnsIcon from "@mui/icons-material/Dns";
import DescriptionIcon from "@mui/icons-material/Description";
import { useState } from "react";
import { useDashboard } from "../api/dashboard";
import TokenBreakdownChart from "../components/TokenBreakdownChart";
import TopConsumersChart from "../components/TopConsumersChart";
import SuggestionCard from "../components/SuggestionCard";
import LoadingCard from "../components/LoadingCard";
import { formatTokens } from "../components/TokenBadge";
import type { DashboardData, OptimizationSuggestion } from "../types";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <Card sx={{ overflow: "hidden" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="caption" sx={{ mb: 0.5, display: "block" }}>
              {label}
            </Typography>
            <Typography
              variant="h2"
              sx={{ fontSize: "1.8rem", fontWeight: 700, lineHeight: 1 }}
            >
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(color, 0.1),
              color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function deriveStats(data: DashboardData) {
  const pluginsCat = data.categories.find((c) => c.name === "Plugins");
  const mcpCat = data.categories.find((c) => c.name === "MCP Servers");
  const mdCat = data.categories.find((c) => c.name === "CLAUDE.md");
  return {
    activePlugins: pluginsCat?.items.filter((i) => i.enabled).length ?? 0,
    activeMcp: mcpCat?.items.filter((i) => i.enabled).length ?? 0,
    mdFiles: mdCat?.items.length ?? 0,
  };
}

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();
  const [toast, setToast] = useState<string | null>(null);

  const handleApply = (suggestion: OptimizationSuggestion) => {
    setToast(`Applied: ${suggestion.title}`);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load dashboard: {(error as Error).message}</Alert>
      </Box>
    );
  }

  const stats = data ? deriveStats(data) : null;
  const breakdownData = (data?.categories ?? []).map((c) => ({
    category: c.name,
    tokens: c.total_tokens,
    color: c.color,
  }));
  const consumersData = (data?.top_consumers ?? []).map((c) => ({
    name: c.name,
    category: c.category,
    tokens: c.estimated_tokens,
  }));

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 0.5 }}>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Context window usage and optimization overview
      </Typography>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ minWidth: 0 }}>
          {isLoading ? (
            <LoadingCard lines={1} />
          ) : (
            <StatCard
              label="Total Tokens"
              value={formatTokens(data?.total_tokens ?? 0)}
              icon={<TokenIcon />}
              color="#8B5CF6"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ minWidth: 0 }}>
          {isLoading ? (
            <LoadingCard lines={1} />
          ) : (
            <StatCard
              label="Active Plugins"
              value={stats?.activePlugins ?? 0}
              icon={<ExtensionIcon />}
              color="#38BDF8"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ minWidth: 0 }}>
          {isLoading ? (
            <LoadingCard lines={1} />
          ) : (
            <StatCard
              label="MCP Servers"
              value={stats?.activeMcp ?? 0}
              icon={<DnsIcon />}
              color="#34D399"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ minWidth: 0 }}>
          {isLoading ? (
            <LoadingCard lines={1} />
          ) : (
            <StatCard
              label="CLAUDE.md Files"
              value={stats?.mdFiles ?? 0}
              icon={<DescriptionIcon />}
              color="#FBBF24"
            />
          )}
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2 }}>
                Token Breakdown
              </Typography>
              {isLoading ? (
                <LoadingCard lines={5} />
              ) : (
                <TokenBreakdownChart
                  data={breakdownData}
                  total={data?.total_tokens ?? 0}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2 }}>
                Top Token Consumers
              </Typography>
              {isLoading ? (
                <LoadingCard lines={6} />
              ) : (
                <TopConsumersChart data={consumersData} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Suggestions */}
      <Typography variant="h4" sx={{ mb: 2 }}>
        Optimization Suggestions
      </Typography>
      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <LoadingCard />
            </Grid>
          ))}
        </Grid>
      ) : (data?.suggestions ?? []).length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No optimization suggestions available.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {data?.suggestions.map((s, idx) => (
            <Grid key={idx} size={{ xs: 12, md: 6 }}>
              <SuggestionCard suggestion={s} onApply={handleApply} />
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
