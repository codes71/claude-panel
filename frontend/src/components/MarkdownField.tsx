import { TextField, type TextFieldProps } from "@mui/material";

type MarkdownFieldProps = Omit<TextFieldProps, "multiline" | "fullWidth"> & {
  /** Grow to fill flex parent when true (default: false) */
  flexFill?: boolean;
};

export default function MarkdownField({
  flexFill = false,
  sx,
  ...rest
}: MarkdownFieldProps) {
  return (
    <TextField
      multiline
      fullWidth
      sx={[
        {
          "& .MuiOutlinedInput-root": {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.8rem",
            lineHeight: 1.8,
            bgcolor: "background.default",
            ...(flexFill && {
              height: "100%",
              alignItems: "flex-start",
            }),
          },
          ...(flexFill && {
            flex: 1,
            minHeight: 0,
            "& textarea": {
              height: "100% !important",
              overflow: "auto !important",
            },
          }),
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...rest}
    />
  );
}
