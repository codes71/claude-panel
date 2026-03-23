import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  Alert,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PreviewIcon from "@mui/icons-material/Preview";
import { useInstances } from "../api/instances";
import { useCommands } from "../api/commands";
import { usePlugins } from "../api/plugins";
import { useMcpServers } from "../api/mcp";
import { useAgents } from "../api/agents";
import { usePreviewTransfer, useApplyTransfer } from "../api/transfers";
import type {
  TransferPreviewResponse,
  TransferItemStatus,
  TransferCommandRef,
  TransferPluginRef,
  TransferMcpRef,
  TransferAgentRef,
} from "../types";

// ---- Helpers ----

function statusColor(status: string): "success" | "warning" | "default" {
  if (status === "new") return "success";
  if (status === "conflict") return "warning";
  return "default";
}

function statusLabel(status: string): string {
  if (status === "new") return "New";
  if (status === "conflict") return "Conflict";
  return "No change";
}

// ---- TransferSectionCard ----

interface SectionCardProps {
  title: string;
  items: { key: string; label: string }[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  loading?: boolean;
}

function TransferSectionCard({
  title,
  items,
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
  loading,
}: SectionCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
            <Chip label={items.length} size="small" sx={{ ml: 1 }} />
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={onSelectAll} disabled={loading || items.length === 0}>
              Select All
            </Button>
            <Button size="small" onClick={onDeselectAll} disabled={loading || selected.size === 0}>
              Deselect All
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No items available
          </Typography>
        ) : (
          <Box sx={{ maxHeight: 240, overflow: "auto" }}>
            {items.map((item) => (
              <FormControlLabel
                key={item.key}
                sx={{ display: "block", ml: 0 }}
                control={
                  <Checkbox
                    checked={selected.has(item.key)}
                    onChange={() => onToggle(item.key)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" component="span" sx={{ fontFamily: "monospace" }}>
                    {item.label}
                  </Typography>
                }
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ---- PreviewDialog ----

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  preview: TransferPreviewResponse | null;
  conflictMode: "skip" | "overwrite";
  onConflictModeChange: (mode: "skip" | "overwrite") => void;
  onApply: () => void;
  applying: boolean;
}

function PreviewStatusList({ title, items }: { title: string; items: TransferItemStatus[] }) {
  if (items.length === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        {title} ({items.length})
      </Typography>
      <List dense disablePadding>
        {items.map((item) => (
          <ListItem key={item.name} disableGutters sx={{ py: 0.25 }}>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {item.name}
                  </Typography>
                  <Chip
                    label={statusLabel(item.status)}
                    color={statusColor(item.status)}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              }
              secondary={item.details}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

function PreviewDialog({
  open,
  onClose,
  preview,
  conflictMode,
  onConflictModeChange,
  onApply,
  applying,
}: PreviewDialogProps) {
  if (!preview) return null;

  const hasConflicts =
    preview.summary.commands.conflicts +
    preview.summary.plugins.conflicts +
    preview.summary.mcp_servers.conflicts +
    preview.summary.agents.conflicts > 0;

  const totalSelected =
    preview.summary.commands.selected +
    preview.summary.plugins.selected +
    preview.summary.mcp_servers.selected +
    preview.summary.agents.selected;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transfer Preview</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {totalSelected} item(s) selected for transfer
          </Typography>
        </Box>

        <PreviewStatusList title="Commands" items={preview.commands} />
        <PreviewStatusList title="Plugins" items={preview.plugins} />
        <PreviewStatusList title="MCP Servers" items={preview.mcp_servers} />
        <PreviewStatusList title="Agents" items={preview.agents} />

        {hasConflicts && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Conflict handling
            </Typography>
            <RadioGroup
              value={conflictMode}
              onChange={(e) => onConflictModeChange(e.target.value as "skip" | "overwrite")}
            >
              <FormControlLabel
                value="skip"
                control={<Radio size="small" />}
                label="Skip existing"
              />
              <FormControlLabel
                value="overwrite"
                control={<Radio size="small" />}
                label="Overwrite"
              />
            </RadioGroup>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={applying}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onApply}
          disabled={applying || totalSelected === 0}
          startIcon={applying ? <CircularProgress size={16} /> : <ContentCopyIcon />}
        >
          Apply Copy
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- Main InstallationsPage ----

export default function InstallationsPage() {
  const { data: instanceData } = useInstances();
  const { data: commandData, isLoading: commandsLoading } = useCommands();
  const { data: pluginData, isLoading: pluginsLoading } = usePlugins();
  const { data: mcpData, isLoading: mcpLoading } = useMcpServers();
  const { data: agentData, isLoading: agentsLoading } = useAgents();

  const previewTransfer = usePreviewTransfer();
  const applyTransfer = useApplyTransfer();

  const [targetPath, setTargetPath] = useState("");
  const [selectedCommands, setSelectedCommands] = useState<Set<string>>(new Set());
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());
  const [selectedMcpServers, setSelectedMcpServers] = useState<Set<string>>(new Set());
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [conflictMode, setConflictMode] = useState<"skip" | "overwrite">("skip");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const activeInstance = instanceData?.active;
  const otherInstances = useMemo(
    () => (instanceData?.instances ?? []).filter((i) => !i.is_active),
    [instanceData],
  );

  // Build selectable item lists from source (active) instance data
  const commandItems = useMemo(
    () =>
      (commandData?.commands ?? []).map((c) => ({
        key: `${c.namespace}:${c.name}`,
        label: c.qualified_name,
        namespace: c.namespace,
        name: c.name,
      })),
    [commandData],
  );

  const pluginItems = useMemo(
    () =>
      (pluginData?.plugins ?? []).map((p) => ({
        key: p.plugin_id,
        label: p.plugin_id,
      })),
    [pluginData],
  );

  const mcpItems = useMemo(
    () =>
      (mcpData?.servers ?? [])
        .filter((s) => s.scope === "global")
        .map((s) => ({
          key: s.name,
          label: s.name,
        })),
    [mcpData],
  );

  const agentItems = useMemo(
    () =>
      (agentData?.agents ?? []).map((a) => ({
        key: a.name,
        label: a.display_name ? `${a.name} (${a.display_name})` : a.name,
      })),
    [agentData],
  );

  // Toggle helpers
  const toggle = (set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = (items: { key: string }[], setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(new Set(items.map((i) => i.key)));
  };

  const deselectAll = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(new Set());
  };

  // Build request refs from selections
  const buildCommandRefs = (): TransferCommandRef[] =>
    commandItems
      .filter((c) => selectedCommands.has(c.key))
      .map((c) => ({ namespace: c.namespace, name: c.name }));

  const buildPluginRefs = (): TransferPluginRef[] =>
    [...selectedPlugins].map((id) => ({ plugin_id: id }));

  const buildMcpRefs = (): TransferMcpRef[] =>
    [...selectedMcpServers].map((name) => ({ name }));

  const buildAgentRefs = (): TransferAgentRef[] =>
    [...selectedAgents].map((name) => ({ name }));

  const totalSelected =
    selectedCommands.size + selectedPlugins.size + selectedMcpServers.size + selectedAgents.size;

  const handlePreview = () => {
    if (!activeInstance || !targetPath) return;
    previewTransfer.mutate(
      {
        source_path: activeInstance.path,
        target_path: targetPath,
        commands: buildCommandRefs(),
        plugins: buildPluginRefs(),
        mcp_servers: buildMcpRefs(),
        agents: buildAgentRefs(),
      },
      {
        onSuccess: () => setPreviewOpen(true),
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const handleApply = () => {
    if (!activeInstance || !targetPath) return;
    applyTransfer.mutate(
      {
        source_path: activeInstance.path,
        target_path: targetPath,
        commands: buildCommandRefs(),
        plugins: buildPluginRefs(),
        mcp_servers: buildMcpRefs(),
        agents: buildAgentRefs(),
        conflict_mode: conflictMode,
      },
      {
        onSuccess: (data) => {
          setPreviewOpen(false);
          setToast({
            msg: `Transfer complete: ${data.applied} applied, ${data.skipped} skipped, ${data.failed} failed`,
            severity: data.failed > 0 ? "error" : "success",
          });
          // Reset selections
          setSelectedCommands(new Set());
          setSelectedPlugins(new Set());
          setSelectedMcpServers(new Set());
          setSelectedAgents(new Set());
        },
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
        Copy Configuration Between Instances
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select items from the active instance and copy them to another instance
      </Typography>

      {/* Source & Target */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Card variant="outlined" sx={{ flex: 1, minWidth: 260 }}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary">
              Source (active)
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ fontFamily: "monospace" }}>
              {activeInstance?.label ?? "Loading..."}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
              {activeInstance?.path ?? ""}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1, minWidth: 260 }}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Target Instance</InputLabel>
              <Select
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                label="Target Instance"
              >
                {otherInstances.length === 0 ? (
                  <MenuItem disabled value="">
                    No other instances available
                  </MenuItem>
                ) : (
                  otherInstances.map((inst) => (
                    <MenuItem key={inst.path} value={inst.path}>
                      {inst.label} — {inst.path}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Box>

      {/* Transfer Section Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
        <TransferSectionCard
          title="Commands"
          items={commandItems}
          selected={selectedCommands}
          onToggle={(k) => toggle(selectedCommands, setSelectedCommands, k)}
          onSelectAll={() => selectAll(commandItems, setSelectedCommands)}
          onDeselectAll={() => deselectAll(setSelectedCommands)}
          loading={commandsLoading}
        />
        <TransferSectionCard
          title="Plugins"
          items={pluginItems}
          selected={selectedPlugins}
          onToggle={(k) => toggle(selectedPlugins, setSelectedPlugins, k)}
          onSelectAll={() => selectAll(pluginItems, setSelectedPlugins)}
          onDeselectAll={() => deselectAll(setSelectedPlugins)}
          loading={pluginsLoading}
        />
        <TransferSectionCard
          title="MCP Servers"
          items={mcpItems}
          selected={selectedMcpServers}
          onToggle={(k) => toggle(selectedMcpServers, setSelectedMcpServers, k)}
          onSelectAll={() => selectAll(mcpItems, setSelectedMcpServers)}
          onDeselectAll={() => deselectAll(setSelectedMcpServers)}
          loading={mcpLoading}
        />
        <TransferSectionCard
          title="Agents"
          items={agentItems}
          selected={selectedAgents}
          onToggle={(k) => toggle(selectedAgents, setSelectedAgents, k)}
          onSelectAll={() => selectAll(agentItems, setSelectedAgents)}
          onDeselectAll={() => deselectAll(setSelectedAgents)}
          loading={agentsLoading}
        />
      </Box>

      {/* Preview button */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Button
          variant="contained"
          startIcon={previewTransfer.isPending ? <CircularProgress size={16} /> : <PreviewIcon />}
          onClick={handlePreview}
          disabled={!targetPath || totalSelected === 0 || previewTransfer.isPending}
        >
          Preview Copy
        </Button>
        {!targetPath && totalSelected > 0 && (
          <Typography variant="body2" color="text.secondary">
            Select a target instance first
          </Typography>
        )}
        {targetPath && totalSelected === 0 && (
          <Typography variant="body2" color="text.secondary">
            Select at least one item to copy
          </Typography>
        )}
      </Box>

      {/* Preview Dialog */}
      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        preview={previewTransfer.data ?? null}
        conflictMode={conflictMode}
        onConflictModeChange={setConflictMode}
        onApply={handleApply}
        applying={applyTransfer.isPending}
      />

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={toast?.severity} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
