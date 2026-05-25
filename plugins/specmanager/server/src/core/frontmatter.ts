import fs from "node:fs/promises";
import matter from "gray-matter";
import { DocFrontmatter, DocFrontmatterSchema, DocumentRecord } from "./types.js";

export async function readDoc(filePath: string): Promise<DocumentRecord> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  const frontmatter = DocFrontmatterSchema.parse(parsed.data);
  return { frontmatter, body: parsed.content, filePath };
}

export async function writeDoc(
  filePath: string,
  frontmatter: DocFrontmatter,
  body: string
): Promise<void> {
  const validated = DocFrontmatterSchema.parse(frontmatter);
  const out = matter.stringify(body, validated);
  await fs.writeFile(filePath, out, "utf8");
}
