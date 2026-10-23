import fs from "node:fs/promises";
import matter from "gray-matter";
import type { z } from "zod";
import { DocFrontmatter, DocFrontmatterSchema, DocumentRecord } from "./types.js";

/** A parsed markdown doc whose frontmatter matched `schema`. */
export interface ParsedDoc<T> {
  frontmatter: T;
  body: string;
  filePath: string;
}

/** Read a markdown doc; frontmatter is validated by `schema` (default: Builder doc schema). */
export async function readDoc(filePath: string): Promise<DocumentRecord>;
export async function readDoc<T>(filePath: string, schema: z.ZodType<T>): Promise<ParsedDoc<T>>;
export async function readDoc(
  filePath: string,
  schema: z.ZodType<unknown> = DocFrontmatterSchema
): Promise<ParsedDoc<unknown>> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  const frontmatter = schema.parse(parsed.data);
  return { frontmatter, body: parsed.content, filePath };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/** Write a markdown doc; frontmatter is validated by `schema` (default: Builder doc schema). */
export async function writeDoc(filePath: string, frontmatter: DocFrontmatter, body: string): Promise<void>;
export async function writeDoc<T extends object>(
  filePath: string,
  frontmatter: T,
  body: string,
  schema: z.ZodType<T>
): Promise<void>;
export async function writeDoc(
  filePath: string,
  frontmatter: object,
  body: string,
  schema: z.ZodType<object> = DocFrontmatterSchema
): Promise<void> {
  const validated = schema.parse(frontmatter) as Record<string, unknown>;
  const out = matter.stringify(body, stripUndefined(validated));
  await fs.writeFile(filePath, out, "utf8");
}
