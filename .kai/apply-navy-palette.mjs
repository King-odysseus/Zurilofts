/**
 * Puts the brand navy back into an obviously blue value everywhere.
 *
 * Why this exists as a script: the palette lives in three shared files that
 * several surfaces read (Tailwind tokens, the Flowbite theme, the stylesheet
 * tokens) plus a few hundred literal hexes across the JSX. Re-running this is
 * safe, so a stale copy of any of those files can be repaired with one command
 * instead of a manual sweep.
 *
 * Run: node .kai/apply-navy-palette.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const INK = '#143A80'; // brand navy: white type on it is still AAA (10.8:1)
const DEEP = '#0B2A5E'; // inverse surfaces, hover and pressed states
const INK_RGB = '20 58 128';
const DEEP_RGB = '11 42 94';

const INK_HEXES = new Set(['0b1f42', '203565', '0b2f6b']);
const DEEP_HEXES = new Set(['0d1e3b', '16294b', '07072e', '071f49', '0b2a5e']);

const ROOTS = ['src', 'tailwind.config.js', 'index.html', 'vite.config.js', 'public'];

function collect(target, out = []) {
  const stat = statSync(target);
  if (stat.isFile()) {
    if (/\.(js|jsx|css|html)$/.test(target)) out.push(target);
    return out;
  }
  for (const entry of readdirSync(target)) collect(path.join(target, entry), out);
  return out;
}

function read(file) {
  return readFileSync(file, 'utf8');
}

function write(file, text) {
  // Keep the line endings the file already uses; these are Windows checkouts.
  writeFileSync(file, text, 'utf8');
}

function recolor(text) {
  let out = text.replace(/#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?/g, (match, hex, alpha) => {
    const lower = hex.toLowerCase();
    if (INK_HEXES.has(lower)) return INK + (alpha ?? '');
    if (DEEP_HEXES.has(lower)) return DEEP + (alpha ?? '');
    return match;
  });

  const swaps = [
    ['rgba(11,31,66,', 'rgba(20,58,128,'],
    ['rgba(11, 31, 66,', 'rgba(20, 58, 128,'],
    ['rgba(32,53,101,', 'rgba(20,58,128,'],
    ['rgba(32, 53, 101,', 'rgba(20, 58, 128,'],
    ['rgba(11,47,107,', 'rgba(20,58,128,'],
    ['rgba(11, 47, 107,', 'rgba(20, 58, 128,'],
    ['rgba(13,30,59,', 'rgba(11,42,94,'],
    ['rgba(13, 30, 59,', 'rgba(11, 42, 94,'],
    ['rgba(7,7,46,', 'rgba(11,42,94,'],
    ['rgba(7, 7, 46,', 'rgba(11, 42, 94,'],
    ['rgba(7,31,73,', 'rgba(11,42,94,'],
    ['rgba(7, 31, 73,', 'rgba(11, 42, 94,'],
    ['11 31 66', INK_RGB],
    ['32 53 101', INK_RGB],
    ['11 47 107', INK_RGB],
    ['7 31 73', DEEP_RGB],
    ['13 30 59', DEEP_RGB],
    ['7 7 46', DEEP_RGB],
    ['%23203565', '%23143A80'],
    // The old bright action blue: buttons and focus rings are navy now.
    ['#2563EB', INK],
    ['#2563eb', INK],
    ['#1D4ED8', DEEP],
    ['#1d4ed8', DEEP],
    ['%230B1F42', '%23143A80'],
  ];
  for (const [from, to] of swaps) out = out.split(from).join(to);
  return out;
}

let touched = 0;
for (const root of ROOTS) {
  for (const file of collect(root)) {
    const before = read(file);
    const after = recolor(before);
    if (after !== before) {
      write(file, after);
      touched += 1;
    }
  }
}

// The Flowbite theme builds class names from constants. Tailwind only emits a
// utility it can see in the source, so "[${NAVY}]" compiles to nothing and the
// control loses its fill. Bake each constant's value into its class strings.
const themeFile = 'src/theme/flowbiteTheme.js';
let theme = read(themeFile);
const consts = [...theme.matchAll(/^const ([A-Z_]+) = '(#[0-9A-Fa-f]{6})';$/gm)].map((m) => [m[1], m[2]]);
for (const [name, hex] of consts) {
  theme = theme.split(`[\${${name}}]`).join(`[${hex}]`);
  theme = theme.split(`\${${name}}`).join(hex);
}
for (const [name] of consts) {
  theme = theme.replace(new RegExp(`^const ${name} = '#[0-9A-Fa-f]{6}';\\r?\\n`, 'm'), '');
}
if (!theme.includes('Brand colours are written into the class strings below')) {
  theme = theme.replace(
    ' */\n\n',
    ' */\n\n' +
      '// Brand colours are written into the class strings below as literal hexes on\n' +
      '// purpose: Tailwind only generates a utility it can see in the source, so a\n' +
      '// class built from "[${CONST}]" is emitted as plain text and never compiled\n' +
      '// (that is how a navy button once rendered as an invisible box).\n' +
      `// Navy ${INK} is the interactive colour; brass #C5A28C is an accent only.\n\n`,
  );
}
write(themeFile, theme);

// Tailwind tokens: one navy for interaction, a deeper one for inverse surfaces.
const twFile = 'tailwind.config.js';
let tw = read(twFile);
tw = tw.replace(/primary: \{\s*DEFAULT: '#[0-9A-Fa-f]{6}',[\s\S]*?\n {8}\},/, `primary: {
          DEFAULT: '${INK}',
          50:  '#EEF3FB',
          100: '#DCE6F5',
          200: '#BFD0EC',
          300: '#9AB3DC',
          400: '#5A7FBF',
          500: '#2D5699',
          600: '${INK}',
          700: '${DEEP}',
          800: '#0A2450',
          900: '#071C3F',
          950: '#05142C',
        },`);
tw = tw.replace(/'primary-hover': '#[0-9A-Fa-f]{6}',/, `'primary-hover': '${DEEP}',`);
tw = tw.replace(/action:\s+'#[0-9A-Fa-f]{6}',/, `action:         '${INK}',`);
tw = tw.replace(/'action-hover': '#[0-9A-Fa-f]{6}',/, `'action-hover': '${DEEP}',`);
tw = tw.replace(/'navy-bg':\s+'#[0-9A-Fa-f]{6}',/, `'navy-bg':      '${INK}',`);
tw = tw.replace(/'navy-hover':\s+'#[0-9A-Fa-f]{6}',/, `'navy-hover':   '${DEEP}',`);
tw = tw.replace(/primary:\s+'#[0-9A-Fa-f]{6}',/, `primary:            '${INK}',`);
tw = tw.replace(/secondary:\s+'#[0-9A-Fa-f]{6}',/, `secondary:          '${DEEP}',`);
write(twFile, tw);

// Stylesheet tokens: navy ink, and panels that read as white on the white canvas.
const cssFile = 'src/styles.css';
let css = read(cssFile);
css = css.replace(/--ds-navy: \d+ \d+ \d+;/, `--ds-navy: ${INK_RGB};`);
css = css.replace(/--ds-surface: \d+ \d+ \d+;/, '--ds-surface: 247 249 252;');
css = css.replace(/--ds-inset: \d+ \d+ \d+;/, '--ds-inset: 246 248 252;');
css = css.replace(/--zl-navy-bg: #[0-9A-Fa-f]{6};/, `--zl-navy-bg: ${INK};`);
css = css.replace(/--op-navy-bg: #[0-9A-Fa-f]{6};/, `--op-navy-bg: ${INK};`);
css = css.split('Design tokens now live in index.css (single source of truth). */').join(
  'Design tokens now live in the :root block of this file (single source of truth). */',
);
write(cssFile, css);

console.log(`recoloured ${touched} files; tailwind + flowbite theme + stylesheet tokens refreshed`);
