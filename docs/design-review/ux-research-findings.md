# Agents Page UX Research Findings

**Researcher**: UX Researcher Agent
**Date**: 2026-03-22
**Scope**: Agents page — create, import, edit, find, delete, rename flows
**Method**: Heuristic evaluation against Nielsen's 10 usability heuristics, WCAG 2.1 AA, and cognitive walkthrough of primary user journeys

---

## Research Overview

### Primary User Journeys Analyzed
1. **First visit** — empty state, orientation, first agent creation
2. **Create agent** — template selection, form completion, save
3. **Import agents** — folder browsing, scan, selection, import
4. **Find & select agent** — filtering, scanning list, identifying agents
5. **Edit agent** — reading content, modifying, saving
6. **Manage agent** — rename, delete

### Key Findings Summary
1. **Empty state provides no onboarding** — new users see "No agents found" with no guidance on next steps
2. **AgentBuilder is cognitively overloaded** — 8 form fields + template picker + instructions editor in a single scrolling dialog
3. **List panel truncates critical information** — descriptions capped at 140px, font sizes as small as 0.55rem
4. **No unsaved-changes protection** — users can navigate away from edited content without warning
5. **Import dialog requires excessive clicks** — multi-step folder browsing with no shortcut for known paths
6. **Accessibility gaps throughout** — missing ARIA labels, tiny touch targets, insufficient color contrast

---

## Prioritized Findings

### P0 — Critical (Fix immediately)

#### P0-1: No unsaved-changes guard on navigation
**File**: `AgentsPage.tsx:34`, `AgentEditor.tsx:40-48`
**Heuristic**: Error prevention (H5)
**Issue**: Users can click a different agent in the list or navigate to another page while the CodeEditor has unsaved changes. All edits are silently discarded. There is no dirty-state tracking (`content !== agentDetail?.content`) and no confirmation dialog.
**Impact**: Data loss — the most severe usability failure.
**Recommendation**: Track dirty state by comparing `content` to `agentDetail?.content`. Show a confirmation dialog ("You have unsaved changes. Discard?") when `selectedAgent` changes or on route navigation. Use `beforeunload` for browser tab close.

#### P0-2: Keyboard trap in CodeEditor
**File**: `CodeEditor.tsx:97-117`
**Heuristic**: Accessibility (WCAG 2.1.2 — No Keyboard Trap)
**Issue**: The `<TextField multiline>` captures Tab key for indentation but provides no escape mechanism. Keyboard-only users cannot Tab out of the editor to reach the Save button or other controls.
**Recommendation**: Add Escape-to-blur behavior, or use a standard code editor component (Monaco, CodeMirror) that has built-in accessibility patterns. At minimum, add `aria-label="Agent instructions editor"` to the TextField.

#### P0-3: Ctrl+S fires globally even when editor is not focused
**File**: `CodeEditor.tsx:26-39`
**Heuristic**: Error prevention (H5)
**Issue**: The `keydown` listener is attached to `document`, meaning Ctrl+S triggers a save even when the user is typing in a completely different field (e.g., the filter input in AgentList). This can cause unexpected saves of stale content.
**Recommendation**: Scope the listener to the CodeEditor container element using a ref, or check `document.activeElement` is within the editor before firing.

---

### P1 — High Priority (Next sprint)

#### P1-1: Empty state lacks onboarding guidance
**File**: `AgentList.tsx:100-107`
**Heuristic**: Help and documentation (H10), Recognition over recall (H6)
**Issue**: When no agents exist, users see a robot icon and "No agents found" — no explanation of what agents are, why they'd want one, or how to create one. The "New Agent" and "Import" buttons are far away in the top-right corner.
**Recommendation**: Replace the empty state with an onboarding card containing:
- A brief explanation: "Agents are reusable personas for Claude Code..."
- A prominent "Create your first agent" CTA button
- A secondary "Import from folder" link
- Optionally, 2-3 template cards as quick-start options

#### P1-2: AgentBuilder dialog is too long and cognitively dense
**File**: `AgentBuilder.tsx:313-512`
**Heuristic**: Aesthetic and minimalist design (H8), Recognition over recall (H6)
**Issue**: The create dialog contains: 6 template cards + 7 form fields + a model selector + a large instructions textarea — all in a single vertical scroll. Users must hold multiple decisions in working memory simultaneously (template choice, naming conventions, frontmatter fields, and markdown instructions).
**Recommendation**: Convert to a stepped wizard (stepper):
1. **Step 1 — Choose template** (template cards only)
2. **Step 2 — Identity** (name, display name, emoji, color, description, vibe)
3. **Step 3 — Configure & Write** (model selector + instructions editor)

This reduces cognitive load per step and lets users focus on one decision at a time.

#### P1-3: Agent description truncated to 140px in list
**File**: `AgentList.tsx:173-183`
**Heuristic**: Visibility of system status (H1)
**Issue**: Agent descriptions are truncated with `maxWidth: 140` and `fontSize: 0.55rem` (approximately 8.8px). At this size, text is illegible on most displays and the truncation hides the primary differentiator between agents.
**Recommendation**:
- Increase font size to at least `0.7rem` (11.2px) to meet WCAG 1.4.4 minimum
- Remove the hard `maxWidth: 140` — let the description use available width
- Consider a 2-line clamp (`-webkit-line-clamp: 2`) instead of single-line truncation

#### P1-4: Model chip font size 0.55rem is below accessibility minimums
**File**: `AgentList.tsx:155-167`
**Heuristic**: Accessibility (WCAG 1.4.4 — Resize Text)
**Issue**: Model chips use `fontSize: 0.55rem` (~8.8px). WCAG requires text to be resizable up to 200% without loss of content. At 8.8px base, even 200% zoom yields only 17.6px. Additionally, the color-on-alpha-background chip styling may not meet 4.5:1 contrast ratio.
**Recommendation**: Increase to minimum `0.65rem`, verify contrast ratios for all MODEL_COLORS against their alpha backgrounds.

#### P1-5: Duplicate MODEL_COLORS constant
**File**: `AgentList.tsx:19-23`, `AgentEditor.tsx:17-21`
**Heuristic**: Consistency and standards (H4)
**Issue**: `MODEL_COLORS` is defined identically in both files. If a new model is added, both files need updating — a maintenance bug waiting to happen.
**Recommendation**: Extract to a shared constants file (e.g., `constants/agents.ts`) and import in both components.

#### P1-6: Delete button is visually de-emphasized and positioned as an afterthought
**File**: `AgentEditor.tsx:173-180`
**Heuristic**: Error prevention (H5), Visibility (H1)
**Issue**: The delete button is rendered as `extraToolbar` in the CodeEditor, placing it inline with Save/Preview. A destructive action should not be adjacent to a constructive action (save). The icon-only button has no visible label — just a tooltip on hover.
**Recommendation**: Move the delete action to a dropdown menu ("..." more actions) that also includes Rename, or separate it visually from the save controls with a divider/spacer. Add visible text label "Delete" next to the icon for clarity.

---

### P2 — Medium Priority (Backlog)

#### P2-1: Import dialog requires navigating from root every time
**File**: `AgentImportDialog.tsx:66-70`
**Heuristic**: Flexibility and efficiency of use (H7)
**Issue**: The import dialog always starts browsing from the home directory (`""`). Users who repeatedly import from the same location (e.g., `~/.claude-t/agents/`) must navigate there every time.
**Recommendation**:
- Remember the last-used import path (localStorage or backend setting)
- Add a "Recent folders" section at the top
- Make the path input more prominent so power users can type/paste a path directly instead of clicking through folders

#### P2-2: No search/filter in AgentBuilder template picker
**File**: `AgentBuilder.tsx:319-373`
**Heuristic**: Flexibility and efficiency of use (H7)
**Issue**: Currently 6 templates in a 3-column grid. As templates grow, this will not scale. There's no way to filter or search templates.
**Recommendation**: This is acceptable at 6 templates. Plan ahead: when template count exceeds ~9, add a search/filter input or categorization.

#### P2-3: Rename dialog doesn't show current filename for reference
**File**: `AgentDialogs.tsx:68-135`
**Heuristic**: Recognition over recall (H6)
**Issue**: The rename dialog opens with the current name pre-filled in the input, but doesn't display the current name as a separate reference label. Users editing the field lose sight of the original name.
**Recommendation**: Add a "Current name: `{initialName}`" label above the input field.

#### P2-4: Agent list has no sorting options
**File**: `AgentList.tsx:42-50`
**Heuristic**: Flexibility and efficiency of use (H7)
**Issue**: Agents can be filtered by name/description but not sorted. Users with many agents may want to sort by model, name alphabetically, creation date, or token count.
**Recommendation**: Add a sort dropdown (Name A-Z, Model, Size/Tokens) next to the filter input.

#### P2-5: Preview mode renders plain text, not markdown
**File**: `CodeEditor.tsx:78-95`
**Heuristic**: Match between system and real world (H2)
**Issue**: The "Preview" button suggests markdown rendering, but it just renders raw text in a monospace `pre-wrap` block. Agent instructions are written in markdown, so users expect rendered output.
**Recommendation**: Use a markdown renderer (e.g., `react-markdown`) in preview mode to show headings, bold, lists, and code blocks as they would appear.

#### P2-6: No keyboard shortcut hints
**File**: `CodeEditor.tsx:57-73`
**Heuristic**: Help and documentation (H10)
**Issue**: Ctrl+S is supported but not communicated anywhere in the UI. The Save button shows no keyboard shortcut hint.
**Recommendation**: Add a tooltip or small hint text to the Save button: "Save (Ctrl+S)".

#### P2-7: Import dialog "Overwrite existing" switch lacks explanation
**File**: `AgentImportDialog.tsx:403-416`
**Heuristic**: Help users recognize, diagnose, recover from errors (H9)
**Issue**: The "Overwrite existing" toggle has no explanatory text. Users may not know what happens to existing agents with the same name — will they be backed up? Merged? Replaced entirely?
**Recommendation**: Add helper text: "Replace agents that already exist with the same filename. A backup will be created."

#### P2-8: Agent list card uses fixed width percentage
**File**: `AgentList.tsx:53-60`
**Heuristic**: Flexibility and efficiency of use (H7)
**Issue**: The list panel uses `width: "30%"` with `minWidth: 260`. On narrow screens (< 900px), the 30% panel plus the editor panel creates a cramped layout. On very wide screens (> 1920px), the 30% becomes excessively wide.
**Recommendation**: Use a responsive layout — collapse to a full-width list on mobile with a back-to-list navigation, or use a `maxWidth` cap (e.g., 360px).

---

### P3 — Low Priority (Nice to have)

#### P3-1: Template card selection has no visual feedback beyond border color
**File**: `AgentBuilder.tsx:334-339`
**Issue**: Selected template gets a blue border, but there's no checkmark, animation, or other affordance. The `transition: "border-color 0.15s"` is subtle.
**Recommendation**: Add a small checkmark overlay or background tint on the selected template card.

#### P3-2: No drag-and-drop reordering of agents
**File**: `AgentList.tsx`
**Issue**: Users who want to organize agents by priority or usage frequency cannot reorder the list.
**Recommendation**: Consider drag-and-drop reordering or pinning favorites — lower priority, only if users request it.

#### P3-3: Color field is a free-text input
**File**: `AgentBuilder.tsx:432-437`
**Issue**: The "Color" field accepts arbitrary text ("blue, red, purple...") but there's no validation or preview. Users don't know which colors are valid.
**Recommendation**: Replace with a color picker or predefined color palette dropdown showing available options.

#### P3-4: No bulk operations
**File**: `AgentsPage.tsx`
**Issue**: Users cannot select multiple agents for bulk delete, export, or model change. Single-agent-at-a-time management becomes tedious at scale.
**Recommendation**: Add multi-select checkboxes in the agent list with a bulk action toolbar. Consider this when agent count commonly exceeds 15-20.

#### P3-5: Agent editor has no line numbers
**File**: `CodeEditor.tsx:97-117`
**Issue**: The multiline TextField doesn't show line numbers, making it harder to reference specific sections of agent instructions during review.
**Recommendation**: Consider using Monaco or CodeMirror for the editor, which provides line numbers, syntax highlighting for markdown, and proper keyboard handling (also addresses P0-2).

#### P3-6: Emoji field has no picker
**File**: `AgentBuilder.tsx:425-430`
**Issue**: The emoji field is a plain text input. Users must know how to input emoji via OS keyboard shortcuts or copy-paste.
**Recommendation**: Add an emoji picker button next to the input field.

---

## Accessibility Audit Summary (WCAG 2.1 AA)

| Criterion | Status | Location | Issue |
|-----------|--------|----------|-------|
| 1.3.1 Info & Relationships | Fail | `AgentList.tsx:109` | List items lack `role="option"` or `aria-selected` |
| 1.4.3 Contrast (Minimum) | Warning | `AgentList.tsx:155-167` | Model chip color on alpha bg may fail 4.5:1 |
| 1.4.4 Resize Text | Fail | `AgentList.tsx:155,174` | 0.55rem (8.8px) font size |
| 2.1.1 Keyboard | Fail | `CodeEditor.tsx:97` | Tab trap in multiline TextField |
| 2.1.2 No Keyboard Trap | Fail | `CodeEditor.tsx:97` | No escape from textarea |
| 2.4.6 Headings & Labels | Warning | `AgentEditor.tsx:100-107` | Rename icon button relies on title, not aria-label |
| 2.4.7 Focus Visible | Pass | — | MUI default focus rings present |
| 3.3.1 Error Identification | Warning | `AgentBuilder.tsx:272-278` | Name validation error shown but not programmatically associated via `aria-describedby` |
| 4.1.2 Name, Role, Value | Fail | `AgentList.tsx:63-78` | Filter input has no `aria-label` (only `placeholder`) |

---

## Cognitive Load Analysis

### AgentBuilder Dialog (Current State)
- **Decisions required**: Template (6 options) + Filename + Display Name + Description + Emoji + Color + Vibe + Model (4 options) + Instructions = **~15 decision points**
- **Working memory load**: HIGH (7+2 chunks — exceeds Miller's Law)
- **Time to completion (estimated)**: 3-8 minutes for a new user

### AgentBuilder Dialog (With Wizard)
- **Step 1**: 1 decision (template)
- **Step 2**: 6 decisions (pre-filled from template)
- **Step 3**: 2 decisions (model + instructions review)
- **Working memory load per step**: LOW-MEDIUM (3-6 chunks)
- **Time to completion (estimated)**: 2-5 minutes, with reduced cognitive strain

---

## User Journey Friction Map

```
CREATE AGENT:
  Click "New Agent" -----> Template picker (OK)
                     -----> Scroll to form fields (FRICTION: form too long)
                     -----> Fill 7+ fields (FRICTION: cognitive overload)
                     -----> Scroll to instructions (FRICTION: lost context)
                     -----> Click Create (OK)
                     -----> Auto-selects agent (GOOD)

IMPORT AGENTS:
  Click "Import" --------> Browse from home (FRICTION: always starts at root)
                     -----> Click through folders (FRICTION: many clicks)
                     -----> "Select This Folder" (OK)
                     -----> Review scanned agents (GOOD: checkbox UI)
                     -----> Click Import (OK)

EDIT AGENT:
  Click agent in list ----> Content loads (OK)
                     -----> Edit in textarea (FRICTION: no line numbers)
                     -----> Ctrl+S or click Save (GOOD: keyboard shortcut)
                     -----> Click different agent (DANGER: unsaved changes lost)

FIND AGENT:
  Type in filter ---------> Results filter (GOOD: instant)
                     -----> Scan descriptions (FRICTION: 8.8px text, 140px truncation)
                     -----> Click to select (OK)
```

---

## Recommendations Summary

| Priority | Count | Theme |
|----------|-------|-------|
| P0 | 3 | Data loss prevention, keyboard accessibility, error prevention |
| P1 | 6 | Onboarding, cognitive load, readability, visual design |
| P2 | 8 | Efficiency, flexibility, progressive disclosure |
| P3 | 6 | Polish, power features, delight |

### Quick Wins (< 1 hour each)
1. Add dirty-state tracking + confirmation dialog (P0-1)
2. Add `aria-label` to filter input (accessibility table)
3. Increase font sizes from 0.55rem to 0.65rem+ (P1-3, P1-4)
4. Extract `MODEL_COLORS` to shared file (P1-5)
5. Add Ctrl+S hint to Save button tooltip (P2-6)
6. Add helper text to "Overwrite existing" switch (P2-7)

### Larger Investments
1. Wizard-based AgentBuilder (P1-2) — ~4-6 hours
2. Markdown preview rendering (P2-5) — ~2-3 hours
3. Monaco/CodeMirror editor (P3-5 + P0-2) — ~4-6 hours
4. Responsive layout for mobile (P2-8) — ~3-4 hours

---

**Next Steps**: Validate P0 findings with real user observation. Implement P0 fixes immediately, then tackle P1 items in the next development cycle.
