/**
 * The stylesheet half of .kai/strip-card-hairlines.mjs.
 *
 * src/styles.css uses CRLF line endings, so the block matches there are written
 * with a CRLF-aware regex instead of the literal newlines the JSX pass uses.
 * Both rules are card surfaces that already (or now) take their edge from the
 * shadow: option cards and the trust/security panels.
 *
 * Run from the project root: node .kai/strip-card-hairlines-css.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/styles.css';
let css = readFileSync(FILE, 'utf8');

function replaceOnce(label, pattern, replacement) {
  const hits = css.match(new RegExp(pattern.source, `${pattern.flags}g`)) || [];
  if (hits.length !== 1) throw new Error(`${label}: ${hits.length} matches, expected 1`);
  css = css.replace(pattern, replacement);
  console.log(`ok ${label}`);
}

// Option cards: the comment above the rule already says "borderless, shadow
// communicates the surface", but the rule still carried a 1px line.
replaceOnce(
  'neu-radio-card',
  /(\.neu-radio-card \{[^}]*?)\r\n  border: 1px solid #E3E8EF;/,
  '$1\r\n  border: 0;',
);

// Trust and security pages: the sidebar and panel were the last hairline cards.
// These match .zl-panel exactly (border 0 plus the shared card shadow).
replaceOnce(
  'op-trust panels',
  /\.op-trust-sidebar,\r\n\.op-trust-panel \{\r\n  border: 1px solid #e5e7eb;\r\n  border-radius: 14px;\r\n  background: #fff;\r\n\}/,
  '.op-trust-sidebar,\r\n.op-trust-panel {\r\n  border: 0;\r\n  border-radius: 14px;\r\n  background: #fff;\r\n  box-shadow: var(--op-shadow);\r\n}',
);

writeFileSync(FILE, css);
