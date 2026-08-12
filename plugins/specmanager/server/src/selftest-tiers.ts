// R2 smoke test — complexity → tier → alias mapping (core/tiers.ts).
//
// Usage: node dist/selftest-tiers.js

import {
  tierForComplexity,
  aliasForTier,
  aliasForComplexity,
  DEFAULT_TIER_TO_ALIAS,
  INHERIT,
} from "./core/index.js";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`ok — ${msg}`);
}

async function main(): Promise<void> {
  // 1. Default complexity → tier.
  assert(tierForComplexity(1) === "cheap", "complexity 1 → cheap");
  assert(tierForComplexity(2) === "standard", "complexity 2 → standard");
  assert(tierForComplexity(3) === "strong", "complexity 3 → strong");

  // 2. >3 / null / undefined → strong (graceful default).
  assert(tierForComplexity(5) === "strong", "complexity 5 (>3) → strong");
  assert(tierForComplexity(13) === "strong", "complexity 13 → strong");
  assert(tierForComplexity(null) === "strong", "null complexity → strong");
  assert(tierForComplexity(undefined) === "strong", "undefined complexity → strong");

  // 3. Default tier → alias (aliases, never dated ids).
  assert(aliasForTier("cheap") === "sonnet", "cheap → sonnet (Q1: Haiku 4.5's 200K context cap)");
  assert(aliasForTier("standard") === "sonnet", "standard → sonnet");
  assert(aliasForTier("strong") === "opus", "strong → opus");
  assert(
    Object.values(DEFAULT_TIER_TO_ALIAS).every((a) => !/\d{4}-\d{2}-\d{2}/.test(a)),
    "default aliases carry no dated ids"
  );

  // 4. Session-table override wins over defaults.
  const session = { cheap: "sonnet", strong: "opus" };
  assert(aliasForTier("cheap", session) === "sonnet", "session override remaps cheap → sonnet");
  assert(aliasForTier("standard", session) === "sonnet", "unset session tier falls back to default");

  // 5. One-hop complexity → alias.
  assert(aliasForComplexity(1) === "sonnet", "complexity 1 → sonnet (one hop)");
  assert(aliasForComplexity(3) === "opus", "complexity 3 → opus (one hop)");
  assert(aliasForComplexity(2, session) === "sonnet", "complexity 2 with session table → sonnet");

  // 6. Unknown tier → INHERIT (graceful default, never throws).
  assert(aliasForTier("mystery" as never) === INHERIT, "unknown tier → inherit");

  console.log("\nAll R2 tier assertions passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
