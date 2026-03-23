# Agents Page - UI Design Review

**Date**: 2026-03-22
**Reviewer**: UI Designer Agent
**Scope**: AgentsPage, AgentList, AgentEditor, AgentBuilder, AgentImportDialog, AgentDialogs, CodeEditor
**Design System**: MUI + custom theme (violet primary `#8B5CF6`, DM Sans body, JetBrains Mono code/headings)

---

## 1. Critical: Typography Size Violations

### Sub-12px Font Sizes (Accessibility Failure)

Multiple components use font sizes well below the 12px minimum for readable UI text. These fail WCAG guidelines and create a cramped, hard-to-read interface, especially on standard-density displays.

| File | Line | Current | Element | Recommended |
|------|------|---------|---------|-------------|
| `AgentList.tsx` | 156 | `0.55rem` (8.8px) | Model chip label | `0.65rem` (10.4px) |
| `AgentList.tsx` | 173 | `0.55rem` (8.8px) | Description text | `0.7rem` (11.2px) |
| `AgentList.tsx` | 136 | `0.8rem` (12.8px) | Agent name (OK but tight with the tiny chips) | Keep |
| `AgentEditor.tsx` | 114 | `0.6rem` (9.6px) | Model chip in header | `0.7rem` (11.2px) |
| `AgentEditor.tsx` | 132 | `0.6rem` (9.6px) | Color chip in header | `0.7rem` (11.2px) |
| `AgentEditor.tsx` | 145 | `0.75rem` (12px) | Description text | Keep (borderline OK) |
| `AgentEditor.tsx` | 155 | `0.7rem` (11.2px) | Vibe text | `0.75rem` (12px) |
| `AgentBuilder.tsx` | 358 | `0.8rem` (12.8px) | Template card name | Keep |
| `AgentBuilder.tsx` | 363 | `0.6rem` (9.6px) | Template card description | `0.7rem` (11.2px) |
| `AgentImportDialog.tsx` | 383 | `0.65rem` (10.4px) | "from folder" caption | `0.7rem` (11.2px) |
| `AgentImportDialog.tsx` | 339 | `0.6rem` (9.6px) | `.md` count chip | `0.7rem` (11.2px) |
| `AgentImportDialog.tsx` | 479 | `0.6rem` (9.6px) | Model chip in scan list | `0.7rem` (11.2px) |
| `AgentImportDialog.tsx` | 488 | `0.6rem` (9.6px) | Color chip in scan list | `0.7rem` (11.2px) |
| `AgentImportDialog.tsx` | 498 | `0.65rem` (10.4px) | Agent description | `0.7rem` (11.2px) |

**Recommendation**: Establish a minimum font size of `0.7rem` (11.2px) across the entire Agents page. The global theme's chip default is `0.7rem` (good), but inline `sx` overrides are undercutting it.

### Fix Pattern (AgentList model chip example)

```tsx
// Before
sx={{
  height: 18,
  fontSize: "0.55rem",  // 8.8px - too small
  ...
}}

// After
sx={{
  height: 22,
  fontSize: "0.7rem",   // 11.2px - matches theme chip default
  ...
}}
```

---

## 2. Visual Hierarchy and Flow

### 2.1 Agent List Panel (AgentList.tsx)

**Issue**: The list items are visually flat. The emoji, name, model chip, and description all compete for attention at nearly the same visual weight.

**Recommendations**:

```tsx
// Increase agent name weight and size for clearer primary text
<Typography
  variant="body2"
  sx={{ fontWeight: 600, fontSize: "0.85rem" }}  // was 500, 0.8rem
>
  {agent.display_name || agent.name}
</Typography>

// Add subtle gap between name row and chip/description row
<Box sx={{ display: "flex", gap: 0.5, mt: 0.5, ... }}>  // was mt: 0.25
```

**Issue**: Selected item uses `borderLeft: 3` which shifts content rightward, causing a visual jump.

**Fix**:
```tsx
// Apply a transparent left border to all items so selection doesn't cause layout shift
sx={{
  py: 1,
  borderBottom: 1,
  borderColor: "divider",
  borderLeft: 3,
  borderLeftColor: "transparent",
  "&.Mui-selected": {
    bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
    borderLeftColor: "primary.main",
  },
}}
```

### 2.2 Agent Editor Panel (AgentEditor.tsx)

**Issue**: The header section (emoji + name + chips) and the description/vibe sit too close to the CodeEditor toolbar. The visual grouping is weak.

**Recommendations**:
```tsx
// Add more breathing room between header metadata and editor
// Change mb from 0.5 to 1 on the header row
<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>

// Add a subtle divider between metadata and code editor
{(selectedInfo.description || selectedInfo.vibe) && (
  <Box sx={{ mb: 2 }}>  // was 1.5
    ...
  </Box>
)}
// Consider adding:
<Divider sx={{ mb: 2 }} />
```

### 2.3 Empty State (AgentEditor - no selection)

**Issue**: The empty state "Select an agent to edit" is a single line of body2 text. It's functional but lacks personality for a page about agents.

**Recommendation**:
```tsx
<Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
  <SmartToyIcon sx={{ fontSize: 48, color: "text.secondary", opacity: 0.4 }} />
  <Typography variant="body2" color="text.secondary">
    Select an agent to edit
  </Typography>
  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "none" }}>
    Choose from the list or create a new one
  </Typography>
</Box>
```

---

## 3. Color System Issues

### 3.1 MODEL_COLORS Duplication

`MODEL_COLORS` is defined identically in both `AgentList.tsx:19` and `AgentEditor.tsx:17`. This is a maintenance risk and a consistency issue.

**Recommendation**: Extract to a shared constant:
```tsx
// frontend/src/constants/agent-colors.ts
export const MODEL_COLORS: Record<string, string> = {
  opus: "#9C27B0",    // MUI purple
  sonnet: "#2196F3",  // MUI blue
  haiku: "#4CAF50",   // MUI green
};
```

### 3.2 Model Chip Color Inconsistency

In `AgentImportDialog.tsx:476-480`, model chips in the scan results list have NO color styling - they use the default chip appearance. This is inconsistent with AgentList and AgentEditor which both use `MODEL_COLORS`.

**Fix**: Apply the same `MODEL_COLORS` pattern to import dialog chips:
```tsx
{agent.model && (
  <Chip
    label={agent.model}
    size="small"
    sx={{
      fontSize: "0.7rem",
      height: 22,
      bgcolor: (t) => alpha(MODEL_COLORS[agent.model] || t.palette.text.secondary, 0.12),
      color: MODEL_COLORS[agent.model] || "text.secondary",
    }}
  />
)}
```

### 3.3 Agent "Color" Field Display

The agent's `color` field (e.g., "purple", "blue", "red") is shown as a plain outlined chip with just the text name. This is a missed opportunity.

**Recommendation**: Map the color name to an actual color swatch:
```tsx
const AGENT_COLORS: Record<string, string> = {
  blue: "#2196F3",
  purple: "#9C27B0",
  red: "#F44336",
  green: "#4CAF50",
  orange: "#FF9800",
  teal: "#009688",
};

// In the chip:
<Chip
  label={selectedInfo.color}
  size="small"
  variant="outlined"
  sx={{
    height: 22,
    fontSize: "0.7rem",
    borderColor: AGENT_COLORS[selectedInfo.color] || "divider",
    color: AGENT_COLORS[selectedInfo.color] || "text.secondary",
    "&::before": {
      content: '""',
      width: 8,
      height: 8,
      borderRadius: "50%",
      bgcolor: AGENT_COLORS[selectedInfo.color] || "text.secondary",
      ml: 0.5,
      mr: -0.25,
    },
  }}
/>
```

---

## 4. Spacing and Layout Balance

### 4.1 AgentsPage Top Bar (AgentsPage.tsx:121-146)

**Issue**: The top bar uses `<Box />` as a spacer on the left, which is a hack. This creates an invisible box that may confuse screen readers and adds no semantic value.

**Fix**:
```tsx
<Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 3 }}>
  <Box sx={{ display: "flex", gap: 1 }}>
    <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={() => setImportOpen(true)}>
      Import
    </Button>
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
      New Agent
    </Button>
  </Box>
</Box>
```

### 4.2 Main Layout Split (AgentsPage.tsx:148)

**Issue**: The list panel is `width: "30%"` with `minWidth: 260`. On large screens (1920px+), 30% = 576px which is too wide for a list panel. On small screens, the 70%/30% split doesn't adapt.

**Recommendation**:
```tsx
// AgentList card:
sx={{
  width: 300,         // Fixed width instead of percentage
  maxWidth: "35%",    // But cap it on smaller screens
  minWidth: 260,
  flexShrink: 0,
  ...
}}

// Main content area:
<Box sx={{ display: "flex", gap: 2, minHeight: 500, overflow: "hidden" }}>
```

### 4.3 Card Internal Padding Inconsistency

- `AgentList` filter box: `p: 1.5`
- `AgentEditor` card content: uses default `CardContent` padding (16px)
- These differ slightly, creating a misaligned top edge between the two panels

**Fix**: Use consistent padding:
```tsx
// AgentEditor CardContent
<CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2, "&:last-child": { pb: 2 } }}>
```

---

## 5. Template Cards Design (AgentBuilder.tsx)

### 5.1 Grid Overflow

**Issue**: With 6 templates in a 3-column grid, the cards work well. But the grid uses `gridTemplateColumns: "repeat(3, 1fr)"` without responsiveness - in the dialog (max-width `md` = 900px), minus padding, each column is ~260px. This is fine, but if more templates are added, the grid will just extend downward with no visual differentiation.

**Recommendation**: Add subtle category grouping or limit visible cards with a "show more":
```tsx
// For now, ensure the grid is responsive within the dialog
sx={{
  display: "grid",
  gridTemplateColumns: {
    xs: "repeat(2, 1fr)",    // 2 columns on narrow dialogs
    sm: "repeat(3, 1fr)",    // 3 columns normally
  },
  gap: 1.5,
}}
```

### 5.2 Template Card Visual Richness

**Issue**: Template cards are minimal - just an emoji and text in a bordered card. The selected state only changes border color. This lacks the visual richness expected for a "builder" experience.

**Recommendation**:
```tsx
<Card
  variant="outlined"
  sx={{
    border: 2,
    borderColor: selectedTemplate === tpl.id ? "primary.main" : "divider",
    transition: "all 0.2s ease",
    bgcolor: selectedTemplate === tpl.id
      ? (t) => alpha(t.palette.primary.main, 0.04)
      : "transparent",
    "&:hover": {
      borderColor: (t) => alpha(t.palette.primary.main, 0.4),
      transform: "translateY(-1px)",
      boxShadow: (t) => `0 4px 12px ${alpha(t.palette.primary.main, 0.1)}`,
    },
  }}
>
  <CardActionArea onClick={() => applyTemplate(tpl.id)}>
    <CardContent sx={{ py: 2, px: 2 }}>  {/* was py: 1.5 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>  {/* was gap: 1 */}
        <Box sx={{
          fontSize: "1.5rem",   // was 1.2rem - make emoji more prominent
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 1.5,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
        }}>
          {tpl.emoji}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
            {tpl.label}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: "0.7rem",   // was 0.6rem
              textTransform: "none",
              letterSpacing: "normal",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tpl.vibe || tpl.description || "Blank template"}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </CardActionArea>
</Card>
```

### 5.3 Instructions TextField Missing Markdown Support

The instructions section uses a plain `<TextField multiline>`. For a markdown-heavy agent definition, this should at minimum show line numbers or use the existing `CodeEditor` component.

**Recommendation**: Consider reusing `CodeEditor` (from `components/CodeEditor.tsx`) for the instructions section in AgentBuilder, or at least adding a preview toggle.

---

## 6. Import Dialog Polish (AgentImportDialog.tsx)

### 6.1 Folder Row Hover State

**Issue**: Folder rows have a hover background but no transition, causing an abrupt color change.

**Fix**:
```tsx
// Add transition to folder rows
sx={{
  display: "flex",
  alignItems: "center",
  gap: 1.5,
  px: 2,
  py: 1,
  borderBottom: 1,
  borderColor: "divider",
  "&:last-child": { borderBottom: 0 },
  cursor: "pointer",
  transition: "background-color 0.15s ease",  // ADD THIS
  "&:hover": {
    bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
  },
}}
```

### 6.2 Breadcrumb Bar Styling

**Issue**: The breadcrumb bar uses `bgcolor: (t) => alpha(t.palette.background.default, 0.5)` which in dark mode creates an almost-invisible semi-transparent overlay against an already-dark dialog. The visual weight is too low.

**Fix**:
```tsx
sx={{
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  bgcolor: (t) => t.palette.mode === "dark"
    ? alpha(t.palette.common.white, 0.03)
    : alpha(t.palette.background.default, 0.5),
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  px: 1.5,
  py: 0.75,
  minHeight: 40,
}}
```

### 6.3 "Select This Folder" Button Placement

**Issue**: The "Select This Folder" button floats below the file browser without visual connection. It should feel anchored to the browser.

**Fix**:
```tsx
// Wrap browser + button in a group
<Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
  {/* folder list */}
  <Box sx={{ maxHeight: 340, overflow: "auto" }}>
    {/* entries */}
  </Box>
  {/* Button as footer of the browser card */}
  <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider", bgcolor: (t) => alpha(t.palette.background.default, 0.3) }}>
    <Button variant="contained" fullWidth onClick={handleSelectFolder} ...>
      Select This Folder
    </Button>
  </Box>
</Box>
```

### 6.4 Scan Results Agent Rows

**Issue**: The checkbox + emoji + text + chips layout works but the checkbox is not vertically aligned with the content center.

**Fix**:
```tsx
<Box sx={{ display: "flex", alignItems: "center", ... }}>
  <Checkbox size="small" checked={...} tabIndex={-1} sx={{ ml: -0.5 }} />  // Negative margin to align edge
  ...
</Box>
```

---

## 7. Dark Mode Specific Issues

### 7.1 Card Hover Glow Conflicts

The global theme applies `boxShadow: 0 0 20px ${alpha(VIOLET, 0.05)}` to all card hovers. On the Agents page, the left list panel and right editor panel are both cards that sit adjacent. When hovering near the gap between them, both cards glow, creating a visual muddle.

**Recommendation**: Disable hover glow on the AgentList and AgentEditor cards since they're structural panels, not interactive cards:
```tsx
// AgentList Card
<Card sx={{
  width: 300,
  "&:hover": { borderColor: "divider", boxShadow: "none" },  // Override theme default
  ...
}}>

// AgentEditor Card
<Card sx={{
  flex: 1,
  "&:hover": { borderColor: "divider", boxShadow: "none" },
  ...
}}>
```

### 7.2 Semi-transparent Backgrounds

Several components use `alpha(background.default, 0.5)` for subtle background tints:
- `AgentBuilder.tsx:493` - instructions textarea
- `AgentImportDialog.tsx:177` - breadcrumb bar

In dark mode, `background.default` is `#0a0a0f`. At 50% opacity over `#18181f` (raised surface), this produces `#111117` which is virtually indistinguishable from the surrounding surface. The visual distinction is lost.

**Fix**: Use `alpha(theme.palette.common.white, 0.02)` in dark mode or `alpha(theme.palette.common.black, 0.03)` in light mode for subtle inset backgrounds. Or use a fixed semi-transparent:
```tsx
bgcolor: (t) => t.palette.mode === "dark"
  ? "rgba(255,255,255,0.02)"
  : "rgba(0,0,0,0.02)"
```

---

## 8. Micro-interactions and Transitions

### 8.1 Missing Transitions

| Component | Element | Current | Recommended |
|-----------|---------|---------|-------------|
| AgentList | Selected item background | Instant | `transition: "background-color 0.15s ease"` |
| AgentList | Left border on selection | Instant | `transition: "all 0.15s ease"` (already partly handled by borderColor) |
| AgentBuilder | Template card selection | `border-color 0.15s` | Extend to `all 0.2s ease` (include bgcolor, shadow) |
| AgentImportDialog | Folder row hover | Instant | `transition: "background-color 0.15s ease"` |
| AgentImportDialog | Scan result row selection bg | Instant | `transition: "background-color 0.15s ease"` |

### 8.2 Save Button Feedback

The Save button in CodeEditor disables during save (`saving` prop) but provides no loading indicator.

**Recommendation**:
```tsx
<Button
  size="small"
  variant="contained"
  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
  onClick={onSave}
  disabled={saving}
>
  {saving ? "Saving..." : "Save"}
</Button>
```

### 8.3 Delete Button Lacks Hover Confirmation

The delete icon button in the editor toolbar (`AgentEditor.tsx:173`) is a small red icon that's easy to accidentally click. It only has a `title` tooltip, no hover warning.

**Recommendation**: Add a more visible hover state:
```tsx
<IconButton
  size="small"
  onClick={onDeleteOpen}
  title="Delete agent"
  sx={{
    color: "text.secondary",
    "&:hover": {
      color: "error.main",
      bgcolor: (t) => alpha(t.palette.error.main, 0.08),
    },
    transition: "all 0.15s ease",
  }}
>
  <DeleteIcon fontSize="small" />
</IconButton>
```
Note: Changed from `color="error"` (always red) to default with red hover. Destructive actions shouldn't be visually loud in their resting state.

---

## 9. Loading and Error States

### 9.1 AgentList Skeleton

**Good**: The skeleton state shows 3 rectangular skeletons, which is fine. However, they're uniform rectangles that don't match the actual list item shape.

**Recommendation**: Use skeleton shapes that mirror the real content:
```tsx
{[0, 1, 2].map((i) => (
  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5 }}>
    <Skeleton variant="circular" width={24} height={24} />
    <Box sx={{ flex: 1 }}>
      <Skeleton variant="text" width="60%" height={18} />
      <Skeleton variant="text" width="40%" height={14} sx={{ mt: 0.5 }} />
    </Box>
  </Box>
))}
```

### 9.2 AgentEditor Loading State

**Issue**: When an agent is selected but `agentDetail` hasn't loaded yet, there's no loading indicator. The editor shows the previous content briefly, then snaps to the new content when data arrives. This creates a jarring flash.

**Recommendation**: Add a loading skeleton or spinner:
```tsx
const { data: agentDetail, isLoading: detailLoading } = useAgentDetail(selectedAgent);

// In render:
{detailLoading ? (
  <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <CircularProgress size={24} />
  </Box>
) : (
  <CodeEditor ... />
)}
```

### 9.3 Error State (AgentsPage.tsx:109-117)

**Issue**: The error state is a plain `Alert` in a padded box. It doesn't match the page's two-panel layout and looks disconnected.

**Recommendation**: Show the error within the normal page layout:
```tsx
// Instead of early return, show error inline
<Box sx={{ display: "flex", gap: 2, minHeight: 500 }}>
  <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Alert severity="error" sx={{ maxWidth: 400 }}>
      Failed to load agents: {(error as Error).message}
    </Alert>
  </Box>
</Box>
```

---

## 10. Chip Height Inconsistency

Chip heights vary across the codebase with no consistent system:

| Location | Height | Context |
|----------|--------|---------|
| Theme default | `26px` | Global MuiChip override |
| AgentList model chip | `18px` | Inline sx |
| AgentEditor model chip | `20px` | Inline sx |
| AgentEditor color chip | `20px` | Inline sx |
| AgentImportDialog .md chip | `20px` | Inline sx |
| AgentImportDialog model chip | `18px` | Inline sx |
| TokenBadge | default (26px) | Uses theme |

**Recommendation**: Standardize on two sizes:
- **Small inline chip**: `height: 22px, fontSize: "0.7rem"` - for metadata within list items
- **Standard chip**: `height: 26px` (theme default) - for standalone chips, toolbar badges

Apply via a shared sx constant or a thin wrapper component:
```tsx
const chipSmall = { height: 22, fontSize: "0.7rem" } as const;
```

---

## 11. Accessibility Gaps

### 11.1 Missing ARIA Labels

- **AgentList filter**: The search `TextField` has a placeholder but no `aria-label`. Screen readers won't announce its purpose.
  ```tsx
  <TextField ... inputProps={{ "aria-label": "Filter agents" }} />
  ```

- **Template cards in AgentBuilder**: Cards use `CardActionArea` but have no `aria-label` describing the template selection action.
  ```tsx
  <CardActionArea onClick={...} aria-label={`Select ${tpl.label} template`}>
  ```

- **Folder browser rows in AgentImportDialog**: Clickable divs with no role or aria-label.
  ```tsx
  <Box role="button" aria-label={`Navigate to ${entry.name}`} tabIndex={0} onKeyDown={...} ...>
  ```

### 11.2 Keyboard Navigation

- **Folder browser**: Rows are clickable but not keyboard-focusable (no `tabIndex`, no `onKeyDown`).
- **Scan results**: Same issue with agent selection rows.

---

## Summary: Priority Actions

### P0 (Must fix - accessibility/readability)
1. Raise all font sizes to minimum `0.7rem` (11.2px)
2. Standardize chip heights to `22px` (small) / `26px` (standard)
3. Add ARIA labels to interactive elements

### P1 (Should fix - visual consistency)
4. Extract `MODEL_COLORS` to shared constant
5. Apply model color styling consistently in AgentImportDialog
6. Fix layout shift on AgentList selection (transparent border trick)
7. Disable card hover glow on structural panels
8. Fix dark mode semi-transparent background invisibility

### P2 (Nice to have - polish)
9. Enhance template cards with emoji background, hover shadow, selected background
10. Add save button loading spinner
11. Improve skeleton loading to match content shape
12. Add agent editor loading state
13. Show color chips with actual color swatches
14. Add transitions to hover/selection states
15. Anchor "Select This Folder" button to browser panel
16. Change delete button to subtle-by-default, red-on-hover

### P3 (Future consideration)
17. Reuse CodeEditor for AgentBuilder instructions
18. Add keyboard navigation to folder browser and scan results
19. Responsive template grid (2 cols on narrow)
20. Cap AgentList width on large screens
