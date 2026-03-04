import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
            p: 4,
            gap: 2,
          }}
        >
          <Alert severity="error" sx={{ maxWidth: 600, width: "100%" }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Something went wrong
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-word" }}>
              {this.state.error?.message ?? "Unknown error"}
            </Typography>
          </Alert>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button variant="outlined" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
