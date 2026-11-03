# Terminology edit plan

Date: 2026-11-03. Scope: guest, host and admin display text, translation
values, browser titles, accessible labels, notices, errors and human-readable
exports. This document specifies future edits. No application wording has
been changed.

## Vocabulary and scope

| Context | Preferred English | Application |
| --- | --- | --- |
| Guest discovery, saved items and accommodation detail | Stay / stays | Browse stays, Similar stays, View stay, Stay unavailable |
| Host/admin inventory and publication | Listing / listings | Create a listing, Listing review, Listing calendar, Listing deleted |
| Apartment/studio/category fields | Accommodation type | A physical accommodation category, rather than a publication status |
| Host application inventory before listing creation | Accommodation / places managed | The application can describe real units before listing records exist |
| Reservation and payment records | Booking / reservation | Retain existing contextual meaning; a listing is not a booking |
| Physical building, authority, damage or legal definition | Property where accurate | Ownership documents, property condition and defined legal terms |

Guest-style content in host/admin guest previews still describes a stay.
Management controls around that preview describe a listing. Choose wording
by the meaning of the control, not just the URL or translation namespace.

Preserve existing component filenames, translation key names, API paths,
Prisma/model names, object keys, enum values and identifiers such as
`propertyId`. Preserve `/properties` API endpoints and legacy redirect
addresses. This copy plan does not require a data or URL migration.

Preserve user-written titles, descriptions, saved templates, moderator notes
and historical messages. Update future application-generated text only.

## Baseline verified from the actual merged dictionary

A Node inspection imported `src/i18n/translations.js`, walked the effective
English values and searched for whole words property/properties after
excluding interpolation placeholders.

- 84 English entries matched.
- 24 are in legal dictionaries and are excluded from automatic changes.
- 60 non-legal entries are editorial candidates, not 60 proven active bugs.
  Some older entries/components are dormant.
- All 60 candidates currently have Swahili counterparts and matching
  placeholder sets. Future edits must preserve that baseline.
- The actual title resolver returns `Property calendar | ZuriLofts Host`
  for `/host/calendar/:id`. The guest detail title is already
  `Stay | ZuriLofts`.

Other inconsistencies use the word listing on guest screens or hard-coded
strings outside the dictionary, so the 84-entry search is not the entire
scope. `LanguageContext.jsx` falls back to English and then raw keys;
checking only a working English screen can conceal missing translation work.

## Batch 1: Guest text and shared-key separation

| Dictionary / keys | Proposed English values |
| --- | --- |
| `stays.js`: `stays.typeProperty`, `overview`, `propertyType` | Stay; Stay overview; Accommodation type |
| `stays.similarTitle`, `similarEmpty` | Similar stays; No similar stays found right now. |
| `stays.loadingProperty`, `loadingPropertyText`, `loadFailed` | Loading stay; Loading stay...; Failed to load stay |
| `stays.notFoundTitle`, `notFoundBody` | Stay not found; This stay could not be loaded. |
| `stays.photoGallery`, `detailsPreparing`, `thisProperty` | Stay photo gallery; Additional details about this stay are being prepared.; this stay |
| `stays.aboutListing` | About this stay |
| `booking.js`: `booking.noAddOns`, `loadingProperty`, `propertyUnavailable` | No add-ons are available for this stay.; Loading stay...; Stay unavailable |
| `profile.js`: `profile.browseProperties`, `tapHeartHint` | Browse stays; Tap the heart on any stay to save it here. |
| `payment.js`: `payment.viewProperty` | View stay |
| `saved.js`: `saved.emptyWishlistBody` | The shared link is valid, but there are no stays to display. |
| `saved.propertiesSavedOne`, `propertiesSavedOther` | {count} stay saved; {count} stays saved |
| `saved.noSavedPropertiesTitle`, `noSavedPropertiesBody`, `removeFailed` | No saved stays; Browse stays and add them to this shortlist from any stay page.; Could not remove stay. |

Active consumers include PropertyPage, PropertyTrustPanel,
SimilarProperties, BookingPage, BookingDetailPage, BookingHistoryPage,
ProfilePage, PaymentCallback, FavouritesPage and ShortlistDetailPage.
The detailed source anchors are `stays.js:14,31-40,75-85,108,120,127`,
`booking.js:42,67-68`, `profile.js:44-46`, `payment.js:38`,
`saved.js:35-37,73-74,87`.

Shared-key prerequisite: `stays.loadFailed` is also used by the host editor
at `AdminPropertyForm.jsx:255`. Give that consumer a listing-specific error
key, with both languages, before changing the guest value. Do not show
Failed to load stay on a host listing-editor failure.

Hard-coded guest text to move into the existing translation system:

- `BookingPage.jsx:218-219,1283`: replace guest-facing listing errors with
  This stay is no longer available; We could not load this stay right now.
  Please try again; and This stay could not be loaded.
- `BookingHistoryPage.jsx:68`: replace fallback Property with translated Stay.
- `src/utils/invoice.js:40`: guest receipt heading Property becomes Stay.
  Preserve amounts, legal/tax fields and structural object keys.

Additional candidate values need consumer checks before an edit:

- `home.searchLocation`: Search by location or stay name...
- `misc.shortlistSharedEmpty`: This collection has been shared, but no stays
  have been added yet.
- `register.subheadline`: Create your account to book verified stays across
  Nairobi, save your favourites, or create a listing and start earning.
- `register.benefit3`: Create a listing free and start earning as a host.
- `register.hostSubtitle`: Create a listing and start earning with ZuriLofts.
- `discovery.heroBadgeHost`: Create a listing, if its dormant Hero consumer
  becomes active. The host action deliberately uses listing.

Do not treat dormant copy as a visible bug: BookingSummaryCard and
CancelBookingDialog had no importing consumers in the source search.
`booking.aboutThisListing` belongs to that old summary. No deletion or
component revival is part of this change.

## Batch 2: Host/admin management, onboarding and exports

| File / key or literal | Current meaning | Proposed English |
| --- | --- | --- |
| `titles.js:41`, `title.hostPropertyCalendar` | Property calendar | Listing calendar, retaining the ZuriLofts Host suffix |
| `host.js:89`, `host.yourProperty` | Fallback in host Today priority | your listing |
| `hostmoney.js:26`, `confirmedByProperty` | Confirmed earnings, property by property... | Confirmed earnings, listing by listing, all of which count towards your payouts. |
| `hostmoney.js:51`, `colProperty` | Earnings table heading | Listing |
| `hostsetup.js:17`, `description` | Identity and accommodation review | Complete your identity, accommodation details and review before you publish. |
| `hostsetup.step3Title`, `numberOfProperties`, `relationship` | Physical inventory before publication | Accommodation details; Number of places you manage; Your role in managing these places |
| `hostsetup.propertyTypes`, `propertyLocations` | Application accommodation categories/locations | Accommodation types; Accommodation locations |
| `hostsetup.setUpProperty` | CTA after host setup | Set up your first listing |
| `hostsetup.startApplicationHint`, `step3Short` | Application guidance | Open your application to add your identity, business and accommodation details.; Locations, accommodation mix and experience |
| `admindash.js:183`, `admin.propertiesCount` | Listing record count, if consumed | {count} listings, with a singular form for one listing |
| `admin.colProperty` at `:206` | Admin reservations/reviews table | Listing |
| `admin.addOnsDescription` at `:299` | Add-on assignment management | Manage guest services, pricing, availability, and listing-level assignments. |
| `admin.propertyAssignments`, `activeLinks` at `:307-308` | Add-on assignment summaries | Listing assignments; Active listing-service links |
| `admin.loadingAddOnsHint`, `colCoverage` at `:312,318` | Add-on coverage | Checking service inventory and listing coverage.; Listing coverage |
| `admin.assignedProperties`, `noPropertiesAvailable` at `:332,334` | Add-on assignment picker | Assigned listings; No listings are available. |
| `admin.propertyCountField`, `propertyTypesField` at `:411,413` | Review of applicant's stated physical inventory | Places managed; Accommodation types |
| `admin.propertyTitlePlaceholder`, `propertyType` at `:528,587` | Host listing editor | Listing title; Accommodation type |
| `admin.aboutThisProperty` at `:607` | Guest-style preview in host editor | About this stay, or reuse the existing guest preview key |
| `adminlisting.js:63`, `typeProperty` | Generic accommodation category fallback | accommodation |

Do not label application.propertyCount as a count of published listings.
It records the applicant's declared places and can exist before any listing
record is created. HostApplicationPage and AdminHostApplicationReview must
describe the same field consistently.

Hard-coded management/export text:

- `AdminPropertyForm.jsx:659,949`: photo accessible names/fallbacks become
  Listing photo {index} and Listing, through translation keys. Its guest
  preview heading retains guest meaning as described above.
- `HostCalendarPage.jsx:1100`: management fallback Your stay becomes
  Your listing, with a translation key.
- `HostPayouts.jsx`: table fallback Property becomes translated Listing.
- `HostEarningsPage.jsx:394,431`: CSV/PDF Property heading becomes Listing.
  At `:583,631`, property by property and property totals become listing by
  listing and listing totals. Localize explanatory text and headings where
  appropriate; preserve numeric/date serialization and column order.
- `AdminAddOns.jsx:210,327,390`: Failed to update listing assignment;
  Offered on selected listings / No listing coverage; deletion warning
  refers to every listing and booking that uses the add-on. Preserve the
  warning's irreversible-action meaning.

Source consumers verified: EarningsPropertyList at `:46`, HostEarningsPage
at `:594`, HostTodayPage at `:353`, AdminBookings at `:498`, AdminFeedback
at `:580`, AdminAddOns at `:257-259`, AdminHostApplicationReview at
`:341-344`, HostApplicationPage at `:824-828,1348`, and the host editor.

## Batch 3: Server errors and future generated messages

The server inspection identified 44 hard-coded candidate occurrences
across 12 files. These include 25 generic Property not-found labels;
they are not all guest-facing. Errors reach the client through
`server/src/middleware/errorHandler.ts:9`.

| Audience / files | Planned wording |
| --- | --- |
| Booking inputs in `server/src/types/index.ts:164,207,249` | Stay is required |
| Booking limits in that schema and `booking.service.ts` | Use stay wording while preserving the occupancy limit, scope and existing policy suffix |
| Guest booking, favourites, shortlist and public extras errors | Stay not found; This stay is not currently available; Those dates are no longer available for this stay; This promo code does not apply to this stay |
| `shortlist.service.ts:155` | This stay is already in this shortlist |
| Host/admin listing writes, pricing, stay rules and calendar management | Listing not found |
| `property.controller.ts:152,224` | Listing deleted |
| Admin add-on assignment lookup | Listing add-on assignment not found |
| Public add-on availability | This add-on is not available for this stay |
| Exported calendar feed lookup | Calendar not found, where an audience-neutral error is needed |

Affected services: booking, favorite, shortlist, property, addon,
automated-message, calendar, ical, priceRule and stayRule. Key guest booking
anchors are `booking.service.ts:180-190,221,238,321,350,398-400,1230,1241,1463`.

Shared-service prerequisite: `property.service.ts:530,533` serves public
detail and workspace preview readers. Choose the appropriate human label
at an existing audience/presentation boundary. Preserve status codes,
ownership checks and identical 404 behavior for inaccessible/unpublished
records. Do not introduce a wording difference that discloses their existence.
The public availability and similar-stay lookups also need guest wording.

`validate.ts:16` currently prefixes errors with raw field paths such as
propertyId. Keep that API field name and map its displayed label to Stay or
Listing at the appropriate boundary. This plan does not require a general
error-framework refactor or a new dependency.

Already aligned and to preserve:

- SEO/canonical output in `seo.service.ts:253,268,306` already uses Stay,
  Stays and `/stay/:id`.
- Listing decision notices in `property.service.ts:654-679` already use
  Your listing is live and Changes needed on your listing.
- Host application notices describe listings; guest automated messages
  describe the stay/apartment.
- The `{property}` token in `automated-message.service.ts:72-80` is a saved
  template contract, substituted with a title. Preserve its spelling and
  replacement behavior. Do not expose a renamed unresolved token.
- WHT endpoints return JSON; preserve structural keys. Their human CSV/PDF
  headings are handled in the frontend export batch.

## Batch 4: Language, accessibility and exception review

Update English and Swahili values together. Existing guest translations
mix malazi, makazi/makaazi, nyumba, mali and tangazo. Do not replace all these
words with one mechanically: they can describe accommodation, a physical
home, an asset, an advertisement or the act/period of staying.

Use the existing guest accommodation vocabulary as the starting point.
Align active guest references currently translated as mali or tangazo with
the chosen accommodation meaning. Use tangazo/matangazo for management
listing references where grammatically appropriate. Final Swahili sentences
and singular/plural agreement need a fluent editorial review; these are
proposed terminology choices, not certified translations.

Review guest `stays`, `booking`, `profile`, `payment` and `saved` values,
then `hostsetup`, `hostmoney`, `host`, `admindash`, `adminlisting` and titles.
Preserve placeholders including `{count}`, `{type}`, `{area}`, `{what}`,
`{price}`, `{guest}`, `{property}` and `{time}`. Counts 0, 1 and 2 need
correct visible grammar. Existing host/admin accessibility keys such as
`a11y2.listing` and `a11y3.filterListingsByStatus` already fit their controls.

Exceptions register:

- Preserve the 24 matching legal entries for this copy pass. Intellectual
  Property, defined Property terms, property care/damage and ownership
  language have distinct meanings. Any later legal editorial alignment
  must retain the definitions and obligations consistently.
- `trust.categoryProperty` describes physical Property condition. Retain
  it, or use Accommodation condition only if it improves clarity without
  changing dispute category semantics.
- Proof of ownership or authority over the property and Property authority
  in AdminHostApplicationReview describe physical/legal authority.
- Preserve apartment, studio, penthouse and other actual accommodation
  categories. Publication-review wording can still say listing even on a
  public marketing page that explains how the platform works.
- Preserve persisted templates, messages, account-export structure,
  listing titles and user content. Historical records are not copy constants.

## Verification and sequencing

1. Confirm active consumers and introduce the guest/host shared-error split.
2. Apply guest and host/admin dictionary values with both languages and
   placeholder parity, keeping physical-inventory distinctions intact.
3. Replace hard-coded visible fallbacks, accessible names and export headings.
4. Update audience-specific API text without changing response structure,
   status codes, privacy boundaries or policy limits.
5. Review remaining property/listing text by meaning, including legal and
   dormant exceptions; do not require a zero-match repository search.

Future acceptance checks:

- Guest stay loading, unavailable, success, similar stays, photo gallery,
  checkout extras, payment result and historical-booking fallbacks in EN/SW.
- Empty/populated/shared saved stays and shortlists, with 0/1/2 counts.
- Host setup, application review, editor failure, preview, calendar, Today,
  earnings, payouts, add-on assignment and admin booking/review tables.
- Browser titles after direct load and client navigation; visible and
  screen-reader labels must agree with the current surface.
- Guest invoice and host CSV/PDF/WHT outputs: labels and layout change as
  intended; calculations, tax fields, row order and data remain identical.
- Guest and workspace not-found/validation errors; unpublished/unauthorized
  records retain identical non-disclosing 404 behavior.
- Automated-message interpolation with existing `{property}` templates;
  future notices preserve links and existing deduplication behavior.
- Run `npm run lint`, `npm run build`, server type checks and relevant
  existing lifecycle, notice and SEO tests after implementation. Add focused
  regression checks for the shared error and locale placeholder contracts.

Planning verification completed: effective dictionary scan, EN/SW key and
placeholder parity for the 60 candidates, title resolver inspection, and
source consumer tracing. No UI screenshots, app copy edits, builds or
behavior-change tests were needed for this documentation-only step.
