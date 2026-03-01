import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import ExtensionIcon from "@mui/icons-material/Extension";
import DnsIcon from "@mui/icons-material/Dns";
import DescriptionIcon from "@mui/icons-material/Description";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import StorefrontIcon from "@mui/icons-material/Storefront";
import HubIcon from "@mui/icons-material/Hub";
import TerminalIcon from "@mui/icons-material/Terminal";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

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

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
  { label: "Plugins", path: "/plugins", icon: <ExtensionIcon /> },
  { label: "Marketplace", path: "/marketplace", icon: <StorefrontIcon /> },
  { label: "Skill Providers", path: "/providers", icon: <HubIcon /> },
  { label: "MCP Servers", path: "/mcp", icon: <DnsIcon /> },
  { label: "CLAUDE.md", path: "/claude-md", icon: <DescriptionIcon /> },
  { label: "Visibility", path: "/visibility", icon: <VisibilityIcon /> },
  { label: "Code Router", path: "/ccr", icon: <AltRouteIcon /> },
  { label: "Commands", path: "/commands", icon: <TerminalIcon /> },
  { label: "Skill Catalog", path: "/skill-catalog", icon: <AutoFixHighIcon /> },
];

export default function App() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                component="img"
                src="/logo.svg"
                alt="ClaudeBoard"
                sx={{ width: 36, height: 36, flexShrink: 0 }}
              />
              <Box>
                <Typography
                  variant="h3"
                  sx={{
                    background: "linear-gradient(135deg, #8B5CF6 0%, #38BDF8 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    lineHeight: 1.2,
                  }}
                >
                  ClaudeBoard
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.55rem" }}>
                  Claude Code Control Panel
                </Typography>
              </Box>
            </Box>
          </Box>

          <List sx={{ px: 1, pt: 1 }}>
            {NAV_ITEMS.map((item) => (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                end={item.path === "/"}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  "&.active": {
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                    color: "primary.main",
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                  },
                  "&:hover": {
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
          </List>

          <Box sx={{ mt: "auto", p: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                textTransform: "none",
                letterSpacing: "normal",
                fontSize: "0.65rem",
              }}
            >
              v1.0.0
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                textTransform: "none",
                letterSpacing: "normal",
                fontSize: "0.6rem",
                mt: 0.25,
              }}
            >
              Created by Thura
            </Typography>
          </Box>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: 0,
          maxWidth: `calc(100vw - ${DRAWER_WIDTH}px)`,
        }}
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/mcp" element={<McpServersPage />} />
          <Route path="/claude-md" element={<ClaudeMdPage />} />
          <Route path="/visibility" element={<VisibilityPage />} />
          <Route path="/ccr" element={<CcrPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/providers" element={<SkillProvidersPage />} />
          <Route path="/commands" element={<CommandsPage />} />
          <Route path="/skill-catalog" element={<SkillCatalogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}
