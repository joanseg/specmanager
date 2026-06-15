// R2 — route a task's Fibonacci complexity to a tier to a Claude Code model
// alias. Pure, no persistence: selection is per-session (the build command holds
// the active table and passes the resolved alias at each Task dispatch). Tiers
// map to ALIASES (haiku/sonnet/opus), never pinned dated ids, so a model version
// change in a tier is automatic and add/remove is a config edit.
/** Default complexity → tier (R2/AC1). >3 / null / unknown ⇒ strong. */
export const DEFAULT_COMPLEXITY_TO_TIER = {
    1: "cheap",
    2: "standard",
    3: "strong",
};
/** Default tier → Claude Code alias (R2/AC2). */
export const DEFAULT_TIER_TO_ALIAS = {
    cheap: "haiku",
    standard: "sonnet",
    strong: "opus",
};
/** Sentinel for "no model override" — the parent omits `model:` ⇒ `inherit` (AC4). */
export const INHERIT = "inherit";
/** Map a task's complexity to a tier. >3, null, or unknown ⇒ strong. */
export function tierForComplexity(complexity) {
    if (complexity == null)
        return "strong";
    return DEFAULT_COMPLEXITY_TO_TIER[complexity] ?? "strong";
}
/**
 * Resolve a tier to a Claude Code alias, honoring a per-session override table.
 * Unknown tier ⇒ graceful default `inherit` (AC4: never error/block).
 */
export function aliasForTier(tier, sessionTable = {}) {
    return sessionTable[tier] ?? DEFAULT_TIER_TO_ALIAS[tier] ?? INHERIT;
}
/** Convenience: complexity → alias in one hop (default or session-overridden). */
export function aliasForComplexity(complexity, sessionTable = {}) {
    return aliasForTier(tierForComplexity(complexity), sessionTable);
}
//# sourceMappingURL=tiers.js.map