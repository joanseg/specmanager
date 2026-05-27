# Design grounding snippet

Shared prompt fragment referenced inline by `architect.md`, `planner.md`, and `builder.md`. The text below is the canonical source — it is also copy-pasted into each agent prompt (no preprocessor at install time, so the install ships the resolved text). If you change the fragment here, also update the three agent prompts.

---

**Design grounding (if present).** Before writing your output, call `list_documents({ featureId, stage: "design" })`. If a design brief exists, `read_document` it and ground your decisions in it — reference the HTML brief's screens, components, and tokens by name. If the brief is `approved`, treat it as authoritative; if it's `draft`, treat it as input but flag any apparent contradictions in your **Open questions**. If no design doc exists for this feature, proceed as before (design is optional).
