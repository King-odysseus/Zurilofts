import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

function PrivacyPage() {
  const lastUpdated = '17 June 2026';

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#0B0B45] mb-2">Privacy Policy</h1>
          <p className="text-sm text-[#6b7280] mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-slate max-w-none space-y-8 text-[#1f2937] leading-relaxed">

            {/* 1. Introduction */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">1. Introduction</h2>
              <p>
                ZuriLofts (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the website{' '}
                <strong>thezurilofts.com</strong> and the ZuriLofts progressive web application
                (collectively, the &ldquo;Platform&rdquo;). We are committed to protecting your
                personal data and respecting your privacy. This Privacy Policy explains how
                we collect, use, disclose, and safeguard your information when you visit our
                Platform or use our services to browse or book short-let apartment stays.
              </p>
              <p className="mt-3">
                By using the Platform, you consent to the data practices described in this
                policy. If you do not agree, please discontinue use of the Platform
                immediately.
              </p>
            </section>

            {/* 2. Data Controller */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">2. Data Controller</h2>
              <p>
                ZuriLofts is the data controller for personal data collected through the
                Platform. For any privacy-related enquiries, contact us at:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> privacy@zurilofts.com<br />
                <strong>Address:</strong> Nairobi, Kenya
              </p>
            </section>

            {/* 3. Information We Collect */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">3. Information We Collect</h2>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">3.1 Information You Provide Directly</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account data:</strong> When you register, we collect your first name, last name, email address, phone number, and a hashed password. If you sign in via Google OAuth, we receive your name, email address, and Google profile identifier from Google.</li>
                <li><strong>Booking data:</strong> When you make a reservation, we collect check-in and check-out dates, number of guests, bed configuration preference, check-in/check-out time preferences, names of additional guests, special requests, payment method selection, and any promo code used.</li>
                <li><strong>Payment data:</strong> Payment method details (card, M-Pesa, or bank transfer). We do not store full credit card numbers or M-Pesa PINs. Payment processing is handled by our payment service providers.</li>
                <li><strong>Communication data:</strong> Messages you send through our in-app messaging system to the ZuriLofts team.</li>
                <li><strong>Review data:</strong> Star ratings and feedback you submit after a stay.</li>
                <li><strong>Favourites data:</strong> Properties you save as favourites.</li>
                <li><strong>Contact form data:</strong> Any information you submit through our contact form.</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">3.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Usage data:</strong> Pages visited, time spent on pages, links clicked, and interaction patterns on the Platform.</li>
                <li><strong>Device data:</strong> IP address, browser type and version, operating system, device type, screen resolution, and referring URLs.</li>
                <li><strong>Cookie data:</strong> Session tokens for authentication, preference cookies, and analytics cookies. See Section 10 for our Cookie Policy.</li>
                <li><strong>Local storage:</strong> We may store preferences (such as your display settings) in your browser&apos;s local storage.</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">3.3 Information We Never Collect</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Government-issued identification numbers (national ID, passport number, KRA PIN) unless you voluntarily provide them.</li>
                <li>Biometric data or facial recognition data.</li>
                <li>Precise geolocation data beyond what your IP address reveals.</li>
                <li>Data about children under 18 — our Platform is not intended for minors.</li>
              </ul>
            </section>

            {/* 4. Legal Basis for Processing */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">4. Legal Basis for Processing</h2>
              <p>We process your personal data only when we have a lawful basis to do so under the Kenya Data Protection Act, 2019 (the &ldquo;DPA&rdquo;) and, where applicable, the EU General Data Protection Regulation (GDPR):</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Contractual necessity:</strong> Processing required to fulfil a booking, create your account, or provide a service you have requested.</li>
                <li><strong>Legitimate interests:</strong> Improving the Platform, preventing fraud, securing our systems, and communicating important service updates.</li>
                <li><strong>Consent:</strong> Where you have given clear consent (e.g., marketing communications). You may withdraw consent at any time.</li>
                <li><strong>Legal obligation:</strong> Complying with Kenyan law, tax regulations, or responding to lawful requests from public authorities.</li>
              </ul>
            </section>

            {/* 5. How We Use Your Information */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">5. How We Use Your Information</h2>
              <p>We use the information we collect for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>To create and maintain your account.</li>
                <li>To process, confirm, and manage your bookings.</li>
                <li>To communicate with you about your reservations — confirmations, reminders, changes, and cancellations.</li>
                <li>To facilitate in-app messaging between you and the ZuriLofts team.</li>
                <li>To process payments and issue receipts or invoices.</li>
                <li>To calculate and apply seasonal pricing, promo code discounts, late check-out fees, and extra-guest charges.</li>
                <li>To sync your booking dates with external calendar platforms (e.g., Airbnb, Booking.com) via iCal feeds to prevent double-booking.</li>
                <li>To collect and display post-stay reviews and ratings.</li>
                <li>To personalise your experience (e.g., saving favourites, pre-filling guest information).</li>
                <li>To send service-related notifications (booking confirmations, policy changes, security alerts).</li>
                <li>To detect, investigate, and prevent fraudulent transactions, abuse, and security incidents.</li>
                <li>To analyse usage trends and improve the Platform&apos;s functionality, design, and performance.</li>
                <li>To comply with legal obligations, enforce our Terms of Service, and protect our rights.</li>
              </ul>
              <p className="mt-3">
                We will <strong>never</strong> sell your personal data to third parties. We will never
                use your data for automated decision-making that produces legal or similarly
                significant effects without human review.
              </p>
            </section>

            {/* 6. Data Sharing and Disclosure */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">6. Data Sharing and Disclosure</h2>
              <p>We may share your data only in the following limited circumstances:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Service providers:</strong> Trusted third-party vendors who perform services on our behalf — payment processors, hosting providers (our servers are hosted in a secure data centre), email delivery services, and analytics providers. These providers are contractually bound to process data only on our instructions and with equivalent data protection standards.</li>
                <li><strong>External calendar platforms:</strong> When you book a stay, your booking dates (but not your personal identity) are included in our outbound iCal feed so that external platforms like Airbnb and Booking.com can block those dates. No guest names, contact details, or payment information are included in iCal feeds.</li>
                <li><strong>Legal compliance:</strong> If required by law, court order, or governmental regulation, we may disclose data to law enforcement, regulators, or other authorised bodies.</li>
                <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of all or a portion of our assets, your data may be transferred as part of that transaction. You will be notified via email and/or a prominent notice on the Platform before your data is transferred and becomes subject to a different privacy policy.</li>
                <li><strong>With your consent:</strong> We may share data for any other purpose disclosed to you at the point of collection with your explicit consent.</li>
              </ul>
            </section>

            {/* 7. Data Retention */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">7. Data Retention</h2>
              <p>We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Account data:</strong> Retained for the life of your account. If you delete your account, your personal data is anonymised or deleted within 30 days, except as required by law.</li>
                <li><strong>Booking records:</strong> Retained for 7 years after the stay date to comply with Kenyan tax and accounting obligations. After this period, records are anonymised.</li>
                <li><strong>Messages:</strong> Retained for 2 years after your last interaction unless you request earlier deletion.</li>
                <li><strong>Reviews:</strong> Retained for the life of the property listing. If you delete your account, reviews are anonymised and kept for the property&apos;s aggregate rating integrity.</li>
                <li><strong>Usage data and logs:</strong> Retained for up to 12 months in identifiable form; aggregated thereafter.</li>
                <li><strong>Payment data:</strong> Transaction records retained for 7 years per tax law. Sensitive payment credentials (card numbers, M-Pesa details) are not stored on our servers.</li>
              </ul>
            </section>

            {/* 8. Data Security */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">8. Data Security</h2>
              <p>
                We implement and maintain appropriate technical and organisational measures
                to protect your personal data against accidental or unlawful destruction,
                loss, alteration, unauthorised disclosure, or access:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>All data in transit is encrypted using TLS 1.2 or higher.</li>
                <li>Passwords are hashed using bcrypt with a work factor of 12. We never store plaintext passwords.</li>
                <li>API endpoints are authenticated and authorised using JSON Web Tokens (JWT) with appropriate expiry.</li>
                <li>Access to personal data is restricted on a need-to-know basis to authorised personnel only.</li>
                <li>We conduct regular security reviews of our codebase and dependencies.</li>
                <li>Our servers are protected by firewalls and are hosted in physically secured data centres.</li>
              </ul>
              <p className="mt-3">
                While we strive to protect your data, no method of electronic storage or
                transmission over the internet is 100% secure. We cannot guarantee absolute
                security. In the event of a data breach, we will notify affected users and
                the relevant supervisory authority within 72 hours of becoming aware of the
                breach, in accordance with the DPA.
              </p>
            </section>

            {/* 9. International Data Transfers */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">9. International Data Transfers</h2>
              <p>
                Your data is primarily stored and processed in Kenya. Some of our service
                providers may process data in other jurisdictions (e.g., the United States
                or the European Union for email delivery, analytics, or hosting). When we
                transfer data internationally, we ensure that:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>The recipient country has been deemed to provide an adequate level of data protection by the relevant authority; or</li>
                <li>We have entered into standard contractual clauses or equivalent safeguards with the data recipient; or</li>
                <li>The transfer is necessary for the performance of a contract with you (e.g., to process your booking).</li>
              </ul>
            </section>

            {/* 10. Cookies and Tracking */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">10. Cookies and Similar Technologies</h2>
              <p>We use the following categories of cookies on the Platform:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Essential cookies:</strong> Required for core functionality — authentication sessions, booking flow state, and security. The Platform cannot function without these.</li>
                <li><strong>Preference cookies:</strong> Remember your display settings and preferences (e.g., which bed configuration you last viewed).</li>
                <li><strong>Analytics cookies:</strong> Help us understand how visitors use the Platform so we can improve it. These collect anonymous, aggregated data.</li>
              </ul>
              <p className="mt-2">
                You can control cookies through your browser settings. Blocking essential
                cookies may prevent the Platform from functioning correctly. We do not
                respond to &ldquo;Do Not Track&rdquo; signals at this time as there is no
                consistent industry standard.
              </p>
            </section>

            {/* 11. Third-Party Services */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">11. Third-Party Services</h2>
              <p>Our Platform integrates with the following third-party services, each of which has its own privacy policy:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Google OAuth:</strong> For social sign-in. Google&apos;s privacy policy applies to data you share through the sign-in flow.{' '}
                  <a href="https://policies.google.com/privacy" className="text-[#C49A6C] hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
                <li><strong>Google Fonts:</strong> We serve the Inter typeface from Google Fonts. Google may log the request for font files.{' '}
                  <a href="https://policies.google.com/privacy" className="text-[#C49A6C] hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
                <li><strong>Payment processors:</strong> Card payments and M-Pesa transactions are processed through PCI-DSS compliant payment gateways. We do not handle or store raw payment credentials.</li>
              </ul>
              <p className="mt-2">
                We are not responsible for the privacy practices of third-party websites or
                services linked from our Platform. Please review their policies independently.
              </p>
            </section>

            {/* 12. Your Rights */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">12. Your Data Protection Rights</h2>
              <p>Under the Kenya Data Protection Act, 2019 and, where applicable, the GDPR, you have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you, free of charge.</li>
                <li><strong>Right of rectification:</strong> Correct any inaccurate or incomplete personal data we hold about you.</li>
                <li><strong>Right to erasure (&ldquo;right to be forgotten&rdquo;):</strong> Request deletion of your personal data, subject to legal retention obligations.</li>
                <li><strong>Right to restriction of processing:</strong> Request that we limit how we process your data in certain circumstances.</li>
                <li><strong>Right to data portability:</strong> Receive your data in a structured, commonly used, machine-readable format and transfer it to another controller.</li>
                <li><strong>Right to object:</strong> Object to processing based on legitimate interests or for direct marketing purposes.</li>
                <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time where processing is based on consent. Withdrawal does not affect the lawfulness of processing before the withdrawal.</li>
                <li><strong>Right to lodge a complaint:</strong> File a complaint with the Office of the Data Protection Commissioner (ODPC) in Kenya or your local supervisory authority.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, email us at{' '}
                <strong>privacy@thezurilofts.com</strong>. We will respond within 30 days.
                We may need to verify your identity before processing your request. We will
                not charge a fee unless your request is manifestly unfounded or excessive.
              </p>
            </section>

            {/* 13. Data Protection for Children */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">13. Children&apos;s Privacy</h2>
              <p>
                Our Platform is not directed to individuals under the age of 18. We do not
                knowingly collect personal data from children. If you are a parent or
                guardian and believe your child has provided us with personal data, please
                contact us immediately. If we become aware that we have collected personal
                data from a child without verified parental consent, we will delete that
                data within 72 hours.
              </p>
            </section>

            {/* 14. Changes to This Policy */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">14. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in
                our practices, legal requirements, or operational needs. When we make
                material changes, we will:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Post the updated policy on this page with a revised &ldquo;Last updated&rdquo; date.</li>
                <li>Notify registered users via email at least 14 days before the changes take effect.</li>
                <li>Display a prominent notice on the Platform for at least 7 days after changes are published.</li>
              </ul>
              <p className="mt-2">
                Your continued use of the Platform after the effective date of any changes
                constitutes your acceptance of the updated policy. If you disagree with the
                changes, you must stop using the Platform and may request deletion of your
                account and data.
              </p>
            </section>

            {/* 15. Governing Law */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">15. Governing Law</h2>
              <p>
                This Privacy Policy is governed by the laws of the Republic of Kenya. Any
                disputes arising from this policy shall be subject to the exclusive
                jurisdiction of the courts of Kenya.
              </p>
            </section>

            {/* 16. Contact */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">16. Contact Us</h2>
              <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
              <p className="mt-2">
                <strong>Email:</strong> privacy@zurilofts.com<br />
                <strong>General enquiries:</strong> enquires@zurilofts.com<br />
                <strong>Address:</strong> Nairobi, Kenya
              </p>
              <p className="mt-2">
                You also have the right to lodge a complaint with the{' '}
                <strong>Office of the Data Protection Commissioner (ODPC)</strong> of Kenya
                at <a href="https://www.odpc.go.ke" className="text-[#C49A6C] hover:underline" target="_blank" rel="noopener noreferrer">www.odpc.go.ke</a>.
              </p>
            </section>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default PrivacyPage;
