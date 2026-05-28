// gray-matter API reference: https://github.com/jonschlinkert/gray-matter
import matter from 'gray-matter';

/** Shape of a context's frontmatter. Free-form `extra` keys are preserved. */
export interface ContextFrontmatter {
  name: string;
  description?: string;
  tags?: string[];
  version: number;
  updatedAt: string; // ISO-8601
  [extra: string]: unknown;
}

export interface ParsedContext {
  frontmatter: ContextFrontmatter;
  body: string;
}

/** Parse raw markdown with YAML frontmatter into typed parts. */
export function parse(raw: string): ParsedContext {
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const fm: ContextFrontmatter = {
    name: typeof data['name'] === 'string' ? data['name'] : '',
    version: typeof data['version'] === 'number' ? data['version'] : 1,
    updatedAt:
      typeof data['updatedAt'] === 'string' ? data['updatedAt'] : new Date(0).toISOString(),
  };
  if (typeof data['description'] === 'string') fm.description = data['description'];
  if (Array.isArray(data['tags'])) fm.tags = data['tags'].map(String);
  for (const [k, v] of Object.entries(data)) {
    if (!(k in fm)) fm[k] = v;
  }
  return { frontmatter: fm, body: parsed.content.replace(/^\n/, '') };
}

/**
 * Serialize a context with a stable key order in the YAML block so diffs stay
 * readable across rewrites.
 */
export function serialize(parsed: ParsedContext): string {
  const fm = parsed.frontmatter;
  const ordered: Record<string, unknown> = {
    name: fm.name,
  };
  if (fm.description !== undefined) ordered['description'] = fm.description;
  if (fm.tags !== undefined) ordered['tags'] = fm.tags;
  ordered['version'] = fm.version;
  ordered['updatedAt'] = fm.updatedAt;
  for (const [k, v] of Object.entries(fm)) {
    if (!(k in ordered)) ordered[k] = v;
  }
  const yaml = renderYaml(ordered);
  const body = parsed.body.endsWith('\n') ? parsed.body : `${parsed.body}\n`;
  return `---\n${yaml}---\n\n${body}`;
}

function renderYaml(obj: Record<string, unknown>): string {
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    out += `${k}: ${yamlValue(v)}\n`;
  }
  return out;
}

function yamlValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.map(yamlScalar).join(', ')}]`;
  return yamlScalar(v);
}

function yamlScalar(v: unknown): string {
  const s = String(v);
  if (/^[A-Za-z0-9_./:+\-]+$/.test(s) && s.length > 0) return s;
  const escaped = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}
