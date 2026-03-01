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
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import { useClaudeMdFiles, useClaudeMdFile, useUpdateClaudeMd, useCreateClaudeMd } from "../api/claudeMd";
import TokenBadge from "../components/TokenBadge";
import type { ClaudeMdTreeNode } from "../types";

const SCOPE_COLORS: Record<string, string> = {
  global: "#8B5CF6",
  project: "#38BDF8",
  local: "#34D399",
};

const STORAGE_KEY = "ccm-tree-expanded";

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

interface TreeNodeItemProps {
  node: ClaudeMdTreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
  filter: string;
  parentPath: string;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
}

function nodeMatchesFilter(node: ClaudeMdTreeNode, filter: string): boolean {
  const lower = filter.toLowerCase();
  if (node.path && node.path.toLowerCase().includes(lower)) return true;
  if (node.name.toLowerCase().includes(lower)) return true;
  return node.children.some((c) => nodeMatchesFilter(c, lower));
}

function TreeNodeItem({ node, selectedPath, onSelect, depth, filter, parentPath, expandedNodes, onToggle }: TreeNodeItemProps) {
  const nodeId = parentPath ? `${parentPath}/${node.name}` : node.name;
  const isLeaf = node.path !== null;
  const isSelected = isLeaf && node.path === selectedPath;
  const open = expandedNodes.has(nodeId);

  // Auto-expand if filter matches a child
  useEffect(() => {
    if (filter && !isLeaf && !open && node.children.some((c) => nodeMatchesFilter(c, filter))) {
      onToggle(nodeId);
    }
  }, [filter]);

  if (filter && !nodeMatchesFilter(node, filter)) return null;

  if (isLeaf) {
    return (
      <ListItemButton
        onClick={() => onSelect(node.path!)}
        sx={{
          pl: 2 + depth * 2,
          py: 0.75,
          borderBottom: 1,
          borderColor: "divider",
          "&.Mui-selected": {
            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            borderLeft: 3,
            borderLeftColor: "primary.main",
          },
        }}
        selected={isSelected}
      >
        <ListItemIcon sx={{ minWidth: 28 }}>
          <InsertDriveFileIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.7rem",
              }}
            >
              CLAUDE.md
            </Typography>
          }
          secondary={
            <Box sx={{ display: "flex", gap: 0.5, mt: 0.25, alignItems: "center" }}>
              <Chip
                label={node.scope}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.55rem",
                  bgcolor: alpha(SCOPE_COLORS[node.scope || "project"] || "#8b8a94", 0.12),
                  color: SCOPE_COLORS[node.scope || "project"] || "#8b8a94",
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "0.55rem", color: "text.secondary", textTransform: "none" }}>
                ~{node.token_estimate} tokens
              </Typography>
            </Box>
          }
        />
      </ListItemButton>
    );
  }

  // Directory node
  return (
    <>
      <ListItemButton
        onClick={() => onToggle(nodeId)}
        sx={{
          pl: 2 + depth * 2,
          py: 0.5,
          "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
        }}
      >
        <ListItemIcon sx={{ minWidth: 24 }}>
          {open ? (
            <ExpandMoreIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          ) : (
            <ChevronRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          )}
        </ListItemIcon>
        <ListItemIcon sx={{ minWidth: 24 }}>
          {open ? (
            <FolderOpenIcon sx={{ fontSize: 16, color: "#FBBF24" }} />
          ) : (
            <FolderIcon sx={{ fontSize: 16, color: "#FBBF24" }} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography variant="body2" sx={{ fontSize: "0.75rem", fontWeight: 500 }}>
              {node.name}
            </Typography>
          }
        />
      </ListItemButton>
      {open &&
        node.children.map((child, i) => (
          <TreeNodeItem
            key={child.path || child.name + i}
            node={child}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={depth + 1}
            filter={filter}
            parentPath={nodeId}
            expandedNodes={expandedNodes}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

export default function ClaudeMdPage() {
  const { data: mdData, isLoading, error } = useClaudeMdFiles();
  const files = mdData?.files;
  const tree = mdData?.tree ?? [];
  const updateMd = useUpdateClaudeMd();
  const createMd = useCreateClaudeMd();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [filter, setFilter] = useState("");
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(loadExpanded);

  // Initialize default expanded nodes on first tree load (depth < 2)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (tree.length > 0 && !initialized) {
      const saved = loadExpanded();
      if (saved.size === 0) {
        // First visit: expand top-level nodes by default
        const defaults = new Set<string>();
        for (const node of tree) {
          if (!node.path) defaults.add(node.name);
        }
        setExpandedNodes(defaults);
        saveExpanded(defaults);
      }
      setInitialized(true);
    }
  }, [tree, initialized]);

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      saveExpanded(next);
      return next;
    });
  }, []);

  const { data: fileDetail } = useClaudeMdFile(selectedPath);

  // Select first file on load
  useEffect(() => {
    if (files && files.length > 0 && !selectedPath) {
      setSelectedPath(files[0].path);
    }
  }, [files, selectedPath]);

  // Load content when file detail is fetched
  useEffect(() => {
    if (fileDetail?.content !== undefined) {
      setContent(fileDetail.content);
    }
  }, [fileDetail]);

  const selectedFile = files?.find((f) => f.path === selectedPath);

  const handleSave = () => {
    if (!selectedPath) return;
    updateMd.mutate(
      { path: selectedPath, content },
      {
        onSuccess: () => setToast({ msg: "File saved", severity: "success" }),
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const handleCreate = () => {
    if (!newPath.trim()) return;
    createMd.mutate(
      { path: newPath, content: "" },
      {
        onSuccess: () => {
          setToast({ msg: "File created", severity: "success" });
          setSelectedPath(newPath);
          setCreateOpen(false);
          setNewPath("");
        },
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const tokenEstimate = fileDetail?.token_estimate ?? Math.ceil(content.length / 4);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load CLAUDE.md files: {(error as Error).message}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h1" sx={{ mb: 0.5 }}>
            CLAUDE.md
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Edit Claude Code instruction files
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          New File
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, minHeight: 500 }}>
        {/* Tree view sidebar */}
        <Card sx={{ width: "30%", minWidth: 260, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Filter files..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 }, flex: 1, overflow: "auto" }}>
            {isLoading ? (
              <Box sx={{ p: 2 }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </Box>
            ) : tree.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <DescriptionIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No CLAUDE.md files found
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {tree.map((node, i) => (
                  <TreeNodeItem
                    key={node.path || node.name + i}
                    node={node}
                    selectedPath={selectedPath}
                    onSelect={(path) => setSelectedPath(path)}
                    depth={0}
                    filter={filter}
                    parentPath=""
                    expandedNodes={expandedNodes}
                    onToggle={handleToggle}
                  />
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Editor area */}
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {!selectedFile ? (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Select a file to edit
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                      {selectedFile.path}
                    </Typography>
                    <TokenBadge tokens={tokenEstimate} />
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
                      disabled={updateMd.isPending}
                    >
                      Save
                    </Button>
                  </Box>
                </Box>

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

      {/* Create File Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create CLAUDE.md File</DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <TextField
            label="File Path"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            fullWidth
            size="small"
            placeholder="~/.claude/CLAUDE.md or ./CLAUDE.md"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!newPath.trim() || createMd.isPending}
          >
            Create
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
