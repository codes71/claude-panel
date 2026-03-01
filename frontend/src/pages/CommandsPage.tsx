import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Skeleton,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import TerminalIcon from "@mui/icons-material/Terminal";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import {
  useCommands,
  useCommandDetail,
  useUpdateCommand,
  useCreateCommand,
  useDeleteCommand,
} from "../api/commands";
import TokenBadge from "../components/TokenBadge";
import type { CommandInfo, CommandNamespace } from "../types";

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
    cmd.description.toLowerCase().includes(lower)
  );
}

export default function CommandsPage() {
  const { data: cmdData, isLoading, error } = useCommands();
  const namespaces = cmdData?.namespaces ?? [];
  const commands = cmdData?.commands ?? [];
  const updateCmd = useUpdateCommand();
  const createCmd = useCreateCommand();
  const deleteCmd = useDeleteCommand();

  const [selectedCommand, setSelectedCommand] = useState<{
    namespace: string;
    name: string;
  } | null>(null);
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [filter, setFilter] = useState("");
  const [expandedNamespaces, setExpandedNamespaces] =
    useState<Set<string>>(loadExpanded);
  const [createOpen, setCreateOpen] = useState(false);
  const [newNamespace, setNewNamespace] = useState("");
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  // Initialize: expand all namespaces on first load if nothing saved
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

  // Fetch detail for selected command
  const { data: cmdDetail } = useCommandDetail(
    selectedCommand?.namespace ?? null,
    selectedCommand?.name ?? null
  );

  // Load content when detail is fetched
  useEffect(() => {
    if (cmdDetail?.content !== undefined) {
      setContent(cmdDetail.content);
    }
  }, [cmdDetail]);

  // Find the CommandInfo for the selected command
  const selectedInfo = commands.find(
    (c) =>
      selectedCommand &&
      c.namespace === selectedCommand.namespace &&
      c.name === selectedCommand.name
  );

  // Group commands by namespace
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

  // Apply filter: auto-expand namespaces with matching commands
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

  const handleSave = () => {
    if (!selectedCommand) return;
    updateCmd.mutate(
      {
        namespace: selectedCommand.namespace,
        name: selectedCommand.name,
        content,
      },
      {
        onSuccess: () =>
          setToast({ msg: "Command saved", severity: "success" }),
        onError: (e) =>
          setToast({ msg: (e as Error).message, severity: "error" }),
      }
    );
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCmd.mutate(
      {
        namespace: newNamespace.trim(),
        name: newName.trim(),
        content: newContent,
      },
      {
        onSuccess: () => {
          setToast({ msg: "Command created", severity: "success" });
          setSelectedCommand({
            namespace: newNamespace.trim(),
            name: newName.trim(),
          });
          setCreateOpen(false);
          setNewNamespace("");
          setNewName("");
          setNewContent("");
        },
        onError: (e) =>
          setToast({ msg: (e as Error).message, severity: "error" }),
      }
    );
  };

  const handleDelete = () => {
    if (!selectedCommand) return;
    deleteCmd.mutate(
      {
        namespace: selectedCommand.namespace,
        name: selectedCommand.name,
      },
      {
        onSuccess: () => {
          setToast({ msg: "Command deleted", severity: "success" });
          setSelectedCommand(null);
          setContent("");
          setDeleteOpen(false);
        },
        onError: (e) => {
          setToast({ msg: (e as Error).message, severity: "error" });
          setDeleteOpen(false);
        },
      }
    );
  };

  const tokenEstimate =
    cmdDetail?.token_estimate ?? Math.ceil(content.length / 4);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load commands: {(error as Error).message}
        </Alert>
      </Box>
    );
  }

  const displayNamespace = (ns: string) => (ns === "" ? "Custom" : ns);
  const selectedQualifiedName = selectedInfo?.qualified_name ?? "";

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h1" sx={{ mb: 0.5 }}>
            Commands
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage custom slash commands
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          New Command
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, minHeight: 500 }}>
        {/* Sidebar */}
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
              onChange={(e) => setFilter(e.target.value)}
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

                  // Hide namespace entirely if filter is active and no commands match
                  if (filter && filteredCmds.length === 0) return null;

                  const isExpanded = expandedNamespaces.has(ns.name);

                  return (
                    <Box key={ns.name}>
                      {/* Namespace header */}
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

                      {/* Commands in namespace */}
                      {isExpanded &&
                        filteredCmds.map((cmd) => {
                          const isSelected =
                            selectedCommand?.namespace === cmd.namespace &&
                            selectedCommand?.name === cmd.name;
                          return (
                            <ListItemButton
                              key={cmd.qualified_name}
                              onClick={() =>
                                setSelectedCommand({
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

        {/* Editor area */}
        <Card sx={{ flex: 1 }}>
          <CardContent
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {!selectedInfo ? (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Select a command to edit
                </Typography>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 300,
                      }}
                    >
                      /{selectedQualifiedName}
                    </Typography>
                    <TokenBadge tokens={tokenEstimate} />
                    {selectedInfo.category && (
                      <Chip
                        label={selectedInfo.category}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.6rem",
                          bgcolor: (t) =>
                            alpha(t.palette.info.main, 0.12),
                          color: "info.main",
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      size="small"
                      variant={preview ? "contained" : "outlined"}
                      onClick={() => setPreview(!preview)}
                      sx={{ minWidth: 80 }}
                    >
                      {preview ? "Edit" : "Preview"}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={updateCmd.isPending}
                    >
                      Save
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteOpen(true)}
                      title="Delete command"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {selectedInfo.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1.5, fontSize: "0.75rem" }}
                  >
                    {selectedInfo.description}
                  </Typography>
                )}

                {preview ? (
                  <Box
                    sx={{
                      flex: 1,
                      p: 2,
                      bgcolor: "background.default",
                      borderRadius: 1,
                      border: 1,
                      borderColor: "divider",
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.8rem",
                      lineHeight: 1.8,
                    }}
                  >
                    {content || "(empty)"}
                  </Box>
                ) : (
                  <TextField
                    multiline
                    fullWidth
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    sx={{
                      flex: 1,
                      "& .MuiOutlinedInput-root": {
                        height: "100%",
                        alignItems: "flex-start",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.8rem",
                        lineHeight: 1.8,
                        bgcolor: "background.default",
                      },
                      "& textarea": {
                        height: "100% !important",
                        overflow: "auto !important",
                      },
                    }}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Create Command Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Command</DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Namespace"
              value={newNamespace}
              onChange={(e) => setNewNamespace(e.target.value)}
              fullWidth
              size="small"
              placeholder="Leave empty for root"
              helperText='e.g. "sc" creates commands under sc/ directory'
            />
            <TextField
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              size="small"
              required
              placeholder="my-command"
              helperText="No .md extension needed"
            />
            <TextField
              label="Content"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              fullWidth
              multiline
              minRows={6}
              maxRows={12}
              placeholder="Enter command content..."
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.8rem",
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!newName.trim() || createCmd.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Command</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete{" "}
            <strong>/{selectedQualifiedName}</strong>? A backup will be
            created automatically.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleteCmd.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={toast?.severity} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
