import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderIcon from "@mui/icons-material/Folder";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import HomeIcon from "@mui/icons-material/Home";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  useBrowseDirectory,
  useScanFolder,
  useImportAgents,
} from "../../api/agents";
import type { AgentInfo, BrowseEntry } from "../../types";

interface AgentImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

export default function AgentImportDialog({
  open,
  onClose,
  onImported,
}: AgentImportDialogProps) {
  // Browser state
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState("");
  const [showPathInput, setShowPathInput] = useState(false);

  // Scan/import state
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [scannedAgents, setScannedAgents] = useState<AgentInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overwrite, setOverwrite] = useState(false);
  const [error, setError] = useState("");

  const browseDir = useBrowseDirectory();
  const scanFolder = useScanFolder();
  const importAgents = useImportAgents();

  // Browse on open
  useEffect(() => {
    if (open) {
      navigateTo("");
    }
  }, [open]);

  const navigateTo = (path: string) => {
    setError("");
    browseDir.mutate(path, {
      onSuccess: (data) => {
        setCurrentPath(data.path);
        setEntries(data.entries);
        setParentPath(data.parent);
        setPathInput(data.path);
        // Reset scan state when navigating
        setSelectedFolder(null);
        setScannedAgents([]);
        setSelected(new Set());
      },
      onError: (e) => setError((e as Error).message),
    });
  };

  const handleSelectFolder = () => {
    setError("");
    setSelectedFolder(currentPath);
    scanFolder.mutate(currentPath, {
      onSuccess: (data) => {
        setScannedAgents(data.agents);
        setSelected(new Set(data.agents.map((a) => a.name)));
        if (data.agents.length === 0) {
          setError("No agent files found in this folder");
        }
      },
      onError: (e) => {
        setError((e as Error).message);
        setSelectedFolder(null);
      },
    });
  };

  const handleImport = () => {
    if (!selectedFolder || selected.size === 0) return;
    importAgents.mutate(
      {
        folder_path: selectedFolder,
        names: Array.from(selected),
        overwrite,
      },
      {
        onSuccess: (data) => {
          onImported(data.imported_count);
          handleClose();
        },
        onError: (e) => setError((e as Error).message),
      },
    );
  };

  const handleClose = () => {
    onClose();
    setCurrentPath("");
    setEntries([]);
    setParentPath(null);
    setSelectedFolder(null);
    setScannedAgents([]);
    setSelected(new Set());
    setOverwrite(false);
    setError("");
    setShowPathInput(false);
    setPathInput("");
  };

  const toggleAgent = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === scannedAgents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(scannedAgents.map((a) => a.name)));
    }
  };

  // Build breadcrumb segments from current path
  const pathSegments = currentPath
    ? currentPath.split("/").filter(Boolean)
    : [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FolderOpenIcon />
          Import Agents from Folder
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Breadcrumb navigation */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              bgcolor: (t) => alpha(t.palette.background.default, 0.5),
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              px: 1.5,
              py: 0.75,
              minHeight: 40,
            }}
          >
            <Tooltip title="Home">
              <IconButton
                size="small"
                onClick={() => navigateTo("")}
                sx={{ mr: 0.5 }}
              >
                <HomeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {parentPath && (
              <Tooltip title="Go up">
                <IconButton
                  size="small"
                  onClick={() => navigateTo(parentPath)}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {showPathInput ? (
              <TextField
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigateTo(pathInput);
                    setShowPathInput(false);
                  }
                  if (e.key === "Escape") setShowPathInput(false);
                }}
                onBlur={() => setShowPathInput(false)}
                size="small"
                fullWidth
                autoFocus
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: "0.8rem",
                    fontFamily: "'JetBrains Mono', monospace",
                  },
                }}
              />
            ) : (
              <Breadcrumbs
                maxItems={5}
                sx={{ flex: 1, cursor: "pointer", fontSize: "0.8rem" }}
                onClick={() => setShowPathInput(true)}
              >
                <Link
                  underline="hover"
                  color="inherit"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateTo("/");
                  }}
                  sx={{ cursor: "pointer", fontSize: "0.8rem" }}
                >
                  /
                </Link>
                {pathSegments.map((seg, i) => {
                  const segPath =
                    "/" + pathSegments.slice(0, i + 1).join("/");
                  const isLast = i === pathSegments.length - 1;
                  return isLast ? (
                    <Typography
                      key={segPath}
                      variant="body2"
                      sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                    >
                      {seg}
                    </Typography>
                  ) : (
                    <Link
                      key={segPath}
                      underline="hover"
                      color="inherit"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo(segPath);
                      }}
                      sx={{ cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      {seg}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            )}
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {/* Folder browser — shown when no folder selected yet */}
          {!selectedFolder && (
            <>
              <Box
                sx={{
                  maxHeight: 340,
                  overflow: "auto",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                {browseDir.isPending && (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                )}
                {!browseDir.isPending && entries.length === 0 && (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      No folders found
                    </Typography>
                  </Box>
                )}
                {!browseDir.isPending &&
                  entries.map((entry) => (
                    <Box
                      key={entry.path}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        px: 2,
                        py: 1,
                        borderBottom: 1,
                        borderColor: "divider",
                        "&:last-child": { borderBottom: 0 },
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: (t) =>
                            alpha(t.palette.primary.main, 0.06),
                        },
                      }}
                      onClick={() => navigateTo(entry.path)}
                    >
                      <FolderIcon
                        fontSize="small"
                        sx={{ color: "primary.main", opacity: 0.7 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ flex: 1, fontSize: "0.8rem" }}
                      >
                        {entry.name}
                      </Typography>
                      {entry.md_count > 0 && (
                        <Chip
                          label={`${entry.md_count} .md`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: "0.6rem", height: 20 }}
                        />
                      )}
                    </Box>
                  ))}
              </Box>

              <Button
                variant="contained"
                onClick={handleSelectFolder}
                disabled={!currentPath || scanFolder.isPending}
                startIcon={
                  scanFolder.isPending ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CheckCircleOutlineIcon />
                  )
                }
              >
                Select This Folder
              </Button>
            </>
          )}

          {/* Scan results — shown after folder is selected */}
          {selectedFolder && scannedAgents.length > 0 && (
            <>
              <Divider />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="subtitle2">
                    Found {scannedAgents.length} agent
                    {scannedAgents.length !== 1 ? "s" : ""}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.65rem" }}
                  >
                    from {selectedFolder}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedFolder(null);
                      setScannedAgents([]);
                      setSelected(new Set());
                    }}
                  >
                    Change Folder
                  </Button>
                  <Button size="small" onClick={toggleAll}>
                    {selected.size === scannedAgents.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={overwrite}
                        onChange={(e) => setOverwrite(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="caption">
                        Overwrite existing
                      </Typography>
                    }
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  maxHeight: 300,
                  overflow: "auto",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                {scannedAgents.map((agent) => (
                  <Box
                    key={agent.name}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 2,
                      py: 1,
                      borderBottom: 1,
                      borderColor: "divider",
                      "&:last-child": { borderBottom: 0 },
                      bgcolor: selected.has(agent.name)
                        ? (t) => alpha(t.palette.primary.main, 0.04)
                        : "transparent",
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                      },
                    }}
                    onClick={() => toggleAgent(agent.name)}
                  >
                    <Checkbox
                      size="small"
                      checked={selected.has(agent.name)}
                      tabIndex={-1}
                    />
                    {agent.emoji && (
                      <Box sx={{ fontSize: "1.1rem", flexShrink: 0 }}>
                        {agent.emoji}
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                        >
                          {agent.display_name || agent.name}
                        </Typography>
                        {agent.model && (
                          <Chip
                            label={agent.model}
                            size="small"
                            sx={{ fontSize: "0.6rem", height: 18 }}
                          />
                        )}
                        {agent.color && (
                          <Chip
                            label={agent.color}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.6rem", height: 18 }}
                          />
                        )}
                      </Box>
                      {agent.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            fontSize: "0.65rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {agent.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>

              <Typography variant="caption" color="text.secondary">
                {selected.size} of {scannedAgents.length} selected
              </Typography>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!selectedFolder || selected.size === 0 || importAgents.isPending}
          startIcon={
            importAgents.isPending ? <CircularProgress size={16} /> : undefined
          }
        >
          Import {selected.size > 0 ? `(${selected.size})` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
