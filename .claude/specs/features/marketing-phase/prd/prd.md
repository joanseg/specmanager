---
id: prd-marketing-phase-035
featureId: feat-marketing-phase
stage: prd
status: draft
stale: false
title: Marketing phase PRD
dependsOn: []
basedOn: {}
generatedBy: agent
version: 1
createdAt: '2026-08-03T16:04:34.067Z'
updatedAt: '2026-08-03T16:04:34.067Z'
---
## Problem

SpecManager drives features from idea to shipped code, but the lifecycle has no stage where the human and agent think about *how the feature reaches users*. Marketing considerations -- positioning, channels, competitive context, launch timing -- surface late (post-ship) or not at all. For internal/backend features, that is fine; for user-facing features on a new product, the absence of early marketing thinking means the feature ships without a go-to-market plan, and adoption depends on luck rather than intent.

A lightweight, optional marketing stage lets every feature carry a right-sized marketing plan, from a one-line changelog entry (backend tweak) to a full go-to-market strategy (new core feature on a new startup).

## Users & jobs-to-be-done

| User | Job |
|------|-----|
| Solo founder / indie hacker | Shape a feature with the market in mind *before* planning tasks, so positioning influences scope and priority. |
| Product manager | Get an actionable marketing plan proportional to the feature's user-facing weight, without context-switching to a separate tool. |
| Developer shipping internal tooling | Skip marketing entirely (stage is absent) or get an auto-generated changelog entry with zero overhead. |

## Goals

1. Add an optional "Marketing" lifecycle stage that sits alongside Design -- both optional, both between Architecture and Plan.
2. The marketing agent auto-assesses feature type from the PRD and calibrates output depth to one of three tiers (see High-level user flows).
3. If a marketing doc exists but is not approved, it gates Plan (same pattern as Design). If no marketing doc is created, the lifecycle proceeds as today.
4. The marketing document contains actionable tasks, not just strategy prose -- the human can use them as a checklist.
5. The stage integrates into the board UI, gate logic, CLAUDE.md sync, and staleness graph with no special-casing beyond the optional-stage pattern already established by Design.

## Non-goals

- **Executing marketing tasks** -- the stage produces a plan; it does not send emails, create social posts, or integrate with marketing platforms.
- **Replacing external marketing tools** -- this is a lightweight planning artifact, not a CRM or campaign manager.
- **Mandatory stage** -- the stage must never block features that don't opt in.
- **Design changes to the marketing document format** -- the architect decides structure; the PRD specifies *what* it contains, not *how*.

## Success metrics

| Metric | Target |
|--------|--------|
| Stage appears on the board as an optional column next to Design | Ship |
| Gate logic: Plan blocked when marketing doc exists but is unapproved; Plan open when no marketing doc exists | Ship |
| Marketing agent produces tier-appropriate output (lightweight / moderate / full) without human specifying the tier | Ship |
| Staleness graph correctly marks marketing doc stale when its upstream (PRD or Architecture) changes | Ship |
| Existing features with no marketing doc continue to work with zero behavioral change | Ship (regression gate) |

## Constraints & assumptions

| Type | Detail |
|------|--------|
| Structural precedent | Must follow the same optional-stage pattern as Design: stage enum extension, compound gate in `checkGate`, `OptionalCell` in the UI, command + agent pair. |
| Stage ordering | Marketing and Design are *peers* -- both optional, both between Architecture and Plan. Neither gates the other. The board renders them as adjacent columns. |
| Gate composition | Plan's gate becomes: Architecture approved AND (no Design doc OR Design approved) AND (no Marketing doc OR Marketing approved). |
| Document format | Markdown (like PRD, Architecture, Plan), not HTML (unlike Design briefs). Persisted via `create_document`, not `create_design_brief`. |
| Agent input | The marketing agent reads the approved PRD (required) and approved Architecture (if present). It does not require a Design doc. |
| Tier inference | The agent infers the feature's marketing weight from PRD content -- no new metadata field on the feature record. |
| Dependency direction | Marketing doc `dependsOn` the PRD doc (and Architecture doc if it exists), same as Design. |
| No new MCP tools | The existing `create_document`, `write_document`, `list_documents`, `read_document`, `check_gate`, `set_status` tools suffice once the stage enum is extended. |
| Backward compatibility | Adding "marketing" to the stage enum must not break existing features or documents. `list_documents` and all stage-filtered queries must accept the new value. |

**Assumption:** The Zod stage enum (`types.ts`), `STAGES` array (`paths.ts`), `PRIOR_STAGE` map, and `checkGate` compound logic (`dependencies.ts`) are the only server-side touchpoints for adding a stage. The UI's `priorStageApproved` helper and column rendering are the only client-side touchpoints. This assumption must be validated during Architecture.

## High-level user flows

### Flow 1: User creates a marketing plan (happy path)

1. User runs `/specmanager:specmanager-marketing` on a feature whose Architecture is approved.
2. Command calls `check_gate({ featureId, stage: "marketing" })` -- gate open (Architecture approved, no prior marketing doc).
3. Command spawns the `marketing-writer` agent.
4. Agent reads the approved PRD (and Architecture if present).
5. Agent assesses the feature's marketing weight and selects a tier:

| Tier | Trigger signals in PRD | Output scope |
|------|----------------------|--------------|
| **Lightweight** | Backend-only, internal tooling, infrastructure, no end-user-facing changes | Changelog entry template, internal announcement draft, ~1 page |
| **Moderate** | Enhancement to existing user-facing feature, incremental UX change | Positioning statement, target channels, timeline, launch checklist, ~2-3 pages |
| **Full** | New core feature, new product/startup context, competitive landscape mentioned | Digital footprint analysis, competitive positioning, capability assessment, channel strategy, phased launch plan with actionable tasks, ~4-6 pages |

6. Agent calls `create_document({ featureId, stage: "marketing", title, body, generatedBy: "agent" })`.
7. Command calls `sync_claude_md`.
8. Doc appears on the board in the Marketing column as a draft. User reviews, edits, approves.

### Flow 2: User skips marketing (default path)

1. User never runs `/specmanager:specmanager-marketing`.
2. No marketing doc is created.
3. User runs `/specmanager:specmanager-plan`. Plan's gate checks: Architecture approved? Yes. Design doc exists? No (or approved). Marketing doc exists? No. Gate open. Lifecycle proceeds normally.

### Flow 3: Marketing doc exists but is unapproved

1. User ran `/specmanager:specmanager-marketing`, a draft was created, but user has not approved it.
2. User runs `/specmanager:specmanager-plan`.
3. `check_gate({ featureId, stage: "plan" })` finds a marketing doc in draft status.
4. Gate returns `{ ok: false, reason: "marketing stage is not approved (marketing is optional -- delete the draft to skip)" }`.
5. User must approve or delete the marketing draft before Plan can proceed.

### Flow 4: Marketing doc becomes stale

1. User approves a marketing doc.
2. User later edits and re-approves the PRD.
3. Staleness graph detects that the marketing doc's upstream (`dependsOn` includes the PRD doc) has a newer version.
4. Marketing doc is flagged stale on the board. User reconciles or re-generates.

## Open questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Should the marketing agent have web-search access for competitive analysis in the Full tier, or should it work only from PRD content and user-supplied context? | Affects agent tool grants and accuracy of competitive sections. |
| 2 | Should the board render Marketing before or after Design in the column order, or should the two optional columns be interchangeable (no ordering between them)? | Affects `STAGES` array ordering and UI layout. Current assumption: adjacent peers, Marketing rendered after Design. |
| 3 | When both Design and Marketing docs exist, should Plan's `dependsOn` include both, or only Architecture? | Affects staleness propagation -- if Plan depends on Marketing, changing the marketing doc makes Plan stale. |
| 4 | Should the marketing agent accept an explicit tier override flag (e.g., `--tier full`) for cases where the auto-assessment under-scopes? | Low-cost escape hatch, but adds a parameter to the command. |
| 5 | For the Full tier, should the agent prompt the user for additional context (startup name, existing channels, budget) or infer everything from the PRD? | Affects whether the command is single-shot (subagent) or conversational (main session, like the interview command). |
