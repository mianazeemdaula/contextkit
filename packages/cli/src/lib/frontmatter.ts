// gray-matter API reference: https://github.com/jonschlinkert/gray-matter
import matter from 'gray-matter';

/**
 * Frontmatter persisted at the top of every `.ctx` file (see spec §15).
 * Keys are stored as snake_case YAML; this object uses camelCase.
 */
export interface ContextFrontmatter {
  id: string; // UUID v4 — stable across renames
  slug: string; // URL-safe name
  name: string; // human-readable
  tags: string[];
  folder?: string;
  pinned: boolean;
  prependNewline: boolean;
  appendNewline: boolean;
  wrapInXml: boolean;
  xmlTag: string;
  version: number; // increments on every save
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  description?: string; // optional, preserved if present
}

export interface ParsedContext {
  frontmatter: ContextFrontmatter;
  body: string;
}

/** Default behaviour-flag values, matching the spec data model (§3.1). */
export function defaultFlags(): Pick<
  ContextFrontmatter,
  'tags' | 'pinned' | 'prependNewline' | 'appendNewline' | 'wrapInXml' | 'xmlTag'
> {
  return {
    tags: [],
    pinned: false,
    prependNewline: false,
    appendNewline: true,
    wrapInXml: false,
    xmlTag: 'context',
  };
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** YAML may auto-parse ISO timestamps into Date objects; normalize back to a string. */
function asDateString(v: unknown, fallback: string): string {
  if (typeof v === 'string') return v;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  return fallback;
}

/** Parse raw `.ctx` content (YAML frontmatter + body) into typed parts. */
export function parse(raw: string): ParsedContext {
  const parsed = matter(raw);
  const d = parsed.data as Record<string, unknown>;
  const flags = defaultFlags();
  const fm: ContextFrontmatter = {
    id: asString(d['id']),
    slug: asString(d['slug']),
    name: asString(d['name']),
    tags: Array.isArray(d['tags']) ? d['tags'].map(String) : flags.tags,
    pinned: asBool(d['pinned'], flags.pinned),
    prependNewline: asBool(d['prepend_newline'], flags.prependNewline),
    appendNewline: asBool(d['append_newline'], flags.appendNewline),
    wrapInXml: asBool(d['wrap_in_xml'], flags.wrapInXml),
    xmlTag: asString(d['xml_tag'], flags.xmlTag),
    version: asNumber(d['version'], 1),
    createdAt: asDateString(d['created_at'], new Date(0).toISOString()),
    updatedAt: asDateString(d['updated_at'], new Date(0).toISOString()),
  };
  if (typeof d['folder'] === 'string') fm.folder = d['folder'];
  if (typeof d['description'] === 'string') fm.description = d['description'];
  return { frontmatter: fm, body: parsed.content.replace(/^\n/, '') };
}

/**
 * Serialize a context to `.ctx` text with a stable, spec-ordered (§15) YAML
 * block so diffs stay readable across rewrites.
 */
export function serialize(parsed: ParsedContext): string {
  const fm = parsed.frontmatter;
  const lines: string[] = [];
  lines.push(`id: ${yamlScalar(fm.id)}`);
  lines.push(`slug: ${yamlScalar(fm.slug)}`);
  lines.push(`name: ${yamlScalar(fm.name)}`);
  lines.push(`tags: [${fm.tags.map(yamlScalar).join(', ')}]`);
  if (fm.folder !== undefined) lines.push(`folder: ${yamlScalar(fm.folder)}`);
  lines.push(`pinned: ${fm.pinned}`);
  lines.push(`prepend_newline: ${fm.prependNewline}`);
  lines.push(`append_newline: ${fm.appendNewline}`);
  lines.push(`wrap_in_xml: ${fm.wrapInXml}`);
  lines.push(`xml_tag: ${yamlScalar(fm.xmlTag)}`);
  lines.push(`version: ${fm.version}`);
  lines.push(`created_at: ${quote(fm.createdAt)}`);
  lines.push(`updated_at: ${quote(fm.updatedAt)}`);
  if (fm.description !== undefined) lines.push(`description: ${yamlScalar(fm.description)}`);
  const yaml = `${lines.join('\n')}\n`;
  const body = parsed.body.endsWith('\n') ? parsed.body : `${parsed.body}\n`;
  return `---\n${yaml}---\n\n${body}`;
}

function yamlScalar(v: unknown): string {
  const s = String(v);
  if (/^[A-Za-z0-9_./:+\-]+$/.test(s) && s.length > 0) return s;
  return quote(s);
}

/** Always double-quote a scalar so YAML never re-types it (e.g. ISO dates → Date). */
function quote(v: unknown): string {
  const escaped = String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}
