/**
 * Allowlist HTML sanitizer for admin-authored rich text (guide bodies).
 *
 * Why this exists: BlogPost.body is authored as raw HTML in the admin console
 * (the field is labelled "Body (HTML)") and rendered with
 * dangerouslySetInnerHTML on the public guide pages. Anything executable that
 * reaches the database therefore runs in every visitor's browser.
 *
 * Why hand-rolled: the project ships no HTML sanitizer dependency, and adding
 * one is a maintainer decision. This is a deliberately minimal, fail-closed
 * stopgap rather than a general HTML parser: anything not explicitly allowlisted
 * is dropped, and raw-text elements (script, style, iframe, ...) lose their
 * contents as well as their tags. Unknown or malformed syntax is escaped to
 * text instead of being passed through.
 *
 * Replace with a vetted library (DOMPurify, sanitize-html) once adding a
 * dependency is acceptable; the allowlists below carry over unchanged.
 */

/** Tags kept in output. A disallowed tag is dropped but its children survive. */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr',
  'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's',
  'blockquote', 'code', 'pre',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
]);

/** Tags that never carry a closing tag. */
const VOID_TAGS = new Set(['br', 'hr', 'img']);

/**
 * Elements whose *contents* must be discarded, not just their tags. Dropping
 * only the tag would leave the payload sitting in the page as visible text.
 */
const RAW_TEXT_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'template',
  'noscript', 'svg', 'math', 'title', 'textarea', 'xmp', 'noembed', 'noframes',
]);

/** Attributes accepted on any allowed tag. */
const GLOBAL_ATTRIBUTES = new Set(['title']);

/** Attributes accepted per tag, on top of GLOBAL_ATTRIBUTES. */
const TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
};

/** URL schemes permitted in href/src. A URL with no scheme is relative. */
const SAFE_URL_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/** Named entities worth decoding, used to catch scheme obfuscation. */
const NAMED_ENTITIES: Record<string, string> = {
  colon: ':',
  tab: '\t',
  newline: '\n',
  nbsp: '\u00a0',
};

/**
 * Resolve numeric and a few named HTML entities. Used only for URL inspection
 * and to spot obfuscated schemes, never on text destined for output.
 */
function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const code = parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Reject javascript:, data: and friends while allowing relative URLs.
 * Schemes are checked after decoding entities and stripping whitespace and
 * control characters, because `java\tscript:` and `&#106;avascript:` are both
 * widely used to slip past a naive comparison.
 */
function isSafeUrl(value: string): boolean {
  const normalised = decodeEntities(value).replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();
  const separator = normalised.indexOf(':');
  if (separator === -1) return true;
  return SAFE_URL_SCHEMES.has(normalised.slice(0, separator));
}

/**
 * Find the index of the `>` closing a tag that starts at `start`, ignoring `>`
 * inside quoted attribute values (`<a title="a > b">`).
 */
function findTagEnd(input: string, start: number): number {
  let quote: string | null = null;
  for (let i = start + 1; i < input.length; i += 1) {
    const char = input[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i;
    }
  }
  return -1;
}

/** Split an attribute string into name/value pairs, tolerating bare attributes. */
function parseAttributes(source: string): Array<{ name: string; value: string | null }> {
  const attributes: Array<{ name: string; value: string | null }> = [];
  // Trailing "/" of a self-closing tag is not an attribute.
  const cleaned = source.replace(/\/\s*$/, '');
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`=]+)))?/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(cleaned)) !== null) {
    const name = match[1];
    if (!name) continue;
    attributes.push({
      name: name.toLowerCase(),
      value: match[2] ?? match[3] ?? match[4] ?? null,
    });
  }
  return attributes;
}

/** Rebuild a tag's attributes, keeping only what the allowlists permit. */
function renderAttributes(tagName: string, source: string): string {
  const allowedForTag = TAG_ATTRIBUTES[tagName];
  let rendered = '';

  for (const { name, value } of parseAttributes(source)) {
    // Event handlers execute; style can smuggle script via url() or expression().
    if (name.startsWith('on')) continue;
    if (!GLOBAL_ATTRIBUTES.has(name) && !allowedForTag?.has(name)) continue;
    if (value === null) continue;
    if ((name === 'href' || name === 'src') && !isSafeUrl(value)) continue;
    rendered += ` ${name}="${value.replace(/"/g, '&quot;')}"`;
  }

  return rendered;
}

/**
 * Strip everything from `html` that is not on the allowlist.
 *
 * Text nodes are passed through untouched (existing entities such as &amp;
 * must survive), so the only escaping needed is for `<` that does not begin a
 * well-formed tag, which stops it from being reinterpreted as one.
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string' || html.length === 0) return '';

  const lower = html.toLowerCase();
  let output = '';
  let cursor = 0;

  while (cursor < html.length) {
    const lt = html.indexOf('<', cursor);
    if (lt === -1) {
      output += html.slice(cursor);
      break;
    }

    output += html.slice(cursor, lt);

    // Comments, doctypes, CDATA and processing instructions carry no safe content.
    if (lower.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      cursor = end === -1 ? html.length : end + 3;
      continue;
    }
    if (lower.startsWith('<!', lt) || lower.startsWith('<?', lt)) {
      const end = html.indexOf('>', lt);
      cursor = end === -1 ? html.length : end + 1;
      continue;
    }

    const tagEnd = findTagEnd(html, lt);
    if (tagEnd === -1) {
      output += '&lt;';
      cursor = lt + 1;
      continue;
    }

    const isClosing = html[lt + 1] === '/';
    const inner = html.slice(lt + (isClosing ? 2 : 1), tagEnd);
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9:-]*/.exec(inner);

    if (!nameMatch) {
      // Not a tag at all, e.g. "a < b": escape and keep scanning.
      output += '&lt;';
      cursor = lt + 1;
      continue;
    }

    const name = nameMatch[0].toLowerCase();
    cursor = tagEnd + 1;

    if (RAW_TEXT_TAGS.has(name)) {
      // An opening tag swallows everything up to its close so the payload is not
      // surfaced as visible text. A closing tag has nothing left to consume -
      // searching again from here would jump past the rest of the document.
      if (!isClosing) {
        const closeIndex = lower.indexOf(`</${name}`, cursor);
        cursor = closeIndex === -1 ? html.length : closeIndex;
      }
      continue;
    }

    if (!ALLOWED_TAGS.has(name)) continue;

    if (isClosing) {
      if (!VOID_TAGS.has(name)) output += `</${name}>`;
      continue;
    }

    const attributes = renderAttributes(name, inner.slice(nameMatch[0].length));
    output += VOID_TAGS.has(name) ? `<${name}${attributes} />` : `<${name}${attributes}>`;
  }

  return output;
}
