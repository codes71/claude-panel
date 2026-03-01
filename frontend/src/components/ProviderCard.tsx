import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ExtensionIcon from "@mui/icons-material/Extension";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import type { ProviderInfo } from "../types";

interface ProviderCardProps {
  provider: ProviderInfo;
  onUpdate: (name: string) => void;
  onRemove: (name: string) => void;
  updating?: boolean;
}

export default function ProviderCard({
  provider,
  onUpdate,
  onRemove,
  updating,
}: ProviderCardProps) {
  const timeSince = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (seconds < 60) return "just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d ago`;
      const months = Math.floor(days / 30);
      return `${months}mo ago`;
    } catch {
      return dateStr;
    }
  };

  return (
    <Card
      sx={{
        transition: "box-shadow 0.2s, transform 0.15s",
        "&:hover": {
          boxShadow: (t) => `0 4px 20px ${alpha(t.palette.primary.main, 0.08)}`,
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        {/* Header: name + plugin count */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="h5" sx={{ flex: 1, minWidth: 0 }}>
            {provider.name}
          </Typography>
          <Chip
            icon={<ExtensionIcon sx={{ fontSize: 14 }} />}
            label={`${provider.plugin_count} plugin${provider.plugin_count !== 1 ? "s" : ""}`}
            size="small"
            sx={{
              bgcolor: (t) => alpha(t.palette.secondary.main, 0.1),
              color: "secondary.main",
              "& .MuiChip-icon": { color: "secondary.main" },
              flexShrink: 0,
            }}
          />
        </Box>

        {/* Description: 2-line clamped */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {provider.description}
        </Typography>

        {/* Chips: owner + repo */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
          <Chip
            icon={<PersonOutlineIcon sx={{ fontSize: 14 }} />}
            label={provider.owner}
            size="small"
            sx={{
              bgcolor: (t) => alpha(t.palette.info.main, 0.1),
              color: "info.main",
              "& .MuiChip-icon": { color: "info.main" },
            }}
          />
          <Chip
            icon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
            label={provider.repo}
            size="small"
            component="a"
            href={`https://github.com/${provider.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            clickable
            variant="outlined"
            sx={{
              cursor: "pointer",
              "&:hover": {
                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
              },
            }}
          />
          {provider.install_location && (
            <Tooltip title={provider.install_location}>
              <Chip
                icon={<FolderOutlinedIcon sx={{ fontSize: 14 }} />}
                label="local"
                size="small"
                variant="outlined"
                sx={{ color: "text.secondary" }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Footer: timestamp left, actions right */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">
            Updated {timeSince(provider.last_updated)}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Update provider">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onUpdate(provider.name)}
                  disabled={updating}
                  sx={{
                    color: "text.secondary",
                    "&:hover": { color: "primary.main" },
                  }}
                >
                  {updating ? (
                    <CircularProgress size={16} />
                  ) : (
                    <RefreshIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Remove provider">
              <IconButton
                size="small"
                onClick={() => onRemove(provider.name)}
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "error.main" },
                }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
