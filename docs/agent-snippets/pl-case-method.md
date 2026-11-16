# P&L case method snippet

Canonical "P&L case method" block, copy-pasted verbatim (no preprocessor) into `agents/researcher.md` under `## P&L case method`. Change it here and in the carrier in the same commit; a parity row in `selftest-prompts.ts` pins the copy.

---

**P&L case method.** Work a money question the way a problem-solving case is solved: inputs first, then the model, then the recommendation. Run the eight steps in order, each sized to the ask.

1. **Frame.** State the objective, its counter-metric, whose P&L it is and the horizon. Reject a single-sided goal: "churn back to 1%" is met by reverting the change that saved the money.
2. **Identity.** Pick one identity, at the level the question is asked: revenue = customers × units × value per unit × take rate; cost = volume of activity × cost per unit of activity; funnel = top × ∏ stage rates; profit = revenue − cost, per cohort over time.
   - Cost at the event: put each cost on the event that causes it, never on a container such as a store or an account, and split fixed from marginal.
   - Funnel and cohort: for a funnel, ask whether one rate moved or the mix moved. For profit, show that a rate change lands small in this month's P&L and large in forward value per cohort.
3. **Data pack.** Build every input before modelling, climbing the source ladder below. Model nothing until each input has a value or a range.
4. **Segment split.** Split every average by segment before trusting it. Test any unlimited or bundled benefit for negative self-selection: it is worth buying only to the customers it loses money on (5 users at 20 trades can hide inside an average of 5.43).
5. **Gross vs net.** For every decision, state what it bought, what it cost and the net per month. A fraud rule that saved €0.9m but added €1.6m of support and €0.4m of lost interchange nets −€1.1m.
6. **Break-even and sensitivity.** Name the one assumption that flips the decision, and its break-even value.
7. **Recommendation.** Answer first, as a 60-second exec summary. Number the fixes `F1`, `F2`, …: at least one tactical (weeks) and one structural (quarters), each with its trade-off, money per month, counter-metric and kill signal.
8. **Self-check.** Run the self-check below against the finished model and fix what fails before writing.

**Source ladder.** Climb it in order, and go up a rung only for inputs the rungs below left open.

1. The study's own docs, the feature specs under `.claude/specs/`, the sibling repos the study or the project CLAUDE.md names, and the company brain (`search_evidence`, `entity`) when its tools are in session.
2. Any MCP connector already connected in session. An unauthorised connector counts as unavailable.
3. Web benchmarks.
4. The owner, last, only for what no rung answered.

A figure another study doc already holds is cited by that doc's id, never copied.

**Read-only database rule.** A linked project's own database may be queried only when its credentials are already in session. Run SELECT or find only, never a write. Read aggregates only, and copy no personal data into the doc. List each query in sources checked and tag its figures `[V]`.

**Tags.** Tag every input with one of four tags, and every model output with `[D]`. A number with no tag is forbidden.

- `[V]` verified: read from a linked project or a connector.
- `[S]` sourced: an external source, cited.
- `[A]` assumption: always given as a range `low–high`, never a point.
- `[ASK]` owner: only the owner can answer it.
- `[D]` derived: computed from tagged inputs.

The doc defines this legend itself. Other docs keep their own legends and are not re-tagged.

**Sources checked.** List every rung tried, one row each, with what it returned, including the rungs that returned nothing. Each `[ASK]` names the connector that would have answered it, ending with `— would be answered by: <connector>`, for example Google Analytics MCP, Stripe, Mixpanel, PostHog (read-only use), Xero, Amplitude or Similarweb.

**Self-check.** Answer each trap yes or no, with one line of evidence. Fix every yes before writing.

1. Revenue reported as profit? Revenue cannot be negative, so a negative "revenue" is a margin.
2. Unit sloppiness? Per user and per 100 users mixed, or a monthly figure read as yearly.
3. Total base size never asked? A rate with no base it applies to.
4. "What did the change buy" never asked? A cost cut with no count of what it gave up.
5. Container-driven cost? Cost put on a store or an account instead of the event that causes it.
6. Celebrating volume growth that grew a loss? More units at a negative unit margin.

**Match effort to the ask.** Scale the work to the question: pick one to three frameworks that answer it, and keep each step as short as the ask allows. A study with no money question records one line on why the method was skipped, and stops there.

**Attribution.** Ideas drawn on, no text vendored: anthropics/knowledge-work-plugins `variance-analysis` (Apache-2.0), mix-or-rate decomposition; anthropics/financial-services `unit-economics` (Apache-2.0), margin waterfall and cohort view; wshobson/agents `startup-business-analyst` (MIT), cohort revenue and cost structure; sruthir28/enterprise-ai-skills (MIT), the answer-first hypothesis and the test that kills it; yoichiojima-2/consultant (MIT), effort matched to the ask and break-even with sensitivity.
