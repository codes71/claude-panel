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
import { useAgentDetail } from "../../api/agents";
import CodeEditor from "../../components/CodeEditor";
import type { AgentInfo } from "../../types";

const MODEL_COLORS: Record<string, string> = {
  opus: "#9C27B0",
  sonnet: "#2196F3",
  haiku: "#4CAF50",
};

interface AgentEditorProps {
  selectedAgent: string | null;
  selectedInfo: AgentInfo | undefined;
  onSave: (content: string) => void;
  onDeleteOpen: () => void;
  onRenameOpen: () => void;
  saving: boolean;
}

export default function AgentEditor({
  selectedAgent,
  selectedInfo,
  onSave,
  onDeleteOpen,
  onRenameOpen,
  saving,
}: AgentEditorProps) {
  const [content, setContent] = useState("");

  const { data: agentDetail } = useAgentDetail(selectedAgent);

  useEffect(() => {
    if (agentDetail?.content !== undefined) {
      setContent(agentDetail.content);
    }
  }, [agentDetail]);

  const tokenEstimate =
    agentDetail?.token_estimate ?? Math.ceil(content.length / 4);

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
              Select an agent to edit
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
                mb: 0.5,
              }}
            >
              <Box sx={{ fontSize: "1.4rem" }}>
                {selectedInfo.emoji || "\u{1F916}"}
              </Box>
              <Typography
                variant="h5"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 300,
                }}
              >
                {selectedInfo.display_name || selectedInfo.name}
              </Typography>
              <IconButton
                size="small"
                onClick={onRenameOpen}
                title="Rename agent"
                sx={{ color: "text.secondary" }}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
              {selectedInfo.model && (
                <Chip
                  label={selectedInfo.model}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.6rem",
                    bgcolor: (t) =>
                      alpha(
                        MODEL_COLORS[selectedInfo.model] ||
                          t.palette.text.secondary,
                        0.12,
                      ),
                    color:
                      MODEL_COLORS[selectedInfo.model] || "text.secondary",
                  }}
                />
              )}
              {selectedInfo.color && (
                <Chip
                  label={selectedInfo.color}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: "0.6rem",
                  }}
                />
              )}
            </Box>

            {(selectedInfo.description || selectedInfo.vibe) && (
              <Box sx={{ mb: 1.5 }}>
                {selectedInfo.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.75rem" }}
                  >
                    {selectedInfo.description}
                  </Typography>
                )}
                {selectedInfo.vibe && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "0.7rem",
                      fontStyle: "italic",
                      color: "text.secondary",
                      mt: 0.25,
                    }}
                  >
                    {selectedInfo.vibe}
                  </Typography>
                )}
              </Box>
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
                  title="Delete agent"
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
