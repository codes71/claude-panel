import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Alert,
  Snackbar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  useProviders,
  useAddProvider,
  useRemoveProvider,
  useUpdateProvider,
} from "../api/marketplace";
import ProviderCard from "../components/ProviderCard";
import LoadingCard from "../components/LoadingCard";
import ConfirmDialog from "../components/ConfirmDialog";

export default function SkillProvidersPage() {
  const { data, isLoading, error } = useProviders();
  const addProvider = useAddProvider();
  const removeProvider = useRemoveProvider();
  const updateProvider = useUpdateProvider();

  const [addOpen, setAddOpen] = useState(false);
  const [addSource, setAddSource] = useState("");
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [updatingName, setUpdatingName] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const providers = data?.providers ?? [];

  const handleAddOpen = () => {
    setAddSource("");
    setAddOpen(true);
  };

  const handleAddConfirm = () => {
    if (!addSource.trim()) return;
    addProvider.mutate(addSource.trim(), {
      onSuccess: (res) => {
        setToast({
          msg: res.message || `Provider added successfully`,
          severity: "success",
        });
        setAddOpen(false);
        setAddSource("");
      },
      onError: (e) => {
        setToast({ msg: (e as Error).message, severity: "error" });
      },
    });
  };

  const handleUpdate = (name: string) => {
    setUpdatingName(name);
    updateProvider.mutate(name, {
      onSuccess: (res) => {
        setToast({
          msg: res.message || `${name} updated successfully`,
          severity: "success",
        });
        setUpdatingName(null);
      },
      onError: (e) => {
        setToast({ msg: (e as Error).message, severity: "error" });
        setUpdatingName(null);
      },
    });
  };

  const handleUpdateAll = () => {
    setUpdatingName("__all__");
    updateProvider.mutate(undefined, {
      onSuccess: (res) => {
        setToast({
          msg: res.message || "All providers updated",
          severity: "success",
        });
        setUpdatingName(null);
      },
      onError: (e) => {
        setToast({ msg: (e as Error).message, severity: "error" });
        setUpdatingName(null);
      },
    });
  };

  const handleRemoveConfirm = () => {
    if (!removeTarget) return;
    removeProvider.mutate(removeTarget, {
      onSuccess: (res) => {
        setToast({
          msg: res.message || `${removeTarget} removed`,
          severity: "success",
        });
        setRemoveTarget(null);
      },
      onError: (e) => {
        setToast({ msg: (e as Error).message, severity: "error" });
        setRemoveTarget(null);
      },
    });
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load providers: {(error as Error).message}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.5, flexWrap: "wrap" }}>
        <Typography variant="h1">Skill Providers</Typography>
        {data && (
          <Chip
            label={`${providers.length} provider${providers.length !== 1 ? "s" : ""}`}
            size="small"
            variant="outlined"
          />
        )}
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              updatingName === "__all__" ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            onClick={handleUpdateAll}
            disabled={updatingName !== null || providers.length === 0}
          >
            Update All
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddOpen}
          >
            Add Provider
          </Button>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage marketplace sources that supply plugins to the Marketplace
      </Typography>
      <Button
        component={RouterLink}
        to="/reliability"
        variant="text"
        size="small"
        sx={{ mb: 2, px: 0 }}
      >
        View provider provenance lock
      </Button>

      {/* Grid */}
      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <LoadingCard />
            </Grid>
          ))}
        </Grid>
      ) : providers.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            px: 3,
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No providers configured
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add a GitHub repository to start discovering plugins.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddOpen}
          >
            Add Provider
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {providers.map((p) => (
            <Grid key={p.id} size={{ xs: 12, md: 6 }}>
              <ProviderCard
                provider={p}
                onUpdate={handleUpdate}
                onRemove={(name) => setRemoveTarget(name)}
                updating={updatingName === p.name}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Provider Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Provider</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="GitHub Repository"
            placeholder="owner/repo"
            helperText="Enter a GitHub repository (e.g., anthropics/claude-plugins)"
            value={addSource}
            onChange={(e) => setAddSource(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddConfirm();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddConfirm}
            disabled={!addSource.trim() || addProvider.isPending}
            startIcon={addProvider.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        title={`Remove ${removeTarget}?`}
        message="This will remove the provider and its plugins will no longer appear in the Marketplace. You can re-add it later."
        confirmLabel="Remove"
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemoveTarget(null)}
      />

      {/* Toast */}
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
