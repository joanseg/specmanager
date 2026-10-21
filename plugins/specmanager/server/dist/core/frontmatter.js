import fs from "node:fs/promises";
import matter from "gray-matter";
import { DocFrontmatterSchema } from "./types.js";
export async function readDoc(filePath, schema = DocFrontmatterSchema) {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);
    const frontmatter = schema.parse(parsed.data);
    return { frontmatter, body: parsed.content, filePath };
}
function stripUndefined(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined)
            out[k] = v;
    }
    return out;
}
export async function writeDoc(filePath, frontmatter, body, schema = DocFrontmatterSchema) {
    const validated = schema.parse(frontmatter);
    const out = matter.stringify(body, stripUndefined(validated));
    await fs.writeFile(filePath, out, "utf8");
}
