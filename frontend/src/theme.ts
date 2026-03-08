import { createTheme, alpha, type Theme } from "@mui/material/styles";

const VIOLET = "#8B5CF6";
const VIOLET_LIGHT = "#A78BFA";
const VIOLET_DARK = "#6D28D9";

const sharedTypography = {
  fontFamily: "'DM Sans', sans-serif",
  h1: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "2rem", letterSpacing: "-0.02em" },
  h2: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: "1.5rem", letterSpacing: "-0.01em" },
  h3: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: "1.25rem" },
  h4: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: "1.1rem" },
  h5: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: "0.95rem" },
  h6: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: "0.85rem" },
  body1: { fontSize: "0.9rem", lineHeight: 1.6 },
  body2: { fontSize: "0.8rem", lineHeight: 1.5 },
  caption: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  },
  button: {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 500,
    fontSize: "0.8rem",
    letterSpacing: "0.02em",
    textTransform: "none" as const,
  },
};

const sharedShape = { borderRadius: 8 };

function buildComponents(surface: string, surfaceRaised: string, surfaceOverlay: string, border: string, mode: "dark" | "light") {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin" as const,
          scrollbarColor: `${border} transparent`,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: border, borderRadius: 3 },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: surfaceRaised,
          border: `1px solid ${border}`,
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
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, padding: "8px 16px" },
        contained: {
          boxShadow: `0 0 16px ${alpha(VIOLET, 0.2)}`,
          "&:hover": { boxShadow: `0 0 24px ${alpha(VIOLET, 0.35)}` },
        },
        outlined: {
          borderColor: border,
          "&:hover": { borderColor: VIOLET, background: alpha(VIOLET, 0.06) },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", height: 26, borderRadius: 6 },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
        track: { borderRadius: 10, backgroundColor: border },
        thumb: { boxShadow: "none" },
        switchBase: {
          "&.Mui-checked": {
            "& + .MuiSwitch-track": { backgroundColor: VIOLET, opacity: 0.5 },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { background: surface, borderRight: `1px solid ${border}` },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { background: surfaceRaised, border: `1px solid ${border}`, borderRadius: 12 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.85rem",
            "& fieldset": { borderColor: border },
            "&:hover fieldset": { borderColor: alpha(VIOLET, 0.5) },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem", textTransform: "none" as const, letterSpacing: "0.01em" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: border },
        head: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.7rem",
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
          color: mode === "dark" ? "#8b8a94" : "#6b7280",
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: { root: { backgroundColor: alpha(border, 0.5) } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.7rem",
          background: surfaceOverlay,
          border: `1px solid ${border}`,
          borderRadius: 6,
        },
      },
    },
  };
}

// --- Dark Theme ---
const DARK_SURFACE = "#111118";
const DARK_SURFACE_RAISED = "#18181f";
const DARK_SURFACE_OVERLAY = "#1e1e28";
const DARK_BORDER = "#2a2a3a";

export const darkTheme: Theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: VIOLET, light: VIOLET_LIGHT, dark: VIOLET_DARK },
    secondary: { main: "#38BDF8", light: "#7DD3FC", dark: "#0284C7" },
    background: { default: "#0a0a0f", paper: DARK_SURFACE },
    text: { primary: "#e0dfe4", secondary: "#8b8a94" },
    divider: DARK_BORDER,
    error: { main: "#F87171" },
    warning: { main: "#FBBF24" },
    success: { main: "#34D399" },
    info: { main: "#38BDF8" },
  },
  typography: { ...sharedTypography, caption: { ...sharedTypography.caption, color: "#8b8a94" } },
  shape: sharedShape,
  components: buildComponents(DARK_SURFACE, DARK_SURFACE_RAISED, DARK_SURFACE_OVERLAY, DARK_BORDER, "dark"),
});

// --- Light Theme ---
const LIGHT_SURFACE = "#f8f9fa";
const LIGHT_SURFACE_RAISED = "#ffffff";
const LIGHT_SURFACE_OVERLAY = "#f1f3f5";
const LIGHT_BORDER = "#e2e4e9";

export const lightTheme: Theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: VIOLET, light: VIOLET_LIGHT, dark: VIOLET_DARK },
    secondary: { main: "#0284C7", light: "#38BDF8", dark: "#075985" },
    background: { default: "#f0f1f3", paper: LIGHT_SURFACE },
    text: { primary: "#1a1a2e", secondary: "#6b7280" },
    divider: LIGHT_BORDER,
    error: { main: "#DC2626" },
    warning: { main: "#D97706" },
    success: { main: "#059669" },
    info: { main: "#0284C7" },
  },
  typography: { ...sharedTypography, caption: { ...sharedTypography.caption, color: "#6b7280" } },
  shape: sharedShape,
  components: buildComponents(LIGHT_SURFACE, LIGHT_SURFACE_RAISED, LIGHT_SURFACE_OVERLAY, LIGHT_BORDER, "light"),
});

export { VIOLET, VIOLET_LIGHT, VIOLET_DARK };

export default darkTheme;
