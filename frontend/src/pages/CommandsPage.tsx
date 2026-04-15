import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  useCommands,
  useUpdateCommand,
  useCreateCommand,
  useDeleteCommand,
  useRenameCommand,
} from "../api/commands";
import CommandTree from "./commands/CommandTree";
import CommandDetail from "./commands/CommandDetail";
import {
  CreateCommandDialog,
  DeleteCommandDialog,
  RenameCommandDialog,
} from "./commands/CommandDialogs";
import type { SelectedCommand } from "./commands/CommandTree";

export default function CommandsPage() {
  const { data: cmdData, isLoading, error } = useCommands();
  const namespaces = cmdData?.namespaces ?? [];
  const commands = cmdData?.commands ?? [];
  const updateCmd = useUpdateCommand();
  const createCmd = useCreateCommand();
  const deleteCmd = useDeleteCommand();
  const renameCmd = useRenameCommand();

  const [selectedCommand, setSelectedCommand] =
    useState<SelectedCommand | null>(null);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const selectedInfo = commands.find(
    (c) =>
      selectedCommand &&
      c.namespace === selectedCommand.namespace &&
      c.name === selectedCommand.name,
  );

  const handleSave = (content: string) => {
    if (!selectedCommand) return;
    updateCmd.mutate(
      {
        namespace: selectedCommand.namespace,
        name: selectedCommand.name,
        content,
      },
      {
        onSuccess: () =>
          setToast({ msg: "Command saved", severity: "success" }),
        onError: (e) =>
          setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const handleCreate = (namespace: string, name: string, content: string) => {
    createCmd.mutate(
      { namespace, name, content },
      {
        onSuccess: () => {
          setToast({ msg: "Command created", severity: "success" });
          setSelectedCommand({ namespace, name });
          setCreateOpen(false);
        },
        onError: (e) =>
          setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const handleDelete = () => {
    if (!selectedCommand) return;
    deleteCmd.mutate(
      {
        namespace: selectedCommand.namespace,
        name: selectedCommand.name,
      },
      {
        onSuccess: () => {
          setToast({ msg: "Command deleted", severity: "success" });
          setSelectedCommand(null);
          setDeleteOpen(false);
        },
        onError: (e) => {
          setToast({ msg: (e as Error).message, severity: "error" });
          setDeleteOpen(false);
        },
      },
    );
  };

  const handleRename = (newNamespace: string, newName: string) => {
    if (!selectedCommand) return;
    renameCmd.mutate(
      {
        namespace: selectedCommand.namespace,
        name: selectedCommand.name,
        new_namespace: newNamespace,
        new_name: newName,
      },
      {
        onSuccess: () => {
          setToast({ msg: "Command renamed", severity: "success" });
          setSelectedCommand({ namespace: newNamespace, name: newName });
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
          Failed to load commands: {(error as Error).message}
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          New Command
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, minHeight: 500, height: "calc(100vh - 180px)" }}>
        <CommandTree
          commands={commands}
          namespaces={namespaces}
          filter={filter}
          onFilterChange={setFilter}
          selectedCommand={selectedCommand}
          onSelectCommand={setSelectedCommand}
          isLoading={isLoading}
        />

        <CommandDetail
          selectedCommand={selectedCommand}
          selectedInfo={selectedInfo}
          onSave={handleSave}
          onDeleteOpen={() => setDeleteOpen(true)}
          onRenameOpen={() => setRenameOpen(true)}
          saving={updateCmd.isPending}
        />
      </Box>

      <CreateCommandDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreate}
        isPending={createCmd.isPending}
      />

      <DeleteCommandDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        isPending={deleteCmd.isPending}
        qualifiedName={selectedInfo?.qualified_name ?? ""}
      />

      <RenameCommandDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        onConfirm={handleRename}
        isPending={renameCmd.isPending}
        initialNamespace={selectedCommand?.namespace ?? ""}
        initialName={selectedCommand?.name ?? ""}
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
