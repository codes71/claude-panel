import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  useMcpServers,
  useToggleMcpServer,
  useCreateMcpServer,
  useDeleteMcpServer,
} from "../api/mcp";
import McpServerCard from "../components/McpServerCard";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingCard from "../components/LoadingCard";

export default function McpServersPage() {
  const { data, isLoading, error } = useMcpServers();
  const servers = data?.servers ?? [];
  const toggleServer = useToggleMcpServer();
  const createServer = useCreateMcpServer();
  const deleteServer = useDeleteMcpServer();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  // Add form state
  const [formName, setFormName] = useState("");
  const [formCommand, setFormCommand] = useState("");
  const [formArgs, setFormArgs] = useState("");
  const [formEnv, setFormEnv] = useState("");

  const handleToggle = (name: string, enabled: boolean) => {
    toggleServer.mutate(
      { name, enabled },
      {
        onSuccess: () =>
          setToast({
            msg: `${name} ${enabled ? "enabled" : "disabled"}`,
            severity: "success",
          }),
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteServer.mutate(deleteTarget, {
      onSuccess: () => {
        setToast({ msg: `${deleteTarget} deleted`, severity: "success" });
        setDeleteTarget(null);
      },
      onError: (e) => {
        setToast({ msg: (e as Error).message, severity: "error" });
        setDeleteTarget(null);
      },
    });
  };

  const handleAdd = () => {
    const args = formArgs
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

    let env: Record<string, string> = {};
    if (formEnv.trim()) {
      try {
        env = Object.fromEntries(
          formEnv
            .split("\n")
            .filter((l) => l.includes("="))
            .map((l) => {
              const idx = l.indexOf("=");
              return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
            }),
        );
      } catch {
        // ignore parse errors
      }
    }

    createServer.mutate(
      {
        name: formName,
        command: formCommand,
        args,
        env,
      },
      {
        onSuccess: () => {
          setToast({ msg: `${formName} created`, severity: "success" });
          resetForm();
        },
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const resetForm = () => {
    setAddOpen(false);
    setFormName("");
    setFormCommand("");
    setFormArgs("");
    setFormEnv("");
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load MCP servers: {(error as Error).message}</Alert>
      </Box>
    );
  }

  const renderSection = (
    title: string,
    items: typeof servers,
    badge: string,
  ) => (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h4">{title}</Typography>
        <Chip label={badge} size="small" variant="outlined" />
      </Box>
      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <LoadingCard />
            </Grid>
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No servers configured
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {items.map((s) => (
            <Grid key={s.name} size={{ xs: 12, md: 6 }}>
              <McpServerCard
                server={s}
                onToggle={handleToggle}
                onDelete={setDeleteTarget}
                toggling={toggleServer.isPending}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h1" sx={{ mb: 0.5 }}>
            MCP Servers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure Model Context Protocol servers
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
        >
          Add Server
        </Button>
      </Box>

      {renderSection("MCP Servers", servers, "~/.claude.json")}

      {/* Add Server Dialog */}
      <Dialog open={addOpen} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle>Add MCP Server</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            label="Server Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Command"
            value={formCommand}
            onChange={(e) => setFormCommand(e.target.value)}
            fullWidth
            size="small"
            placeholder="npx -y @modelcontextprotocol/server-name"
          />
          <TextField
            label="Arguments (one per line)"
            value={formArgs}
            onChange={(e) => setFormArgs(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder={"--port\n3000"}
          />
          <TextField
            label="Environment Variables (KEY=VALUE, one per line)"
            value={formEnv}
            onChange={(e) => setFormEnv(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder={"API_KEY=your-key\nDEBUG=true"}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={resetForm} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            disabled={!formName.trim() || !formCommand.trim() || createServer.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete MCP Server"
        message={`Are you sure you want to remove "${deleteTarget}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

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
