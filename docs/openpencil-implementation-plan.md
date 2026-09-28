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
- In progress: guest home and discovery. The stay detail route now loads a real API listing and gallery, but still needs visual alignment with frame `0:1935`. Do not claim other families complete until route-by-route visual and behavior checks pass.
- In progress: functional checkout, sign-in, and public content pages have been restored from existing project implementations. Checkout header/progress, sign-in split layout, and Places card grid have been aligned to their OpenPencil frames; checkout details/payment, sign-up, Restaurants, Guides, and legal pages still need visual QA.
- In progress: account/travel routes now use real profile, trips, booking history, favourites, shortlists and conversation pages behind the existing auth gate. The composite guest account scene `0:9318` still needs a dedicated dashboard/layout pass.
- Preserve unrelated dirty worktree changes and never commit generated audit/build directories or credentials.
