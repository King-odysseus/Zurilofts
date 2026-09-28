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
- Host listings now match frame `0:3642` with live lifecycle statuses, operation filters, availability toggles, review submission, calendar links, and listing deletion. The create/edit editor remains the next host workspace slice.
- Host calendar now matches frame `0:3699` with owner-scoped calendar APIs, a multi-property weekly board, reserved/blocked/open states, day details, iCal feed management, and manual blocking. The host calendar no longer depends on admin-only endpoints.
- Host earnings now matches frame `0:3761` with live period filters, full-width status metrics, income trend, payout destination summary, property-level earnings, accounting breakdown, and PDF/CSV reports. The legacy admin earnings page remains unchanged for the admin workspace.
- Preserve unrelated dirty worktree changes and never commit generated audit/build directories or credentials.
