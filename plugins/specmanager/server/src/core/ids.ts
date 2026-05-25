export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "feature";
}

export function featureId(slug: string): string {
  return `feat-${slug}`;
}

export function docId(stage: string, slug: string, n: number): string {
  const prefix: Record<string, string> = {
    prd: "prd",
    architecture: "arch",
    plan: "plan",
    walkthrough: "wt",
  };
  const p = prefix[stage] ?? stage;
  return `${p}-${slug}-${String(n).padStart(3, "0")}`;
}

export function taskId(n: number): string {
  return `task-${String(n).padStart(3, "0")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
