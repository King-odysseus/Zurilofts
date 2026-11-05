# Dependency audit, 5 November 2026

Read-only review of the dependency surface: advisories, reachability, install scripts, licences and unused packages. Nothing was installed, upgraded, pinned or removed.

Complements `docs/privacy-audit-2026-11-05.md` (what data leaves the app) and `docs/reliability-audit-2026-11-05.md` (how it fails). This one asks what the third-party code underneath can be made to do.

## Scope

The repository holds four separate npm packages, not one:

| Package | What it is | Declared deps | Installed | Lockfile |
|---|---|---|---|---|
| root (`zurilofts`) | React site, Vite build | 19 prod, 7 dev | 726 | yes |
| `server` | Express API, Prisma | 30 prod, 2 dev | 230 | yes |
| `manual` | Developer manual site | 4 prod, 2 dev | 111 | yes |
| `offline-app` | Second, half-finished app | 12 prod, 7 dev | 423 | yes |

`server/.tmp-pg-client/` is a generated Prisma client copy. It is gitignored (`.gitignore:102`) and untracked, so it is not part of the shipped surface.

## How this was checked

- `npm audit --json` in each of the four packages, plus `npm view` for candidate fixed versions.
- Reachability decided by reading the actual call site for each advisory, not by severity alone. Where a package is present but the vulnerable path is unreachable, that is said explicitly.
- Licence and install-script scan across 1,447 installed `package.json` files in all four trees.
- `grep` for every declared dependency's import site to find dead weight.

Limits: no exploit was attempted and nothing was run against a live provider. Advisories are as the npm registry reports them today. "Reachable" means the vulnerable code path can be entered from this application, not that an exploit has been demonstrated.

## Headline numbers

`npm audit` counts vulnerable **packages**, not advisories, and it counts the same advisory once per tree.

| Package | Critical | High | Moderate | Low | Total |
|---|---|---|---|---|---|
| root | 1 | 15 | 8 | 5 | 29 |
| server | 1 | 3 | 2 | 1 | 7 |
| manual | 0 | 5 | 7 | 0 | 12 |
| offline-app | 3 | 13 | 11 | 4 | 31 |

The 79 entries collapse to far fewer distinct problems, and the two trees that matter in production (root's browser bundle and the server) are dominated by build tooling and Node-only code paths. Ranked below by what can actually happen.

---

## A. Reachable in production today

### A1. Uploaded bytes reach the image decoder whatever their label says (sharp 0.35.1, high)

- Where: `server/src/controllers/upload.controller.ts:30` (`sharp(buffer)` re-encode), allowlist at `server/src/routes/upload.routes.ts:8`
- The allowlist is `image/jpeg`, `image/png`, `image/webp`, `image/jpg`, and it checks `file.mimetype`, which is whatever the client declares. sharp picks its decoder from the bytes, not the label.
- So a file labelled `image/jpeg` whose contents are HEIF or SVG still reaches libheif or librsvg. Advisories open against this version: libheif (`GHSA-g89c-p67h-r497`, `GHSA-2jg2-4ch7-h545`) and librsvg (`CVE-2026-96889`). The linux binaries sharp installs carry both decoders.
- Blast radius: the upload routes require `authenticate` plus `requireHostWorkspace`, and each file is capped at 10 MB, so this is an authenticated host, not an anonymous visitor. The process that decodes, however, holds the database credentials.
- Note the asymmetry: PDFs already get a byte-level check (`looksLikePdf`, `upload.controller.ts:21`) while images get none.
- Smallest fix: bump sharp to `0.35.5`, and gate images on magic bytes the way PDFs already are, reusing `server/src/utils/fileSignature.ts`. The second half is what actually closes the class, because it stops trusting the label.

### A2. Anyone can forge lines in the request log (morgan 1.11.0, moderate)

- Where: `server/src/app.ts:100` (`morgan('combined')` in production), custom tokens at `:92-95`
- Advisories: log forging via unescaped Unicode line separators, and log injection via an unescaped double quote in quoted fields. The URL is attacker-controlled on every request.
- Why this matters more here than the CVSS suggests: the privacy work made the request log a load-bearing record. `utils/logRedaction.ts` strips reset tokens from the logged URL and referrer, and the ops alerts are read out of these same logs. A newline in a URL lets an attacker append a line that looks like a clean, redacted entry, so a forged entry sits beside the real ones.
- Smallest fix: `morgan@1.12.1` (patch, no API change).

### A3. Every JSON endpoint can be made to burn CPU and memory (body-parser 1.20.5, qs 6.15.2, high and moderate)

- Where: `server/src/app.ts:104` (`express.json({ limit: '1mb' })`), webhook raw body at `:53`
- Advisories: trailing bytes after a compressed body, an invalid `limit` silently disabling size enforcement, attacker-controlled `isBuffer`, and an array-limit bypass. All are denial of service, none is remote code execution.
- Mitigated, not fixed, by: the 1 MB cap, `express-rate-limit`, and `helmet`. A single request cannot exhaust the process, but a stream of them degrades it, and the API is public.
- The awkward part: **express 4 cannot fix this.** 4.22.2 (installed) and 4.22.3 (latest 4.x) both pin `body-parser ~1.20.5` and `qs ~6.16.0`. Only express 5.3.0 moves to `body-parser ^2.3.0`, `qs ^6.16.0`, `proxy-addr ^2.0.8`.
- Smallest fix: an `overrides` block in `server/package.json` pinning `body-parser` to `^1.20.9` and `qs` to `^6.17.1`, rather than a major framework upgrade. Verify with the server suite, since overrides bypass express's own pins.

### A4. `proxy-addr` 2.0.7 carries a critical advisory, but the app does not take the vulnerable path (critical)

- Where: `server/src/app.ts:49` (`app.set('trust proxy', 1)`)
- Advisory: IP spoofing via IPv4-mapped IPv6 **trust subnet** matching.
- Reachability: a numeric hop count compiles to `i < n` and never enters the subnet matcher the advisory concerns. So as configured today the exploit path is not taken. It becomes live the moment someone changes the setting to `true`, `'loopback'`, `'uniquelocal'` or a CIDR list, which is a very plausible future edit behind a proxy.
- Why it deserves attention anyway: the address derived here is `req.ip`, which keys the rate limiter and is hashed into the consent record and the governance audit trail (`utils/ipHash.ts`). A spoofable address weakens all three at once.
- Smallest fix: override `proxy-addr` to `^2.0.8`. Cheap, and it removes the trap.

### A5. Validation accepts unbounded arrays (zod 3.25.76, high)

- Where: `server/src/types/index.ts:108-110`, used by `POST /properties` and `PUT /properties/:id` (`property.routes.ts:60,66`)
- `images`, `amenities` and `nearby` have no `.max()`. Everything else in the schema is bounded (`ids` `.max(100)`, `templates` `.max(5)`, `attachments` `.max(5)`).
- Advisory: memory exhaustion while validating oversized constrained collections. Bounded by the 1 MB body limit and by `authenticate` + `requireHostWorkspace`, so this is a slow authenticated host, not an anonymous attacker.
- Smallest fix: add `.max()` to those three arrays. That is a two-line change and does not need the major version bump. `zod` 4.6.7 fixes it properly but is a breaking migration, so treat that as its own decision.

### A6. `multer` 1.x is deprecated by its own author (no open advisory)

- Where: `server/src/routes/upload.routes.ts` (listing images, attachments, host documents), 5 import sites
- `npm view multer@1.4.5-lts.2 deprecated` returns: "Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version."
- `npm audit` reports nothing for it, because `lts.2` closed the known advisories. So the risk today is that future fixes land only in 2.x.
- Decision needed, not a code fix: the 2.x upgrade touches multipart parsing for the upload paths, so it wants a deliberate test pass over listing photos, chat attachments and host documents.

---

## B. Present, but the vulnerable path is not reachable

### axios 1.18.1 (12 advisories, high) - in the browser bundle

The app uses axios for API calls only (`src/api/client.js:3`, a relative `/api` base URL, no `data:` URLs anywhere). All twelve advisories concern code the browser build does not run: the Node HTTP/2 adapter, `createConnection` and `shouldBypassProxy` (Node adapters), `fromDataURI`, and the redirect/SSRF ones. The four prototype-pollution gadgets need an attacker to already control `Object.prototype`, and this codebase has no prototype-pollution source.

Verdict: present, unused in this context, worth upgrading anyway to `1.21.0` because it is a minor bump.

### react-router-dom 7.18.0 (high) - RSC-mode only

The high advisory is CSRF in RSC/server-action mode. This is a plain browser SPA on `BrowserRouter`, so that mode is never entered. The open-redirect advisory (`<Link>` and `useNavigate` backslash, CVE-2025-68470) is already fixed in 7.18.0, and the app independently validates return paths through `safeInternalPath()` before calling `navigate` (`src/pages/LoginPage.jsx:33-37`).

Verdict: not reachable. Upgrade to `7.18.5` on the next dependency pass.

### dompurify 3.4.11 (critical) - pulled in by jsPDF, never called

`jspdf@4.2.1` depends on `dompurify`. DOMPurify runs only through jsPDF's `html()` method, and the app never calls it: `src/pages/HostEarningsPage.jsx` builds the PDF with jsPDF's own primitives. No `DOMPurify` import exists anywhere in `src`.

Verdict: the critical rating is accurate for jsPDF's HTML mode and irrelevant to this app. It clears itself when jsPDF bumps, or with an `overrides` entry for `dompurify@3.4.17`.

### flowbite-react 0.12.17 to deepmerge-ts (high)

`deepmerge-ts@7.1.5` can exhaust the stack on recursive object graphs. flowbite-react uses it to merge the component theme, which is fixed in application code, not user input.

Separate supply-chain note: flowbite-react's runtime dependencies include `chokidar`, `oxc-parser`, `magic-string`, `@iarna/toml` and `package-manager-detector`. Build tooling inside a runtime dependency of a UI library is an unusually wide surface for what it does, and it is in the browser bundle.

### vite 4.5.14, esbuild 0.18.20, launch-editor (high) - the developer's machine, not visitors

The Vite advisories (`server.fs` bypasses, public-directory matching, custom-middleware script execution, optimized-deps path traversal) all require a running dev server. The launch-editor ones are worse in kind: command injection and NTLMv2 hash disclosure, Windows-specific.

This project is developed on Windows and `npm run dev` is the normal loop, so these are real for the person at the keyboard, while a malicious page is open. There is no patched 4.x; the fix is a jump to Vite 6.4.5 or later, which drags `@vitejs/plugin-react` and `vite-plugin-pwa` along. That is a decision, not a patch.

### Build-time only

`postcss` (8.5.15, path traversal on `sourceMappingURL`), `browserslist`, `minimatch`/`brace-expansion`, `js-yaml`, `fast-uri`, `nanoid`, `source-map-js`, `prismjs` and `refractor` in `manual`, and `@tailwindcss/postcss@4.3.1`. None of them runs in response to a user. Two of these only exist here as a side effect of version drift:

- `@tailwindcss/postcss` arrives via `flowbite@4.0.2` to `flowbite-datepicker@2.0.0`. flowbite 4 is built for Tailwind 4 and is wired into a Tailwind 3.4.19 build at `tailwind.config.js:84`.
- `daisyui@5.6.3` is likewise a Tailwind 4 library, sitting in a Tailwind 3 build, and no daisyUI component class is used in `src` (2 incidental word matches, no component classes).

---

## C. Never ships

`offline-app` holds three criticals and is not a real target:

- `@capacitor/android@6.2.1`: remote content can be loaded at the app origin through the internal HTTP proxy path. Fixed in 6.2.2.
- `tar@6.2.1` (via `@capacitor/cli`): hardlink target escape on extraction, install-time only.
- `dompurify@3.4.10`: same jsPDF story as above.

There is no `offline-app/android/` or `ios/` directory, `capacitor.config.json` has never been initialised into a native project, nothing under `offline-app/src` imports `@capacitor/core` or `@capacitor/android`, and `offline-app/dist` is not tracked by git. The package is an unbuilt second web app with an aspirational native stack.

---

## D. Declared but not used

| Package | Tree | Finding |
|---|---|---|
| `react-hot-toast` | root, manual, offline-app | zero imports in any of the three |
| `apexcharts` | root | imported only by `src/components/FlowbiteChart.jsx`, which nothing renders (dynamic `import('apexcharts')` inside a component used nowhere) |
| `daisyui` | root | no daisyUI classes in markup; Tailwind 4 library in a Tailwind 3 build |
| `axios`, `react-hot-toast`, `jspdf`, `react-syntax-highlighter`, `flowbite`, `flowbite-react`, `@capacitor/core`, `@capacitor/android` | offline-app | all declared, none imported; only `react-router-dom` is used |

Also misclassified, though not unused:

- Root puts every build tool in `dependencies` (`vite`, `@vitejs/plugin-react`, `postcss`, `tailwindcss`, `autoprefixer`, `daisyui`, `vite-plugin-pwa`). Functionally fine because Railway builds with full installs, but it says the bundler ships at runtime.
- Server puts `typescript` and eleven `@types/*` packages in `dependencies`, and `prisma` in `devDependencies`, while the start command actually calls it: `Procfile` runs `npx prisma migrate deploy` before `node dist/index.js`. Today that works only because the build installs dev dependencies too. Any deploy that prunes them either fails at boot or makes `npx` fetch Prisma from the network at start time. `prisma` belongs in `dependencies`.

---

## E. Install scripts: clean

Packages that run code at install time across all four trees: `esbuild` (native binary), `sharp` (libvips binary), `prisma`, `@prisma/client`, `@prisma/engines` (engine download), and `core-js` (a funding banner on stdout, no network call).

Every one is expected for what it does, and no unexpected or typosquat-shaped package runs an install script. Nothing to change here.

## F. Licences

Scan of 1,447 installed `package.json` files:

- Overwhelmingly permissive: MIT (689), ISC (47), Apache-2.0 (23), BSD-2/3-Clause (23), BlueOak-1.0.0 (8), 0BSD (1), CC0.
- `LGPL-3.0-or-later` inside `@img/sharp-*` (the libvips binaries). Running sharp on your own server is not distribution, so no obligation today. Distributing a container image or binary to customers would trigger the LGPL duties: licence text, notice, and the ability to relink.
- `MPL-2.0` in `dompurify`, `web-push`, `lightningcss`: file-level copyleft, no obligation unless those files are modified.
- `CC-BY-4.0` in `caniuse-lite`: build-time only, attribution.
- No GPL, AGPL, SSPL, Commons-Clause or unlicensed package anywhere.

Attribution: `public/third-party-notices.txt` exists, is generated by `scripts/generate-notices.mjs`, and is served from the site root. It covers the client's dependency tree only. `express`, `sharp`, `web-push`, `prisma`, `multer`, `node-ical` and `cloudinary` are absent from it, which is correct while the server is a service and never handed to anyone. If the server is ever shipped as an image or archive, this file must be regenerated for that tree first.

## G. Ranges and lockfiles

All four packages have a committed `package-lock.json`. No `git`, `file`, `link` or `http` specifiers anywhere, no unpublished or lookalike names, no floating majors. Ranges are carets, so minors float at install time but the lockfile pins exact versions, which is what makes a deploy reproducible. Only the root declares `engines` (`node: 20.x`).

## H. Repo hygiene that touches dependencies

- `node_modules-from-dist/` sits in the project root: a stray copy of installed packages, outside `node_modules`, so it is neither ignored nor meaningful. Remove it.
- `server/.tmp-pg-client/` is a Prisma client copy on disk (gitignored). Harmless, but it is dead weight and a confusing second client.
- `daisyui` 5 and `flowbite` 4 are Tailwind 4 packages inside a Tailwind 3 build. The build succeeds because neither contributes working component classes to this markup, which is also the reason removing daisyUI is safe.

---

## What to do first

1. `sharp` to `0.35.5` plus a magic-byte gate on image uploads (A1). The gate is the real fix; the bump only closes today's two CVEs.
2. `morgan` to `1.12.1` (A2). One-line change, and it protects the log the privacy work now depends on.
3. Overrides for `body-parser@^1.20.9`, `qs@^6.17.1`, `proxy-addr@^2.0.8` (A3, A4). No major upgrade, no code change; verify with the server suite.
4. `.max()` on `images`, `amenities`, `nearby` (A5).
5. Remove `react-hot-toast`, `daisyui`, and the orphaned `FlowbiteChart.jsx` with `apexcharts` (D). Removes the `@tailwindcss/postcss` chain with them.

## What you must decide

- **Vite 6.4.5 upgrade** (B). Protects the development machine, not users. Drags two plugins with it.
- **`zod` 4** (A5). Fixes the advisory properly; breaking migration across 7 files.
- **`multer` 2.x** (A6). Deprecated 1.x, no open advisory; needs a test pass over all upload paths.
- **`express` 5.3.0** (A3). The clean long-term answer to the `body-parser`/`proxy-addr` pinning; a bigger change than the override.
- **`offline-app`** (C, D). Either finish it or delete it. As it stands it contributes 31 advisory entries, 3 criticals and 8 unused packages to the audit and cannot ship anything.
- **Server notices file** (F). Only needed if the server binary is ever distributed.

## Commands proposed, not run

This audit changed nothing. The changes above would be, in `server/` unless noted:

```
npm install sharp@^0.35.5 morgan@^1.12.1
npm install --save-dev @types/morgan@latest      # types already present; re-check after bump
npm install axios@^1.21.0 react-router-dom@^7.18.5   # in the root package
npm pkg set overrides.body-parser="^1.20.9" overrides.qs="^6.17.1" overrides.proxy-addr="^2.0.8"
npm uninstall react-hot-toast daisyui            # in the root package, after removing the tailwind plugin line
```

Each wants `npx tsc --noEmit`, `npm run lint`, `npm run build` and the server suite afterwards; the overrides in particular deserve the upload and payment tests, because they bypass framework pins.

---

## Outcome: what was applied

Applied on the same day as the audit. Items are named by the finding numbers above. Everything marked verified was run, not reasoned about.

### A1. Image bytes now decide, not the label

`detectImageFormat` in `server/src/utils/fileSignature.ts` recognises JPEG, PNG, GIF and WebP by their own header bytes and returns null for everything else. Both upload entry points in `server/src/controllers/upload.controller.ts` (`uploadImages` and the image branch of `storeAttachment`) call `assertImageContents` before sharp is handed the buffer, so an unrecognised buffer is refused as a 400 rather than decoded.

`sharp` went from `^0.35.1` to `^0.35.5` (installed 0.35.5, libvips 8.18.7).

This matters because the decoder is chosen from the bytes: before this, a file labelled `image/jpeg` whose contents were HEIF or SVG still reached libheif or librsvg. The version bump only closes today's two CVEs; the signature check closes the class.

Verified:

- Four new tests in `server/tests/file-signature.test.ts` (the suite now runs 9, all passing) cover each recognised format, HEIF and SVG being refused, a mislabelled HTML/PDF payload being refused, and empty or truncated buffers being refused.
- A probe against the real controllers, not a copy of the logic: SVG and HEIF labelled `image/jpeg` on the listing path, and SVG and HTML labelled `image/png` / `image/webp` on the chat-attachment path, are all refused as `ValidationError` with status 400.
- Real JPEG, PNG, WebP and GIF encoded by sharp all pass the gate, so ordinary uploads are unaffected.

### A2. `morgan` to the patched release

`^1.10.0` to `^1.12.1` (installed 1.12.1). This closes the log-forging advisories, which matter here because the privacy work made the request log load-bearing.

### A3, A4. Framework pins overridden instead of upgrading Express

`server/package.json` now carries:

```
"overrides": { "body-parser": "^1.20.9", "qs": "^6.17.1", "proxy-addr": "^2.0.8" }
```

Resolved: body-parser 1.20.9, qs 6.17.1, proxy-addr 2.0.8. `express` stays at 4.22.2, so no framework migration.

Verified by booting the built server and exercising the exact paths these packages govern:

| Exercise | Result |
|---|---|
| `GET /api/health` | 200, `{"status":"ok"}` |
| `GET /api/properties?amenities[]=wifi&limit=2` | 200 (qs parses the override) |
| `POST /api/auth/login` with a JSON body | 401, not 400 (body-parser parses the override) |
| `POST /api/chat` (removed with Telegram) | 404, as expected |

### A5. Collections are bounded

`server/src/types/index.ts`: `images` capped at 30 entries of 2048 characters, `amenities` at 60 of 100, `nearby` at 30 of 200. The reachable path the advisory describes is closed.

`zod` itself was not upgraded, so `npm audit` still flags it (see below). Only zod 4 fixes the advisory in the package, and that is a breaking migration across seven files, so it stays a decision.

### D. Dead weight removed

Removed from the root package: `react-hot-toast` (no import anywhere), `daisyui` (with its Tailwind plugin line and theme block; no daisyUI class was used in any markup), and `apexcharts`, whose only importer was `src/components/FlowbiteChart.jsx` - itself imported by nothing. That component is deleted.

### Deploy correctness

`prisma` moved from `devDependencies` to `dependencies`, because `Procfile` runs `npx prisma migrate deploy` at boot and a deploy that prunes dev dependencies would have failed there. `typescript` and the `@types/*` packages were left where they are: the build needs `tsc`, so moving them risks a deploy that cannot compile.

### Advisory counts after the change

| Tree | Before | After |
|---|---|---|
| `server` | 7 (1 critical, 3 high, 2 moderate, 1 low) | 2 (1 high, 1 low) |
| root | 29 (1 critical, 15 high, 8 moderate, 5 low) | 29, unchanged |

The server's critical is gone. The two that remain are both understood:

- `zod` (high): the package is still the flagged version; the reachable input path is closed by the `.max()` ceilings above, and the real fix is zod 4.
- `esbuild` (low): arrives through `tsx`, affects the Windows development server only, never a deployed request.

The root count did not move because the three removed packages carried no open advisories of their own; the 29 entries are dominated by build tooling, which this change did not touch.

### Types now match the runtime

`server` paired `multer` 1.4.5-lts.2 with `@types/multer` `^2.1.0`, so the compiler was checking every upload call against a 2.x API that is not installed. The types are now `^1.4.13`, matching what runs. Compiles clean. When `multer` is eventually moved to 2.x, the types move with it in the same commit.

### Two tests that could not pass in a normal run

`server/tests/public-url.test.ts` had two cases that only pass when the suite is launched with `NODE_ENV=production`, which is why the file's header says to run it that way. Under the project's own test command they failed every time, so the suite carried two known-red results that would have hidden a real regression in exactly the code that decides which address goes into a reset link.

Both cases now set the environment they describe (and the local `CLIENT_URL` / `GOOGLE_CALLBACK_URL` they assume) and restore it afterwards, the same save-and-restore pattern the rest of that file already uses. The suite is now 531 of 531.

Checked that this did not turn them into tests that pass by accident: dropping the production fallback in `clientUrlForRequest` makes case 2 fail, and dropping the production guard in `googleCallbackUrlForRequest` makes case 3 fail. Source restored byte-for-byte afterwards.

### Checks run

- `npx tsc --noEmit` in `server/`: clean.
- Server suite: 531 of 531 pass, exit 0.
- `npm run lint`: clean.
- `npm run build` (client): clean, same pre-existing large-chunk warning.
- Server rebuilt from an empty `dist/` and booted; the Telegram line that a stale `dist/` was printing is gone, which confirmed the rebuild from the previous change as well.

### Still open, deliberately

Unchanged from "What you must decide" above, plus:

1. `manual` and `offline-app` still declare `react-hot-toast`; they are separate packages and were not touched, because `offline-app` needs the finish-or-delete decision first.
2. The root package still lists its build tools (`vite`, `postcss`, `tailwindcss`, `autoprefixer`, `@vitejs/plugin-react`, `vite-plugin-pwa`) as production dependencies. Functionally fine on Railway, which installs everything, but it says the bundler ships at runtime.
3. `node_modules-from-dist/` at the repository root is still present and untracked. It is a stray copy of installed packages, outside `node_modules`, and is left for a human to delete: nothing references it, and a silent recursive delete of a folder I did not create is not a call worth making on someone else's behalf.
