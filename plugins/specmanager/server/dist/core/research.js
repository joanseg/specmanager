import fs from "node:fs/promises";
import path from "node:path";
import { ResearchDocFrontmatterSchema, StudySchema, } from "./types.js";
import { projectRoot, researchDir, studyDir, studyDocsDir, studyNotesDir } from "./paths.js";
import { nowIso, slugify } from "./ids.js";
import { createFeature, ensureSpecsRoot, listFeatures, uniqueSlug } from "./features.js";
import { indexHeadings } from "./spec-slice.js";
import { events } from "./events.js";
import { readDoc, writeDoc } from "./frontmatter.js";
import { DESIGN_BRIEF_MAX_BYTES, sanitizeDesignBriefBody } from "./documents.js";
/** Study id for a research slug. */
export function studyId(slug) {
    return `study-${slug}`;
}
function studyFile(slug, root) {
    return path.join(studyDir(slug, root), "study.json");
}
/** Create `research/<slug>/study.json` and an empty `notes/` (notes are tracked in git). */
export async function createStudy(input, root = projectRoot()) {
    await ensureSpecsRoot(root);
    await fs.mkdir(researchDir(root), { recursive: true });
    const slug = await uniqueSlug(slugify(input.title), researchDir(root));
    await fs.mkdir(studyNotesDir(slug, root), { recursive: true });
    const study = StudySchema.parse({
        id: studyId(slug),
        slug,
        title: input.title,
        idea: input.idea,
        createdAt: nowIso(),
    });
    await fs.writeFile(studyFile(slug, root), JSON.stringify(study, null, 2), "utf8");
    events.emit({ type: "study.created", studyId: study.id });
    return study;
}
/** All studies, oldest first; a malformed study.json is skipped with a stderr warning. */
export async function listStudies(root = projectRoot()) {
    const slugs = await fs.readdir(researchDir(root)).catch(() => []);
    const studies = [];
    for (const slug of slugs) {
        const file = studyFile(slug, root);
        const raw = await fs.readFile(file, "utf8").catch(() => null);
        if (raw === null)
            continue;
        try {
            studies.push(StudySchema.parse(JSON.parse(raw)));
        }
        catch (err) {
            console.error(`specmanager: skipping malformed ${file}: ${err.message}`);
        }
    }
    studies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return studies;
}
/** Read one study by slug. */
export async function readStudy(slug, root = projectRoot()) {
    const raw = await fs.readFile(studyFile(slug, root), "utf8");
    return StudySchema.parse(JSON.parse(raw));
}
const KIND_ID_PREFIX = {
    brief: "brief",
    market: "market",
    "user-research": "ur",
    marketing: "mktg",
    strategy: "strategy",
};
const KIND_FILENAME = {
    brief: "brief.md",
    market: "market-research.md",
    "user-research": "user-research.md",
    marketing: "marketing-plan.md",
    strategy: "strategy.md",
};
/** Pre-docs studies keep their wireframes in `concepts.html` (id `concepts-<slug>`), read as a `doc`. */
const LEGACY_CONCEPTS_FILENAME = "concepts.html";
/** Deterministic research doc id for a single kind: one doc per kind per study. */
export function researchDocId(kind, slug) {
    return `${KIND_ID_PREFIX[kind]}-${slug}`;
}
/** Research doc id for a `doc`: `doc-<study-slug>-<doc-slug>`. */
export function studyDocId(studySlug, docSlug) {
    return `doc-${studySlug}-${docSlug}`;
}
function slugOfStudyId(id) {
    if (!id.startsWith("study-"))
        throw new Error(`not a study id: ${id}`);
    return id.slice("study-".length);
}
/** Doc bodies are HTML: defang `---` lines and enforce the design-brief size cap. */
function prepareBody(kind, body) {
    if (kind !== "doc")
        return body;
    const bytes = Buffer.byteLength(body, "utf8");
    if (bytes > DESIGN_BRIEF_MAX_BYTES) {
        throw new Error(`doc body is ${bytes} bytes — cap is ${DESIGN_BRIEF_MAX_BYTES}. Refer to large images by repo-relative path instead of inlining them.`);
    }
    return sanitizeDesignBriefBody(body);
}
/** Reject `dependsOn` / `basedOn` ids that are not among the study's listed doc ids. */
function assertSameStudy(slug, studyDocs, dependsOn, basedOn) {
    const own = new Set(studyDocs.map((d) => d.frontmatter.id));
    const foreign = [...dependsOn, ...Object.keys(basedOn)].filter((id) => !own.has(id));
    if (foreign.length > 0) {
        throw new Error(`cross-study reference rejected: ${foreign.join(", ")} not in study-${slug}`);
    }
}
function assertFindingsKind(kind, findings) {
    if (findings !== undefined && kind !== "user-research") {
        throw new Error(`findings is only valid on user-research docs (got kind "${kind}")`);
    }
}
/** Study doc files in listing order: single kinds, legacy `concepts.html`, then `docs/*.html` by doc slug. */
async function studyDocFiles(slug, root) {
    const dir = studyDir(slug, root);
    const single = [...Object.values(KIND_FILENAME), LEGACY_CONCEPTS_FILENAME].map((n) => path.join(dir, n));
    const docsDir = studyDocsDir(slug, root);
    const htmls = (await fs.readdir(docsDir).catch(() => []))
        .filter((f) => f.endsWith(".html"))
        .map((f) => f.slice(0, -".html".length))
        .sort()
        .map((docSlug) => path.join(docsDir, `${docSlug}.html`));
    return [...single, ...htmls];
}
/** All research docs of one study; a malformed doc is skipped with a stderr warning. */
export async function listResearchDocs(studyId, root = projectRoot()) {
    const slug = slugOfStudyId(studyId);
    const docs = [];
    for (const file of await studyDocFiles(slug, root)) {
        try {
            docs.push(await readDoc(file, ResearchDocFrontmatterSchema));
        }
        catch (err) {
            if (err.code === "ENOENT")
                continue;
            console.error(`specmanager: skipping malformed ${file}: ${err.message}`);
        }
    }
    return docs;
}
/** Find a research doc by id across all studies. */
export async function readResearchDocById(id, root = projectRoot()) {
    for (const study of await listStudies(root)) {
        const hit = (await listResearchDocs(study.id, root)).find((d) => d.frontmatter.id === id);
        if (hit)
            return hit;
    }
    throw new Error(`research doc not found: ${id}`);
}
/** Path and id for a new `doc`: requires `docType`; the id must be new project-wide. */
async function newDocTarget(study, docType, root) {
    if (!docType)
        throw new Error("docType is required on doc");
    const dir = studyDocsDir(study.slug, root);
    const docSlug = await uniqueSlug(slugify(docType), dir, ".html");
    const id = studyDocId(study.slug, docSlug);
    const taken = await readResearchDocById(id, root).then(() => true, () => false);
    if (taken)
        throw new Error(`research doc id ${id} already exists in another study`);
    await fs.mkdir(dir, { recursive: true });
    return { filePath: path.join(dir, `${docSlug}.html`), id };
}
/** Path and id for a single-kind doc; fails if the study already has one. */
async function newSingleTarget(study, kind, root) {
    const filePath = path.join(studyDir(study.slug, root), KIND_FILENAME[kind]);
    const exists = await fs.stat(filePath).then(() => true, () => false);
    if (exists) {
        throw new Error(`a ${kind} doc already exists for ${study.id} — use write_research_doc`);
    }
    return { filePath, id: researchDocId(kind, study.slug) };
}
/** Create a research doc: a new `doc` under `docs/`, or the study's single doc of `kind`. */
export async function createResearchDoc(input, root = projectRoot()) {
    const state = await readStudyState(input.studyId, root);
    const study = state.study;
    const dependsOn = input.dependsOn ?? [];
    const basedOn = input.basedOn ?? {};
    assertSameStudy(study.slug, state.docs, dependsOn, basedOn);
    assertFindingsKind(input.kind, input.findings);
    if (input.docType !== undefined && input.kind !== "doc") {
        throw new Error(`docType is only valid on doc (got kind "${input.kind}")`);
    }
    const gate = gateForKind(input.kind, state);
    if (!gate.ok)
        throw new Error(`gate closed for ${input.kind} on ${study.id}: ${gate.reason}`);
    const { filePath, id } = input.kind === "doc"
        ? await newDocTarget(study, input.docType, root)
        : await newSingleTarget(study, input.kind, root);
    const body = prepareBody(input.kind, input.body ?? "");
    const now = nowIso();
    const frontmatter = ResearchDocFrontmatterSchema.parse({
        id,
        studyId: study.id,
        kind: input.kind,
        title: input.title,
        dependsOn,
        basedOn,
        generatedBy: input.generatedBy ?? "human",
        version: 1,
        ...(input.findings !== undefined ? { findings: input.findings } : {}),
        ...(input.kind === "doc" ? { docType: input.docType } : {}),
        createdAt: now,
        updatedAt: now,
    });
    await writeDoc(filePath, frontmatter, body, ResearchDocFrontmatterSchema);
    events.emit({ type: "research.created", documentId: frontmatter.id, studyId: study.id });
    return { frontmatter, body, filePath };
}
/** Update a research doc in place, bumping `version`; `baseVersion` mismatch is a conflict. */
export async function writeResearchDoc(input, root = projectRoot()) {
    const current = await readResearchDocById(input.id, root);
    const fm = current.frontmatter;
    if (typeof input.baseVersion === "number" && input.baseVersion !== fm.version) {
        throw new Error(`version conflict: doc ${input.id} is at v${fm.version}, write expected v${input.baseVersion}`);
    }
    const dependsOn = input.dependsOn ?? fm.dependsOn;
    const basedOn = input.basedOn ?? fm.basedOn;
    const studyDocs = await listResearchDocs(fm.studyId, root);
    assertSameStudy(slugOfStudyId(fm.studyId), studyDocs, dependsOn, basedOn);
    assertFindingsKind(fm.kind, input.findings);
    const updated = ResearchDocFrontmatterSchema.parse({
        ...fm,
        title: input.title ?? fm.title,
        generatedBy: input.generatedBy ?? fm.generatedBy,
        dependsOn,
        basedOn,
        ...(input.findings !== undefined ? { findings: input.findings } : {}),
        version: fm.version + 1,
        updatedAt: nowIso(),
    });
    const body = input.body !== undefined ? prepareBody(fm.kind, input.body) : current.body;
    await writeDoc(current.filePath, updated, body, ResearchDocFrontmatterSchema);
    events.emit({
        type: "research.updated",
        documentId: updated.id,
        studyId: updated.studyId,
        version: updated.version,
    });
    return { frontmatter: updated, body, filePath: current.filePath };
}
/** Step order shared by the step rail and `nextResearchStep`; the brief is not a step. */
export const RESEARCH_STEPS = [
    "market",
    "docs",
    "user-research",
    "marketing",
    "findings",
    "strategy",
    "handoff",
];
const BUILD_ITEM_RE = /^\s*\d+\.\s+\[(S\d+)\]\s+(.*)$/;
/** Parse one `1. [S<n>] **<title>** — <rationale>` line; null when it has no `S<n>` id. */
function parseBuildLine(line) {
    const m = line.match(BUILD_ITEM_RE);
    if (!m)
        return null;
    const rest = m[2].trim();
    const dash = rest.indexOf(" — ");
    const head = dash >= 0 ? rest.slice(0, dash) : rest;
    const rationale = dash >= 0 ? rest.slice(dash + 3).trim() : "";
    const bold = head.match(/\*\*(.+?)\*\*/);
    return { itemId: m[1], title: (bold ? bold[1] : head).trim(), rationale };
}
/** Build items from the strategy body's `## What to build` ordered list, ranked by position. */
export function parseBuildList(body) {
    const headings = indexHeadings(body);
    const i = headings.findIndex((h) => h.slug === "what-to-build");
    if (i < 0)
        return [];
    const next = headings.slice(i + 1).find((h) => h.level <= headings[i].level);
    const section = body.slice(headings[i].start, next ? next.start : body.length);
    const items = [];
    for (const line of section.split("\n")) {
        const item = parseBuildLine(line);
        if (item)
            items.push({ rank: items.length + 1, ...item });
    }
    return items;
}
/** `dependsOn` ids whose current version is ahead of the version recorded in `basedOn`. */
export function outdatedUpstreams(doc, studyDocs) {
    const { dependsOn, basedOn } = doc.frontmatter;
    return dependsOn.filter((id) => {
        const upstream = studyDocs.find((d) => d.frontmatter.id === id);
        return upstream !== undefined && upstream.frontmatter.version > (basedOn[id] ?? 0);
    });
}
const NOTE_EXTENSIONS = new Set([".md", ".txt", ".pdf"]);
/** Note files (`.md`/`.txt`/`.pdf`) in the study's `notes/` not yet listed in user-research `findings`. */
export async function newNotes(study, studyDocs, root = projectRoot()) {
    const ur = studyDocs.find((d) => d.frontmatter.kind === "user-research");
    const ingested = new Set(ur?.frontmatter.findings ?? []);
    const files = await fs.readdir(studyNotesDir(study.slug, root)).catch(() => []);
    return files
        .filter((f) => NOTE_EXTENSIONS.has(path.extname(f).toLowerCase()) && !ingested.has(f))
        .sort();
}
/** Read a study's docs, notes, build list and handed-off feature ids. */
export async function readStudyState(studyId, root = projectRoot()) {
    const study = await readStudy(slugOfStudyId(studyId), root);
    const docs = await listResearchDocs(study.id, root);
    const strategy = docs.find((d) => d.frontmatter.kind === "strategy");
    const features = await listFeatures(root);
    const handoffs = features
        .filter((f) => f.origin?.studyId === study.id)
        .map((f) => ({ itemId: f.origin.itemId, featureId: f.id, slug: f.slug }));
    return {
        study,
        docs,
        newNotes: await newNotes(study, docs, root),
        buildList: strategy ? parseBuildList(strategy.body) : [],
        handedOff: handoffs.map((h) => h.featureId),
        handoffs,
    };
}
/** Gate for one step against an already-read study state. */
function gateFor(step, state) {
    const doc = (kind) => state.docs.find((d) => d.frontmatter.kind === kind);
    switch (step) {
        case "market":
            return { ok: true };
        case "docs":
        case "user-research":
        case "marketing":
            return doc("market") ? { ok: true } : { ok: false, reason: "needs market research first" };
        case "findings":
            return doc("user-research")
                ? { ok: true }
                : { ok: false, reason: "needs the user-research plan first" };
        case "strategy":
            return (doc("user-research")?.frontmatter.findings?.length ?? 0) > 0
                ? { ok: true }
                : { ok: false, reason: "needs user-research findings first" };
        case "handoff":
            if (!doc("strategy"))
                return { ok: false, reason: "needs strategy first" };
            return state.buildList.length > 0 ? { ok: true } : { ok: false, reason: "no build items" };
    }
}
/** Gate for creating a doc of `kind` (or the handoff); the brief is always open. */
function gateForKind(kind, state) {
    if (kind === "brief")
        return { ok: true };
    return gateFor(kind === "doc" ? "docs" : kind, state);
}
/** Core ordering gate called by `createResearchDoc` and the handoff. */
export async function checkResearchStep(studyId, step, root = projectRoot()) {
    return gateForKind(step, await readStudyState(studyId, root));
}
/** The docs a doc-producing step writes (`docs` → every `doc`); empty for findings and handoff. */
function stepDocs(step, state) {
    if (step === "findings" || step === "handoff")
        return [];
    const kind = step === "docs" ? "doc" : step;
    return state.docs.filter((d) => d.frontmatter.kind === kind);
}
/** Whether a step's work exists (flags aside). */
function isDone(step, state) {
    if (step === "handoff")
        return state.handedOff.length > 0;
    if (step === "findings") {
        const ur = state.docs.find((d) => d.frontmatter.kind === "user-research");
        return (ur?.frontmatter.findings?.length ?? 0) > 0 && state.newNotes.length === 0;
    }
    return stepDocs(step, state).length > 0;
}
/** Flag reason for a done step whose docs are behind their upstreams, or null. */
function flagReason(step, state) {
    const behind = stepDocs(step, state)
        .map((d) => ({ id: d.frontmatter.id, ups: outdatedUpstreams(d, state.docs) }))
        .filter((b) => b.ups.length > 0);
    if (behind.length === 0)
        return null;
    if (step !== "docs")
        return `behind ${behind[0].ups.join(", ")}`;
    return behind.map((b) => `${b.id} behind ${b.ups.join(", ")}`).join("; ");
}
/**
 * Per-step rail state. The first unfinished step is `next` (or `locked` when its gate is
 * closed); later unfinished steps are `open` or `locked`; a done doc behind its upstreams is `flag`.
 */
export function researchSteps(state) {
    let nextTaken = false;
    return RESEARCH_STEPS.map((step) => {
        if (isDone(step, state)) {
            const reason = flagReason(step, state);
            return reason ? { step, state: "flag", reason } : { step, state: "done" };
        }
        const gate = gateFor(step, state);
        const first = !nextTaken;
        nextTaken = true;
        if (!gate.ok)
            return { step, state: "locked", reason: gate.reason };
        return { step, state: first ? "next" : "open" };
    });
}
/** First unfinished step in rail order, or null when every step is done; derived from `researchSteps`. */
export function nextResearchStep(steps) {
    return steps.find((s) => s.state !== "done" && s.state !== "flag")?.step ?? null;
}
/**
 * Create one Builder feature per requested build item, recording `origin` on `feature.json`.
 * Idempotent per `(origin.studyId, origin.itemId)`: an item already handed off is skipped.
 */
export async function handoffStudyItems(input, root = projectRoot()) {
    const state = await readStudyState(input.studyId, root);
    const gate = gateFor("handoff", state);
    if (!gate.ok)
        throw new Error(`gate closed for handoff on ${input.studyId}: ${gate.reason}`);
    const strategy = state.docs.find((d) => d.frontmatter.kind === "strategy");
    const unknown = input.itemIds.filter((id) => !state.buildList.some((b) => b.itemId === id));
    if (unknown.length > 0)
        throw new Error(`unknown build item id(s): ${unknown.join(", ")}`);
    const features = await listFeatures(root);
    const result = { created: [], skipped: [] };
    for (const itemId of input.itemIds) {
        const existing = features.find((f) => f.origin?.studyId === state.study.id && f.origin.itemId === itemId);
        if (existing) {
            result.skipped.push({ itemId, featureId: existing.id });
            continue;
        }
        const item = state.buildList.find((b) => b.itemId === itemId);
        const feature = await createFeature(item.title, root, {
            origin: {
                studyId: state.study.id,
                strategyId: strategy.frontmatter.id,
                strategyVersion: strategy.frontmatter.version,
                rank: item.rank,
                itemId,
                item: item.title,
            },
        });
        features.push(feature);
        result.created.push(feature);
    }
    return result;
}
/** One study's docs, flags, rail steps, build list and handed-off features. */
export async function studySummary(studyId, root = projectRoot()) {
    const state = await readStudyState(studyId, root);
    const steps = researchSteps(state);
    return {
        ...state.study,
        docs: state.docs.map((d) => ({
            id: d.frontmatter.id,
            kind: d.frontmatter.kind,
            ...(d.frontmatter.docType !== undefined ? { docType: d.frontmatter.docType } : {}),
            title: d.frontmatter.title,
            version: d.frontmatter.version,
            filePath: d.filePath,
            outdated: outdatedUpstreams(d, state.docs),
        })),
        newNotes: state.newNotes,
        nextStep: nextResearchStep(steps),
        steps,
        buildList: state.buildList,
        handedOff: state.handedOff,
        handoffs: state.handoffs,
    };
}
/** Summaries for every study, or only `studyId` when given. */
export async function listStudySummaries(studyId, root = projectRoot()) {
    const ids = studyId ? [studyId] : (await listStudies(root)).map((s) => s.id);
    return Promise.all(ids.map((id) => studySummary(id, root)));
}
