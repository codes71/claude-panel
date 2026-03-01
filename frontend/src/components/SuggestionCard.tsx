import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import type { OptimizationSuggestion } from "../types";
import { formatTokens } from "./TokenBadge";

interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
}

export default function SuggestionCard({ suggestion }: SuggestionCardProps) {
  return (
    <Card
      sx={{
        borderLeft: (t) => `3px solid ${t.palette.warning.main}`,
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, mr: 1 }}>
            <LightbulbIcon sx={{ fontSize: 18, color: "warning.main" }} />
            <Typography variant="h5">
              {suggestion.title}
            </Typography>
          </Box>
          <Chip
            label={`-${formatTokens(suggestion.savings_tokens)}`}
            size="small"
            sx={{
              bgcolor: (t) => alpha(t.palette.success.main, 0.12),
              color: "success.main",
              fontWeight: 600,
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {suggestion.description}
        </Typography>
      </CardContent>
    </Card>
  );
}
