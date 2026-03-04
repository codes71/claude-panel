import { useState } from "react";
import { Box, Typography, Alert, Snackbar } from "@mui/material";
import { useSkillProviders } from "../api/skillProviders";
import InstalledSkills from "./skill-catalog/InstalledSkills";
import ProviderManager from "./skill-catalog/ProviderManager";
import CatalogGrid from "./skill-catalog/CatalogGrid";

export default function SkillCatalogPage() {
  const { data, isLoading, error } = useSkillProviders();
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const showToast = (msg: string, severity: "success" | "error") => {
    setToast({ msg, severity });
  };

  if (error) return <Alert severity="error">Failed to load skill providers: {(error as any).message}</Alert>;

  const providers = data?.providers || [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Skill Catalog</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Browse and install skills and commands from GitHub repositories.
      </Typography>

      <ProviderManager providers={providers} isLoading={isLoading} toast={showToast} />
      <InstalledSkills toast={showToast} />
      <CatalogGrid providers={providers} toast={showToast} />

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast?.severity} onClose={() => setToast(null)} variant="filled">
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
