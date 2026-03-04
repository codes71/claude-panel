import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import {
  useAddSkillProvider,
  useRemoveSkillProvider,
  useUpdateSkillProvider,
} from "../../api/skillProviders";
import type { SkillProviderInfo } from "../../types";

interface ProviderManagerProps {
  providers: SkillProviderInfo[];
  isLoading: boolean;
  toast: (msg: string, severity: "success" | "error") => void;
}

export default function ProviderManager({
  providers,
  isLoading,
  toast,
}: ProviderManagerProps) {
  const addProvider = useAddSkillProvider();
  const removeProvider = useRemoveSkillProvider();
  const updateProvider = useUpdateSkillProvider();

  const [providersExpanded, setProvidersExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addSource, setAddSource] = useState("");
  const [addBranch, setAddBranch] = useState("main");
  const [removeSlug, setRemoveSlug] = useState<string | null>(null);

  const handleAddProvider = () => {
    if (!addSource.trim()) return;
    addProvider.mutate(
      { source: addSource.trim(), branch: addBranch.trim() || "main" },
      {
        onSuccess: (res) => {
          toast(res.message || `Provider added: ${res.slug}`, "success");
          setAddOpen(false);
          setAddSource("");
          setAddBranch("main");
        },
        onError: (e: any) =>
          toast(e.detail || e.message || "Failed to add provider", "error"),
      },
    );
  };

  const handleRemoveProvider = () => {
    if (!removeSlug) return;
    removeProvider.mutate(removeSlug, {
      onSuccess: (res) => {
        toast(res.message || `Provider removed: ${res.slug}`, "success");
        setRemoveSlug(null);
      },
      onError: (e: any) =>
        toast(e.detail || e.message || "Failed to remove provider", "error"),
    });
  };

  const handleUpdateAll = () => {
    updateProvider.mutate(undefined, {
      onSuccess: () => toast("All providers updated", "success"),
      onError: (e: any) => toast(e.detail || e.message || "Update failed", "error"),
    });
  };

  const handleUpdateOne = (slug: string) => {
    updateProvider.mutate(slug, {
      onSuccess: () => toast(`Provider updated: ${slug}`, "success"),
      onError: (e: any) => toast(e.detail || e.message || "Update failed", "error"),
    });
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="h6">Providers</Typography>
          <IconButton size="small" onClick={() => setProvidersExpanded(!providersExpanded)}>
            {providersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleUpdateAll}
            disabled={updateProvider.isPending || providers.length === 0}
          >
            Update All
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
          >
            Add Provider
          </Button>
        </Box>
        <Collapse in={providersExpanded}>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : providers.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No providers added yet. Click "Add Provider" to get started.
            </Alert>
          ) : (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {providers.map((p) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={p.slug}>
                  <Card variant="outlined">
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {p.display_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {p.owner}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        <Chip
                          label={`${p.skill_count} skills`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={`${p.command_count} commands`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                      {p.last_updated && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          Updated: {new Date(p.last_updated).toLocaleDateString()}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Tooltip title="Update from remote">
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateOne(p.slug)}
                          disabled={updateProvider.isPending}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove provider">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setRemoveSlug(p.slug)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Collapse>
      </Box>

      {/* Add Provider Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Skill Provider</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="GitHub Source"
            placeholder="owner/repo"
            value={addSource}
            onChange={(e) => setAddSource(e.target.value)}
            sx={{ mt: 1 }}
            helperText='Enter "owner/repo" or a full GitHub URL'
          />
          <TextField
            fullWidth
            label="Branch"
            value={addBranch}
            onChange={(e) => setAddBranch(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddProvider}
            disabled={!addSource.trim() || addProvider.isPending}
          >
            {addProvider.isPending ? "Cloning..." : "Add Provider"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Provider Confirmation Dialog */}
      <Dialog
        open={!!removeSlug}
        onClose={() => setRemoveSlug(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Remove Provider</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to remove provider <strong>{removeSlug}</strong>? Already
            installed skills will not be affected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveSlug(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveProvider}
            disabled={removeProvider.isPending}
          >
            {removeProvider.isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
