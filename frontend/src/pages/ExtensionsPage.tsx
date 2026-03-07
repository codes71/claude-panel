import { useState } from "react";
import { Box, Typography, Tab, Tabs } from "@mui/material";
import PluginsPage from "./PluginsPage";
import MarketplacePage from "./MarketplacePage";
import SkillCatalogPage from "./SkillCatalogPage";

const TABS = ["Installed", "Marketplace", "Skill Catalog"] as const;

export default function ExtensionsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 0.5 }}>
        Extensions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage plugins, browse marketplace, and discover skills
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
        {tab === 0 && <PluginsPage />}
        {tab === 1 && <MarketplacePage />}
        {tab === 2 && <SkillCatalogPage />}
      </Box>
    </Box>
  );
}
