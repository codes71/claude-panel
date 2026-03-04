import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  TextField,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  InputAdornment,
  Switch,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import TerminalIcon from "@mui/icons-material/Terminal";
import ExtensionIcon from "@mui/icons-material/Extension";
import { usePlugins, useTogglePlugin } from "../../api/plugins";

interface PluginGroup {
  pluginId: string;
  name: string;
  enabled: boolean;
  skills: { skill: string; slash: string }[];
}

interface InstalledSkillsProps {
  toast: (msg: string, severity: "success" | "error") => void;
}

export default function InstalledSkills({ toast }: InstalledSkillsProps) {
  const { data: pluginData } = usePlugins();
  const togglePlugin = useTogglePlugin();

  const [installedExpanded, setInstalledExpanded] = useState(true);
  const [installedSearch, setInstalledSearch] = useState("");
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());

  const pluginGroups = useMemo<PluginGroup[]>(() => {
    if (!pluginData?.plugins) return [];
    return pluginData.plugins
      .filter((p) => (p.skills ?? []).length > 0)
      .map((p) => ({
        pluginId: p.plugin_id,
        name: p.name,
        enabled: p.enabled,
        skills: (p.skills ?? []).map((s) => ({
          skill: s,
          slash: (p.skills ?? []).length === 1 && s === p.name ? `/${s}` : `/${p.name}:${s}`,
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pluginData]);

  const totalSkillCount = useMemo(
    () => pluginGroups.reduce((sum, g) => sum + g.skills.length, 0),
    [pluginGroups],
  );

  const filteredGroups = useMemo(() => {
    if (!installedSearch) return pluginGroups;
    const q = installedSearch.toLowerCase();
    return pluginGroups
      .map((g) => ({
        ...g,
        skills: g.skills.filter(
          (s) =>
            s.skill.toLowerCase().includes(q) ||
            s.slash.toLowerCase().includes(q) ||
            g.name.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.skills.length > 0);
  }, [pluginGroups, installedSearch]);

  const togglePluginExpanded = (name: string) => {
    setExpandedPlugins((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  if (pluginGroups.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="h6">Installed Skills</Typography>
        <Chip label={totalSkillCount} size="small" color="success" />
        <IconButton size="small" onClick={() => setInstalledExpanded(!installedExpanded)}>
          {installedExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={installedExpanded}>
        <Box sx={{ mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search installed skills..."
            value={installedSearch}
            onChange={(e) => setInstalledSearch(e.target.value)}
            sx={{ minWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        {filteredGroups.map((group) => {
          const isExpanded = expandedPlugins.has(group.name);
          return (
            <Card
              key={group.pluginId}
              variant="outlined"
              sx={{
                mb: 1,
                opacity: group.enabled ? 1 : 0.5,
                borderColor: (t) =>
                  group.enabled ? alpha(t.palette.success.main, 0.25) : "divider",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 1.5,
                  py: 0.75,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => togglePluginExpanded(group.name)}
              >
                <ExtensionIcon
                  sx={{
                    fontSize: 18,
                    color: group.enabled ? "success.main" : "text.disabled",
                    mr: 1,
                  }}
                />
                <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>
                  {group.name}
                </Typography>
                <Chip
                  label={`${group.skills.length} skill${group.skills.length !== 1 ? "s" : ""}`}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Tooltip title={group.enabled ? "Disable plugin" : "Enable plugin"}>
                  <Switch
                    size="small"
                    checked={group.enabled}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() =>
                      togglePlugin.mutate(
                        { pluginId: group.pluginId, enabled: !group.enabled },
                        {
                          onError: (e: any) =>
                            toast(e.detail || e.message || "Toggle failed", "error"),
                        },
                      )
                    }
                  />
                </Tooltip>
                <IconButton size="small">
                  {isExpanded ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
              </Box>
              <Collapse in={isExpanded}>
                <Box sx={{ px: 2, pb: 1.5 }}>
                  <Grid container spacing={1}>
                    {group.skills.map((s) => (
                      <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={s.slash}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            py: 0.5,
                            px: 1,
                            borderRadius: 1,
                            bgcolor: (t) => alpha(t.palette.background.default, 0.5),
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <TerminalIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "0.7rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.slash}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Collapse>
            </Card>
          );
        })}
        {filteredGroups.length === 0 && installedSearch && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No installed skills match "{installedSearch}"
          </Typography>
        )}
      </Collapse>
    </Box>
  );
}
