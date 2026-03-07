import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  useClaudeMdDrift,
  useMcpDiagnostics,
  useMcpHealth,
  useProviderProvenance,
} from "../api/reliability";
import {
  useApplyConfigBundle,
  useConfigBundleExport,
  useValidateConfigBundle,
} from "../api/configBundle";

function parseBundle(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default function ReliabilityPage() {
  const diagnostics = useMcpDiagnostics();
  const health = useMcpHealth();
  const drift = useClaudeMdDrift();
  const provenance = useProviderProvenance();
  const bundleExport = useConfigBundleExport();
  const validateBundle = useValidateConfigBundle();
  const applyBundle = useApplyConfigBundle();

  const [bundleText, setBundleText] = useState("{}");

  useEffect(() => {
    if (bundleExport.data?.bundle) {
      setBundleText(JSON.stringify(bundleExport.data.bundle, null, 2));
    }
  }, [bundleExport.data]);

  const diagnosticsCount = diagnostics.data?.servers.length ?? 0;
  const healthCount = health.data?.servers.length ?? 0;
  const driftCount = drift.data?.events.length ?? 0;
  const providerCount = provenance.data?.providers.length ?? 0;

  const parseError = useMemo(() => {
    try {
      JSON.parse(bundleText);
      return "";
    } catch (err) {
      return (err as Error).message;
    }
  }, [bundleText]);

  const hasError =
    diagnostics.error || health.error || drift.error || provenance.error || bundleExport.error;

  const onValidate = () => {
    if (parseError) return;
    validateBundle.mutate(parseBundle(bundleText));
  };

  const onDryRun = () => {
    if (parseError) return;
    applyBundle.mutate({ bundle: parseBundle(bundleText), dryRun: true });
  };

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 0.5 }}>
        Reliability
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Diagnose MCP issues, monitor CLAUDE.md drift, inspect provider provenance, and validate config bundles.
      </Typography>

      {hasError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load one or more reliability panels.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h4">MCP Doctor</Typography>
              <Chip label={`${diagnosticsCount} servers`} size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Health rows: {healthCount}. Diagnose command/env/transport issues with structured checks.
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h4">CLAUDE.md Drift</Typography>
              <Chip label={`${driftCount} events`} size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Detect added, changed, and removed CLAUDE.md files since the last snapshot.
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h4">Provider Provenance</Typography>
              <Chip label={`${providerCount} locked`} size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Track repo, branch, and commit lock metadata for provider reproducibility.
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Config Bundle
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Export current configuration, validate shape, and run safe dry-run apply workflows.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Button
            variant="outlined"
            onClick={() => bundleExport.refetch()}
            disabled={bundleExport.isFetching}
          >
            Refresh Export
          </Button>
          <Button
            variant="outlined"
            onClick={onValidate}
            disabled={!!parseError || validateBundle.isPending}
          >
            Validate
          </Button>
          <Button
            variant="contained"
            onClick={onDryRun}
            disabled={!!parseError || applyBundle.isPending}
          >
            Dry Run Apply
          </Button>
        </Stack>

        <TextField
          label="Bundle JSON"
          value={bundleText}
          onChange={(e) => setBundleText(e.target.value)}
          multiline
          minRows={12}
          fullWidth
          size="small"
        />

        {parseError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Invalid JSON: {parseError}
          </Alert>
        )}

        {validateBundle.data && (
          <Alert severity={validateBundle.data.valid ? "success" : "warning"} sx={{ mt: 2 }}>
            Validation: {validateBundle.data.valid ? "valid" : "invalid"}.
            {" "}
            Errors: {validateBundle.data.errors.length}, warnings: {validateBundle.data.warnings.length}.
          </Alert>
        )}

        {applyBundle.data && (
          <Alert severity={applyBundle.data.applied ? "success" : "info"} sx={{ mt: 2 }}>
            {applyBundle.data.applied ? "Applied bundle." : "Dry run completed."}
            {" "}
            Planned changes: {applyBundle.data.changes.length}.
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
