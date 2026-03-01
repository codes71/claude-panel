import { Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import TokenIcon from "@mui/icons-material/DataUsage";

interface TokenBadgeProps {
  tokens: number;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function TokenBadge({ tokens }: TokenBadgeProps) {
  return (
    <Chip
      icon={<TokenIcon sx={{ fontSize: 14 }} />}
      label={`${formatTokens(tokens)} tokens`}
      size="small"
      sx={{
        bgcolor: (t) => alpha(t.palette.secondary.main, 0.1),
        color: "secondary.main",
        "& .MuiChip-icon": { color: "secondary.main" },
      }}
    />
  );
}

export { formatTokens };
