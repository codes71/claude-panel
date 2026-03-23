# Agents Page - UX Architecture Review

**Reviewer**: ArchitectUX Agent
**Date**: 2026-03-22
**Scope**: `frontend/src/pages/AgentsPage.tsx` and all `agents/*` subcomponents

---

## 1. Layout Architecture (Master-Detail)

### Current State

The Agents page uses a classic master-detail split: a 30%-width `AgentList` card on the left, a flex-1 `AgentEditor` card on the right, with a fixed `minHeight: 500` on the container.

```
+--------------------------------------------+
| [Import] [+ New Agent]                     |
+----------+---------------------------------+
| AgentList | AgentEditor                    |
| (30%)     | (flex: 1)                      |
|           |                                |
| [Search]  | [emoji] Title [rename] [chips] |
| [Agent 1] | description / vibe             |
| [Agent 2] | +----------------------------+ |
| [Agent 3] | | CodeEditor                 | |
|           | | (Token) [Preview] [Save] [X]| |
|           | |                            | |
|           | | <textarea>                 | |
|           | +----------------------------+ |
+----------+---------------------------------+
```

### Issues Found

1. **Fixed width ratio (`width: "30%"`)** - The list panel does not resize or collapse. On narrow viewports (< 900px), the 30% list becomes too cramped for the search field and agent metadata (emoji + name + model chip + description are squeezed into ~260px min-width).

2. **`minHeight: 500` is a magic number** - Does not adapt to viewport height. On tall screens, the editor area has dead space below. On short screens, content can overflow without visual indication.

3. **No collapsible sidebar** - Users cannot expand the editor to full width when focused on writing. The list is always visible even when not needed.

4. **No responsive breakpoint** - Below tablet width, the side-by-side layout breaks. There is no stacking behavior defined.

### Recommendations

**R1.1 - Resizable split pane**: Add a draggable divider between list and editor, or at minimum a collapse/expand toggle on the list panel. This mirrors IDE conventions users are familiar with.

```
+---+--------------------------------------+
| < | [emoji] Title  [Preview] [Save] [X]  |
|   | description                          |
|   | +----------------------------------+ |
|   | | Full-width editor                | |
|   | +----------------------------------+ |
+---+--------------------------------------+
     ^ collapse toggle
```

**R1.2 - Viewport-aware height**: Replace `minHeight: 500` with `height: calc(100vh - <header-height>)` or use a flex container that fills available viewport space.

**R1.3 - Mobile stack layout**: At `< 768px`, switch to a stacked layout where tapping an agent in the list navigates to a full-screen editor view with a back button.

```
Mobile (< 768px):
+---------------------------+    +---------------------------+
| [Search]                  |    | [<- Back]  Agent Name     |
| [Agent 1]                 | -> | [Preview] [Save] [Delete] |
| [Agent 2]                 |    | +---------------------+   |
| [Agent 3]                 |    | | Full-width editor   |   |
| [+ New] [Import]          |    | +---------------------+   |
+---------------------------+    +---------------------------+
```

---

## 2. Component Composition

### Current State

```
AgentsPage (orchestrator)
  +-- AgentList (list panel)
  +-- AgentEditor (detail panel)
  +-- AgentBuilder (create dialog)
  +-- AgentImportDialog (import dialog)
  +-- DeleteAgentDialog (confirmation)
  +-- RenameAgentDialog (rename form)
  +-- Snackbar (toast)
```

### Issues Found

1. **AgentsPage is a "god orchestrator"** - It owns 6 pieces of state (`selectedAgent`, `filter`, `createOpen`, `importOpen`, `deleteOpen`, `renameOpen`), 4 mutation handlers, a toast system, and renders 7 children. This is manageable now but fragile as features grow.

2. **`MODEL_COLORS` is duplicated** - Defined identically in both `AgentList.tsx:19-23` and `AgentEditor.tsx:17-21`. This will drift.

3. **`VALID_NAME_RE` is duplicated** - Defined in both `AgentBuilder.tsx:22` and `AgentDialogs.tsx:13`.

4. **AgentBuilder has 224 lines of template data inline** - The `TEMPLATES` array (lines 35-224) is a large data constant mixed into the component file, making the component harder to scan.

5. **No barrel export** - No `agents/index.ts` file exists, so the parent imports each subcomponent individually.

### Recommendations

**R2.1 - Extract shared constants**: Create `agents/constants.ts` for `MODEL_COLORS`, `VALID_NAME_RE`, and `TEMPLATES`. Single source of truth.

**R2.2 - Extract templates to data file**: Move `TEMPLATES` array to `agents/templates.ts`. This separates content from rendering logic and makes templates easier to maintain or extend (e.g., loading from API later).

**R2.3 - Extract toast logic**: Create a reusable `useToast` hook (or use a context) to eliminate the toast state + Snackbar boilerplate that's duplicated between `AgentsPage` and `CommandsPage`.

**R2.4 - Add barrel export**: Create `agents/index.ts` to simplify imports in the parent page.

---

## 3. State Management

### Current State

- `selectedAgent` is a `string | null` (agent name)
- `AgentEditor` fetches detail via `useAgentDetail(selectedAgent)` independently
- `AgentList` receives pre-filtered agents from parent
- All dialog open/close states live in `AgentsPage`
- Mutations use `onSuccess`/`onError` callbacks inline

### Issues Found

1. **Stale content after rename**: When renaming an agent, `setSelectedAgent(newName)` is called on success (line 100). However, the `useAgentDetail` query key changes from `["agent", oldName]` to `["agent", newName]`, triggering a refetch. During this window, `agentDetail?.content` is briefly undefined, which causes `content` state in the editor to potentially flash empty before the new fetch resolves.

2. **Content state is local in AgentEditor** - `content` is initialized from `agentDetail.content` via `useEffect` (lines 44-48). If the user edits content, then selects a different agent and comes back, the local state may briefly show stale content from the previous edit before the new `agentDetail` arrives.

3. **No dirty state tracking** - If a user modifies content and clicks a different agent, changes are silently lost. There's no "unsaved changes" warning.

4. **No optimistic updates** - Save operations wait for server round-trip before showing success. For a file-based backend, optimistic updates would feel snappier.

5. **`selectedInfo` lookup is O(n) on every render** - `agents.find(a => a.name === selectedAgent)` at line 45. Negligible for small lists but indicates missing memoization.

### Recommendations

**R3.1 - Dirty state guard**: Track whether content has been modified. Show a confirmation dialog or visual indicator when switching agents with unsaved changes.

```
+----------------------------------+
| Unsaved Changes                  |
| You have unsaved edits to        |
| "code-reviewer". Discard?        |
|                                  |
|     [Discard]  [Save & Switch]   |
+----------------------------------+
```

**R3.2 - Optimistic save**: Use React Query's `onMutate` to optimistically update the cache, with rollback on error. The backend is local filesystem, so failures are rare and the perceived speed improvement is meaningful.

**R3.3 - Stabilize rename flow**: After rename, set the query data for the new key from the old key's cache before invalidating, to prevent the content flash.

---

## 4. Navigation and Discovery

### Current State

- Simple text filter field in `AgentList`
- Filters by `name`, `display_name`, and `description`
- No sort options
- No category/grouping mechanism
- No keyboard navigation between list items

### Issues Found

1. **No sort control** - Agents appear in whatever order the API returns them. Users can't sort by name, model, token count, or recently modified.

2. **No category/tag grouping** - The `color` field exists but isn't used for filtering. Users with 20+ agents have a flat list with only text search.

3. **Description truncation is aggressive** - `maxWidth: 140` on description text (AgentList line 178) clips most descriptions to 2-3 words, making them almost useless for discovery.

4. **No agent count indicator** - Users can't see "12 agents" or "3 of 12 matching" at a glance.

### Recommendations

**R4.1 - Add sort dropdown**: Allow sorting by name (A-Z, Z-A), model, token estimate, and (if available) modified date.

**R4.2 - Add model filter chips**: Quick-filter chips above the list for `opus`, `sonnet`, `haiku` that toggle filtering by model.

```
+---------------------------+
| [Search agents...]        |
| [opus] [sonnet] [haiku]   |  <-- toggle chips
| 3 of 12 agents            |  <-- count
+---------------------------+
| [Agent 1]                 |
| [Agent 2]                 |
| [Agent 3]                 |
+---------------------------+
```

**R4.3 - Widen description display**: Either use a second line for description (removing `whiteSpace: nowrap`) or increase `maxWidth` to fill available space dynamically.

---

## 5. Builder Flow (AgentBuilder)

### Current State

Single-page dialog with three sections: Template Picker, Identity fields, and Instructions textarea. All in one scrollable dialog.

### Issues Found

1. **No template preview** - Clicking a template fills in the fields, but users can't see what the template's instructions look like before committing. The instructions section is at the bottom and requires scrolling.

2. **Template selection resets fields** - Calling `applyTemplate()` overwrites all fields. If a user picked a template, customized the name/description, then accidentally clicks another template, their customizations are lost without warning.

3. **No step indicator** - The flow has a natural 3-step progression (pick template -> configure identity -> write instructions) but presents everything simultaneously, which can be overwhelming for first-time users.

4. **Instructions textarea is raw markdown** - No syntax highlighting, no structured sections, no preview. The AgentBuilder uses a plain `TextField` (line 480) while the AgentEditor uses the full `CodeEditor` component with preview toggle. This inconsistency means the create experience is worse than the edit experience.

5. **3-column template grid doesn't scale** - Fixed `gridTemplateColumns: "repeat(3, 1fr)"` breaks on narrow dialogs. With 6 templates, it fits in 2 rows, but if templates grow to 9-12, the grid becomes unwieldy.

6. **Color field is free-text** - Users type color names like "blue", "red" but there's no validation, color swatch preview, or dropdown of valid options. This leads to inconsistency.

### Recommendations

**R5.1 - Template preview panel**: When hovering/selecting a template, show a preview of the generated instructions beside or below the template grid.

```
+---------------------------+----------------------------+
| Template Grid             | Preview                    |
| [x] Code Reviewer         | # Code Reviewer Agent     |
| [ ] Software Architect    | You are **Code Reviewer**, |
| [ ] DevOps Engineer       | an expert who provides...  |
| [ ] Technical Writer      |                            |
| [ ] Security Engineer     | ## Your Core Mission       |
| [ ] Start from Scratch    | 1. **Correctness** --...  |
+---------------------------+----------------------------+
```

**R5.2 - Protect user edits**: When switching templates, if the user has modified any field, show a confirmation: "Switching templates will overwrite your changes. Continue?"

**R5.3 - Use CodeEditor in builder**: Replace the raw `TextField` for instructions with the same `CodeEditor` component used in the editor, providing preview toggle and consistent editing experience.

**R5.4 - Color picker dropdown**: Replace free-text color input with a dropdown/swatch picker showing the valid color options.

---

## 6. Import Flow (AgentImportDialog)

### Current State

Two-phase dialog: browse folders -> scan and select agents. Breadcrumb navigation with home/up buttons and inline path editing.

### Issues Found

1. **No recent folders** - Every import session starts from home directory. Users who import from the same folder repeatedly must navigate there each time.

2. **No search within browser** - The folder list can be long; there's no way to filter directories.

3. **Browse uses mutation, not query** - `useBrowseDirectory()` is a mutation (POST), which means browse results aren't cached. Navigating back to a previously visited folder re-fetches from the server.

4. **`entries` stored in local state** - Browse results (`entries`, `currentPath`, `parentPath`) are managed as local state rather than leveraging React Query's cache. This means no stale-while-revalidate behavior.

5. **Path input loses focus on blur** - `onBlur={() => setShowPathInput(false)}` (line 217) hides the input field on blur. If the user clicks outside accidentally while typing a path, their input is lost.

6. **No drag-and-drop** - Users can't drag a folder from their file manager onto the dialog.

### Recommendations

**R6.1 - Recent folders**: Store the last 5 import paths in localStorage and show them as quick-access links at the top of the browser.

```
+---------------------------------+
| Recent:                         |
| ~/.claude-t/agents              |
| ~/Projects/team-agents          |
+---------------------------------+
| [Home] [Up]                     |
| / home / code / .claude-t       |
| ...                             |
```

**R6.2 - Convert browse to query**: Use `useQuery` with the path as the query key instead of `useMutation`. This enables caching, back-navigation without refetch, and stale-while-revalidate.

**R6.3 - Debounced path input**: Instead of hiding the path input on blur, keep it visible and navigate on Enter. Show the breadcrumbs as a clickable overlay above the input.

---

## 7. Editor Experience (AgentEditor)

### Current State

- `CodeEditor` component with edit/preview toggle
- Preview is raw `pre`-formatted text (no markdown rendering)
- Token badge shows estimated token count
- Ctrl+S keyboard shortcut for save
- Delete button in toolbar

### Issues Found

1. **Preview is not rendered markdown** - The preview mode (CodeEditor lines 78-95) displays raw text with `whiteSpace: "pre-wrap"` and monospace font. It does NOT render markdown headings, bold, lists, or code blocks. This makes preview almost useless for agents, whose content is heavily markdown-formatted.

2. **No frontmatter visualization** - Agent content starts with YAML frontmatter (`---\nname: ...\n---`). In both edit and preview modes, the frontmatter is shown as raw text. It would be more useful to parse and display it as structured metadata, or at minimum hide it from the preview.

3. **No line numbers** - The editor textarea has no line numbers, making it harder to reference specific sections during pair programming or review.

4. **No search within editor** - For long agent definitions (500+ lines), there's no Ctrl+F equivalent within the editor.

5. **Ctrl+S is global** - The `handleKeyDown` listener is on `document` (CodeEditor line 37), meaning Ctrl+S fires even when the user is typing in other fields or dialogs. This could trigger unexpected saves.

### Recommendations

**R7.1 - Rendered markdown preview**: Use a markdown renderer (e.g., `react-markdown` or `marked`) in preview mode. This dramatically improves the preview experience for agent content which is markdown by design.

```
Preview mode (current):       Preview mode (proposed):
+------------------------+    +------------------------+
| # Code Reviewer Agent  |    | Code Reviewer Agent    |
|                        |    | ==================     |
| You are **Code         |    | You are Code Reviewer, |
| Reviewer**, an expert  |    | an expert who provides |
| who provides...        |    | thorough, constructive |
| ## Your Core Mission   |    | code reviews...        |
| 1. **Correctness**     |    |                        |
|    -- Does the code... |    | Your Core Mission      |
+------------------------+    | ------------------     |
                              | 1. Correctness - Does  |
                              |    the code...         |
                              +------------------------+
```

**R7.2 - Structured frontmatter editor**: Parse the YAML frontmatter and render it as editable form fields (name, description, emoji, color, model, vibe) above the markdown body. This gives users a structured editing experience for metadata while keeping the body as free-form markdown.

```
+-----------------------------------------------+
| [emoji] Agent Name       [model: sonnet v]     |
| Description: Expert code reviewer who provides |
| Vibe: Reviews code like a mentor, not a gate.. |
| Color: [purple]                                |
+-----------------------------------------------+
| [Tokens: 2.4k] [Preview] [Save] [Delete]      |
+-----------------------------------------------+
| # Code Reviewer Agent                          |
|                                                |
| You are **Code Reviewer**...                   |
+-----------------------------------------------+
```

**R7.3 - Scope Ctrl+S listener**: Attach the keydown listener to the editor's container element (ref-based), not `document`. This prevents accidental saves when focus is elsewhere.

---

## 8. Keyboard Accessibility

### Current State

- List items are MUI `ListItemButton` (focusable, clickable)
- Dialogs use MUI `Dialog` (focus trap, Escape to close)
- Ctrl+S for save
- No other keyboard shortcuts

### Issues Found

1. **No arrow-key navigation in agent list** - Users can Tab through list items but cannot use Up/Down arrows to move between agents, which is the expected pattern for list navigation.

2. **No keyboard shortcut to create** - No Ctrl+N or equivalent to open the builder dialog.

3. **No Escape to deselect** - Pressing Escape in the editor doesn't deselect the current agent or collapse panels.

4. **Delete button has no keyboard shortcut** - Delete requires mouse click on the small icon button.

5. **Template cards in builder aren't keyboard-navigable** - `CardActionArea` provides click handling but the 3-column grid doesn't support arrow-key navigation between template options.

### Recommendations

**R8.1 - Arrow key list navigation**: Implement `onKeyDown` handler on the list that moves selection with Up/Down arrows and opens the editor with Enter.

**R8.2 - Keyboard shortcut legend**: Add a `?` shortcut that shows available keyboard shortcuts:
- `Ctrl+S` - Save
- `Ctrl+N` - New agent
- `Ctrl+I` - Import
- `Up/Down` - Navigate list
- `Escape` - Deselect / close dialog

---

## 9. Mobile/Responsive Behavior

### Current State

No responsive breakpoints are defined. The layout is entirely percentage-based (`width: "30%"`) with a fixed `minWidth: 260`.

### Issues Found

1. **Layout breaks below ~800px** - The 30%/70% split becomes unusable. The list panel at 260px minimum pushes the editor off-screen or into extreme compression.

2. **Template grid is fixed 3-column** - On mobile, the `repeat(3, 1fr)` grid produces tiny, unreadable template cards.

3. **Builder dialog is not mobile-friendly** - The `maxWidth="md"` dialog with its complex form layout overflows on phones.

4. **Agent metadata wraps poorly** - The editor header (emoji + name + rename button + model chip + color chip) wraps into multiple lines on narrow screens with no clear hierarchy.

5. **Touch targets are small** - Font sizes like `0.55rem` (8.8px) and chip heights of 18px are below the 44px minimum recommended for touch targets.

### Recommendations

**R9.1 - Define breakpoints**: Implement three layout modes:
- **Desktop (>= 1024px)**: Current side-by-side layout
- **Tablet (768-1023px)**: Narrower list (25%), larger editor
- **Mobile (< 768px)**: Stacked list/detail with navigation

**R9.2 - Template grid responsive columns**: Use `gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))"` instead of fixed 3 columns.

**R9.3 - Increase touch targets**: Minimum 36px height for chips and interactive elements, minimum 0.75rem for readable text.

---

## 10. Performance Concerns

### Current State

- `useAgents()` fetches the full agent list on mount
- `useAgentDetail(name)` fetches individual agent content on selection
- No virtualization in the list
- No debouncing on the filter input

### Issues Found

1. **No list virtualization** - For users with 50+ agents, the full list renders all DOM nodes. This isn't critical for typical use (5-20 agents) but will degrade with scale.

2. **Filter input isn't debounced** - Every keystroke triggers a re-render with the new filter value. For small lists this is fine, but the pattern doesn't scale.

3. **`selectedInfo` recomputes on every render** - The `.find()` at AgentsPage line 45 runs on every render, including when unrelated state changes (dialog opens, toast changes). Should be wrapped in `useMemo`.

4. **CodeEditor re-mounts on agent switch** - When `selectedAgent` changes, the entire `CodeEditor` tree unmounts and remounts because the parent conditional (`!selectedInfo ? ... : ...`) toggles the branch. A `key` prop on the editor tied to the agent name would be clearer.

5. **Ctrl+S listener adds/removes on every render** - The `useEffect` in CodeEditor depends on `handleKeyDown`, which depends on `onSave`, which is a new closure on every AgentEditor render. This causes the listener to be removed and re-added on every render cycle.

### Recommendations

**R10.1 - Memoize selectedInfo**: Wrap in `useMemo` with `[agents, selectedAgent]` dependency.

**R10.2 - Stabilize Ctrl+S handler**: Use a ref-based pattern for the save callback to avoid re-registering the event listener:

```tsx
const onSaveRef = useRef(onSave);
onSaveRef.current = onSave;

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      onSaveRef.current();
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, []); // stable - never re-registers
```

**R10.3 - Debounce filter** (optional): Add 150ms debounce on filter input for future-proofing, though current performance is likely fine for typical agent counts.

---

## Priority Matrix

| # | Recommendation | Impact | Effort | Priority |
|---|---------------|--------|--------|----------|
| R3.1 | Dirty state guard (unsaved changes) | HIGH | Medium | **P0** |
| R7.1 | Rendered markdown preview | HIGH | Low | **P0** |
| R2.1 | Extract shared constants | Medium | Low | **P1** |
| R7.3 | Scope Ctrl+S listener | Medium | Low | **P1** |
| R10.2 | Stabilize Ctrl+S handler | Medium | Low | **P1** |
| R5.3 | Use CodeEditor in builder | Medium | Low | **P1** |
| R4.1 | Sort dropdown | Medium | Medium | **P1** |
| R4.2 | Model filter chips | Medium | Medium | **P1** |
| R1.3 | Mobile stack layout | HIGH | High | **P2** |
| R5.1 | Template preview panel | Medium | Medium | **P2** |
| R7.2 | Structured frontmatter editor | HIGH | High | **P2** |
| R6.1 | Recent folders | Medium | Low | **P2** |
| R6.2 | Convert browse to query | Medium | Medium | **P2** |
| R1.1 | Resizable split pane | Medium | High | **P3** |
| R8.1 | Arrow key list navigation | Low | Medium | **P3** |
| R8.2 | Keyboard shortcut legend | Low | Medium | **P3** |
| R10.1 | Memoize selectedInfo | Low | Low | **P3** |

---

## Comparison with CommandsPage

The `AgentsPage` and `CommandsPage` share nearly identical architecture patterns:
- Same master-detail layout
- Same toast pattern
- Same dialog management (create/delete/rename open states)
- Same mutation handler structure

This confirms that extracting shared patterns (toast hook, layout shell, dialog management) would benefit both pages and reduce maintenance burden across the project.

---

**ArchitectUX Agent**
**Review Date**: 2026-03-22
**Status**: Initial review complete - awaiting team prioritization
