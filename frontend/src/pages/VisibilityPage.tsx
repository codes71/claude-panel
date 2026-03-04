import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  InputAdornment,
  Alert,
  Skeleton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useVisibility } from "../api/visibility";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function MonoCell({ children }: { children: React.ReactNode }) {
  return (
    <TableCell
      sx={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.75rem",
        maxWidth: 300,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </TableCell>
  );
}

export default function VisibilityPage() {
  const { data, isLoading, error } = useVisibility();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");

  const searchLower = search.toLowerCase();

  const filteredCommands = useMemo(
    () =>
      (data?.commands ?? []).filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(searchLower) ||
          (c.file_path ?? "").toLowerCase().includes(searchLower),
      ),
    [data?.commands, searchLower],
  );

  const filteredHooks = useMemo(
    () =>
      (data?.hooks ?? []).filter(
        (h) =>
          (h.event ?? "").toLowerCase().includes(searchLower) ||
          (h.command ?? "").toLowerCase().includes(searchLower) ||
          (h.file_path ?? "").toLowerCase().includes(searchLower),
      ),
    [data?.hooks, searchLower],
  );

  const filteredAgents = useMemo(
    () =>
      (data?.agents ?? []).filter(
        (a) =>
          (a.name ?? "").toLowerCase().includes(searchLower) ||
          (a.description ?? "").toLowerCase().includes(searchLower) ||
          (a.file_path ?? "").toLowerCase().includes(searchLower),
      ),
    [data?.agents, searchLower],
  );

  const filteredMemory = useMemo(
    () =>
      (data?.memory_files ?? []).filter(
        (m) =>
          (m.name ?? "").toLowerCase().includes(searchLower) ||
          (m.file_path ?? "").toLowerCase().includes(searchLower),
      ),
    [data?.memory_files, searchLower],
  );

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load visibility data: {(error as Error).message}
        </Alert>
      </Box>
    );
  }

  const loadingSkeleton = (
    <Box sx={{ p: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} variant="rectangular" height={36} sx={{ mb: 1, borderRadius: 1 }} />
      ))}
    </Box>
  );

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 0.5 }}>
        Visibility
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Explore commands, hooks, agents, and memory files
      </Typography>

      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 2,
              pt: 1,
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, v) => {
                setTab(v);
                setSearch("");
              }}
            >
              <Tab label={`Commands (${data?.commands?.length ?? 0})`} />
              <Tab label={`Hooks (${data?.hooks?.length ?? 0})`} />
              <Tab label={`Agents (${data?.agents?.length ?? 0})`} />
              <Tab label={`Memory (${data?.memory_files?.length ?? 0})`} />
            </Tabs>
            <TextField
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ width: 240 }}
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

          {/* Commands tab */}
          {tab === 0 &&
            (isLoading ? (
              loadingSkeleton
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>File Path</TableCell>
                    <TableCell align="right">Size</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCommands.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                          {search ? "No commands match" : "No commands found"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCommands.map((c) => (
                      <TableRow key={c.name} hover>
                        <MonoCell>{c.name}</MonoCell>
                        <MonoCell>{c.file_path}</MonoCell>
                        <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
                          {formatBytes(c.size_bytes)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ))}

          {/* Hooks tab */}
          {tab === 1 &&
            (isLoading ? (
              loadingSkeleton
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Event Type</TableCell>
                    <TableCell>Command</TableCell>
                    <TableCell>File Path</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                          {search ? "No hooks match" : "No hooks found"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHooks.map((h, i) => (
                      <TableRow key={i} hover>
                        <MonoCell>{h.event}</MonoCell>
                        <MonoCell>{h.command}</MonoCell>
                        <MonoCell>{h.file_path}</MonoCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ))}

          {/* Agents tab */}
          {tab === 2 &&
            (isLoading ? (
              loadingSkeleton
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>File Path</TableCell>
                    <TableCell align="right">Size</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAgents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                          {search ? "No agents match" : "No agents found"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAgents.map((a) => (
                      <TableRow key={a.name} hover>
                        <MonoCell>{a.name}</MonoCell>
                        <TableCell sx={{ fontSize: "0.8rem", maxWidth: 300 }}>
                          {a.description}
                        </TableCell>
                        <MonoCell>{a.file_path}</MonoCell>
                        <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
                          {formatBytes(a.size_bytes)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ))}

          {/* Memory tab */}
          {tab === 3 &&
            (isLoading ? (
              loadingSkeleton
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Path</TableCell>
                    <TableCell align="right">Size</TableCell>
                    <TableCell align="right">Last Modified</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMemory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                          {search ? "No files match" : "No memory files found"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMemory.map((m) => (
                      <TableRow key={m.file_path} hover>
                        <MonoCell>{m.name}</MonoCell>
                        <MonoCell>{m.file_path}</MonoCell>
                        <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
                          {formatBytes(m.size_bytes)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
                          {new Date(m.last_modified).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ))}
        </CardContent>
      </Card>
    </Box>
  );
}
