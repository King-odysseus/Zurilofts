# OpenPencil implementation plan

OpenPencil is the visual source of truth. Keep the existing ZuriLofts logo and API-backed behavior. Use **Stays** in visible UI; `/properties` remains the compatible route and API name.

## Source and acceptance baseline

- Product Screens page `0:3` (57 top-level scenes), Design System `0:4946`, Admin `0:6411` (10 scenes).
- Foundations `0:5031`: navy `#0B1F42`, bronze `#C49A6C`, sand `#F3E9DC`, surface `#F7F4EF`, border `#E2DAD0`; Montserrat headings, Inter UI, 4px spacing grid.
- Compare each implemented route at 1440px and 390px against its frame; verify navigation, data loading, empty/error states, and interaction. A build alone is not acceptance.

## Route-family sequence

| Family | Primary design frames | Implementation gate |
| --- | --- | --- |
| Guest home + discovery | Desktop home `0:4`, mobile home `0:10192`, results `0:1629` / `0:10333` | Real listing API, search/filter, favorites, responsive nav, recent history |
| Stay detail + booking | Detail `0:1935`; identity `0:2081`, stay `0:2153`, details `0:2386`, payment `0:2559`; booking/payment states | Real property, dates, prices, validation, checkout state |
| Guest account + travel | Product Screens account, auth, saved, trips, inbox, guide, legal scenes | Auth, favorites, messages, trips and form state |
| Host workspace | Product Screens host dashboard, listing, calendar, earnings, messages scenes | Protected routes and existing host API operations |
| Admin workspace | Admin overview `0:6909`, listing review `0:7015`, bookings/payments `0:7116`, verification/disputes `0:7228`, content/support `0:7343`, governance/audit `0:7458`, insights `0:7570` | 224px rail, responsive tables, role-protected live operations |

## Work state

- Audit completed: page hierarchy and design foundations; current generic theme and demo content diverge materially.
- Guest home and discovery are visually QA'd at 1440px and 390px, including the mobile search stack, avatar auth menu, circular language menu, and mobile tab naming.
- Sign-in and registration are aligned through the shared split auth shell and Flowbite controls, including the mobile layout. Public Places, Restaurants, Guides, legal pages, and the unknown-route state use the shared guest shell, white canvas, and repository photography.
- The stay detail route loads a real API listing and gallery and is visually aligned with frame `0:1935`. Checkout details, add-ons, and payment passed desktop/mobile QA with the shared Flowbite controls and a 1080px checkout rhythm.
- Saved stays and shared shortlists are aligned with frames `0:3864`, `0:3871`, and `0:2001`; they use real favourites, collection previews, Flowbite controls, and API-backed share links.
- Guest trips, booking history, inbox, conversation detail, support, and profile now share the account shell and OpenPencil desktop/mobile layouts. They preserve real booking, conversation, avatar, payout, review, privacy, and account-deletion flows. The guest account and travel route family is complete.
- Host Today is aligned with frames `0:3583` and `0:4070` and uses the live host bookings and conversations APIs. The host shell now restores the desktop workspace navigation and a light, pill-shaped mobile workspace navigation with legible icons and safe content clearance.
- Host listings now match frame `0:3642` with live lifecycle statuses, operation filters, availability toggles, review submission, calendar links, and listing deletion. The shared host/admin create and edit listing editor is also aligned with frames `0:3955`, `0:4339`, and `0:4710`, including the progress rail and guest preview.
- Host calendar now matches frame `0:3699` with owner-scoped calendar APIs, a multi-property weekly board, reserved/blocked/open states, day details, iCal feed management, and manual blocking. The host calendar no longer depends on admin-only endpoints.
- Host earnings now matches frame `0:3761` with live period filters, full-width status metrics, income trend, payout destination summary, property-level earnings, accounting breakdown, and PDF/CSV reports. The legacy admin earnings page remains unchanged for the admin workspace.
- Host payouts now uses the same white workspace shell with live wallet summary, destination details, schedule, WHT statements, CSV/PDF export, and payout history. Signed-in guest and admin avatar menus now expose the host onboarding route.
- Host setup at `/host/application` now matches frame `0:9744` with a navy setup hero, 4-step progress rail, white form panels, Flowbite controls, secure document uploads, status states, and desktop/mobile QA.
- Admin users now matches the `0:7228` operations language with live account metrics, a responsive people board, Flowbite role/search controls, payout editing, suspension, and account erasure. Desktop and mobile QA passed.
- Admin host applications now matches the same verification language with live review metrics, a responsive queue, encrypted document download, full applicant/business/hosting details, review history, and approve, request-changes, and reject actions. Desktop and mobile QA passed.
- Admin promo codes now matches the content operations language with live offer metrics, a searchable responsive board, status controls, property targeting, and a Flowbite create/edit form. Desktop and mobile QA passed.
- Admin add-ons now matches the same content operations language with live pricing and coverage metrics, searchable responsive inventory, Flowbite service editing, and per-property assignment controls. Desktop and mobile QA passed.
- Admin guest feedback now matches the content operations language with live rating metrics, a searchable rating board, public and private review separation, and a responsive review detail dialog. Desktop and mobile QA passed.
- Admin travel guides now match the content operations language with live publishing metrics, a searchable editorial board, Flowbite create/edit controls, publishing state, and responsive overflow handling. Desktop and mobile QA passed.
- Admin messages now matches the governance operations language with live unread/thread metrics, a searchable conversation queue, mobile list-to-thread navigation, polling, and a Flowbite reply composer. Desktop and mobile QA passed.
- Admin bookings now matches the bookings-and-payments language with live reservation metrics, status filters, Flowbite search and actions, responsive desktop rows, and mobile card rows. Desktop and mobile QA passed.
- Admin earnings and payouts now match the insight and finance language with live KPI cards, Flowbite-styled line and radial gauge charts, property performance, settlement controls, export reports, confirmation dialogs, and responsive tables. Desktop, mobile, and dark-mode QA passed.
- Admin navigation and overlay controls now share Flowbite components: the collapsed desktop rail exposes theme-aware Tooltip flyouts, while quick actions, avatar menus, mobile navigation, filters, and disclosure panels use Flowbite Dropdown, Drawer, Select, and Accordion primitives in the unified stylesheet cascade.
- Guest account, verification, payment-result, saved, and public routes now share one `GuestShell` header/footer, so individual pages no longer render nested or stale navigation. A shared back control returns through in-app history and uses route-family fallbacks on direct visits. Host and admin workspaces expose the same recovery action in their own headers.
- Preserve unrelated dirty worktree changes and never commit generated audit/build directories or credentials.
