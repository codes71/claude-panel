import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Collapse,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExtensionIcon from "@mui/icons-material/Extension";
import DnsIcon from "@mui/icons-material/Dns";
import DescriptionIcon from "@mui/icons-material/Description";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TerminalIcon from "@mui/icons-material/Terminal";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import StorageIcon from "@mui/icons-material/Storage";
import { useDashboard } from "../api/dashboard";
import { useVisibility } from "../api/visibility";
import LoadingCard from "../components/LoadingCard";

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
            <Typography variant="h2" sx={{ fontSize: "1.8rem", fontWeight: 700, lineHeight: 1 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              bgcolor: alpha(color, 0.1), color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

interface InventoryCardProps {
  label: string;
  total: number;
  active?: number;
  icon: React.ReactNode;
  color: string;
}

function InventoryCard({ label, total, active, icon, color }: InventoryCardProps) {
  return (
    <Card sx={{ overflow: "hidden" }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 1.5,
              display: "flex", alignItems: "center", justifyContent: "center",
              bgcolor: alpha(color, 0.1), color,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" sx={{ display: "block", lineHeight: 1.2 }}>
              {label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {total}
              {active !== undefined && total > 0 && (
                <Typography component="span" variant="caption" sx={{ ml: 0.5, color: "text.secondary", fontWeight: 400 }}>
                  ({active} active)
                </Typography>
              )}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();
  const { data: visData } = useVisibility();
  const [visOpen, setVisOpen] = useState(false);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load dashboard: {(error as Error).message}</Alert>
      </Box>
    );
  }

  const stats = data?.usage_stats;
  const inv = data?.inventory;

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 0.5 }}>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Activity overview and configuration summary
      </Typography>

      {/* Activity Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <LoadingCard lines={1} /> : (
            <StatCard
              label="Messages Today"
              value={stats?.messages_today ?? 0}
              icon={<ChatBubbleOutlineIcon />}
              color="#8B5CF6"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <LoadingCard lines={1} /> : (
            <StatCard
              label="Active Plugins"
              value={inv?.plugins_enabled ?? 0}
              icon={<ExtensionIcon />}
              color="#38BDF8"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <LoadingCard lines={1} /> : (
            <StatCard
              label="MCP Servers"
              value={inv?.mcp_servers_enabled ?? 0}
              icon={<DnsIcon />}
              color="#34D399"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {isLoading ? <LoadingCard lines={1} /> : (
            <StatCard
              label="CLAUDE.md Files"
              value={inv?.claude_md_files ?? 0}
              icon={<DescriptionIcon />}
              color="#FBBF24"
            />
          )}
        </Grid>
      </Grid>

      {/* Activity + Inventory Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2 }}>Activity This Week</Typography>
              {isLoading ? <LoadingCard lines={5} /> : !stats?.available ? (
                <Typography variant="body2" color="text.secondary">
                  No usage statistics available. Stats appear after using Claude Code.
                </Typography>
              ) : (
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                    <Box>
                      <Typography variant="caption">Messages</Typography>
                      <Typography variant="h3">{stats.messages_week}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">Sessions Today</Typography>
                      <Typography variant="h3">{stats.sessions_today}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">Tool Calls</Typography>
                      <Typography variant="h3">{stats.tool_calls_today}</Typography>
                    </Box>
                  </Box>
                  {stats.daily_breakdown && stats.daily_breakdown.length > 0 && (
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-end", height: 80 }}>
                      {stats.daily_breakdown.map((day: { date: string; messages: number }, i: number) => {
                        const max = Math.max(...stats.daily_breakdown.map((d: { messages: number }) => d.messages), 1);
                        const h = Math.max((day.messages / max) * 64, 4);
                        return (
                          <Box key={i} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                            <Box sx={{ width: "100%", height: h, bgcolor: "primary.main", borderRadius: 0.5, opacity: 0.8 }} />
                            <Typography variant="caption" sx={{ fontSize: "0.55rem", color: "text.secondary" }}>
                              {day.date.slice(5)}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2 }}>Configuration Inventory</Typography>
              {isLoading ? <LoadingCard lines={4} /> : (
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <InventoryCard label="Plugins" total={inv?.plugins ?? 0} active={inv?.plugins_enabled} icon={<ExtensionIcon fontSize="small" />} color="#8B5CF6" />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <InventoryCard label="MCP Servers" total={inv?.mcp_servers ?? 0} active={inv?.mcp_servers_enabled} icon={<DnsIcon fontSize="small" />} color="#38BDF8" />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <InventoryCard label="CLAUDE.md" total={inv?.claude_md_files ?? 0} icon={<DescriptionIcon fontSize="small" />} color="#34D399" />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <InventoryCard label="Commands" total={inv?.commands ?? 0} icon={<TerminalIcon fontSize="small" />} color="#FBBF24" />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <InventoryCard label="Agents" total={inv?.agents ?? 0} icon={<SmartToyIcon fontSize="small" />} color="#F87171" />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <InventoryCard label="Memory Files" total={inv?.memory_files ?? 0} icon={<StorageIcon fontSize="small" />} color="#A78BFA" />
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Collapsible Visibility Section */}
      <Card>
        <CardContent sx={{ "&:last-child": { pb: visOpen ? 2 : undefined } }}>
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            onClick={() => setVisOpen(!visOpen)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography variant="h4">Visibility</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip label={`${visData?.commands?.length ?? 0} commands`} size="small" variant="outlined" />
                <Chip label={`${visData?.hooks?.length ?? 0} hooks`} size="small" variant="outlined" />
                <Chip label={`${visData?.agents?.length ?? 0} agents`} size="small" variant="outlined" />
                <Chip label={`${visData?.memory_files?.length ?? 0} memory`} size="small" variant="outlined" />
              </Box>
            </Box>
            <IconButton size="small" sx={{ transform: visOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <ExpandMoreIcon />
            </IconButton>
          </Box>
          <Collapse in={visOpen}>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                {visData?.commands && visData.commands.length > 0 && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ mb: 1, display: "block" }}>Commands</Typography>
                    <List dense disablePadding>
                      {visData.commands.slice(0, 10).map((c, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                          <ListItemText primary={c.name} secondary={c.file_path} primaryTypographyProps={{ variant: "body2" }} secondaryTypographyProps={{ variant: "caption" }} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
                {visData?.agents && visData.agents.length > 0 && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ mb: 1, display: "block" }}>Agents</Typography>
                    <List dense disablePadding>
                      {visData.agents.slice(0, 10).map((a, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                          <ListItemText primary={a.name} secondary={a.file_path} primaryTypographyProps={{ variant: "body2" }} secondaryTypographyProps={{ variant: "caption" }} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
                {visData?.hooks && visData.hooks.length > 0 && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ mb: 1, display: "block" }}>Hooks</Typography>
                    <List dense disablePadding>
                      {visData.hooks.slice(0, 10).map((h, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                          <ListItemText primary={h.event} secondary={h.command} primaryTypographyProps={{ variant: "body2" }} secondaryTypographyProps={{ variant: "caption" }} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
                {visData?.memory_files && visData.memory_files.length > 0 && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ mb: 1, display: "block" }}>Memory Files</Typography>
                    <List dense disablePadding>
                      {visData.memory_files.slice(0, 10).map((m, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                          <ListItemText primary={m.name} secondary={`${m.size_bytes} bytes`} primaryTypographyProps={{ variant: "body2" }} secondaryTypographyProps={{ variant: "caption" }} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
}
