# Lossless carryover snippet

Canonical "Density contract (lossless)" block, copy-pasted verbatim (no preprocessor) into `agents/architect.md`, `agents/planner.md`, `agents/prd-writer.md`, `agents/researcher.md` and `agents/walkthrough-writer.md`. Change it here and in all five carriers in the same commit; INV-13 and INV-29 pin the density line's two sentences at all five; the "Survive means *reachable*" line follows it directly.

---

> **Density contract (lossless).** Reference upstream docs by id — never restate their content. Every fact, number, constraint, decision, and open question from your inputs must survive into your output — merging duplicates is condensing; dropping information is a defect.
> Survive means *reachable*: a fact already in an upstream doc survives by its id — don't copy it. Put each fact once, in the doc that owns it. Detail a reader doesn't need to decide goes under the details section at the end — never out of the doc.
