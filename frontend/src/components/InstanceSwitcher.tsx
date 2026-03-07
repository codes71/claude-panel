import { useState } from "react";
import {
  Box,
  Select,
  MenuItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  useInstances,
  useSwitchInstance,
  useAddInstance,
  useRemoveInstance,
} from "../api/instances";
import type { InstanceInfo } from "../types";

const ADD_INSTANCE_VALUE = "__add_instance__";

interface Props {
  variant?: "sidebar" | "header";
}

export default function InstanceSwitcher({ variant = "sidebar" }: Props) {
  const { data, isLoading, error } = useInstances();
  const switchMutation = useSwitchInstance();
  const addMutation = useAddInstance();
  const removeMutation = useRemoveInstance();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addPath, setAddPath] = useState("");
  const [deleteConfirmPath, setDeleteConfirmPath] = useState<string | null>(null);

  const instances = data?.instances ?? [];
  const active = data?.active;

  if (error && !isLoading) {
    if (variant === "header") {
      return (
        <Typography variant="caption" sx={{ color: "error.main", fontSize: "0.65rem" }}>
          Instance error
        </Typography>
      );
    }
    return (
      <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="caption" sx={{ color: "error.main", fontSize: "0.65rem" }}>
          Failed to load instances
        </Typography>
      </Box>
    );
  }

  if (isLoading || instances.length <= 1) {
    if (variant === "header" && active) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
          <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem", fontWeight: 500 }}>
            {active.label}
          </Typography>
        </Box>
      );
    }
    return null;
  }

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    if (value === ADD_INSTANCE_VALUE) {
      setAddDialogOpen(true);
      return;
    }
    if (value !== active?.path) {
      switchMutation.mutate({ path: value });
    }
  };

  const handleAddSubmit = () => {
    const trimmed = addPath.trim();
    if (!trimmed) return;
    addMutation.mutate(
      { path: trimmed },
      { onSuccess: () => { setAddPath(""); setAddDialogOpen(false); } }
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmPath) return;
    removeMutation.mutate(deleteConfirmPath, {
      onSuccess: () => setDeleteConfirmPath(null),
    });
  };

  const formatStats = (inst: InstanceInfo): string => {
    const parts: string[] = [];
    if (inst.mcp_server_count > 0) parts.push(`${inst.mcp_server_count} MCP`);
    if (inst.settings_count > 0) parts.push(`${inst.settings_count} settings`);
    return parts.length === 0 ? "No config" : parts.join(", ");
  };

  const selectEl = (
    <Select
      size="small"
      value={active?.path ?? ""}
      onChange={handleChange}
      disabled={switchMutation.isPending}
      renderValue={(selected) => {
        const inst = instances.find((i) => i.path === selected);
        if (!inst) return "Select instance";
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, overflow: "hidden" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main", flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {inst.label}
            </Typography>
          </Box>
        );
      }}
      sx={{
        minWidth: variant === "header" ? 180 : "100%",
        ...(variant === "header" && { "& .MuiSelect-select": { py: 0.5, px: 1.5 } }),
        ...(variant === "sidebar" && { width: "100%", "& .MuiSelect-select": { py: 0.75 } }),
      }}
    >
      {instances.map((inst) => (
        <MenuItem
          key={inst.path}
          value={inst.path}
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, pr: 1 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flex: 1, minWidth: 0 }}>
            {inst.has_credentials && (
              <CheckCircleIcon sx={{ fontSize: 14, color: "success.main", flexShrink: 0 }} />
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: inst.is_active ? 600 : 400, fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {inst.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", display: "block" }}>
                {formatStats(inst)}
              </Typography>
            </Box>
          </Box>
          {!inst.is_active && (
            <Tooltip title="Remove instance">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmPath(inst.path); }}
                sx={{ p: 0.25, opacity: 0.5, "&:hover": { opacity: 1, color: "error.main" } }}
              >
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </MenuItem>
      ))}
      <MenuItem
        value={ADD_INSTANCE_VALUE}
        sx={{ borderTop: "1px solid", borderColor: "divider", mt: 0.5, pt: 1, color: "text.secondary", fontStyle: "italic", gap: 1 }}
      >
        <AddIcon sx={{ fontSize: 18 }} />
        <Typography variant="body2" sx={{ fontSize: "0.8rem", fontStyle: "italic" }}>Add Instance...</Typography>
      </MenuItem>
    </Select>
  );

  const dialogs = (
    <>
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Instance</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            Enter the path to a Claude Code configuration directory.
          </Typography>
          <TextField
            autoFocus fullWidth size="small"
            label="Configuration path"
            placeholder="~/.claude or /path/to/project"
            value={addPath}
            onChange={(e) => setAddPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSubmit(); }}
            disabled={addMutation.isPending}
          />
          {addMutation.isError && (
            <Typography variant="caption" sx={{ color: "error.main", mt: 1, display: "block" }}>
              Failed to add instance. Check the path and try again.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleAddSubmit} variant="contained" disabled={!addPath.trim() || addMutation.isPending}>
            {addMutation.isPending ? <CircularProgress size={18} /> : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmPath !== null} onClose={() => setDeleteConfirmPath(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Instance</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Remove this instance from the switcher? This will not delete any files on disk.
          </Typography>
          {deleteConfirmPath && (
            <Typography variant="caption" sx={{ display: "block", mt: 1, fontFamily: "monospace", color: "text.secondary", wordBreak: "break-all" }}>
              {deleteConfirmPath}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmPath(null)} color="inherit">Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={removeMutation.isPending}>
            {removeMutation.isPending ? <CircularProgress size={18} /> : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  if (variant === "header") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {selectEl}
        {switchMutation.isPending && <CircularProgress size={16} />}
        {dialogs}
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Instance
        </Typography>
        {selectEl}
        {switchMutation.isPending && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 0.75 }}>
            <CircularProgress size={16} />
          </Box>
        )}
      </Box>
      {dialogs}
    </>
  );
}
