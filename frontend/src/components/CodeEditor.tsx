import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Box, Button, TextField } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import TokenBadge from "./TokenBadge";

interface CodeEditorProps {
  content: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving?: boolean;
  tokenEstimate?: number;
  extraToolbar?: ReactNode;
}

export default function CodeEditor({
  content,
  onChange,
  onSave,
  saving = false,
  tokenEstimate,
  extraToolbar,
}: CodeEditorProps) {
  const [preview, setPreview] = useState(false);

  // Ctrl+S / Cmd+S keyboard shortcut
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    },
    [onSave],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        {tokenEstimate != null && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TokenBadge tokens={tokenEstimate} />
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
          <Button
            size="small"
            variant={preview ? "contained" : "outlined"}
            onClick={() => setPreview(!preview)}
            sx={{ minWidth: 80 }}
          >
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={onSave}
            disabled={saving}
          >
            Save
          </Button>
          {extraToolbar}
        </Box>
      </Box>

      {preview ? (
        <Box
          sx={{
            flex: 1,
            p: 2,
            bgcolor: "background.default",
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.8rem",
            lineHeight: 1.8,
          }}
        >
          {content || "(empty)"}
        </Box>
      ) : (
        <TextField
          multiline
          fullWidth
          value={content}
          onChange={(e) => onChange(e.target.value)}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              height: "100%",
              alignItems: "flex-start",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.8rem",
              lineHeight: 1.8,
              bgcolor: "background.default",
            },
            "& textarea": {
              height: "100% !important",
              overflow: "auto !important",
            },
          }}
        />
      )}
    </>
  );
}
