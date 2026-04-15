import { useState } from "react";
import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Tooltip,
} from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import { useUpdateCheck, useApplyUpdate } from "../api/updates";

export default function UpdateBadge() {
  const [open, setOpen] = useState(false);
  const { data } = useUpdateCheck();
  const apply = useApplyUpdate();

  if (!data?.update_available) return null;

  const isManual = data.install_method === "local-dev" || data.install_method === "npx";

  return (
    <>
      <Tooltip title="A new version is available">
        <Chip
          icon={<SystemUpdateAltIcon />}
          label={`v${data.latest_version}`}
          size="small"
          color="warning"
          variant="outlined"
          onClick={() => setOpen(true)}
          sx={{ cursor: "pointer" }}
        />
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Available</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Current</Typography>
              <Typography variant="h6">v{data.current_version}</Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="caption" color="text.secondary">Latest</Typography>
              <Typography variant="h6" color="primary">v{data.latest_version}</Typography>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Install method: <strong>{data.install_method}</strong>
            {isManual && " — automatic updates are not supported for this install method."}
          </Typography>

          {apply.isPending && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Applying update...</Typography>
            </Box>
          )}

          {apply.isSuccess && apply.data && (
            <Alert severity={apply.data.success ? "success" : "error"} sx={{ mb: 1 }}>
              {apply.data.success
                ? "Update applied. Please restart claude-panel to use the new version."
                : apply.data.error || "Update failed."}
            </Alert>
          )}

          {apply.isError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {(apply.error as Error).message || "Update request failed."}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Dismiss</Button>
          <Button
            variant="contained"
            disabled={isManual || apply.isPending || (apply.isSuccess && apply.data?.success)}
            onClick={() => apply.mutate()}
          >
            Update Now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
