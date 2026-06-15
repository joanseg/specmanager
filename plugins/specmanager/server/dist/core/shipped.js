import { DEFAULT_PHASE } from "./types.js";
/**
 * A feature is shipped when its *terminal* walkthrough is approved:
 *  - an approved walkthrough with phase `"final"` (the multi-phase roll-up), OR
 *  - a single-phase feature whose only phase's walkthrough is approved — no
 *    separate `"final"` roll-up is required (it would just re-link the one phase).
 *
 * Shared by `status.ts` (which fires `feature.shipped`) and `claude-md.ts` (which
 * renders the shipped badge), so the two signals can never drift — a load-bearing
 * invariant: shipped detection must match the event.
 */
export function isFeatureShipped(documents, phases) {
    const approvedWalkthroughs = documents.filter((d) => d.stage === "walkthrough" && d.status === "approved");
    if (approvedWalkthroughs.some((d) => d.phase === "final"))
        return true;
    if (phases.length === 1) {
        const only = phases[0].name;
        return approvedWalkthroughs.some((d) => (d.phase ?? DEFAULT_PHASE) === only);
    }
    return false;
}
//# sourceMappingURL=shipped.js.map