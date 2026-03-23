import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";

const VALID_NAME_RE = /^[a-zA-Z0-9_-]+$/;

// ---- Delete Dialog ----

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  agentName: string;
}

export function DeleteAgentDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  agentName,
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Agent</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Are you sure you want to delete <strong>{agentName}</strong>? A backup
          will be created automatically.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={isPending}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- Rename Dialog ----

interface RenameDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  isPending: boolean;
  initialName: string;
}

export function RenameAgentDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  initialName,
}: RenameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setName(initialName);
    setError("");
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const handleRename = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!VALID_NAME_RE.test(trimmed)) {
      setError("Only letters, numbers, hyphens, and underscores allowed");
      return;
    }
    setError("");
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rename Agent</DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="New Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            fullWidth
            size="small"
            required
            placeholder="my-agent"
            helperText={
              error || "Letters, numbers, hyphens, underscores only"
            }
            error={!!error}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleRename}
          variant="contained"
          disabled={!name.trim() || isPending}
        >
          Rename
        </Button>
      </DialogActions>
    </Dialog>
  );
}
