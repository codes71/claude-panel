import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Switch,
  Box,
  Chip,
  Collapse,
  IconButton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StorefrontIcon from "@mui/icons-material/Storefront";
import type { Plugin } from "../types";
import TokenBadge from "./TokenBadge";

interface PluginCardProps {
  plugin: Plugin;
  onToggle: (pluginId: string, enabled: boolean) => void;
  toggling?: boolean;
}

export default function PluginCard({ plugin, onToggle, toggling }: PluginCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    plugin.skills.length > 0 || plugin.agents.length > 0 || plugin.commands.length > 0;

  return (
    <Card
      sx={{
        opacity: plugin.enabled ? 1 : 0.65,
        transition: "opacity 0.2s",
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h5">{plugin.name}</Typography>
              {plugin.marketplace && (
                <Chip
                  icon={<StorefrontIcon sx={{ fontSize: 14 }} />}
                  label={plugin.marketplace}
                  size="small"
                  sx={{
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                    color: "primary.main",
                    "& .MuiChip-icon": { color: "primary.main" },
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
              <Chip
                label={`${plugin.skills.length} skill${plugin.skills.length !== 1 ? "s" : ""}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${plugin.agents.length} agent${plugin.agents.length !== 1 ? "s" : ""}`}
                size="small"
                variant="outlined"
              />
              <TokenBadge tokens={plugin.estimated_tokens} />
            </Box>
          </Box>
          <Switch
            checked={plugin.enabled}
            onChange={(_, checked) => onToggle(plugin.plugin_id, checked)}
            disabled={toggling}
            color="primary"
          />
        </Box>

        {hasDetails && (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
              onClick={() => setExpanded(!expanded)}
            >
              <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                {expanded ? "hide" : "show"} details
              </Typography>
              <IconButton size="small" sx={{ ml: 0.5, p: 0 }}>
                <ExpandMoreIcon
                  sx={{
                    fontSize: 16,
                    transform: expanded ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </IconButton>
            </Box>
            <Collapse in={expanded}>
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
                {plugin.skills.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ mb: 0.5, display: "block" }}>
                      Skills
                    </Typography>
                    {plugin.skills.map((s) => (
                      <Typography key={s} variant="body2" sx={{ pl: 1, mb: 0.3 }}>
                        {s}
                      </Typography>
                    ))}
                  </Box>
                )}
                {plugin.agents.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ mb: 0.5, display: "block" }}>
                      Agents
                    </Typography>
                    {plugin.agents.map((a) => (
                      <Typography key={a} variant="body2" sx={{ pl: 1, mb: 0.3 }}>
                        {a}
                      </Typography>
                    ))}
                  </Box>
                )}
                {plugin.commands.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ mb: 0.5, display: "block" }}>
                      Commands
                    </Typography>
                    {plugin.commands.map((c) => (
                      <Typography key={c} variant="body2" sx={{ pl: 1, mb: 0.3 }}>
                        {c}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
}
