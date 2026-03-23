import { useState } from "react";
import { Box, Typography, Tab, Tabs, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SettingsPage from "./SettingsPage";
import McpServersPage from "./McpServersPage";
import CommandsPage from "./CommandsPage";
import InstallationsPage from "./InstallationsPage";

const TABS = ["Settings", "MCP Servers", "Commands", "Installations"] as const;

export default function ConfigurationPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="h1">
          Configuration
        </Typography>
        <Button component={RouterLink} to="/reliability" variant="outlined" size="small">
          Open Reliability
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage settings, MCP servers, and custom commands
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        {TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      <Box sx={{ animation: "fadeIn 0.2s ease" }}>
        {tab === 0 && <SettingsPage />}
        {tab === 1 && <McpServersPage />}
        {tab === 2 && <CommandsPage />}
        {tab === 3 && <InstallationsPage />}
      </Box>
    </Box>
  );
}
