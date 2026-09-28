# OpenPencil route reference matrix

Every frontend route must be compared with its named OpenPencil frame before it is marked visually complete. A restored legacy implementation is **functional only**, not design-complete. The shared controls reference is Product `0:4165` / `0:4207` and Design System `0:4946`; inputs and dropdowns follow the Flowbite control pattern with OpenPencil colours.

| Application route(s) | OpenPencil reference | Visual status |
| --- | --- | --- |
| `/` | Product `0:4`, mobile `0:10192` | Implemented; desktop/mobile QA passed for layout, navigation, controls |
| `/properties` | Product `0:1629`, mobile `0:10333`; filters `0:3591`, `0:3745` | Implemented; desktop/mobile QA passed for search/filter layout and controls |
| `/property/:id` | Product `0:1935`, gallery `0:4441`, availability `0:4542` | Implemented with real listing data and repository photography; desktop/mobile QA passed |
| `/booking/:id` | Product `0:2081`, `0:2153`, `0:2386`, `0:2559`, states `0:2708`, `0:2757` | Implemented; desktop/mobile QA passed for details, add-ons, and payment |
| `/payment/callback` | Product `0:2757` | Functional legacy, redesign pending |
| `/login`, `/register`, `/auth/callback` | Product `0:1365`, `0:1538`, connection `0:3497` | Login and register aligned with shared Flowbite controls; desktop/mobile QA passed |
| `/places`, `/restaurants` | Product `0:2825`, `0:10436`; `0:2858`, `0:10544` | Implemented with repository photography; desktop/mobile QA passed |
| `/guides`, `/guides/:id` | Product `0:2891`, `0:10948`; detail `0:2925`, `0:10857` | Implemented with API data and repository photography; desktop/mobile QA passed |
| `/privacy`, `/terms`, unknown route | Product `0:3059`, `0:3110`, `0:2964` | Implemented in the shared public shell with editorial legal layout; desktop/mobile QA passed |
| `/favourites`, `/shortlists`, `/shortlists/:id`, `/s/:token` | Saved `0:3864`, tabs `0:3871`, shared shortlist `0:2001` | Implemented with real favourites, collection previews and shared links; desktop/mobile QA passed |
| `/trips`, `/booking-history`, `/bookings` | Guest Trips `0:3821` / mobile `0:4018`; account/history `0:9318` | Implemented with real booking data, receipts, messaging, and responsive account navigation; desktop/mobile QA passed |
| `/inbox`, `/inbox/:id`, `/messages` | Guest Inbox `0:3910`, conversation detail `0:3940` | Implemented with real conversations, polling, read state, sending, support thread, and mobile detail flow; desktop/mobile QA passed |
| `/profile` | Guest Account `0:3960`, security `0:4626` | Implemented with account shell, Flowbite controls, avatar upload, host payouts, reviews, privacy controls, and account deletion; desktop/mobile QA passed |
| `/verify-identity` | Product trust `0:9724`, security `0:4626` | Live identity flow redesigned; dispute flow still pending |
| `/host/application` | Product `0:9744`, application states `0:4123` | Functional legacy, redesign pending |
| `/host/today` | Host Today `0:3583`, mobile `0:4070`, navigation `0:3584` | Implemented with live arrivals, in-house, departures, recent conversations, responsive tabs, and the mobile pill workspace navigation; desktop/mobile QA passed |
| `/host/listings` | Host Listings `0:3642` | Implemented with live listing data, lifecycle filters, draft submission, availability controls, deletion, and repository photography; desktop/mobile QA passed |
| `/host/properties/new`, `/host/properties/:id/edit` | Host Listing Editor `0:4339`, edit `0:3955`, preview `0:4710` | Functional legacy, redesign pending |
| `/host/calendar`, `/host/calendar/:id` | Host Calendar `0:3699` | Implemented with owner-scoped weekly availability, reservations, manual blocks, iCal feeds, week navigation, and detail panel; desktop/mobile QA passed |
| `/host/earnings` | Host Earnings `0:3761` | Implemented with live period metrics, wallet summary, property earnings, income breakdown, and PDF/CSV reports; desktop/mobile QA passed |
| `/host/payouts` | Host Earnings `0:3761`, payout details `0:4039` | Functional legacy, redesign pending |
| `/admin` | Admin `0:6909`, workspace `0:6598` | Redesigned overview, QA ongoing |
| `/admin/properties` | Admin `0:7015` | Redesigned live listing review, QA ongoing |
| `/admin/properties/new`, `/admin/properties/:id/edit`, `/admin/properties/:id/calendar` | Admin `0:7015`, Product listing editor `0:3955` | Functional legacy, redesign pending |
| `/admin/bookings`, `/admin/earnings`, `/admin/payouts` | Admin `0:7116`, insights `0:7570` | Functional legacy, redesign pending |
| `/admin/users`, `/admin/host-applications` | Admin `0:7228`, Product `0:4123` | Functional legacy, redesign pending |
| `/admin/promos`, `/admin/addons`, `/admin/guides` | Admin `0:7343`, content/support `0:6855` | Functional legacy, redesign pending |
| `/admin/feedback`, `/admin/messages` | Admin `0:7343`, governance `0:7458` | Functional legacy, redesign pending |

OpenPencil has composite rather than standalone frames for several legacy CRUD screens. Their listed composite frame is the design-system anchor; a dedicated design frame should be added in OpenPencil if the implemented layout needs a distinct handoff. The repository photo assets, not design placeholders, supply product imagery.

## Shared implementation rules verified

- Page canvases are white. Beige/sand is reserved for accents, tinted panels, and interaction states.
- Header guest actions are grouped under the avatar menu; language is a circular translate control.
- Flowbite controls are styled through Tailwind's current `flowbite-react/dist` content path, with shared input/select/dropdown geometry from `src/flowbite-controls.css`.
- Bronze action buttons use white text.
- Mobile `Inbox` navigation matches the OpenPencil mobile tab naming.
