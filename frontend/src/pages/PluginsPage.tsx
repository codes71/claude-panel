import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Alert,
  Snackbar,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { usePlugins, useTogglePlugin } from "../api/plugins";
import PluginCard from "../components/PluginCard";
import LoadingCard from "../components/LoadingCard";

export default function PluginsPage() {
  const { data, isLoading, error } = usePlugins();
  const togglePlugin = useTogglePlugin();
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const plugins = data?.plugins ?? [];

  const filtered = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.skills.some((s) => s.toLowerCase().includes(search.toLowerCase())),
  );

  const handleToggle = (pluginId: string, enabled: boolean) => {
    togglePlugin.mutate(
      { pluginId, enabled },
      {
        onSuccess: () =>
          setToast({
            msg: `Plugin ${enabled ? "enabled" : "disabled"}`,
            severity: "success",
          }),
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load plugins: {(error as Error).message}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 0.5 }}>
        Plugins
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage installed Claude Code plugins
      </Typography>

      <TextField
        placeholder="Search plugins, skills..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 3, maxWidth: 400 }}
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <LoadingCard />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {search ? "No plugins match your search." : "No plugins found."}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid key={p.plugin_id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <PluginCard
                plugin={p}
                onToggle={handleToggle}
                toggling={togglePlugin.isPending}
              />
            </Grid>
          ))}
        </Grid>
      )}

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
