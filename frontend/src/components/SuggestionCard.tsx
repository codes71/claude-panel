import { Card, CardContent, Typography, Button, Box, Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import type { OptimizationSuggestion } from "../types";
import { formatTokens } from "./TokenBadge";

interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
  onApply: (suggestion: OptimizationSuggestion) => void;
}

export default function SuggestionCard({ suggestion, onApply }: SuggestionCardProps) {
  return (
    <Card
      sx={{
        borderLeft: (t) => `3px solid ${t.palette.warning.main}`,
        "&:hover": {
          borderLeftColor: "primary.main",
        },
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Typography variant="h5" sx={{ flex: 1, mr: 1 }}>
            {suggestion.title}
          </Typography>
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {suggestion.description}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AutoFixHighIcon />}
          onClick={() => onApply(suggestion)}
        >
          Apply
        </Button>
      </CardContent>
    </Card>
  );
}
