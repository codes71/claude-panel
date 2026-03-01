import { createTheme, alpha } from "@mui/material/styles";

const VIOLET = "#8B5CF6";
const VIOLET_LIGHT = "#A78BFA";
const VIOLET_DARK = "#6D28D9";

const SURFACE = "#111118";
const SURFACE_RAISED = "#18181f";
const SURFACE_OVERLAY = "#1e1e28";
const BORDER = "#2a2a3a";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: VIOLET,
      light: VIOLET_LIGHT,
      dark: VIOLET_DARK,
    },
    secondary: {
      main: "#38BDF8",
      light: "#7DD3FC",
      dark: "#0284C7",
    },
    background: {
      default: "#0a0a0f",
      paper: SURFACE,
    },
    text: {
      primary: "#e0dfe4",
      secondary: "#8b8a94",
    },
    divider: BORDER,
    error: {
      main: "#F87171",
    },
    warning: {
      main: "#FBBF24",
    },
    success: {
      main: "#34D399",
    },
    info: {
      main: "#38BDF8",
    },
  },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 700,
      fontSize: "2rem",
      letterSpacing: "-0.02em",
    },
    h2: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 600,
      fontSize: "1.5rem",
      letterSpacing: "-0.01em",
    },
    h3: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 600,
      fontSize: "1.25rem",
    },
    h4: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 500,
      fontSize: "1.1rem",
    },
    h5: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 500,
      fontSize: "0.95rem",
    },
    h6: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 500,
      fontSize: "0.85rem",
    },
    body1: {
      fontSize: "0.9rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.8rem",
      lineHeight: 1.5,
    },
    caption: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "0.7rem",
      letterSpacing: "0.04em",
      textTransform: "uppercase" as const,
      color: "#8b8a94",
    },
    button: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 500,
      fontSize: "0.8rem",
      letterSpacing: "0.02em",
      textTransform: "none" as const,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin",
          scrollbarColor: `${BORDER} transparent`,
          "&::-webkit-scrollbar": {
            width: 6,
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: BORDER,
            borderRadius: 3,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: SURFACE_RAISED,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          backgroundImage: "none",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            borderColor: alpha(VIOLET, 0.3),
            boxShadow: `0 0 20px ${alpha(VIOLET, 0.05)}`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 16px",
        },
        contained: {
          boxShadow: `0 0 16px ${alpha(VIOLET, 0.2)}`,
          "&:hover": {
            boxShadow: `0 0 24px ${alpha(VIOLET, 0.35)}`,
          },
        },
        outlined: {
          borderColor: BORDER,
          "&:hover": {
            borderColor: VIOLET,
            background: alpha(VIOLET, 0.06),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.7rem",
          height: 26,
          borderRadius: 6,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 8,
        },
        track: {
          borderRadius: 10,
          backgroundColor: "#2a2a3a",
        },
        thumb: {
          boxShadow: "none",
        },
        switchBase: {
          "&.Mui-checked": {
            "& + .MuiSwitch-track": {
              backgroundColor: VIOLET,
              opacity: 0.5,
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: SURFACE,
          borderRight: `1px solid ${BORDER}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: SURFACE_RAISED,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.85rem",
            "& fieldset": {
              borderColor: BORDER,
            },
            "&:hover fieldset": {
              borderColor: alpha(VIOLET, 0.5),
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.8rem",
          textTransform: "none",
          letterSpacing: "0.01em",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: BORDER,
        },
        head: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#8b8a94",
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(BORDER, 0.5),
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.7rem",
          background: SURFACE_OVERLAY,
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
        },
      },
    },
  },
});

export default theme;
export { VIOLET, VIOLET_LIGHT, VIOLET_DARK, SURFACE, SURFACE_RAISED, SURFACE_OVERLAY, BORDER };
