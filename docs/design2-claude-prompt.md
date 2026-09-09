# Claude assignment: shared foundation and guest implementation

Implement phases 0-2 of `design2.md` in the ZuriLofts repository. This is an implementation request: complete the assigned work, not another plan. Read `AGENTS.md`, `Instruct.md`, `design2.md`, the current source and the actual local preview PNGs before editing.

The user explicitly wants the former colours preserved: bronze `#C49A6C` primary actions (hover `#B8895C`, white text), navy `#0B0B45` strong secondary actions, neutral outlined secondary actions, and blue `#2563EB` links/selected states/focus. Blue buttons in the boards become bronze; do not recolour blue interaction indicators. Keep the existing logo. Leave `DESIGN.md` and `design2.md` unchanged.

Preview location: `C:/Users/Mega-Mind/Documents/ZuriLofts Design Preview/START-HERE.html`. The adjacent PNGs and PAGE-INDEX.md are visual references. `design2.md` resolves layout/navigation ambiguities and defines intentional differences from those images. If the files are unavailable, identify the missing reference rather than claiming visual fidelity without seeing it.

Own all Claude routes in section 6, shared primitives/styles/theme, guest navigation/mobile bottom tabs and guest router integration. Implement G1-G6: compact working discovery, property cards/detail composition, real date/guest search state, three-stage checkout with extras inside Details, trips/history, saved/shortlists, exploration/guides, split auth, account/verification, messages/support/issues, recovery and legal layouts. Follow the detailed acceptance requirements rather than merely restyling existing screens. Preserve routes and real behaviour; do not fabricate fees, inventory, states or API results.

Work sequentially through the phases with meaningful checks. Keep shared components compatible with host/admin consumers, but leave host/admin page redesign to the next assignment. In particular, the default Hero export is not the current homepage, and Admin-prefixed components can serve host routes. Check references before removing code. No dependencies without approval. Make only narrowly necessary API changes for your assigned working controls and test them.

This assignment runs before Codex's. Check active work and git status; preserve other people's edits. Do not start another implementation agent against the same files. Follow project commit/push rules, using logical commits containing only your changes; do not deploy or exercise production payments/moderation to test the UI.

Use a functioning local/test backend and permitted test accounts where available. Apply section 8: real browser screenshots at the specified sizes, populated and alternate states, keyboard/mobile checks and behavioural validation. A build or login redirect does not prove fidelity. Keep secrets/private documents out of artifacts. If an environment or API limitation blocks a criterion, document it explicitly, complete independent work and report a partial handoff.

Create `docs/design2-implementation-status.md`: one row per registered route, filling guest results and leaving host/admin rows pending for Codex. Include before/after screenshot links, tested states, exact checks/results, commits, shared component contracts and precise remaining gaps. Store image artifacts outside the repository by default. Do not mark requirements done without evidence.

Finish with the committed/pushed phase 0-2 result, the report path, checks and screenshot locations, and a concise handoff explaining what Codex must implement in phases 3-5. The user will request a separate independent audit afterward.
