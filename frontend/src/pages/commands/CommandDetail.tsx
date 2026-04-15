import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useCommandDetail } from "../../api/commands";
import CodeEditor from "../../components/CodeEditor";
import type { CommandInfo } from "../../types";
import type { SelectedCommand } from "./CommandTree";

interface CommandDetailProps {
  selectedCommand: SelectedCommand | null;
  selectedInfo: CommandInfo | undefined;
  onSave: (content: string) => void;
  onDeleteOpen: () => void;
  onRenameOpen: () => void;
  saving: boolean;
}

export default function CommandDetail({
  selectedCommand,
  selectedInfo,
  onSave,
  onDeleteOpen,
  onRenameOpen,
  saving,
}: CommandDetailProps) {
  const [content, setContent] = useState("");

  const { data: cmdDetail } = useCommandDetail(
    selectedCommand?.namespace ?? null,
    selectedCommand?.name ?? null,
  );

  useEffect(() => {
    if (cmdDetail?.content !== undefined) {
      setContent(cmdDetail.content);
    }
  }, [cmdDetail]);

  const tokenEstimate =
    cmdDetail?.token_estimate ?? Math.ceil(content.length / 4);
  const selectedQualifiedName = selectedInfo?.qualified_name ?? "";

  return (
    <Card sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
      <CardContent
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {!selectedInfo ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Select a command to edit
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                mb: 1,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 300,
                }}
              >
                /{selectedQualifiedName}
              </Typography>
              <IconButton
                size="small"
                onClick={onRenameOpen}
                title="Rename command"
                sx={{ color: "text.secondary" }}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
              {selectedInfo.category && (
                <Chip
                  label={selectedInfo.category}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.6rem",
                    bgcolor: (t) =>
                      alpha(t.palette.info.main, 0.12),
                    color: "info.main",
                  }}
                />
              )}
            </Box>

            {selectedInfo.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5, fontSize: "0.75rem" }}
              >
                {selectedInfo.description}
              </Typography>
            )}

            <CodeEditor
              content={content}
              onChange={setContent}
              onSave={() => onSave(content)}
              saving={saving}
              tokenEstimate={tokenEstimate}
              extraToolbar={
                <IconButton
                  size="small"
                  color="error"
                  onClick={onDeleteOpen}
                  title="Delete command"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
