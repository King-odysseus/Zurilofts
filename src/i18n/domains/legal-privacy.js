/**
 * legal-privacy: the ZuriLofts Privacy Policy page, front to back.
 *
 * The policy is a contract, so the Swahili here keeps every obligation and
 * qualifier the English states, sentence for sentence - nothing is summarised.
 * Defined terms follow one glossary across the legal pages: Jukwaa (Platform),
 * Huduma (Service), Akaunti (Account), data binafsi (personal data), mdhibiti
 * wa data (data controller), msindikaji wa data (data processor), Uhifadhi
 * (Booking), Mali (Property), Tangazo (Listing), Malipo (Payment), Tathmini
 * (Review), Idhini (Consent), Vidakuzi (Cookies).
 *
 * Several paragraphs carry inline emphasis, so their wording is split around
 * the <strong>/<em> tags: the page renders the fragments in order and the
 * emphasis falls on the same word it falls on in English.
 *
 * Everything in the page that is data rather than prose stays in the markup:
 * email addresses, domain names, vendor names, the policy version and the
 * "last updated" date value.
 */
export const legalPrivacy = {
  en: {
    legal: {
      privacy: {
        // Page header
        home: 'Home',
        privacy: 'Privacy',
        eyebrow: 'Legal',
        title: 'Privacy Policy',
        lastUpdatedLabel: 'Last updated:',
        policyVersionLabel: 'Policy version:',

        // Shared labels for the contact blocks in sections 2 and 16
        emailLabel: 'Email:',
        addressLabel: 'Address:',
        generalEnquiriesLabel: 'General enquiries:',

        // 1. Introduction
        s1Title: '1. Introduction',
        s1Lead: 'ZuriLofts (“we,” “our,” or “us”) operates the website',
        s1Tail: 'and the ZuriLofts progressive web application (collectively, the “Platform”). We are committed to protecting your personal data and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Platform or use our services to browse or book short-let apartment stays.',
        s1Consent: 'By using the Platform, you consent to the data practices described in this policy. If you do not agree, please discontinue use of the Platform immediately.',

        // 2. Data Controller
        s2Title: '2. Data Controller',
        s2Body: 'ZuriLofts is the data controller for personal data collected through the Platform. For any privacy-related enquiries, contact us at:',

        // 3. Information We Collect
        s3Title: '3. Information We Collect',
        s31Title: '3.1 Information You Provide Directly',
        s31AccountLabel: 'Account data:',
        s31AccountText: 'When you register, we collect your first name, last name, email address, phone number, and a hashed password. If you sign in via Google OAuth, we receive your name, email address, and Google profile identifier from Google.',
        s31BookingLabel: 'Booking data:',
        s31BookingText: 'When you make a reservation, we collect check-in and check-out dates, number of guests, bed configuration preference, check-in/check-out time preferences, names of additional guests, special requests, payment method selection, and any promo code used.',
        s31PaymentLabel: 'Payment data:',
        s31PaymentText: 'Payment method details (card, M-Pesa, or bank transfer). We do not store full credit card numbers or M-Pesa PINs. Payment processing is handled by our payment service providers.',
        s31CommunicationLabel: 'Communication data:',
        s31CommunicationText: 'Messages you send through our in-app messaging system to the ZuriLofts team.',
        s31ReviewLabel: 'Review data:',
        s31ReviewText: 'Star ratings and feedback you submit after a stay.',
        s31FavouritesLabel: 'Favourites data:',
        s31FavouritesText: 'Properties you save as favourites.',
        s31ContactLabel: 'Contact form data:',
        s31ContactText: 'Any information you submit through our contact form.',

        s32Title: '3.2 Information Collected Automatically',
        s32UsageLabel: 'Usage data:',
        s32UsageText: 'Pages visited, time spent on pages, links clicked, and interaction patterns on the Platform.',
        s32DeviceLabel: 'Device data:',
        s32DeviceText: 'IP address, browser type and version, operating system, device type, screen resolution, and referring URLs.',
        s32CookieLabel: 'Cookie data:',
        s32CookieText: 'Session tokens for authentication, preference cookies, and analytics cookies. See Section 10 for our Cookie Policy.',
        s32StorageLabel: 'Local storage:',
        s32StorageText: "We may store preferences (such as your display settings) in your browser's local storage.",

        s33Title: '3.3 Information We Never Collect',
        s33IdText: 'Government-issued identification numbers (national ID, passport number, KRA PIN) unless you voluntarily provide them.',
        s33BiometricText: 'Biometric data or facial recognition data.',
        s33GeoText: 'Precise geolocation data beyond what your IP address reveals.',
        s33ChildrenText: 'Data about children under 18 - our Platform is not intended for minors.',

        // 4. Legal Basis for Processing
        s4Title: '4. Legal Basis for Processing',
        s4Body: 'We process your personal data only when we have a lawful basis to do so under the Kenya Data Protection Act, 2019 (the “DPA”) and, where applicable, the EU General Data Protection Regulation (GDPR):',
        s4ContractLabel: 'Contractual necessity:',
        s4ContractText: 'Processing required to fulfil a booking, create your account, or provide a service you have requested.',
        s4InterestLabel: 'Legitimate interests:',
        s4InterestText: 'Improving the Platform, preventing fraud, securing our systems, and communicating important service updates.',
        s4ConsentLabel: 'Consent:',
        s4ConsentText: 'Where you have given clear consent (e.g., marketing communications). You may withdraw consent at any time.',
        s4LegalLabel: 'Legal obligation:',
        s4LegalText: 'Complying with Kenyan law, tax regulations, or responding to lawful requests from public authorities.',

        // 5. How We Use Your Information
        s5Title: '5. How We Use Your Information',
        s5Intro: 'We use the information we collect for the following purposes:',
        s5Account: 'To create and maintain your account.',
        s5Bookings: 'To process, confirm, and manage your bookings.',
        s5Communicate: 'To communicate with you about your reservations - confirmations, reminders, changes, and cancellations.',
        s5Messaging: 'To facilitate in-app messaging between you and the ZuriLofts team.',
        s5Payments: 'To process payments and issue receipts or invoices.',
        s5Pricing: 'To calculate and apply seasonal pricing, promo code discounts, late check-out fees, and extra-guest charges.',
        s5Calendar: 'To sync your booking dates with external calendar platforms (e.g., Airbnb, Booking.com) via iCal feeds to prevent double-booking.',
        s5Reviews: 'To collect and display post-stay reviews and ratings.',
        s5Personalise: 'To personalise your experience (e.g., saving favourites, pre-filling guest information).',
        s5Notifications: 'To send service-related notifications (booking confirmations, policy changes, security alerts).',
        s5Fraud: 'To detect, investigate, and prevent fraudulent transactions, abuse, and security incidents.',
        s5Analyse: "To analyse usage trends and improve the Platform's functionality, design, and performance.",
        s5Comply: 'To comply with legal obligations, enforce our Terms of Service, and protect our rights.',
        s5NeverLead: 'We will',
        s5NeverEmphasis: 'never',
        s5NeverTail: 'sell your personal data to third parties. We will never use your data for automated decision-making that produces legal or similarly significant effects without human review.',

        // 6. Data Sharing and Disclosure
        s6Title: '6. Data Sharing and Disclosure',
        s6Intro: 'We may share your data only in the following limited circumstances:',
        s6ProvidersLabel: 'Service providers:',
        s6ProvidersText: 'Trusted third-party vendors who perform services on our behalf - payment processors, hosting providers (our servers are hosted in a secure data centre), email delivery services, and analytics providers. These providers are contractually bound to process data only on our instructions and with equivalent data protection standards.',
        s6CalendarLabel: 'External calendar platforms:',
        s6CalendarText: 'When you book a stay, your booking dates (but not your personal identity) are included in our outbound iCal feed so that external platforms like Airbnb and Booking.com can block those dates. No guest names, contact details, or payment information are included in iCal feeds.',
        s6LegalLabel: 'Legal compliance:',
        s6LegalText: 'If required by law, court order, or governmental regulation, we may disclose data to law enforcement, regulators, or other authorised bodies.',
        s6TransferLabel: 'Business transfers:',
        s6TransferText: 'In the event of a merger, acquisition, or sale of all or a portion of our assets, your data may be transferred as part of that transaction. You will be notified via email and/or a prominent notice on the Platform before your data is transferred and becomes subject to a different privacy policy.',
        s6ConsentLabel: 'With your consent:',
        s6ConsentText: 'We may share data for any other purpose disclosed to you at the point of collection with your explicit consent.',

        // 7. Data Retention
        s7Title: '7. Data Retention',
        s7Intro: 'We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected:',
        s7AccountLabel: 'Account data:',
        s7AccountText: 'Retained for the life of your account. If you delete your account, your personal data is anonymised or deleted within 30 days, except as required by law.',
        s7BookingLabel: 'Booking records:',
        s7BookingText: 'Retained for 7 years after the stay date to comply with Kenyan tax and accounting obligations. After this period, records are anonymised.',
        s7MessagesLabel: 'Messages:',
        s7MessagesText: 'Retained for 2 years after your last interaction unless you request earlier deletion.',
        s7ReviewsLabel: 'Reviews:',
        s7ReviewsText: "Retained for the life of the property listing. If you delete your account, reviews are anonymised and kept for the property's aggregate rating integrity.",
        s7UsageLabel: 'Usage data and logs:',
        s7UsageText: 'Retained for up to 12 months in identifiable form; aggregated thereafter.',
        s7PaymentLabel: 'Payment data:',
        s7PaymentText: 'Transaction records retained for 7 years per tax law. Sensitive payment credentials (card numbers, M-Pesa details) are not stored on our servers.',

        // 8. Data Security
        s8Title: '8. Data Security',
        s8Body: 'We implement and maintain appropriate technical and organisational measures to protect your personal data against accidental or unlawful destruction, loss, alteration, unauthorised disclosure, or access:',
        s8Tls: 'All data in transit is encrypted using TLS 1.2 or higher.',
        s8Passwords: 'Passwords are hashed using bcrypt with a work factor of 12. We never store plaintext passwords.',
        s8Tokens: 'API endpoints are authenticated and authorised using JSON Web Tokens (JWT) with appropriate expiry.',
        s8Access: 'Access to personal data is restricted on a need-to-know basis to authorised personnel only.',
        s8Reviews: 'We conduct regular security reviews of our codebase and dependencies.',
        s8Firewalls: 'Our servers are protected by firewalls and are hosted in physically secured data centres.',
        s8Breach: 'While we strive to protect your data, no method of electronic storage or transmission over the internet is 100% secure. We cannot guarantee absolute security. In the event of a data breach, we will notify affected users and the relevant supervisory authority within 72 hours of becoming aware of the breach, in accordance with the DPA.',

        // 9. International Data Transfers
        s9Title: '9. International Data Transfers',
        s9Body: 'Your data is primarily stored and processed in Kenya. Some of our service providers may process data in other jurisdictions (e.g., the United States or the European Union for email delivery, analytics, or hosting). When we transfer data internationally, we ensure that:',
        s9Adequate: 'The recipient country has been deemed to provide an adequate level of data protection by the relevant authority; or',
        s9Clauses: 'We have entered into standard contractual clauses or equivalent safeguards with the data recipient; or',
        s9Contract: 'The transfer is necessary for the performance of a contract with you (e.g., to process your booking).',

        // 10. Cookies and Similar Technologies
        s10Title: '10. Cookies and Similar Technologies',
        s10Intro: 'We use the following categories of cookies on the Platform:',
        s10EssentialLabel: 'Essential cookies:',
        s10EssentialText: 'Required for core functionality - authentication sessions, booking flow state, and security. The Platform cannot function without these.',
        s10PreferenceLabel: 'Preference cookies:',
        s10PreferenceText: 'Remember your display settings and preferences (e.g., which bed configuration you last viewed).',
        s10AnalyticsLabel: 'Analytics cookies:',
        s10AnalyticsText: 'Help us understand how visitors use the Platform so we can improve it. These collect anonymous, aggregated data.',
        s10Control: 'You can control cookies through your browser settings. Blocking essential cookies may prevent the Platform from functioning correctly. We do not respond to “Do Not Track” signals at this time as there is no consistent industry standard.',

        // 11. Third-Party Processors
        s11Title: '11. Third-Party Processors',
        s11Body: 'We use the following third-party processors to operate the Platform. Each receives only the data needed to provide its service, and each has its own privacy policy. We are not responsible for the privacy practices of these third parties; please review their policies independently.',
        s11ColProcessor: 'Processor',
        s11ColReceives: 'Receives',
        s11ColPurpose: 'Purpose',
        s11PushName: 'Web Push (browser vendors)',
        s11CloudinaryReceives: 'Uploaded images',
        s11CloudinaryPurpose: 'Image hosting and delivery',
        s11PaystackReceives: 'Name, email, payment details',
        s11PaystackPurpose: 'Payment processing',
        s11GoogleReceives: 'Email, name, profile picture',
        s11GooglePurpose: 'Optional sign-in',
        s11PushReceives: 'Push subscription endpoint',
        s11PushPurpose: 'Booking notifications',
        s11TelegramReceives: 'Support chat message contents',
        s11TelegramPurpose: 'Support conversations',
        s11RailwayReceives: 'All application data',
        s11RailwayPurpose: 'Hosting and database',
        s11NoSell: 'We do not sell your personal data to any third party. Processors are engaged only to provide the services described above and are bound to process data on our instructions.',

        // 12. Your Data Protection Rights
        s12Title: '12. Your Data Protection Rights',
        s12Intro: 'Under the Kenya Data Protection Act, 2019 and, where applicable, the GDPR, you have the following rights:',
        s12AccessLabel: 'Right of access:',
        s12AccessText: 'Request a copy of the personal data we hold about you, free of charge.',
        s12RectifyLabel: 'Right of rectification:',
        s12RectifyText: 'Correct any inaccurate or incomplete personal data we hold about you.',
        s12EraseLabel: 'Right to erasure (“right to be forgotten”):',
        s12EraseText: 'Request deletion of your personal data, subject to legal retention obligations.',
        s12RestrictLabel: 'Right to restriction of processing:',
        s12RestrictText: 'Request that we limit how we process your data in certain circumstances.',
        s12PortabilityLabel: 'Right to data portability:',
        s12PortabilityText: 'Receive your data in a structured, commonly used, machine-readable format and transfer it to another controller.',
        s12ObjectLabel: 'Right to object:',
        s12ObjectText: 'Object to processing based on legitimate interests or for direct marketing purposes.',
        s12WithdrawLabel: 'Right to withdraw consent:',
        s12WithdrawText: 'Withdraw consent at any time where processing is based on consent. Withdrawal does not affect the lawfulness of processing before the withdrawal.',
        s12ComplainLabel: 'Right to lodge a complaint:',
        s12ComplainText: 'File a complaint with the Office of the Data Protection Commissioner (ODPC) in Kenya or your local supervisory authority.',
        s12ExerciseIntro: 'You can exercise several of these rights directly from your account:',

        // The in-app shortcuts, split around the <strong> and <em> buttons they name
        s12AccessPortabilityLabel: 'Access and portability:',
        s12Use: 'Use',
        s12DownloadData: 'Download my data',
        s12InSectionOf: "in your profile's",
        s12PrivacyData: 'Privacy and data',
        s12AccessTail: 'section to receive a copy of your personal data in a portable format.',
        s12RectificationLabel: 'Rectification:',
        s12RectificationLead: 'Update your name, email, phone, and photo from the',
        s12MyInfo: 'My Info',
        s12RectificationTail: 'tab of your profile.',
        s12ErasureLabel: 'Erasure:',
        s12DeleteAccount: 'Delete my account',
        s12ErasureTail: 'section. Bookings and payment records are retained for legal and tax reasons but are anonymised so they no longer identify you.',
        s12WithdrawalLabel: 'Withdrawal of consent:',
        s12CookiePreferences: 'Cookie preferences',
        s12WithdrawalTail: 'in your profile or the footer to change or withdraw your consent choices at any time.',

        s12OtherLead: 'For any other request, email us at',
        s12OtherTail: 'We will respond within 30 days. We may need to verify your identity before processing your request. We will not charge a fee unless your request is manifestly unfounded or excessive.',

        // 13. Children's Privacy
        s13Title: "13. Children's Privacy",
        s13Body: 'Our Platform is not directed to individuals under the age of 18. We do not knowingly collect personal data from children. If you are a parent or guardian and believe your child has provided us with personal data, please contact us immediately. If we become aware that we have collected personal data from a child without verified parental consent, we will delete that data within 72 hours.',

        // 14. Changes to This Privacy Policy
        s14Title: '14. Changes to This Privacy Policy',
        s14Body: 'We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or operational needs. When we make material changes, we will:',
        s14Post: 'Post the updated policy on this page with a revised “Last updated” date.',
        s14Notify: 'Notify registered users via email at least 14 days before the changes take effect.',
        s14Display: 'Display a prominent notice on the Platform for at least 7 days after changes are published.',
        s14Accept: 'Your continued use of the Platform after the effective date of any changes constitutes your acceptance of the updated policy. If you disagree with the changes, you must stop using the Platform and may request deletion of your account and data.',

        // 15. Governing Law
        s15Title: '15. Governing Law',
        s15Body: 'This Privacy Policy is governed by the laws of the Republic of Kenya. Any disputes arising from this policy shall be subject to the exclusive jurisdiction of the courts of Kenya.',

        // 16. Contact Us
        s16Title: '16. Contact Us',
        s16Body: 'If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:',
        s16OdpcLead: 'You also have the right to lodge a complaint with the',
        s16OdpcTerm: 'Office of the Data Protection Commissioner (ODPC)',
        s16OdpcTail: 'of Kenya at',
      },
    },
  },
  sw: {
    legal: {
      privacy: {
        // Kichwa cha ukurasa
        home: 'Nyumbani',
        privacy: 'Faragha',
        eyebrow: 'Kisheria',
        title: 'Sera ya Faragha',
        lastUpdatedLabel: 'Ilisasishwa mwisho:',
        policyVersionLabel: 'Toleo la sera:',

        // Lebo zinazotumika katika sehemu 2 na 16
        emailLabel: 'Barua pepe:',
        addressLabel: 'Anwani:',
        generalEnquiriesLabel: 'Maswali ya jumla:',

        // 1. Utangulizi
        s1Title: '1. Utangulizi',
        s1Lead: 'ZuriLofts (“sisi,” “yetu,” au “sisi”) inaendesha tovuti',
        s1Tail: 'na programu ya wavuti inayoendelea ya ZuriLofts (kwa pamoja, “Jukwaa”). Tumejitolea kulinda data yako binafsi na kuheshimu faragha yako. Sera hii ya Faragha inaeleza jinsi tunavyokusanya, kutumia, kufichua, na kulinda taarifa zako unapotembelea Jukwaa letu au kutumia huduma zetu kuvinjari au kuhifadhi makazi ya ghorofa ya muda mfupi.',
        s1Consent: 'Kwa kutumia Jukwaa, unatoa idhini kwa mbinu za data zilizoelezwa katika sera hii. Ikiwa hukubaliani, tafadhali acha kutumia Jukwaa mara moja.',

        // 2. Mdhibiti wa Data
        s2Title: '2. Mdhibiti wa Data',
        s2Body: 'ZuriLofts ndiyo mdhibiti wa data kwa data binafsi inayokusanywa kupitia Jukwaa. Kwa maswali yoyote yanayohusiana na faragha, wasiliana nasi kupitia:',

        // 3. Taarifa Tunazokusanya
        s3Title: '3. Taarifa Tunazokusanya',
        s31Title: '3.1 Taarifa Unazotoa Moja kwa Moja',
        s31AccountLabel: 'Data ya akaunti:',
        s31AccountText: 'Unapojisajili, tunakusanya jina lako la kwanza, jina la ukoo, anwani ya barua pepe, namba ya simu, na nenosiri lililofanywa hashi. Ikiwa unaingia kupitia Google OAuth, tunapokea jina lako, anwani ya barua pepe, na kitambulisho cha wasifu wa Google kutoka Google.',
        s31BookingLabel: 'Data ya uhifadhi:',
        s31BookingText: 'Unapoweka uhifadhi, tunakusanya tarehe za kuingia na kutoka, idadi ya wageni, upendeleo wa mpangilio wa vitanda, upendeleo wa muda wa kuingia na kutoka, majina ya wageni wa ziada, maombi maalum, uchaguzi wa njia ya malipo, na msimbo wowote wa punguzo uliotumika.',
        s31PaymentLabel: 'Data ya malipo:',
        s31PaymentText: 'Maelezo ya njia ya malipo (kadi, M-Pesa, au uhamisho wa benki). Hatuweki namba kamili za kadi ya mkopo au PIN za M-Pesa. Uchakataji wa malipo hufanywa na watoa huduma wetu wa malipo.',
        s31CommunicationLabel: 'Data ya mawasiliano:',
        s31CommunicationText: 'Ujumbe unaotuma kupitia mfumo wetu wa ujumbe ndani ya programu kwa timu ya ZuriLofts.',
        s31ReviewLabel: 'Data ya tathmini:',
        s31ReviewText: 'Viwango vya nyota na maoni unayowasilisha baada ya kukaa.',
        s31FavouritesLabel: 'Data ya vipendwa:',
        s31FavouritesText: 'Mali unazohifadhi kama vipendwa.',
        s31ContactLabel: 'Data ya fomu ya mawasiliano:',
        s31ContactText: 'Taarifa yoyote unayowasilisha kupitia fomu yetu ya mawasiliano.',

        s32Title: '3.2 Taarifa Zinazokusanywa Kiotomatiki',
        s32UsageLabel: 'Data ya matumizi:',
        s32UsageText: 'Kurasa zilizotembelewa, muda uliotumika kwenye kurasa, viungo vilivyobofyiwa, na mitindo ya mwingiliano kwenye Jukwaa.',
        s32DeviceLabel: 'Data ya kifaa:',
        s32DeviceText: 'Anwani ya IP, aina na toleo la kivinjari, mfumo wa uendeshaji, aina ya kifaa, ubora wa skrini, na URL za marejeleo.',
        s32CookieLabel: 'Data ya vidakuzi:',
        s32CookieText: 'Vianzio vya kipindi kwa uthibitishaji, vidakuzi vya mapendeleo, na vidakuzi vya uchanganuzi. Tazama Sehemu ya 10 kwa Sera yetu ya Vidakuzi.',
        s32StorageLabel: 'Hifadhi ya ndani:',
        s32StorageText: 'Tunaweza kuhifadhi mapendeleo (kama mipangilio yako ya kuonyesha) katika hifadhi ya ndani ya kivinjari chako.',

        s33Title: '3.3 Taarifa Ambazo Hatukusanyi Kamwe',
        s33IdText: 'Namba za utambulisho zilizotolewa na serikali (kitambulisho cha taifa, namba ya pasipoti, KRA PIN) isipokuwa ukitumia hiari yako kuzitoa.',
        s33BiometricText: 'Data za kibaiometriki au data za utambuzi wa uso.',
        s33GeoText: 'Data mahususi za eneo zaidi ya inavyofichua anwani yako ya IP.',
        s33ChildrenText: 'Data kuhusu watoto walio chini ya miaka 18 - Jukwaa letu halikusudiwi kwa watoto wadogo.',

        // 4. Msingi wa Kisheria wa Uchakataji
        s4Title: '4. Msingi wa Kisheria wa Uchakataji',
        s4Body: 'Tunachakata data yako binafsi tu pale tunapokuwa na msingi halali wa kufanya hivyo chini ya Sheria ya Ulinzi wa Data ya Kenya, 2019 (“DPA”) na, inapohitajika, Kanuni ya Jumla ya Ulinzi wa Data ya Umoja wa Ulaya (GDPR):',
        s4ContractLabel: 'Umuhimu wa kimkataba:',
        s4ContractText: 'Uchakataji unaohitajika kutimiza uhifadhi, kufungua akaunti yako, au kutoa huduma uliyoomba.',
        s4InterestLabel: 'Maslahi halali:',
        s4InterestText: 'Kuboresha Jukwaa, kuzuia ulaghai, kulinda mifumo yetu, na kuwasiliana taarifa muhimu za huduma.',
        s4ConsentLabel: 'Idhini:',
        s4ConsentText: 'Pale ambapo umetoa idhini ya wazi (k.m., mawasiliano ya masoko). Unaweza kuondoa idhini wakati wowote.',
        s4LegalLabel: 'Wajibu wa kisheria:',
        s4LegalText: 'Kutii sheria za Kenya, kanuni za kodi, au kujibu maombi halali kutoka kwa mamlaka za umma.',

        // 5. Jinsi Tunavyotumia Taarifa Zako
        s5Title: '5. Jinsi Tunavyotumia Taarifa Zako',
        s5Intro: 'Tunatumia taarifa tunazokusanya kwa madhumuni yafuatayo:',
        s5Account: 'Kufungua na kutunza akaunti yako.',
        s5Bookings: 'Kuchakata, kuthibitisha, na kusimamia uhifadhi wako.',
        s5Communicate: 'Kuwasiliana nawe kuhusu uhifadhi wako - uthibitisho, vikumbusho, mabadiliko, na kughairi.',
        s5Messaging: 'Kuwezesha ujumbe ndani ya programu kati yako na timu ya ZuriLofts.',
        s5Payments: 'Kuchakata malipo na kutoa risiti au ankara.',
        s5Pricing: 'Kuhesabu na kutumia bei za msimu, punguzo la msimbo wa promo, ada za kuchelewa kutoka, na malipo ya wageni wa ziada.',
        s5Calendar: 'Kusawazisha tarehe zako za uhifadhi na majukwaa ya kalenda ya nje (k.m., Airbnb, Booking.com) kupitia mitandao ya iCal ili kuzuia uhifadhi maradufu.',
        s5Reviews: 'Kukusanya na kuonyesha tathmini na viwango vya baada ya kukaa.',
        s5Personalise: 'Kubinafsisha uzoefu wako (k.m., kuhifadhi vipendwa, kujaza mapema taarifa za mgeni).',
        s5Notifications: 'Kutuma arifa zinazohusiana na huduma (uthibitisho wa uhifadhi, mabadiliko ya sera, arifa za usalama).',
        s5Fraud: 'Kugundua, kuchunguza, na kuzuia miamala ya ulaghai, unyanyasaji, na matukio ya usalama.',
        s5Analyse: 'Kuchanganua mitindo ya matumizi na kuboresha utendakazi, muundo, na utendaji wa Jukwaa.',
        s5Comply: 'Kutii wajibu wa kisheria, kutekeleza Masharti yetu ya Huduma, na kulinda haki zetu.',
        s5NeverLead: 'Sisi',
        s5NeverEmphasis: 'kamwe',
        s5NeverTail: 'hatutauza data yako binafsi kwa wahusika wa tatu. Hatutawahi kutumia data yako kwa maamuzi ya kiotomatiki yanayozalisha athari za kisheria au athari nyingine muhimu bila mapitio ya binadamu.',

        // 6. Kushiriki Data na Kufichua
        s6Title: '6. Kushiriki Data na Kufichua',
        s6Intro: 'Tunaweza kushiriki data yako tu katika mazingira machache yafuatayo:',
        s6ProvidersLabel: 'Watoa huduma:',
        s6ProvidersText: 'Wachuuzi wa wahusika wa tatu wanaoaminika wanaofanya huduma kwa niaba yetu - wasindikaji wa malipo, watoa huduma za uwekaji wa seva (seva zetu zimewekwa katika kituo cha data salama), huduma za utumaji wa barua pepe, na watoa huduma za uchanganuzi. Watoa huduma hawa wamefungwa kimkataba kuchakata data kwa maelekezo yetu tu na kwa viwango sawa vya ulinzi wa data.',
        s6CalendarLabel: 'Majukwaa ya kalenda ya nje:',
        s6CalendarText: 'Unapohifadhi makazi, tarehe zako za uhifadhi (lakini si utambulisho wako binafsi) zinajumuishwa katika mtandao wetu wa iCal unaotoka ili majukwaa ya nje kama Airbnb na Booking.com yaweze kuzuia tarehe hizo. Hakuna majina ya wageni, maelezo ya mawasiliano, au taarifa za malipo zinazojumuishwa katika mitandao ya iCal.',
        s6LegalLabel: 'Uzingatiaji wa kisheria:',
        s6LegalText: 'Ikiwa inahitajika na sheria, amri ya mahakama, au kanuni za kiserikali, tunaweza kufichua data kwa vyombo vya utekelezaji wa sheria, wadhibiti, au vyombo vingine vilivyoidhinishwa.',
        s6TransferLabel: 'Uhamishaji wa biashara:',
        s6TransferText: 'Katika tukio la muungano, ununuzi, au uuzaji wa mali zetu zote au sehemu yake, data yako inaweza kuhamishwa kama sehemu ya muamala huo. Utajulishwa kupitia barua pepe na/au taarifa maarufu kwenye Jukwaa kabla data yako kuhamishwa na kuwa chini ya sera tofauti ya faragha.',
        s6ConsentLabel: 'Kwa idhini yako:',
        s6ConsentText: 'Tunaweza kushiriki data kwa madhumuni mengine yoyote yaliyofichuliwa kwako wakati wa ukusanyaji kwa idhini yako ya wazi.',

        // 7. Uhifadhi wa Data
        s7Title: '7. Uhifadhi wa Data',
        s7Intro: 'Tunahifadhi data yako binafsi tu kwa muda unaohitajika kutimiza madhumuni ambayo ilikusanywa:',
        s7AccountLabel: 'Data ya akaunti:',
        s7AccountText: 'Inahifadhiwa kwa muda wote wa akaunti yako. Ukifuta akaunti yako, data yako binafsi hufanywa isiyotambulisha mtu au hufutwa ndani ya siku 30, isipokuwa inapohitajika na sheria.',
        s7BookingLabel: 'Kumbukumbu za uhifadhi:',
        s7BookingText: 'Inahifadhiwa kwa miaka 7 baada ya tarehe ya kukaa ili kutii wajibu wa kodi na uhasibu wa Kenya. Baada ya kipindi hiki, kumbukumbu hufanywa zisizotambulisha mtu.',
        s7MessagesLabel: 'Ujumbe:',
        s7MessagesText: 'Inahifadhiwa kwa miaka 2 baada ya mwingiliano wako wa mwisho isipokuwa uombe kufutwa mapema.',
        s7ReviewsLabel: 'Tathmini:',
        s7ReviewsText: 'Inahifadhiwa kwa muda wote wa tangazo la mali. Ukifuta akaunti yako, tathmini hufanywa zisizotambulisha mtu na huhifadhiwa kwa ajili ya uadilifu wa kiwango cha jumla cha mali.',
        s7UsageLabel: 'Data ya matumizi na kumbukumbu:',
        s7UsageText: 'Inahifadhiwa hadi miezi 12 katika hali inayotambulika; baada ya hapo hujumuishwa.',
        s7PaymentLabel: 'Data ya malipo:',
        s7PaymentText: 'Kumbukumbu za miamala huhifadhiwa kwa miaka 7 kwa mujibu wa sheria ya kodi. Vitambulisho nyeti vya malipo (namba za kadi, maelezo ya M-Pesa) havihifadhiwi kwenye seva zetu.',

        // 8. Usalama wa Data
        s8Title: '8. Usalama wa Data',
        s8Body: 'Tunatekeleza na kutunza hatua zinazofaa za kiufundi na za kitaasisi kulinda data yako binafsi dhidi ya uharibifu wa bahati mbaya au haramu, upotevu, mabadiliko, ufichuzi usioidhinishwa, au ufikiaji:',
        s8Tls: 'Data yote inayosafiri husimbwa kwa kutumia TLS 1.2 au zaidi.',
        s8Passwords: 'Manenosiri hufanywa hashi kwa kutumia bcrypt na kipengele cha kazi cha 12. Hatuweki manenosiri ya maandishi wazi.',
        s8Tokens: 'Vituo vya API huthibitishwa na kuidhinishwa kwa kutumia JSON Web Tokens (JWT) zenye muda wa kumalizika unaofaa.',
        s8Access: 'Ufikiaji wa data binafsi umezuiwa kwa msingi wa kuhitaji kujua kwa wafanyakazi walioidhinishwa tu.',
        s8Reviews: 'Tunafanya mapitio ya usalama ya mara kwa mara ya msimbo wetu na vitegemezi.',
        s8Firewalls: 'Seva zetu zinalindwa na ngome za moto na zimewekwa katika vituo vya data vilivyolindwa kifizikia.',
        s8Breach: 'Ingawa tunajitahidi kulinda data yako, hakuna njia ya kuhifadhi au kusafirisha kielektroniki kupitia intaneti iliyo salama kwa asilimia 100. Hatuwezi kuhakikisha usalama kamili. Katika tukio la uvunjaji wa data, tutajulisha watumiaji walioathirika na mamlaka husika ya usimamizi ndani ya saa 72 tangu kufahamu uvunjaji huo, kwa kuzingatia DPA.',

        // 9. Uhamishaji wa Data Kimataifa
        s9Title: '9. Uhamishaji wa Data Kimataifa',
        s9Body: 'Data yako huhifadhiwa na kuchakatwa hasa Kenya. Baadhi ya watoa huduma wetu wanaweza kuchakata data katika mamlaka nyingine (k.m., Marekani au Umoja wa Ulaya kwa utumaji wa barua pepe, uchanganuzi, au uwekaji wa seva). Tunapohamisha data kimataifa, tunahakikisha kwamba:',
        s9Adequate: 'Nchi inayopokea imeonekana kutoa kiwango cha kutosha cha ulinzi wa data na mamlaka husika; au',
        s9Clauses: 'Tumeingia katika vifungu vya kawaida vya kimkataba au ulinzi sawa na mpokeaji wa data; au',
        s9Contract: 'Uhamishaji ni muhimu kwa utekelezaji wa mkataba na wewe (k.m., kuchakata uhifadhi wako).',

        // 10. Vidakuzi na Teknolojia Zinazofanana
        s10Title: '10. Vidakuzi na Teknolojia Zinazofanana',
        s10Intro: 'Tunatumia aina zifuatazo za vidakuzi kwenye Jukwaa:',
        s10EssentialLabel: 'Vidakuzi muhimu:',
        s10EssentialText: 'Vinahitajika kwa utendakazi wa msingi - vipindi vya uthibitishaji, hali ya mtiririko wa uhifadhi, na usalama. Jukwaa haliwezi kufanya kazi bila hivi.',
        s10PreferenceLabel: 'Vidakuzi vya mapendeleo:',
        s10PreferenceText: 'Hukumbuka mipangilio yako ya kuonyesha na mapendeleo (k.m., mpangilio wa vitanda uliouona mwisho).',
        s10AnalyticsLabel: 'Vidakuzi vya uchanganuzi:',
        s10AnalyticsText: 'Hutusaidia kuelewa jinsi wageni wanavyotumia Jukwaa ili tuweze kuliboresha. Hivi hukusanya data zisizotambulisha mtu na zilizojumuishwa.',
        s10Control: 'Unaweza kudhibiti vidakuzi kupitia mipangilio ya kivinjari chako. Kuzuia vidakuzi muhimu kunaweza kuzuia Jukwaa kufanya kazi ipasavyo. Hatujibu ishara za “Do Not Track” kwa sasa kwa kuwa hakuna kiwango cha tasnia kinacholingana.',

        // 11. Wasindikaji wa Wahusika wa Tatu
        s11Title: '11. Wasindikaji wa Wahusika wa Tatu',
        s11Body: 'Tunatumia wasindikaji wafuatao wa wahusika wa tatu kuendesha Jukwaa. Kila mmoja hupokea data inayohitajika tu kutoa huduma yake, na kila mmoja ana sera yake ya faragha. Hatuwajibiki kwa mbinu za faragha za wahusika hawa wa tatu; tafadhali pitia sera zao kwa kujitegemea.',
        s11ColProcessor: 'Msindikaji',
        s11ColReceives: 'Anapokea',
        s11ColPurpose: 'Madhumuni',
        s11PushName: 'Web Push (watoa vivinjari)',
        s11CloudinaryReceives: 'Picha zilizopakiwa',
        s11CloudinaryPurpose: 'Uhifadhi na usambazaji wa picha',
        s11PaystackReceives: 'Jina, barua pepe, maelezo ya malipo',
        s11PaystackPurpose: 'Uchakataji wa malipo',
        s11GoogleReceives: 'Barua pepe, jina, picha ya wasifu',
        s11GooglePurpose: 'Kuingia kwa hiari',
        s11PushReceives: 'Kianzio cha usajili wa arifa',
        s11PushPurpose: 'Arifa za uhifadhi',
        s11TelegramReceives: 'Maudhui ya ujumbe wa gumzo la usaidizi',
        s11TelegramPurpose: 'Mazungumzo ya usaidizi',
        s11RailwayReceives: 'Data yote ya programu',
        s11RailwayPurpose: 'Uwekaji wa seva na hifadhidata',
        s11NoSell: 'Hatuuzi data yako binafsi kwa mhusika yeyote wa tatu. Wasindikaji huajiriwa tu kutoa huduma zilizoelezwa hapo juu na wamefungwa kuchakata data kwa maelekezo yetu.',

        // 12. Haki Zako za Ulinzi wa Data
        s12Title: '12. Haki Zako za Ulinzi wa Data',
        s12Intro: 'Chini ya Sheria ya Ulinzi wa Data ya Kenya, 2019 na, inapohitajika, GDPR, una haki zifuatazo:',
        s12AccessLabel: 'Haki ya ufikiaji:',
        s12AccessText: 'Kuomba nakala ya data binafsi tunayoshikilia kukuhusu, bila malipo.',
        s12RectifyLabel: 'Haki ya marekebisho:',
        s12RectifyText: 'Kurekebisha data binafsi yoyote isiyo sahihi au isiyokamilika tunayoshikilia kukuhusu.',
        s12EraseLabel: 'Haki ya kufutwa (“haki ya kusahaulika”):',
        s12EraseText: 'Kuomba kufutwa kwa data yako binafsi, kwa kuzingatia wajibu wa kisheria wa uhifadhi.',
        s12RestrictLabel: 'Haki ya kuzuia uchakataji:',
        s12RestrictText: 'Kuomba tuzuie jinsi tunavyochakata data yako katika mazingira fulani.',
        s12PortabilityLabel: 'Haki ya uhamishaji wa data:',
        s12PortabilityText: 'Kupokea data yako katika muundo uliopangwa, unaotumika kawaida, na unaosomeka na mashine, na kuihamisha kwa mdhibiti mwingine.',
        s12ObjectLabel: 'Haki ya kupinga:',
        s12ObjectText: 'Kupinga uchakataji unaotegemea maslahi halali au kwa madhumuni ya masoko ya moja kwa moja.',
        s12WithdrawLabel: 'Haki ya kuondoa idhini:',
        s12WithdrawText: 'Kuondoa idhini wakati wowote pale uchakataji unapotegemea idhini. Kuondoa hakunaathiri uhalali wa uchakataji kabla ya kuondoa.',
        s12ComplainLabel: 'Haki ya kuwasilisha malalamiko:',
        s12ComplainText: 'Kuwasilisha malalamiko kwa Ofisi ya Kamishna wa Ulinzi wa Data (ODPC) nchini Kenya au mamlaka yako ya usimamizi ya ndani.',
        s12ExerciseIntro: 'Unaweza kutumia haki kadhaa kati ya hizi moja kwa moja kutoka kwa akaunti yako:',

        // Njia za moja kwa moja ndani ya programu, zilizogawanywa kuzunguka vitufe vinavyotajwa
        s12AccessPortabilityLabel: 'Ufikiaji na uhamishaji:',
        s12Use: 'Tumia',
        s12DownloadData: 'Pakua data yangu',
        s12InSectionOf: 'katika sehemu ya',
        s12PrivacyData: 'Faragha na data',
        s12AccessTail: 'ya wasifu wako ili kupokea nakala ya data yako binafsi katika muundo unaobebeka.',
        s12RectificationLabel: 'Marekebisho:',
        s12RectificationLead: 'Sasisha jina lako, barua pepe, simu, na picha kutoka kwenye kichupo cha',
        s12MyInfo: 'Taarifa Zangu',
        s12RectificationTail: 'ya wasifu wako.',
        s12ErasureLabel: 'Kufutwa:',
        s12DeleteAccount: 'Futa akaunti yangu',
        s12ErasureTail: 'ya wasifu wako. Kumbukumbu za uhifadhi na malipo huhifadhiwa kwa sababu za kisheria na za kodi lakini hufanywa zisizotambulisha mtu ili zisiweze kukutambulisha tena.',
        s12WithdrawalLabel: 'Kuondoa idhini:',
        s12CookiePreferences: 'Mapendeleo ya Vidakuzi',
        s12WithdrawalTail: 'katika wasifu wako au sehemu ya chini ya ukurasa ili kubadilisha au kuondoa chaguo zako za idhini wakati wowote.',

        s12OtherLead: 'Kwa ombi lingine lolote, tutumie barua pepe kupitia',
        s12OtherTail: 'Tutajibu ndani ya siku 30. Tunaweza kuhitaji kuthibitisha utambulisho wako kabla ya kuchakata ombi lako. Hatutatoza ada isipokuwa ombi lako halina msingi kabisa au la kuzidi kiasi.',

        // 13. Faragha ya Watoto
        s13Title: '13. Faragha ya Watoto',
        s13Body: 'Jukwaa letu haliuelekezwi kwa watu walio chini ya umri wa miaka 18. Hatukusanyi kwa kujua data binafsi kutoka kwa watoto. Ikiwa wewe ni mzazi au mlezi na unaamini mtoto wako ametupatia data binafsi, tafadhali wasiliana nasi mara moja. Ikiwa tutafahamu kwamba tumekusanya data binafsi kutoka kwa mtoto bila idhini ya wazazi iliyothibitishwa, tutafuta data hiyo ndani ya saa 72.',

        // 14. Mabadiliko ya Sera Hii ya Faragha
        s14Title: '14. Mabadiliko ya Sera Hii ya Faragha',
        s14Body: 'Tunaweza kusasisha Sera hii ya Faragha mara kwa mara ili kuakisi mabadiliko katika mbinu zetu, mahitaji ya kisheria, au mahitaji ya uendeshaji. Tunapofanya mabadiliko makubwa, tutafanya yafuatayo:',
        s14Post: 'Kuchapisha sera iliyosasishwa kwenye ukurasa huu pamoja na tarehe mpya ya “Ilisasishwa mwisho”.',
        s14Notify: 'Kujulisha watumiaji waliosajiliwa kupitia barua pepe angalau siku 14 kabla mabadiliko hayo kuanza kutumika.',
        s14Display: 'Kuonyesha taarifa maarufu kwenye Jukwaa kwa angalau siku 7 baada ya mabadiliko kuchapishwa.',
        s14Accept: 'Kuendelea kwako kutumia Jukwaa baada ya tarehe ya kuanza kutumika kwa mabadiliko yoyote kunamaanisha kukubali kwako sera iliyosasishwa. Ikiwa hukubaliani na mabadiliko hayo, lazima uache kutumia Jukwaa na unaweza kuomba kufutwa kwa akaunti yako na data yako.',

        // 15. Sheria Inayotawala
        s15Title: '15. Sheria Inayotawala',
        s15Body: 'Sera hii ya Faragha inatawaliwa na sheria za Jamhuri ya Kenya. Migogoro yoyote inayotokana na sera hii itakuwa chini ya mamlaka ya kipekee ya mahakama za Kenya.',

        // 16. Wasiliana Nasi
        s16Title: '16. Wasiliana Nasi',
        s16Body: 'Ikiwa una maswali, wasiwasi, au maombi yoyote kuhusu Sera hii ya Faragha au mbinu zetu za data, tafadhali wasiliana nasi:',
        s16OdpcLead: 'Pia una haki ya kuwasilisha malalamiko kwa',
        s16OdpcTerm: 'Ofisi ya Kamishna wa Ulinzi wa Data (ODPC)',
        s16OdpcTail: 'ya Kenya kupitia',
      },
    },
  },
};
