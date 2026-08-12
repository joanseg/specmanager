# Lossless carryover snippet

Shared prompt fragment currently duplicated verbatim, as the closing sentence of the longer "Density contract (lossless)" block, in `architect.md`, `planner.md`, `prd-writer.md`, and `walkthrough-writer.md`. The text below is the canonical source — it is also copy-pasted into each agent prompt (no preprocessor at install time, so the install ships the resolved text). If you change the fragment here, also update the four agent prompts.

Verified identical (byte-for-byte) across all four current call sites as of this task — `architect.md:65`, `planner.md:56`, `prd-writer.md:24`, `walkthrough-writer.md:77` — no drift found. The rest of that block ("Reference upstream docs by id...", "No throat-clearing, transitions, or restating what a section just said", the length-range justification) describes default Opus 5 behaviour, is not load-bearing, and is deleted rather than preserved when the four agents are trimmed to point at this fragment.

---

**Lossless carryover.** Every fact, number, constraint, decision, and open question from your inputs must survive into your output — merging duplicates is condensing; dropping information is a defect.
