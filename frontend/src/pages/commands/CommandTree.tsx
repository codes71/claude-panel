import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Skeleton,
  TextField,
  InputAdornment,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import TerminalIcon from "@mui/icons-material/Terminal";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import TokenBadge from "../../components/TokenBadge";
import type { CommandInfo, CommandNamespace } from "../../types";

const STORAGE_KEY = "ccm-cmd-expanded";

function loadExpanded(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function saveExpanded(expanded: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...expanded]));
}

function commandMatchesFilter(cmd: CommandInfo, filter: string): boolean {
  const lower = filter.toLowerCase();
  return (
    cmd.name.toLowerCase().includes(lower) ||
    cmd.qualified_name.toLowerCase().includes(lower) ||
    (cmd.description ?? "").toLowerCase().includes(lower)
  );
}

export interface SelectedCommand {
  namespace: string;
  name: string;
}

interface CommandTreeProps {
  commands: CommandInfo[];
  namespaces: CommandNamespace[];
  filter: string;
  onFilterChange: (value: string) => void;
  selectedCommand: SelectedCommand | null;
  onSelectCommand: (cmd: SelectedCommand) => void;
  isLoading: boolean;
}

const displayNamespace = (ns: string) => (ns === "" ? "Custom" : ns);

export default function CommandTree({
  commands,
  namespaces,
  filter,
  onFilterChange,
  selectedCommand,
  onSelectCommand,
  isLoading,
}: CommandTreeProps) {
  const [expandedNamespaces, setExpandedNamespaces] =
    useState<Set<string>>(loadExpanded);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (namespaces.length > 0 && !initialized) {
      const saved = loadExpanded();
      if (saved.size === 0) {
        const defaults = new Set<string>(namespaces.map((ns) => ns.name));
        setExpandedNamespaces(defaults);
        saveExpanded(defaults);
      }
      setInitialized(true);
    }
  }, [namespaces, initialized]);

  const handleToggleNamespace = useCallback((ns: string) => {
    setExpandedNamespaces((prev) => {
      const next = new Set(prev);
      if (next.has(ns)) {
        next.delete(ns);
      } else {
        next.add(ns);
      }
      saveExpanded(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (filter) {
      const toExpand = new Set<string>();
      for (const cmd of commands) {
        if (commandMatchesFilter(cmd, filter)) {
          toExpand.add(cmd.namespace);
        }
      }
      if (toExpand.size > 0) {
        setExpandedNamespaces((prev) => {
          const next = new Set(prev);
          for (const ns of toExpand) next.add(ns);
          saveExpanded(next);
          return next;
        });
      }
    }
  }, [filter, commands]);

  const commandsByNamespace = new Map<string, CommandInfo[]>();
  for (const ns of namespaces) {
    commandsByNamespace.set(ns.name, []);
  }
  for (const cmd of commands) {
    const list = commandsByNamespace.get(cmd.namespace);
    if (list) {
      list.push(cmd);
    } else {
      commandsByNamespace.set(cmd.namespace, [cmd]);
    }
  }

  return (
    <Card
      sx={{
        width: "30%",
        minWidth: 260,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Filter commands..."
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <CardContent
        sx={{
          p: 0,
          "&:last-child": { pb: 0 },
          flex: 1,
          overflow: "auto",
        }}
      >
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={56}
                sx={{ mb: 1, borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : namespaces.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <TerminalIcon
              sx={{ fontSize: 40, color: "text.secondary", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No commands found
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {namespaces.map((ns) => {
              const nsCmds = commandsByNamespace.get(ns.name) ?? [];
              const filteredCmds = filter
                ? nsCmds.filter((c) => commandMatchesFilter(c, filter))
                : nsCmds;

              if (filter && filteredCmds.length === 0) return null;

              const isExpanded = expandedNamespaces.has(ns.name);

              return (
                <Box key={ns.name}>
                  <ListItemButton
                    onClick={() => handleToggleNamespace(ns.name)}
                    sx={{
                      py: 0.5,
                      "&:hover": {
                        bgcolor: (t) =>
                          alpha(t.palette.primary.main, 0.04),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      {isExpanded ? (
                        <ExpandMoreIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                      ) : (
                        <ChevronRightIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                      )}
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      {isExpanded ? (
                        <FolderOpenIcon
                          sx={{ fontSize: 16, color: "#FBBF24" }}
                        />
                      ) : (
                        <FolderIcon
                          sx={{ fontSize: 16, color: "#FBBF24" }}
                        />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontSize: "0.75rem", fontWeight: 500 }}
                          >
                            {displayNamespace(ns.name)}
                          </Typography>
                          <Chip
                            label={ns.command_count}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.55rem",
                              minWidth: 24,
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItemButton>

                  {isExpanded &&
                    filteredCmds.map((cmd) => {
                      const isSelected =
                        selectedCommand?.namespace === cmd.namespace &&
                        selectedCommand?.name === cmd.name;
                      return (
                        <ListItemButton
                          key={cmd.qualified_name}
                          onClick={() =>
                            onSelectCommand({
                              namespace: cmd.namespace,
                              name: cmd.name,
                            })
                          }
                          sx={{
                            pl: 7,
                            py: 0.75,
                            borderBottom: 1,
                            borderColor: "divider",
                            "&.Mui-selected": {
                              bgcolor: (t) =>
                                alpha(t.palette.primary.main, 0.08),
                              borderLeft: 3,
                              borderLeftColor: "primary.main",
                            },
                          }}
                          selected={isSelected}
                        >
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <InsertDriveFileIcon
                              sx={{
                                fontSize: 16,
                                color: "text.secondary",
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily:
                                    "'JetBrains Mono', monospace",
                                  fontSize: "0.7rem",
                                }}
                              >
                                {cmd.name}
                              </Typography>
                            }
                            secondary={
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 0.5,
                                  mt: 0.25,
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                <TokenBadge
                                  tokens={cmd.token_estimate}
                                />
                                {cmd.description && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: "0.55rem",
                                      color: "text.secondary",
                                      textTransform: "none",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: 140,
                                    }}
                                  >
                                    {cmd.description}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItemButton>
                      );
                    })}
                </Box>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
