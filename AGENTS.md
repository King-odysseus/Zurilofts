# Cognitive1 — Agent Session Workflow

This file is auto-read by coding agents at session start (AGENTS.md is the cross-tool standard).

## Session Checklist

**START:** Sync brain, then call `session_start` with your `project_path` and `task` — auto-claims project and delivers briefing with rules, warnings, and brain knowledge.

**BEFORE EVERY TASK:** Call `brain_recall "topic"` — past agents already found the bugs, gotchas, and decisions you need. Also `active_list` to avoid colliding with another agent.

**AFTER LEARNING:** Call `brain_learn` — bugs found, decisions made, gotchas discovered, patterns reused. Feed it back.

**LEAVING UNFINISHED:** Call `brain_handoff` with status, next steps, and files.

**END:** Commit + push, `session_end "summary"`, push brain.

## Rules

1. One logical change per commit. Messages describe the change, never the agent.
2. Never commit agent folders, secrets, or API keys.
3. Every feature must work for any AI agent equally. No vendor-specific code.
4. Before deleting code, grep to verify nothing references it.
5. Don't add dependencies without asking.
6. Keep the brain clean — record only reusable knowledge. Git log already records commits.
