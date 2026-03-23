import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Skeleton,
  TextField,
  InputAdornment,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SearchIcon from "@mui/icons-material/Search";
import type { AgentInfo } from "../../types";

const MODEL_COLORS: Record<string, string> = {
  opus: "#9C27B0",
  sonnet: "#2196F3",
  haiku: "#4CAF50",
};

interface AgentListProps {
  agents: AgentInfo[];
  filter: string;
  onFilterChange: (value: string) => void;
  selectedAgent: string | null;
  onSelectAgent: (name: string) => void;
  isLoading: boolean;
}

export default function AgentList({
  agents,
  filter,
  onFilterChange,
  selectedAgent,
  onSelectAgent,
  isLoading,
}: AgentListProps) {
  const lower = filter.toLowerCase();
  const filtered = filter
    ? agents.filter(
        (a) =>
          a.name.toLowerCase().includes(lower) ||
          a.display_name.toLowerCase().includes(lower) ||
          a.description.toLowerCase().includes(lower),
      )
    : agents;

  return (
    <Card
      sx={{
        width: "30%",
        minWidth: 260,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Filter agents..."
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <CardContent
        sx={{
          p: 0,
          "&:last-child": { pb: 0 },
          flex: 1,
          overflow: "auto",
        }}
      >
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={56}
                sx={{ mb: 1, borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <SmartToyIcon
              sx={{ fontSize: 40, color: "text.secondary", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {filter ? "No matching agents" : "No agents found"}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((agent) => {
              const isSelected = selectedAgent === agent.name;
              return (
                <ListItemButton
                  key={agent.name}
                  onClick={() => onSelectAgent(agent.name)}
                  selected={isSelected}
                  sx={{
                    py: 1,
                    borderBottom: 1,
                    borderColor: "divider",
                    "&.Mui-selected": {
                      bgcolor: (t) =>
                        alpha(t.palette.primary.main, 0.08),
                      borderLeft: 3,
                      borderLeftColor: "primary.main",
                    },
                  }}
                >
                  <Box sx={{ mr: 1.5, fontSize: "1.2rem", flexShrink: 0 }}>
                    {agent.emoji || "\u{1F916}"}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, fontSize: "0.8rem" }}
                      >
                        {agent.display_name || agent.name}
                      </Typography>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          mt: 0.25,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {agent.model && (
                          <Chip
                            label={agent.model}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.55rem",
                              bgcolor: (t) =>
                                alpha(
                                  MODEL_COLORS[agent.model] ||
                                    t.palette.text.secondary,
                                  0.12,
                                ),
                              color:
                                MODEL_COLORS[agent.model] || "text.secondary",
                            }}
                          />
                        )}
                        {agent.description && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.55rem",
                              color: "text.secondary",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 140,
                            }}
                          >
                            {agent.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
