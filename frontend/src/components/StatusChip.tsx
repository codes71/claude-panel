import { Chip, type ChipProps } from "@mui/material";
import { alpha } from "@mui/material/styles";

interface StatusChipProps {
  enabled: boolean;
  size?: ChipProps["size"];
}

export default function StatusChip({ enabled, size = "small" }: StatusChipProps) {
  return (
    <Chip
      label={enabled ? "active" : "disabled"}
      size={size}
      sx={{
        bgcolor: enabled
          ? (t) => alpha(t.palette.success.main, 0.12)
          : (t) => alpha(t.palette.text.secondary, 0.08),
        color: enabled ? "success.main" : "text.secondary",
        fontWeight: 500,
      }}
    />
  );
}
