import { useState } from "react";
import {
  Box,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  useAgents,
  useUpdateAgent,
  useCreateAgent,
  useDeleteAgent,
  useRenameAgent,
} from "../api/agents";
import AgentList from "./agents/AgentList";
import AgentEditor from "./agents/AgentEditor";
import AgentBuilder from "./agents/AgentBuilder";
import AgentImportDialog from "./agents/AgentImportDialog";
import {
  DeleteAgentDialog,
  RenameAgentDialog,
} from "./agents/AgentDialogs";

export default function AgentsPage() {
  const { data: agentData, isLoading, error } = useAgents();
  const agents = agentData?.agents ?? [];
  const updateAgent = useUpdateAgent();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const renameAgent = useRenameAgent();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const selectedInfo = agents.find((a) => a.name === selectedAgent);

  const handleSave = (content: string) => {
    if (!selectedAgent) return;
    updateAgent.mutate(
      { name: selectedAgent, content },
      {
        onSuccess: () =>
          setToast({ msg: "Agent saved", severity: "success" }),
        onError: (e) =>
          setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const handleCreate = (name: string, content: string) => {
    createAgent.mutate(
      { name, content },
      {
        onSuccess: () => {
          setToast({ msg: "Agent created", severity: "success" });
          setSelectedAgent(name);
          setCreateOpen(false);
        },
        onError: (e) =>
          setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const handleDelete = () => {
    if (!selectedAgent) return;
    deleteAgent.mutate(
      { name: selectedAgent },
      {
        onSuccess: () => {
          setToast({ msg: "Agent deleted", severity: "success" });
          setSelectedAgent(null);
          setDeleteOpen(false);
        },
        onError: (e) => {
          setToast({ msg: (e as Error).message, severity: "error" });
          setDeleteOpen(false);
        },
      },
    );
  };

  const handleRename = (newName: string) => {
    if (!selectedAgent) return;
    renameAgent.mutate(
      { name: selectedAgent, new_name: newName },
      {
        onSuccess: () => {
          setToast({ msg: "Agent renamed", severity: "success" });
          setSelectedAgent(newName);
          setRenameOpen(false);
        },
        onError: (e) =>
          setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load agents: {(error as Error).message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
        }}
      >
        <Box />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => setImportOpen(true)}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            New Agent
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2, minHeight: 500 }}>
        <AgentList
          agents={agents}
          filter={filter}
          onFilterChange={setFilter}
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
          isLoading={isLoading}
        />

        <AgentEditor
          selectedAgent={selectedAgent}
          selectedInfo={selectedInfo}
          onSave={handleSave}
          onDeleteOpen={() => setDeleteOpen(true)}
          onRenameOpen={() => setRenameOpen(true)}
          saving={updateAgent.isPending}
        />
      </Box>

      <AgentBuilder
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreate}
        isPending={createAgent.isPending}
      />

      <AgentImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(count) =>
          setToast({
            msg: `Imported ${count} agent${count !== 1 ? "s" : ""}`,
            severity: "success",
          })
        }
      />

      <DeleteAgentDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        isPending={deleteAgent.isPending}
        agentName={selectedInfo?.display_name || selectedAgent || ""}
      />

      <RenameAgentDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        onConfirm={handleRename}
        isPending={renameAgent.isPending}
        initialName={selectedAgent ?? ""}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
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
