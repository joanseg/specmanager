# Lossless carryover snippet

Shared prompt fragment duplicated verbatim, as the "Density contract (lossless)" block, in `architect.md`, `planner.md`, `prd-writer.md`, and `walkthrough-writer.md`. The text below is the canonical source — it is also copy-pasted into each agent prompt (no preprocessor at install time, so the install ships the resolved text). If you change the fragment here, also update the four agent prompts.

Verified identical (byte-for-byte) across all four current call sites as of this task — `architect.md:65`, `planner.md:56`, `prd-writer.md:24`, `walkthrough-writer.md:77` — no drift found. The block was originally five sentences; "Prefer tables/lists where the content is structured", "No throat-clearing, transitions, or restating what a section just said", and the length-range justification describe default Opus 5 behaviour, are not load-bearing, and were deleted (`task-020`). Two sentences survive because both are load-bearing with no other statement site: the lossless-carryover rule, and `INV-29` — the token-budget rule that upstream docs are referenced by id, never restated.

---

> **Density contract (lossless).** Reference upstream docs by id — never restate their content. Every fact, number, constraint, decision, and open question from your inputs must survive into your output — merging duplicates is condensing; dropping information is a defect.
