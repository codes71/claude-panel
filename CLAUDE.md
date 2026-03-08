Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
- use serena and superclaude mcp to load whenever somthing become complex

### 2. Subagent Strategy
- Use agent teams liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to all the separate agents and gain knowlege from them
- For complex problems, throw more compute at it via subagents
- One main task per agent created, the created plan should specify all of this task for these agents of team

### 3. Self-Improvement Loop
- After ANY correction from the user: update `.claude/tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
- write to this file whenever the app archtecture or user preference changes. 

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Local Development & npm Package

- Project is globally linked via `npm link` — typing `claude-panel` launches the app
- Backend Python changes reflect immediately (symlink, not copy)
- Frontend React changes require rebuild: `npm run build:frontend`
- Quick refresh workflow: `npm run build:frontend && claude-panel`
- Default port: `8787` (configurable via `--port` or `CLAUDE_PANEL_PORT` env var)

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections