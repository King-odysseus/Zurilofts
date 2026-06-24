# Session Workflow — MANDATORY (do NOT skip)

## MANDATORY session workflow

**START (do this FIRST):**
1. Sync brain from GitHub
2. Call MCP tool session_start with project_path and task — auto-claims project and delivers briefing.

**BEFORE EVERY CODING TASK:**
Call MCP tool brain_recall with a query relevant to what you're about to do.

**AFTER LEARNING:**
Call MCP tool brain_learn — bug fixes, decisions, gotchas, patterns.

**LEAVING UNFINISHED:**
Call MCP tool brain_handoff with status, next steps, and files.

**END:**
1. Commit and push code changes
2. Call session_end with a summary
3. Push brain to GitHub

## Key MCP tools
session_start, session_end, brain_recall, brain_learn, brain_handoff, active_list, urgent_list, wiki_status

## Rules
- One logical change per commit. Messages describe the change, never the agent.
- Never commit agent folders, secrets, or API keys.
- Every feature must work for any AI agent equally.
- Keep the brain clean — record only reusable knowledge.