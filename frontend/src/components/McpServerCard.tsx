import {
  Card,
  CardContent,
  Typography,
  Switch,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TerminalIcon from "@mui/icons-material/Terminal";
import WifiIcon from "@mui/icons-material/Wifi";
import type { McpServer } from "../types";
import TokenBadge from "./TokenBadge";

interface McpServerCardProps {
  server: McpServer;
  onToggle: (name: string, enabled: boolean) => void;
  onDelete: (name: string) => void;
  toggling?: boolean;
}

export default function McpServerCard({
  server,
  onToggle,
  onDelete,
  toggling,
}: McpServerCardProps) {
  const isProjectScoped = server.scope === "project";

  return (
    <Card
      sx={{
        opacity: server.enabled ? 1 : 0.6,
        transition: "opacity 0.2s",
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h5">{server.name}</Typography>
              <Chip
                icon={
                  server.server_type === "stdio" ? (
                    <TerminalIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <WifiIcon sx={{ fontSize: 14 }} />
                  )
                }
                label={server.server_type}
                size="small"
                sx={{
                  bgcolor: (t) =>
                    server.server_type === "stdio"
                      ? alpha(t.palette.warning.main, 0.1)
                      : alpha(t.palette.info.main, 0.1),
                  color: server.server_type === "stdio" ? "warning.main" : "info.main",
                  "& .MuiChip-icon": {
                    color: server.server_type === "stdio" ? "warning.main" : "info.main",
                  },
                }}
              />
              <Chip
                label={server.scope}
                size="small"
                variant="outlined"
              />
            </Box>
            {server.project_path && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "text.secondary",
                  mb: 1,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.65rem",
                  wordBreak: "break-all",
                }}
              >
                {server.project_path}
              </Typography>
            )}
            <Typography
              variant="body2"
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "text.secondary",
                mb: 1,
                fontSize: "0.75rem",
                wordBreak: "break-all",
              }}
            >
              {server.command} {server.args.join(" ")}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {server.tool_count > 0 && (
                <Chip
                  label={`${server.tool_count} tool${server.tool_count !== 1 ? "s" : ""}`}
                  size="small"
                  variant="outlined"
                />
              )}
              <TokenBadge tokens={server.estimated_tokens} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
            <Switch
              checked={server.enabled}
              onChange={(_, checked) => onToggle(server.name, checked)}
              disabled={toggling || isProjectScoped}
              color="primary"
            />
            <Tooltip title={isProjectScoped ? "Project-scoped servers are read-only here" : "Delete server"}>
              <IconButton
                size="small"
                onClick={() => onDelete(server.name)}
                disabled={isProjectScoped}
                sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
