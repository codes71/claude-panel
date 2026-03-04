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

// ---- Create Dialog ----

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (namespace: string, name: string, content: string) => void;
  isPending: boolean;
}

export function CreateCommandDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: CreateDialogProps) {
  const [namespace, setNamespace] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [nameError, setNameError] = useState("");

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!VALID_NAME_RE.test(trimmedName)) {
      setNameError("Only letters, numbers, hyphens, and underscores allowed");
      return;
    }
    setNameError("");

    const desc = description.trim();
    const frontmatter = desc
      ? `---\ndescription: "${desc}"\n---\n\n`
      : "";
    const fullContent = frontmatter + content;

    onConfirm(namespace.trim(), trimmedName, fullContent);
  };

  const handleClose = () => {
    onClose();
    setNamespace("");
    setName("");
    setDescription("");
    setContent("");
    setNameError("");
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Command</DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Namespace"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            fullWidth
            size="small"
            placeholder="Leave empty for root"
            helperText='e.g. "sc" creates commands under sc/ directory'
          />
          <TextField
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            fullWidth
            size="small"
            required
            placeholder="my-command"
            helperText={nameError || "Letters, numbers, hyphens, underscores only"}
            error={!!nameError}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size="small"
            placeholder="What this command does"
            helperText="Shows in Claude Code's skill list"
          />
          <TextField
            label="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!name.trim() || isPending}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- Delete Dialog ----

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  qualifiedName: string;
}

export function DeleteCommandDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  qualifiedName,
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Command</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Are you sure you want to delete{" "}
          <strong>/{qualifiedName}</strong>? A backup will be
          created automatically.
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
  onConfirm: (namespace: string, name: string) => void;
  isPending: boolean;
  initialNamespace: string;
  initialName: string;
}

export function RenameCommandDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  initialNamespace,
  initialName,
}: RenameDialogProps) {
  const [namespace, setNamespace] = useState(initialNamespace);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  // Sync from parent when the dialog opens with new values
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setNamespace(initialNamespace);
    setName(initialName);
    setError("");
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const handleRename = () => {
    const trimmedName = name.trim();
    const trimmedNs = namespace.trim();
    if (!trimmedName) return;
    if (!VALID_NAME_RE.test(trimmedName)) {
      setError("Only letters, numbers, hyphens, and underscores allowed");
      return;
    }
    if (trimmedNs && !VALID_NAME_RE.test(trimmedNs)) {
      setError("Namespace: only letters, numbers, hyphens, and underscores allowed");
      return;
    }
    setError("");
    onConfirm(trimmedNs, trimmedName);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rename Command</DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Namespace"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            fullWidth
            size="small"
            placeholder="Leave empty for root"
            helperText='The part before the colon (e.g. "sc" in sc:load)'
          />
          <TextField
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            fullWidth
            size="small"
            required
            placeholder="my-command"
            helperText={error || "Letters, numbers, hyphens, underscores only"}
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
