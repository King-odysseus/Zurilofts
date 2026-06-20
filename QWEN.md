# Session Workflow — MANDATORY (do NOT skip)

This file is auto-read by Qwen Code at session start (QWEN.md + AGENTS.md as fallback).

## MANDATORY session workflow

**START (do this FIRST):**
1. Sync brain from GitHub
2. Call MCP tool `session_start` with `project_path` and `task` — auto-claims project and delivers briefing.

**BEFORE EVERY CODING TASK:**
Call MCP tool `brain_recall` with a query relevant to what you're about to do. Past agents already discovered bugs and gotchas.

**AFTER LEARNING:**
Call MCP tool `brain_learn` — bug fixes, decisions, gotchas, patterns. Feed it back.

**LEAVING UNFINISHED:**
Call MCP tool `brain_handoff` with status, next steps, and files.

**END OF SESSION:**
1. Commit and push code changes
2. Call `session_end` with a summary
3. Push brain to GitHub

## Key MCP tools

| Tool | When |
|------|------|
| `session_start` | Session start |
| `session_end` | Session end |
| `brain_recall` | Before every task |
| `brain_learn` | After discovering something |
| `brain_handoff` | Leaving unfinished work |
| `active_list` | Check for other agents before editing |
| `urgent_list` | Check for active blocks |

## Rules

- One logical change per commit. Messages describe the change, never the agent.
- Never commit agent folders (.qwen, .claude, etc.), secrets, or API keys.
- Every feature must work for any AI agent equally. No Qwen-only logic.
- Keep the brain clean — record only reusable knowledge.
