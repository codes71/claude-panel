import { useState, useCallback } from "react";
import { Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExtensionIcon from "@mui/icons-material/Extension";
import SettingsIcon from "@mui/icons-material/Settings";
import DescriptionIcon from "@mui/icons-material/Description";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

import { useThemeMode } from "./ThemeContext";
import InstanceSwitcher from "./components/InstanceSwitcher";
import ErrorBoundary from "./components/ErrorBoundary";
import UpdateBadge from "./components/UpdateBadge";

import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import PluginsPage from "./pages/PluginsPage";
import McpServersPage from "./pages/McpServersPage";
import ClaudeMdPage from "./pages/ClaudeMdPage";
import VisibilityPage from "./pages/VisibilityPage";
import CcrPage from "./pages/CcrPage";
import MarketplacePage from "./pages/MarketplacePage";
import SkillProvidersPage from "./pages/SkillProvidersPage";
import CommandsPage from "./pages/CommandsPage";
import SkillCatalogPage from "./pages/SkillCatalogPage";
import ExtensionsPage from "./pages/ExtensionsPage";
import ConfigurationPage from "./pages/ConfigurationPage";
import ReliabilityPage from "./pages/ReliabilityPage";
import AgentsPage from "./pages/AgentsPage";

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 64;
const HEADER_HEIGHT = 48;

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "Extensions", path: "/extensions", icon: <ExtensionIcon /> },
  { label: "Configuration", path: "/configuration", icon: <SettingsIcon /> },
  { label: "Agents", path: "/agents", icon: <SmartToyIcon /> },
  { label: "Reliability", path: "/reliability", icon: <HealthAndSafetyIcon /> },
  { label: "CLAUDE.md", path: "/claude-md", icon: <DescriptionIcon /> },
];

export default function App() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("claude-panel-sidebar") === "collapsed"; } catch { return false; }
  });
  const { mode, toggle: toggleTheme } = useThemeMode();
  const theme = useTheme();
  const location = useLocation();

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("claude-panel-sidebar", next ? "collapsed" : "expanded"); } catch { /* */ }
      return next;
    });
  }, []);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* --- Sidebar --- */}
      <Box
        component="nav"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          background: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          transition: "width 0.25s ease",
          overflow: "hidden",
          zIndex: theme.zIndex.drawer,
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            height: 64,
            px: collapsed ? 1 : 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            flexShrink: 0,
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              background: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src="/logo.svg"
              alt="Claude Panel"
              sx={{ width: 18, height: 18 }}
            />
          </Box>
          {!collapsed && (
            <Box sx={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <Typography
                variant="h3"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  fontSize: "1rem",
                  lineHeight: 1.3,
                }}
              >
                Claude Panel
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: "block",
                  fontSize: "0.55rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Claude Code Control Panel
              </Typography>
            </Box>
          )}
        </Box>

        {/* Nav items */}
        <List sx={{ px: collapsed ? 0.5 : 1.5, pt: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <Tooltip key={item.path} title={collapsed ? item.label : ""} placement="right" arrow>
              <ListItemButton
                component={NavLink}
                to={item.path}
                end={item.path === "/"}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  px: collapsed ? 1.25 : 1.5,
                  justifyContent: collapsed ? "center" : "flex-start",
                  "&.active": {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                  },
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36 }}>{item.icon}</ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>

        {/* Collapse toggle + footer */}
        <Box sx={{ p: collapsed ? 1 : 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: "flex", justifyContent: collapsed ? "center" : "flex-start", mb: collapsed ? 0 : 1 }}>
            <IconButton size="small" onClick={toggleSidebar} sx={{ color: "text.secondary" }}>
              {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Box>
          {!collapsed && (
            <>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textTransform: "none", letterSpacing: "normal", fontSize: "0.65rem" }}>
                v{__APP_VERSION__}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textTransform: "none", letterSpacing: "normal", fontSize: "0.6rem", mt: 0.25 }}>
                Created by Thura
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* --- Main area --- */}
      <Box sx={{ flexGrow: 1, ml: `${sidebarWidth}px`, transition: "margin-left 0.25s ease", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Header bar */}
        <Box
          component="header"
          sx={{
            height: HEADER_HEIGHT,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            flexShrink: 0,
            background: theme.palette.background.paper,
            position: "sticky",
            top: 0,
            zIndex: theme.zIndex.appBar,
          }}
        >
          <InstanceSwitcher variant="header" />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <UpdateBadge />
            <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton size="small" onClick={toggleTheme} sx={{ color: "text.secondary" }}>
                {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            maxWidth: "100%",
            overflow: "auto",
            height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          }}
          key={location.pathname}
        >
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/extensions" element={<ExtensionsPage />} />
              <Route path="/configuration" element={<ConfigurationPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/reliability" element={<ReliabilityPage />} />
              <Route path="/claude-md" element={<ClaudeMdPage />} />
              {/* Legacy routes redirect to new consolidated pages */}
              <Route path="/settings" element={<Navigate to="/configuration" replace />} />
              <Route path="/plugins" element={<Navigate to="/extensions" replace />} />
              <Route path="/mcp" element={<Navigate to="/configuration" replace />} />
              <Route path="/marketplace" element={<Navigate to="/extensions" replace />} />
              <Route path="/providers" element={<Navigate to="/extensions" replace />} />
              <Route path="/skill-catalog" element={<Navigate to="/extensions" replace />} />
              <Route path="/commands" element={<Navigate to="/configuration" replace />} />
              <Route path="/visibility" element={<Navigate to="/" replace />} />
              <Route path="/ccr" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </Box>
      </Box>
    </Box>
  );
}
