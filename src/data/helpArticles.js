/**
 * Help Centre articles.
 *
 * Content, not code: these are written once here and rendered by two pages, so
 * the wording a guest or host reads comes from a single reviewed source rather
 * than from strings scattered through components.
 *
 * Both languages are required for every field. The product ships English and
 * Kiswahili side by side, and a half-translated article is worse than none: the
 * reader gets a page that changes language halfway down.
 *
 * Rules for anyone editing this file:
 * - Only describe what the app actually does. No promised response times, no
 *   refund deadlines, no emergency service.
 * - `action.href` must be a route that exists. `/help/<slug>` is for the
 *   `contact` article, and its action is the support thread, not itself.
 * - Plain text only. No HTML, no markdown. The renderer emits text nodes.
 */

export const HELP_AUDIENCES = ['everyone', 'guest', 'host'];
export const HELP_TOPICS = ['stays', 'money', 'account', 'hosting', 'safety'];

export const helpArticles = [
  {
    slug: 'finding-a-stay',
    audience: 'guest',
    topic: 'stays',
    title: {
      en: 'Finding a stay that suits you',
      sw: 'Kupata makaazi yanayokufaa',
    },
    summary: {
      en: 'How to search by area, dates and guests, and how the filters narrow the list.',
      sw: 'Jinsi ya kutafuta kwa eneo, tarehe na wageni, na jinsi vichujio vinavyopunguza orodha.',
    },
    keywords: {
      en: ['search', 'area', 'dates', 'guests', 'filters', 'sort'],
      sw: ['tafuta', 'eneo', 'tarehe', 'wageni', 'vichujio', 'panga'],
    },
    steps: {
      en: [
        'Enter an area, or choose All Kenya to search the whole country.',
        'Add your check-in and check-out dates. Only stays free for those nights are shown.',
        'Set how many guests are travelling, then search.',
        'On the results page, use Filters to set a price range, minimum bedrooms or bathrooms, and amenities such as wifi or parking.',
        'Use Sort by to order the list by price or rating.',
      ],
      sw: [
        'Weka eneo, au chagua Kenya yote ili kutafuta nchini kote.',
        'Ongeza tarehe ya kuwasili na ya kuondoka. Makaazi yaliyo huru usiku huo pekee ndiyo yanayoonekana.',
        'Weka idadi ya wageni, kisha tafuta.',
        'Kwenye ukurasa wa matokeo, tumia Vichujio kuweka kiwango cha bei, chumba cha kulala au bafu cha chini, na huduma kama wifi au maegesho.',
        'Tumia Panga kwa kupanga orodha kwa bei au kwa alama.',
      ],
    },
    related: ['booking-and-payment', 'reviews-and-saved-stays'],
    action: { href: '/stays', labelKey: 'help.actionBrowseStays' },
  },
  {
    slug: 'booking-and-payment',
    audience: 'guest',
    topic: 'money',
    title: {
      en: 'Booking a stay and paying for it',
      sw: 'Kuhifadhi makaazi na kulipia',
    },
    summary: {
      en: 'What happens between choosing a stay and having a confirmed booking.',
      sw: 'Kinachotokea kati ya kuchagua makaazi na kupata uhifadhi uliothibitishwa.',
    },
    keywords: {
      en: ['booking', 'payment', 'card', 'mpesa', 'receipt', 'confirmation'],
      sw: ['uhifadhi', 'malipo', 'kadi', 'mpesa', 'risiti', 'uthibitisho'],
    },
    steps: {
      en: [
        'Choose your dates and guests on the stay page, then continue to checkout.',
        'Add any extras offered for that stay, then review the total. The total shows the nightly charge, any cleaning fee and the fees that apply.',
        'Choose how to pay. Card and M-Pesa are handled by our payment provider, so your card or phone details are entered on their secure pages, never on ZuriLofts.',
        'If identity verification is needed, you are asked for it before payment can finish.',
        'A booking is confirmed only after the provider verifies the payment. You then see it under Trips with a receipt you can download.',
      ],
      sw: [
        'Chagua tarehe na wageni kwenye ukurasa wa makaazi, kisha endelea kwenye malipo.',
        'Ongeza huduma za ziada zinazotolewa kwa makaazi hayo, kisha pitia jumla. Jumla inaonyesha bei ya usiku, ada ya usafi na ada zinazohusika.',
        'Chagua namna ya kulipa. Kadi na M-Pesa hushughulikiwa na mtoa huduma wa malipo, hivyo taarifa za kadi au simu yako huwekwa kwenye kurasa zao salama, si kwenye ZuriLofts.',
        'Ikiwa uthibitishaji wa utambulisho unahitajika, utaombwa kabla malipo hayajakamilika.',
        'Uhifadhi huthibitishwa tu baada ya mtoa huduma kuthibitisha malipo. Kisha unauona kwenye Safari ukiwa na risiti unayoweza kupakua.',
      ],
    },
    related: ['cancellations-and-refunds', 'identity-and-disputes', 'finding-a-stay'],
    action: { href: '/bookings', labelKey: 'help.actionViewBookings' },
  },
  {
    slug: 'arrival-and-host-messages',
    audience: 'guest',
    topic: 'stays',
    title: {
      en: 'Arriving, and messaging your host',
      sw: 'Kufika, na kutuma ujumbe kwa mwenyeji',
    },
    summary: {
      en: 'Where to find directions, check-in times and how to reach your host before you travel.',
      sw: 'Wapi kupata maelekezo, saa za kuingia na jinsi ya kumfikia mwenyeji kabla ya safari.',
    },
    keywords: {
      en: ['arrival', 'check-in', 'directions', 'host', 'message', 'inbox'],
      sw: ['kuwasili', 'kuingia', 'maelekezo', 'mwenyeji', 'ujumbe', 'kikasha'],
    },
    steps: {
      en: [
        'Open Trips and choose your stay to see the dates, the check-in time and the address.',
        'If the host has written an arrival guide, it is linked from the stay and covers directions, access and house rules.',
        'Message your host from the conversation attached to that booking. It opens from the stay and from Inbox.',
        'Keep arrival questions in that conversation so the host has the booking in front of them when they reply.',
      ],
      sw: [
        'Fungua Safari na uchague makaazi yako kuona tarehe, saa ya kuingia na anwani.',
        'Ikiwa mwenyeji ameandika mwongozo wa kuwasili, unaunganishwa kutoka kwenye makaazi na unaeleza njia, namna ya kuingia na kanuni za nyumba.',
        'Tumia ujumbe kwa mwenyeji wako kutoka mazungumzo yaliyounganishwa na uhifadhi huo. Unafunguka kutoka kwenye makaazi na kutoka Kikasha.',
        'Weka maswali ya kuwasili kwenye mazungumzo hayo ili mwenyeji awe na uhifadhi mbele yake anapojibu.',
      ],
    },
    related: ['booking-and-payment', 'contact'],
    action: { href: '/inbox', labelKey: 'help.actionOpenInbox' },
  },
  {
    slug: 'cancellations-and-refunds',
    audience: 'guest',
    topic: 'money',
    title: {
      en: 'Cancellations and refunds',
      sw: 'Kughairi na marejesho ya fedha',
    },
    summary: {
      en: 'What to do when plans change, and where the outcome of a refund is recorded.',
      sw: 'La kufanya mipango inapobadilika, na wapi matokeo ya marejesho yameandikwa.',
    },
    keywords: {
      en: ['cancel', 'cancellation', 'refund', 'money back', 'change dates'],
      sw: ['ghairi', 'kughairi', 'marejesho', 'kurudisha fedha', 'badilisha tarehe'],
    },
    steps: {
      en: [
        'Open the booking under Trips to see whether cancelling is still offered for those dates.',
        'If it is, cancel from the booking. The page then shows the booking as cancelled and records what was charged and what is being returned.',
        'Contact your host first if you only need different dates. A date change is agreed with the host, not applied automatically.',
        'If the amount returned does not match what you expected, open a dispute on that booking so it is recorded with the payment details attached.',
      ],
      sw: [
        'Fungua uhifadhi kwenye Safari kuona kama kughairi bado kunaruhusiwa kwa tarehe hizo.',
        'Ikiwa ndiyo, ghairi kutoka kwenye uhifadhi. Ukurasa utaonyesha uhifadhi umeshairiwa na kurekodi kile kilichotozwa na kile kinachorejeshwa.',
        'Wasiliana na mwenyeji kwanza ikiwa unahitaji tarehe tofauti tu. Mabadiliko ya tarehe hukubaliwa na mwenyeji, hayatumiki kiotomatiki.',
        'Ikiwa kiasi kilichorejeshwa hakiendani na ulichotarajia, fungua mgogoro kwenye uhifadhi huo ili urekodiwe pamoja na taarifa za malipo.',
      ],
    },
    related: ['booking-and-payment', 'identity-and-disputes'],
    action: { href: '/bookings', labelKey: 'help.actionViewBookings' },
  },
  {
    slug: 'identity-and-disputes',
    audience: 'guest',
    topic: 'safety',
    title: {
      en: 'Verifying your identity and opening a dispute',
      sw: 'Kuthibitisha utambulisho na kufungua mgogoro',
    },
    summary: {
      en: 'Why identity checks are asked for, and how a problem with a stay is recorded and resolved.',
      sw: 'Kwa nini uthibitisho wa utambulisho huombwa, na jinsi tatizo la makaazi linavyorekodiwa na kutatuliwa.',
    },
    keywords: {
      en: ['verify', 'identity', 'documents', 'dispute', 'problem', 'report'],
      sw: ['thibitisha', 'utambulisho', 'nyaraka', 'mgogoro', 'tatizo', 'ripoti'],
    },
    steps: {
      en: [
        'Open Trust and recovery to see what identity verification needs from you.',
        'Enter your legal name and date of birth, then add the documents listed: your ID or passport, and a selfie holding it.',
        'Upload a clear photo or a PDF. Files are encrypted and used only for verification.',
        'A booking that needs verification is held, not lost, while the review completes.',
        'To report a problem with a stay, open that booking and choose Report an issue. You can add evidence and follow the resolution thread there.',
      ],
      sw: [
        'Fungua Uaminifu na urejeshaji kuona kile uthibitisho wa utambulisho unachohitaji kutoka kwako.',
        'Weka jina lako la kisheria na tarehe ya kuzaliwa, kisha ongeza nyaraka zilizoorodheshwa: kitambulisho au pasipoti yako, na selfie ukiwa na kitambulisho.',
        'Pakia picha iliyo wazi au PDF. Faili husimbwa na hutumika kwa uthibitisho pekee.',
        'Uhifadhi unaohitaji uthibitisho huzuiliwa, haupotei, wakati ukaguzi unakamilika.',
        'Ili kuripoti tatizo la makaazi, fungua uhifadhi huo na uchague Ripoti tatizo. Unaweza kuongeza ushahidi na kufuata mazungumzo ya utatuzi hapo.',
      ],
    },
    related: ['cancellations-and-refunds', 'privacy-and-safety'],
    action: { href: '/verify-identity', labelKey: 'help.actionOpenTrust' },
  },
  {
    slug: 'reviews-and-saved-stays',
    audience: 'guest',
    topic: 'stays',
    title: {
      en: 'Reviews, saved stays and shortlists',
      sw: 'Maoni, makaazi yaliyohifadhiwa na orodha',
    },
    summary: {
      en: 'Where to write a review after a stay, and how to keep the places you like together.',
      sw: 'Wapi kuandika maoni baada ya makaazi, na jinsi ya kuweka pamoja sehemu unazozipenda.',
    },
    keywords: {
      en: ['review', 'rating', 'favourite', 'saved', 'shortlist', 'share'],
      sw: ['maoni', 'alama', 'kipendwa', 'kuhifadhi', 'orodha', 'shiriki'],
    },
    steps: {
      en: [
        'After a stay, open the booking under Trips to find the review form for that stay.',
        'Reviews show the guest name, the rating and the comment. Your full surname is not published.',
        'Save a stay with the heart on any stay card. Saved stays appear under Favourites.',
        'Group stays into a shortlist when you are planning with other people, and share the shortlist link with them.',
      ],
      sw: [
        'Baada ya makaazi, fungua uhifadhi kwenye Safari kupata fomu ya maoni kwa makaazi hayo.',
        'Maoni huonyesha jina la mgeni, alama na maoni yenyewe. Jina lako kamili la ukoo halichapishwi.',
        'Hifadhi makaazi kwa alama ya moyo kwenye kadi yoyote. Makaazi yaliyohifadhiwa yanaonekana kwenye Vipendwa.',
        'Unganisha makaazi kwenye orodha mnapopanga na wengine, na shiriki kiungo cha orodha nao.',
      ],
    },
    related: ['finding-a-stay', 'booking-and-payment'],
    action: { href: '/favourites', labelKey: 'help.actionOpenFavourites' },
  },
  {
    slug: 'host-application',
    audience: 'host',
    topic: 'hosting',
    title: {
      en: 'Becoming a host',
      sw: 'Kuwa mkaribishaji',
    },
    summary: {
      en: 'What the host application asks for, and what happens after you send it.',
      sw: 'Ombi la mkaribishaji linahitaji nini, na kinachotokea baada ya kulituma.',
    },
    keywords: {
      en: ['host', 'apply', 'application', 'payout', 'identity', 'review'],
      sw: ['mkaribishaji', 'omba', 'ombi', 'malipo', 'utambulisho', 'ukaguzi'],
    },
    steps: {
      en: [
        'Start from Become a host. The fees and what hosting involves are set out there before you sign anything.',
        'Complete the application: your details, your payout destination, and the identity documents asked for.',
        'Send it for review. You can follow its state from the host workspace.',
        'If it is sent back for changes, the application says what to correct. Update it and send it again.',
        'Once approved you can create a listing. A listing is still reviewed before guests can book it.',
      ],
      sw: [
        'Anza kwenye Kuwa mkaribishaji. Ada na kile ukaribishaji unachohusisha vimeelezwa hapo kabla ya kusaini chochote.',
        'Kamilisha ombi: taarifa zako, mahali pa kupokea malipo, na nyaraka za utambulisho zilizoombwa.',
        'Litume kwa ukaguzi. Unaweza kufuata hali yake kutoka eneo la mkaribishaji.',
        'Ikiwa litarudishwa kwa marekebisho, ombi linaeleza la kurekebisha. Lisasishie na ulitume tena.',
        'Ukikubaliwa unaweza kuunda tangazo. Tangazo bado hukaguliwa kabla wageni kuweza kulihifadhi.',
      ],
    },
    related: ['listing-review', 'earnings-and-payouts'],
    action: { href: '/host/application', labelKey: 'help.actionOpenApplication' },
  },
  {
    slug: 'listing-review',
    audience: 'host',
    topic: 'hosting',
    title: {
      en: 'Preparing a listing for review',
      sw: 'Kuandaa tangazo kwa ukaguzi',
    },
    summary: {
      en: 'What is checked before a listing goes live, and why edits are paused during review.',
      sw: 'Kinachokaguliwa kabla tangazo kuonekana, na kwa nini mabadiliko huzuiliwa wakati wa ukaguzi.',
    },
    keywords: {
      en: ['listing', 'review', 'approval', 'photos', 'description', 'publish', 'edit'],
      sw: ['tangazo', 'ukaguzi', 'idhini', 'picha', 'maelezo', 'chapisha', 'hariri'],
    },
    steps: {
      en: [
        'Open Your listings and create a listing. You can save it as a draft and finish it later.',
        'Add photos, an honest description, the amenities, the address and a location pin, and set your nightly rate.',
        'Submit it for review. While a listing is in review it cannot be edited, so finish it before you send it.',
        'If it is sent back, the listing says what needs changing. Update those details and submit again.',
        'Only a published listing accepts bookings. Your own preview shows exactly what a guest would see.',
      ],
      sw: [
        'Fungua Matangazo yako na uunde tangazo. Unaweza kulihifadhi kama rasimu na kulikamilisha baadaye.',
        'Ongeza picha, maelezo ya kweli, huduma, anwani na alama ya eneo, kisha weka bei ya usiku.',
        'Liwasilishe kwa ukaguzi. Tangazo linapokuwa kwenye ukaguzi haliwezi kuhaririwa, hivyo likamilishe kabla ya kulituma.',
        'Ikiwa litarudishwa, tangazo linaeleza la kubadilisha. Sasisha maelezo hayo na uwasilishe tena.',
        'Tangazo lililochapishwa pekee ndilo hupokea uhifadhi. Onyesho lako linaonyesha hasa kile mgeni angeona.',
      ],
    },
    related: ['host-application', 'calendar-and-reservations'],
    action: { href: '/host/listings', labelKey: 'help.actionOpenListings' },
  },
  {
    slug: 'calendar-and-reservations',
    audience: 'host',
    topic: 'hosting',
    title: {
      en: 'Calendar, availability and reservations',
      sw: 'Kalenda, upatikanaji na uhifadhi',
    },
    summary: {
      en: 'Keeping nights open or blocked, and connecting the calendars you already use.',
      sw: 'Kuweka usiku wazi au umefungwa, na kuunganisha kalenda unazotumia tayari.',
    },
    keywords: {
      en: ['calendar', 'availability', 'block', 'price', 'ical', 'double booking', 'reservation'],
      sw: ['kalenda', 'upatikanaji', 'funga', 'bei', 'ical', 'uhifadhi mara mbili', 'uhifadhi'],
    },
    steps: {
      en: [
        'Open Calendar to see every night, what it costs and who is already booked.',
        'Pick the nights you want to change, then block or open them together. A blocked night cannot be booked.',
        'Set a different price for particular nights when demand changes, or keep the base rate for all of them.',
        'Connect the calendars you use on other platforms. ZuriLofts then imports those bookings as blocked nights, so a stay is not sold twice.',
        'Reservations lists every booking across your listings with the guest and the dates.',
      ],
      sw: [
        'Fungua Kalenda kuona kila usiku, bei yake na nani amehifadhi tayari.',
        'Chagua usiku unaotaka kubadilisha, kisha funga au fungua kwa pamoja. Usiku uliofungwa hauwezi kuhifadhiwa.',
        'Weka bei tofauti kwa usiku fulani mahitaji yanapobadilika, au tumia bei ya msingi kwa wote.',
        'Unganisha kalenda unazotumia kwenye majukwaa mengine. ZuriLofts huingiza uhifadhi huo kama usiku uliofungwa, ili makaazi yasihifadhiwe mara mbili.',
        'Uhifadhi huorodhesha kila uhifadhi wa matangazo yako pamoja na mgeni na tarehe.',
      ],
    },
    related: ['listing-review', 'host-messages-and-arrival'],
    action: { href: '/host/calendar', labelKey: 'help.actionOpenCalendar' },
  },
  {
    slug: 'host-messages-and-arrival',
    audience: 'host',
    topic: 'hosting',
    title: {
      en: 'Guest messages and arrival details',
      sw: 'Ujumbe wa wageni na taarifa za kuwasili',
    },
    summary: {
      en: 'Where guest conversations appear, and how to write arrival guidance once.',
      sw: 'Mazungumzo ya wageni yanaonekana wapi, na jinsi ya kuandika mwongozo wa kuwasili mara moja.',
    },
    keywords: {
      en: ['message', 'guest', 'inbox', 'arrival', 'directions', 'wifi', 'check-in'],
      sw: ['ujumbe', 'mgeni', 'kikasha', 'kuwasili', 'maelekezo', 'wifi', 'kuingia'],
    },
    steps: {
      en: [
        'Open Guest messages to see one conversation per booking, newest first.',
        'Reply from the conversation so the booking details stay beside the discussion.',
        'Write an arrival guide on the listing: directions, gate, parking, wifi, hot water and the house rules guests must follow.',
        'Guests see the arrival guide from their booking, which means you do not have to repeat it in every message.',
      ],
      sw: [
        'Fungua Ujumbe wa wageni kuona mazungumzo moja kwa kila uhifadhi, mapya kwanza.',
        'Jibu kutoka kwenye mazungumzo ili taarifa za uhifadhi zibaki karibu na majadiliano.',
        'Andika mwongozo wa kuwasili kwenye tangazo: njia, lango, maegesho, wifi, maji ya moto na kanuni za nyumba ambazo wageni lazima wafuate.',
        'Wageni huona mwongozo wa kuwasili kutoka kwenye uhifadhi wao, hivyo huhitaji kuurudia kwenye kila ujumbe.',
      ],
    },
    related: ['calendar-and-reservations', 'listing-review'],
    action: { href: '/host/inbox', labelKey: 'help.actionOpenHostInbox' },
  },
  {
    slug: 'earnings-and-payouts',
    audience: 'host',
    topic: 'money',
    title: {
      en: 'Earnings and payouts',
      sw: 'Mapato na malipo',
    },
    summary: {
      en: 'How earnings are recorded, and what must be set before money can be sent.',
      sw: 'Jinsi mapato yanavyorekodiwa, na kinachopaswa kuwekwa kabla fedha kutumwa.',
    },
    keywords: {
      en: ['earnings', 'payout', 'bank', 'transfer', 'fees', 'statement'],
      sw: ['mapato', 'malipo', 'benki', 'uhamisho', 'ada', 'taarifa'],
    },
    steps: {
      en: [
        'Earnings shows what each completed stay earned and what the platform fee was.',
        'Set a payout destination under Payouts before a transfer can be sent. The bank list is read from our payment provider.',
        'If the bank list cannot be loaded, the screen says so and offers a retry rather than an empty menu.',
        'A payout moves through states: requested, processing, then sent or returned. A returned payout puts the amount back on your balance.',
        'Payouts need a verified identity. Complete verification if the screen says your payout is held.',
      ],
      sw: [
        'Mapato huonyesha kile kila makaazi yaliyokamilika yalipata na ada ya jukwaa ilikuwa kiasi gani.',
        'Weka mahali pa kupokea malipo kwenye Malipo kabla uhamisho kutumwa. Orodha ya benki husomwa kutoka kwa mtoa huduma wa malipo.',
        'Ikiwa orodha ya benki haiwezi kupakiwa, skrini inasema hivyo na inatoa nafasi ya kujaribu tena badala ya menyu tupu.',
        'Malipo hupitia hatua: yameombwa, yanachakatwa, kisha yametumwa au yamerejeshwa. Malipo yaliyorejeshwa hurudisha kiasi kwenye salio lako.',
        'Malipo yanahitaji utambulisho uliothibitishwa. Kamilisha uthibitisho ikiwa skrini inasema malipo yako yamezuiliwa.',
      ],
    },
    related: ['host-application', 'account-access'],
    action: { href: '/host/earnings', labelKey: 'help.actionOpenEarnings' },
  },
  {
    slug: 'account-access',
    audience: 'everyone',
    topic: 'account',
    title: {
      en: 'Signing in and getting back into your account',
      sw: 'Kuingia na kurejesha ufikiaji wa akaunti yako',
    },
    summary: {
      en: 'What to do when a password is forgotten, or a sign-in link does not work.',
      sw: 'La kufanya nenosiri likisahaulika, au kiungo cha kuingia kisipofanya kazi.',
    },
    keywords: {
      en: ['password', 'forgot', 'reset', 'sign in', 'login', 'email', 'locked out'],
      sw: ['nenosiri', 'umesahau', 'weka upya', 'ingia', 'barua pepe', 'umefungiwa'],
    },
    steps: {
      en: [
        'On the sign-in page choose Forgot password, then enter the email address on your account.',
        'If an account with a password exists for that address, a reset link is sent to it. The page says the same thing either way, so nobody can use it to discover which addresses have accounts.',
        'The link works once and expires after 30 minutes. Opening it shows a form for a new password.',
        'Changing your password signs out the other devices on that account, so sign in again everywhere you still use.',
        'If no email arrives, check the spam folder, then ask support from Contact below. Support cannot see your password, and will only send a new link.',
      ],
      sw: [
        'Kwenye ukurasa wa kuingia chagua Umesahau nenosiri, kisha weka barua pepe ya akaunti yako.',
        'Ikiwa akaunti yenye nenosiri ipo kwa anwani hiyo, kiungo cha kuweka upya hutumwa. Ukurasa husema kitu kimoja vyovyote vile, hivyo hakuna anayeweza kutumia kujua anwani zipi zina akaunti.',
        'Kiungo hufanya kazi mara moja na huisha baada ya dakika 30. Kukifungua kunaonyesha fomu ya nenosiri jipya.',
        'Kubadilisha nenosiri hukutoa kwenye vifaa vingine vya akaunti hiyo, hivyo ingia tena kila unapotumia.',
        'Ikiwa barua pepe haifiki, angalia folda ya taka, kisha omba msaada kutoka Wasiliana hapa chini. Msaada hauwezi kuona nenosiri lako, na utatumwa kiungo kipya pekee.',
      ],
    },
    related: ['privacy-and-safety', 'contact'],
    action: { href: '/login', labelKey: 'help.actionGoToSignIn' },
  },
  {
    slug: 'privacy-and-safety',
    audience: 'everyone',
    topic: 'safety',
    title: {
      en: 'Your privacy, and staying safe',
      sw: 'Faragha yako, na kuwa salama',
    },
    summary: {
      en: 'What we keep, who can see a conversation, and what to do about a suspicious message.',
      sw: 'Tunachohifadhi, nani anaweza kuona mazungumzo, na la kufanya kuhusu ujumbe unaotia shaka.',
    },
    keywords: {
      en: ['privacy', 'data', 'safety', 'scam', 'suspicious', 'documents', 'cookies'],
      sw: ['faragha', 'data', 'usalama', 'utapeli', 'kutia shaka', 'nyaraka', 'vidakuzi'],
    },
    steps: {
      en: [
        'Identity documents are encrypted and used only to verify you. They are not shown to hosts or guests.',
        'A conversation is readable by the two people in it, and by the resolution team when a case is open.',
        'Files sent in a message are not public: a link to one works only for someone in that conversation.',
        'Never pay outside ZuriLofts. A request to move the conversation to another app and pay there is not from us.',
        'Report a suspicious message or a stay that does not exist from that booking or conversation. Use the cookie choices in the footer to change what is stored on your device.',
      ],
      sw: [
        'Nyaraka za utambulisho husimbwa na hutumika kukuthibitisha pekee. Hazionyeshwi kwa wakurugenzi wa nyumba wala wageni.',
        'Mazungumzo husomeka na watu wawili waliomo, na na timu ya utatuzi kesi inapokuwa wazi.',
        'Faili zinazotumwa kwenye ujumbe si za umma: kiungo cha faili hufanya kazi kwa aliye kwenye mazungumzo hayo pekee.',
        'Kamwe usilipe nje ya ZuriLofts. Ombi la kuhamisha mazungumzo kwenye programu nyingine na kulipa hapo halitoki kwetu.',
        'Ripoti ujumbe unaotia shaka au makaazi yasiyokuwepo kutoka kwenye uhifadhi au mazungumzo hayo. Tumia chaguo za vidakuzi kwenye sehemu ya chini kubadilisha kinachohifadhiwa kwenye kifaa chako.',
      ],
    },
    related: ['identity-and-disputes', 'account-access'],
    action: { href: '/privacy', labelKey: 'help.actionReadPrivacy' },
  },
  {
    slug: 'contact',
    audience: 'everyone',
    topic: 'account',
    title: {
      en: 'Contacting support',
      sw: 'Kuwasiliana na msaada',
    },
    summary: {
      en: 'How to reach the team, and what to include so a case can be handled in one reply.',
      sw: 'Jinsi ya kufikia timu, na nini cha kujumuisha ili kesi ishughulikiwe kwa jibu moja.',
    },
    keywords: {
      en: ['contact', 'support', 'help', 'message', 'problem', 'email'],
      sw: ['wasiliana', 'msaada', 'help', 'ujumbe', 'tatizo', 'barua pepe'],
    },
    steps: {
      en: [
        'Sign in and open Contact support to write to the team in a secure thread.',
        'Include the booking reference, the dates, and what you would like to happen.',
        'For a problem with a stay, open the dispute on that booking first: the payment and conversation details are already attached there.',
        'Documents are never needed by email. Support will ask you to upload them through the app if identity verification is the issue.',
      ],
      sw: [
        'Ingia na ufungue Wasiliana na msaada ili kuandikia timu kwenye mazungumzo salama.',
        'Jumuisha kumbukumbu ya uhifadhi, tarehe, na unachotaka kitokee.',
        'Kwa tatizo la makaazi, fungua mgogoro kwenye uhifadhi huo kwanza: taarifa za malipo na mazungumzo ziko tayari hapo.',
        'Nyaraka hazihitajiki kwa barua pepe kamwe. Msaada utakuomba kuzipakia kupitia programu ikiwa tatizo ni uthibitisho wa utambulisho.',
      ],
    },
    related: ['account-access', 'privacy-and-safety'],
    action: { href: '/messages', labelKey: 'help.actionContactSupport' },
  },
];

/** Articles in the order they are shown, filtered by the reader's role. */
export function articlesFor(audience) {
  return helpArticles.filter(
    (article) => article.audience === 'everyone' || article.audience === audience
  );
}

export function findArticle(slug) {
  return helpArticles.find((article) => article.slug === slug) || null;
}

/** Related articles that actually exist, so a stale slug cannot become a dead link. */
export function relatedArticles(article) {
  if (!article) return [];
  return article.related.map(findArticle).filter(Boolean);
}
