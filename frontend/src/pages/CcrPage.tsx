import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useCcrDashboard } from "../api/ccr";
import type { CcrProvider, CcrRouterConfig } from "../types";

const ROUTE_LABELS: { key: keyof Omit<CcrRouterConfig, "long_context_threshold">; label: string; description: string }[] = [
  { key: "default_model", label: "Default", description: "Primary model for all requests" },
  { key: "background", label: "Background", description: "Background / batch tasks" },
  { key: "think", label: "Think", description: "Extended thinking / reasoning" },
  { key: "long_context", label: "Long Context", description: "Large context windows" },
  { key: "web_search", label: "Web Search", description: "Web search augmented" },
];

function StatusBanner({ installed, running }: { installed: boolean; running: boolean }) {
  if (!installed) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        Claude Code Router is not installed. Install it with:
        <Box
          component="code"
          sx={{
            display: "block",
            mt: 1,
            p: 1.5,
            bgcolor: "action.hover",
            borderRadius: 1,
            fontFamily: "monospace",
            fontSize: "0.85rem",
          }}
        >
          npm install -g @musistudio/claude-code-router
        </Box>
      </Alert>
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}>
      <Chip
        icon={<CheckCircleIcon />}
        label="Installed"
        color="success"
        variant="outlined"
        size="small"
      />
      <Chip
        icon={running ? <CheckCircleIcon /> : <CancelIcon />}
        label={running ? "Running" : "Stopped"}
        color={running ? "success" : "error"}
        variant="outlined"
        size="small"
      />
    </Box>
  );
}

function RouterRulesSection({ router }: { router: CcrRouterConfig }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Router Rules
      </Typography>
      <Grid container spacing={2}>
        {ROUTE_LABELS.map(({ key, label, description }) => {
          const value = router[key];
          return (
            <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      mt: 0.5,
                      wordBreak: "break-all",
                      color: value ? "text.primary" : "text.disabled",
                    }}
                  >
                    {value ?? "Not configured"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        {/* Long context threshold */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Long Context Threshold
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontFamily: "monospace", fontSize: "0.85rem", mt: 0.5 }}
              >
                {router.long_context_threshold.toLocaleString()} tokens
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Switch to long context model above this
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function ProviderCard({ provider }: { provider: CcrProvider }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {provider.name}
          </Typography>
          <Chip
            label={`${provider.models.length} model${provider.models.length !== 1 ? "s" : ""}`}
            size="small"
            variant="outlined"
          />
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontFamily: "monospace",
            fontSize: "0.78rem",
            mb: 1.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={provider.api_base_url}
        >
          {provider.api_base_url}
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 1 }}>
          <Chip
            label={provider.has_api_key ? "API Key Set" : "No API Key"}
            size="small"
            color={provider.has_api_key ? "success" : "default"}
            variant="outlined"
          />
          {provider.transformer_names.map((t) => (
            <Chip key={t} label={t} size="small" variant="outlined" />
          ))}
        </Box>

        {provider.models.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
              Models
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              {provider.models.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  size="small"
                  sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function ProvidersSection({ providers }: { providers: CcrProvider[] }) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h4">Providers</Typography>
        <Chip label={String(providers.length)} size="small" variant="outlined" />
      </Box>
      <Grid container spacing={2}>
        {providers.map((p) => (
          <Grid key={p.name} size={{ xs: 12, sm: 6, lg: 4 }}>
            <ProviderCard provider={p} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function ConfigViewer({ config }: { config: Record<string, unknown> | null }) {
  const [copied, setCopied] = useState(false);

  if (!config) return null;

  const json = JSON.stringify(config, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h4">Raw Config</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <Box sx={{ position: "relative" }}>
          <Chip
            icon={<ContentCopyIcon />}
            label={copied ? "Copied!" : "Copy"}
            size="small"
            onClick={handleCopy}
            sx={{ position: "absolute", top: 8, right: 8, cursor: "pointer" }}
          />
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              overflow: "auto",
              maxHeight: 480,
              fontSize: "0.78rem",
              fontFamily: "monospace",
              bgcolor: "action.hover",
              borderRadius: 0,
            }}
          >
            {json}
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function LoadingSkeleton() {
  return (
    <Box>
      <Skeleton variant="rectangular" height={48} sx={{ mb: 3, borderRadius: 1 }} />
      <Skeleton variant="text" width={120} sx={{ mb: 2 }} />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[0, 1, 2].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="text" width={100} sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {[0, 1].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default function CcrPage() {
  const { data, isLoading, error } = useCcrDashboard();

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load Code Router data: {(error as Error).message}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h1" sx={{ mb: 0.5 }}>
          Code Router
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Claude Code Router — proxy API requests to different LLM providers
        </Typography>
      </Box>

      {isLoading || !data ? (
        <LoadingSkeleton />
      ) : (
        <>
          <StatusBanner installed={data.status.installed} running={data.status.running} />

          {data.status.installed && (
            <>
              <RouterRulesSection router={data.router} />
              <ProvidersSection providers={data.providers} />
              <ConfigViewer config={data.raw_config} />
            </>
          )}
        </>
      )}
    </Box>
  );
}
