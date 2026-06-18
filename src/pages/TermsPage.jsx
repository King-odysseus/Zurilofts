import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

function TermsPage() {
  const lastUpdated = '17 June 2026';
  const companyName = 'ZuriLofts';

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#0B0B45] mb-2">Terms of Service</h1>
          <p className="text-sm text-[#6b7280] mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-slate max-w-none space-y-8 text-[#1f2937] leading-relaxed">

            {/* 1. Acceptance */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the {companyName} Platform — including the website{' '}
                <strong>thezurilofts.com</strong>, the {companyName} progressive web application,
                and any related services (collectively, the &ldquo;Platform&rdquo;) — you
                (&ldquo;you,&rdquo; &ldquo;Guest,&rdquo; or &ldquo;User&rdquo;) agree to be
                bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to
                every provision of these Terms, you must not access or use the Platform.
              </p>
              <p className="mt-3">
                These Terms constitute a legally binding agreement between you and{' '}
                {companyName} (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), a
                business operating in Nairobi, Kenya. You represent that you are at least 18
                years of age and have the legal capacity to enter into this agreement.
              </p>
            </section>

            {/* 2. Definitions */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">2. Definitions</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>&ldquo;Booking&rdquo;</strong> means a confirmed reservation for a stay at a listed property.</li>
                <li><strong>&ldquo;Guest&rdquo;</strong> means any individual who books or stays at a property, including the account holder and any additional guests named in the booking.</li>
                <li><strong>&ldquo;Property&rdquo;</strong> means a furnished short-let apartment listed on the Platform.</li>
                <li><strong>&ldquo;Bed Option&rdquo;</strong> means the guest&apos;s selection of either a 1-Bed or 2-Bed configuration, each with its own nightly price, included guest count, and maximum occupancy.</li>
                <li><strong>&ldquo;Nightly Rate&rdquo;</strong> means the base price per night for the selected Bed Option, subject to seasonal adjustments (Price Rules).</li>
                <li><strong>&ldquo;Stay&rdquo;</strong> means the period from check-in to check-out at a property.</li>
              </ul>
            </section>

            {/* 3. Account */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">3. Account Registration and Security</h2>
              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">3.1 Account Creation</h3>
              <p>
                To make a booking, you must create an account by providing accurate, current,
                and complete information including your full legal name, a valid email address,
                and a working phone number. You may also register using Google OAuth, which
                constitutes your representation that the Google account is yours and that you
                authorise us to access the profile information Google provides.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">3.2 Account Security</h3>
              <p>
                You are solely responsible for maintaining the confidentiality of your account
                credentials and for all activities that occur under your account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Use a strong, unique password that you do not reuse across other services.</li>
                <li>Notify us immediately at <strong>enquires@thezurilofts.com</strong> of any unauthorised use of your account or any other breach of security.</li>
                <li>Log out of your account at the end of each session when using shared or public devices.</li>
              </ul>
              <p className="mt-2">
                We are not liable for any loss or damage arising from your failure to comply
                with this section.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">3.3 One Account Per Person</h3>
              <p>
                You may maintain only one account. Duplicate accounts, accounts created using
                false information, and accounts created to circumvent a prior suspension or
                ban are prohibited and will be terminated without notice.
              </p>
            </section>

            {/* 4. Bookings */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">4. Bookings and Reservations</h2>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">4.1 Booking Process</h3>
              <p>
                A booking is made in three steps: (1) selecting dates, guest count, and Bed
                Option; (2) providing guest information; and (3) selecting a payment method
                and confirming the booking. A booking is not confirmed until you complete all
                three steps and receive an on-screen confirmation with a unique booking ID.
                You will also receive a confirmation email at the email address associated
                with your account.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">4.2 Pricing</h3>
              <p>
                The total price of a booking comprises:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Nightly Rate</strong> × number of nights, based on the selected Bed Option (KES 5,100/night for 1-Bed; KES 5,500/night for 2-Bed, subject to change). Seasonal Price Rules set by us may override the base Nightly Rate for specific date ranges.</li>
                <li><strong>Cleaning Fee:</strong> A flat KES 1,500 per stay.</li>
                <li><strong>Service Fee:</strong> 12% of the subtotal (nightly total before fees).</li>
                <li><strong>Extra Guest Fee:</strong> KES 800 per additional guest per night, for each guest exceeding the included headcount (2 guests for 1-Bed; 4 guests for 2-Bed).</li>
                <li><strong>Late Check-out Fee:</strong> Applicable if you select a check-out time later than 10:00 AM. The fee doubles each hour past 10:00 AM, up to a maximum of one full night&apos;s rate at 5 hours late.</li>
                <li><strong>Promo Discount:</strong> Any discount from a valid promo code applied at the time of booking.</li>
              </ul>
              <p className="mt-2">
                All prices are listed and charged in Kenya Shillings (KES). We reserve the right
                to adjust base pricing at any time. Price changes do not affect confirmed bookings.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">4.3 Bed Options and Occupancy</h3>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>1-Bed configuration:</strong> Includes 2 guests in the base rate. Maximum occupancy is 4 guests. Each guest beyond 2 incurs the Extra Guest Fee.</li>
                <li><strong>2-Bed configuration:</strong> Includes 4 guests in the base rate. Maximum occupancy is 6 guests. Each guest beyond 4 incurs the Extra Guest Fee.</li>
              </ul>
              <p className="mt-2">
                The absolute maximum occupancy across all configurations is 6 guests. Exceeding
                this limit is a material breach of these Terms and constitutes grounds for
                immediate removal from the property without refund.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">4.4 Check-in and Check-out</h3>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Check-in:</strong> From 3:00 PM (15:00) on the check-in date.</li>
                <li><strong>Check-out:</strong> By 10:00 AM on the check-out date. A later check-out time may be selected at the time of booking; late check-out fees apply (see Section 4.2).</li>
              </ul>
              <p className="mt-2">
                Early check-in is subject to availability and must be arranged in advance
                through the in-app messaging system. We do not guarantee early check-in.
                Failure to vacate by the agreed check-out time will result in the Late
                Check-out Fee being charged to the payment method on file, and may result
                in an additional full night being charged if the delay exceeds 5 hours.
              </p>
            </section>

            {/* 5. Payment */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">5. Payment Terms</h2>
              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">5.1 Payment Methods</h3>
              <p>We accept payment via:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>Credit/Debit Card:</strong> Processed through a PCI-DSS compliant payment gateway.</li>
                <li><strong>M-Pesa:</strong> Processed through Lipa Na M-Pesa.</li>
                <li><strong>Bank Transfer:</strong> Direct deposit to our designated bank account. Instructions are provided at checkout.</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">5.2 Payment Timing</h3>
              <p>
                Full payment is required at the time of booking to confirm the reservation.
                Your booking is not confirmed and the dates are not reserved until payment
                is successfully processed.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">5.3 Taxes</h3>
              <p>
                All prices include applicable taxes (including VAT where required by Kenyan
                law). You are responsible for any additional taxes or duties that may apply.
                We will issue an electronic receipt for every booking.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">5.4 Promo Codes</h3>
              <p>
                Promo codes are subject to the specific terms stated at issuance — including
                validity period, minimum booking amount, maximum discount, and usage limits.
                A promo code:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Must be applied at the time of booking and cannot be applied retroactively.</li>
                <li>Cannot be combined with other promo codes unless expressly stated.</li>
                <li>Is void if transferred, sold, or obtained through unauthorised channels.</li>
                <li>May be revoked or modified by us at any time without prior notice for any reason, including suspected fraud or abuse.</li>
                <li>Has no cash value and is not redeemable for cash.</li>
              </ul>
            </section>

            {/* 6. Cancellation and Refunds */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">6. Cancellation and Refunds</h2>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">6.1 Guest Cancellation</h3>
              <p>Our standard cancellation policy is as follows:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>More than 14 days before check-in:</strong> Full refund of the Nightly Rate and Cleaning Fee. The Service Fee is non-refundable.</li>
                <li><strong>7–14 days before check-in:</strong> 50% refund of the Nightly Rate. Cleaning Fee and Service Fee are non-refundable.</li>
                <li><strong>Less than 7 days before check-in:</strong> No refund. All fees are non-refundable.</li>
                <li><strong>No-show:</strong> If you do not check in on the check-in date and have not cancelled, the full booking amount is charged and is non-refundable.</li>
              </ul>
              <p className="mt-2">
                To cancel a booking, contact us through the in-app messaging system or email{' '}
                <strong>enquires@thezurilofts.com</strong>. The cancellation is effective from
                the date and time we receive and acknowledge your request.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">6.2 Cancellation by ZuriLofts</h3>
              <p>
                We reserve the right to cancel a booking at any time if:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>The property becomes unavailable due to circumstances beyond our reasonable control (e.g., fire, flood, structural damage, or government order).</li>
                <li>We reasonably suspect that the booking is fraudulent, made in violation of these Terms, or poses a risk to the property or other guests.</li>
                <li>Payment is declined, reversed, or otherwise fails to clear.</li>
              </ul>
              <p className="mt-2">
                If we cancel a booking for reasons other than your breach of these Terms, you
                will receive a full refund of all amounts paid, which shall be your sole and
                exclusive remedy.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">6.3 Refund Processing</h3>
              <p>
                Approved refunds are processed within 14 business days to the original payment
                method. The time it takes for the refund to appear in your account depends on
                your payment provider.
              </p>
            </section>

            {/* 7. Guest Obligations */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">7. Guest Obligations and Conduct</h2>
              <p>As a Guest, you agree to the following:</p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">7.1 Occupancy Limits</h3>
              <p>
                The total number of guests staying overnight (including the booking account
                holder and all additional named guests) must not exceed the maximum occupancy
                for the selected Bed Option — 4 guests for a 1-Bed or 6 guests for a 2-Bed.
                Exceeding this limit is a material breach and grounds for immediate removal
                without refund.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">7.2 Noise and Nuisance</h3>
              <p>
                You must respect quiet hours (10:00 PM – 7:00 AM) and avoid creating excessive
                noise, nuisance, or disturbance to neighbours and other residents. Parties,
                events, and gatherings exceeding the booked guest count are strictly prohibited.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">7.3 Property Care</h3>
              <p>
                You must treat the property and its contents with reasonable care. You are
                financially responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Any damage to the property, furnishings, appliances, or fixtures caused by you or any member of your party during the Stay, beyond ordinary wear and tear.</li>
                <li>Excessive cleaning required as a result of your Stay (e.g., stains, litter, or waste disposal issues).</li>
                <li>Missing items from the property inventory noted at check-in.</li>
              </ul>
              <p className="mt-2">
                We reserve the right to charge the payment method on file for any such costs
                and to provide an itemised breakdown of charges upon request.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">7.4 Prohibited Activities</h3>
              <p>The following are strictly prohibited on any property:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Smoking indoors (including vaping and e-cigarettes). A deep-cleaning fee of KES 15,000 will be charged for violations.</li>
                <li>Bringing pets without prior written approval from us.</li>
                <li>Illegal activity of any kind, including but not limited to drug use, possession of illegal substances, or any activity violating Kenyan law.</li>
                <li>Commercial photography, filming, or any commercial use of the property without our prior written consent.</li>
                <li>Subletting or re-listing the property on any other platform.</li>
                <li>Tampering with safety equipment (smoke detectors, fire extinguishers, security cameras in common areas).</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">7.5 Accurate Information</h3>
              <p>
                All guest names provided at the time of booking must be accurate and complete.
                All adults staying at the property must be listed. You may not book on behalf
                of another person unless you are also staying at the property as the primary
                guest. Third-party bookings (booking for someone else without staying yourself)
                are prohibited without our prior written consent.
              </p>
            </section>

            {/* 8. Reviews */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">8. Post-Stay Reviews</h2>
              <p>
                After your Stay, you may submit a star rating (1–5) and optional private
                feedback. By submitting a review:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>You grant us a perpetual, irrevocable, royalty-free licence to display the star rating on the Platform.</li>
                <li>You represent that your review is based on your genuine stay experience and does not contain false, defamatory, or misleading statements.</li>
                <li>We reserve the right to remove reviews that are fraudulent, abusive, discriminatory, or violate these Terms.</li>
                <li>Private feedback notes are visible only to the {companyName} admin team and are not published publicly.</li>
              </ul>
            </section>

            {/* 9. Messaging */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">9. In-App Messaging</h2>
              <p>
                Our in-app messaging system is provided for communication between Guests and
                the {companyName} team regarding bookings, check-in/check-out arrangements,
                special requests, and issue resolution. By using the messaging system, you agree:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Not to use the messaging system for unsolicited commercial communications, spam, harassment, threats, or any unlawful purpose.</li>
                <li>That we may review message content for quality assurance, dispute resolution, and compliance with these Terms.</li>
                <li>Not to share personal contact information (email, phone number, social media handles) within messages for the purpose of circumventing the Platform for bookings or payments.</li>
              </ul>
              <p className="mt-2">
                We reserve the right to suspend or terminate messaging access for any user
                who violates this section.
              </p>
            </section>

            {/* 10. Favourites */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">10. Favourites and Personalisation</h2>
              <p>
                The Platform allows you to save properties as favourites. This feature is
                provided for your convenience. Favourites data is associated with your account
                and does not guarantee property availability or pricing. We reserve the right
                to modify or remove the favourites feature at any time.
              </p>
            </section>

            {/* 11. Intellectual Property */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">11. Intellectual Property</h2>
              <p>
                The Platform and all its content — including but not limited to the {companyName}{' '}
                name, logo, design, text, graphics, images, photographs, software code, user
                interface, and the selection and arrangement thereof — are owned by or licensed
                to {companyName} and are protected by Kenyan and international copyright,
                trademark, and intellectual property laws.
              </p>
              <p className="mt-2">
                You are granted a limited, non-exclusive, non-transferable, revocable licence
                to access and use the Platform for your personal, non-commercial use in
                accordance with these Terms. You may not:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Copy, reproduce, distribute, or create derivative works of the Platform or any of its content without our prior written consent.</li>
                <li>Scrape, data-mine, or use automated tools to extract content, pricing, or listing data from the Platform.</li>
                <li>Use the {companyName} name, logo, or branding in any manner that implies endorsement, affiliation, or sponsorship without our prior written consent.</li>
                <li>Reverse-engineer, decompile, or disassemble any part of the Platform.</li>
              </ul>
            </section>

            {/* 12. Limitation of Liability */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">12. Limitation of Liability</h2>
              <p className="font-semibold">
                PLEASE READ THIS SECTION CAREFULLY. IT LIMITS OUR LIABILITY TO YOU.
              </p>
              <p className="mt-2">
                To the fullest extent permitted by Kenyan law:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{companyName}, its owners, officers, employees, and agents shall not be liable for any indirect, consequential, special, incidental, or punitive damages — including loss of profits, loss of data, loss of business opportunity, or personal injury — arising from or related to your use of the Platform or any stay at a property, even if we have been advised of the possibility of such damages.</li>
                <li>Our total aggregate liability to you for any claim arising from or related to these Terms, the Platform, or any booking shall not exceed the total amount you paid for the specific booking giving rise to the claim.</li>
                <li>We are not liable for: (a) events beyond our reasonable control (force majeure — see Section 16); (b) acts or omissions of third-party service providers; (c) your failure to secure your account credentials; (d) inaccuracies in information you provide; (e) temporary unavailability of the Platform due to maintenance, upgrades, or technical issues.</li>
              </ul>
              <p className="mt-2">
                Nothing in these Terms excludes or limits our liability for death or personal
                injury caused by our gross negligence, fraud or fraudulent misrepresentation,
                or any other liability that cannot be excluded by Kenyan law.
              </p>
            </section>

            {/* 13. Indemnification */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">13. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless {companyName}, its owners,
                officers, employees, agents, and affiliates from and against any and all claims,
                damages, losses, liabilities, costs, and expenses (including reasonable legal
                fees) arising from or related to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Your breach of these Terms or any applicable law.</li>
                <li>Your use of the Platform or any stay at a property.</li>
                <li>Damage to the property, its contents, or common areas caused by you or any member of your party.</li>
                <li>Any claim by a third party arising from your conduct, including claims by neighbours, other residents, or public authorities.</li>
              </ul>
            </section>

            {/* 14. Disclaimer of Warranties */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">14. Disclaimer of Warranties</h2>
              <p>
                THE PLATFORM AND ALL SERVICES ARE PROVIDED ON AN &ldquo;AS IS&rdquo; AND
                &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER
                EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
                WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
              </p>
              <p className="mt-2">
                We do not warrant that: (a) the Platform will be uninterrupted, error-free,
                or secure; (b) any defects or errors will be corrected; (c) the Platform is
                free of viruses or other harmful components; (d) property descriptions,
                photographs, or amenities are error-free or fully representative (photographs
                may differ from the actual property at the time of stay).
              </p>
            </section>

            {/* 15. Force Majeure */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">15. Force Majeure</h2>
              <p>
                Neither party shall be liable for any failure or delay in performance under
                these Terms due to events beyond their reasonable control, including but not
                limited to: acts of God, natural disasters, fire, flood, earthquake,
                epidemic or pandemic (including government-imposed restrictions), war,
                terrorism, civil unrest, strikes, utility failures, internet or
                telecommunications outages, or government action.
              </p>
              <p className="mt-2">
                If a force majeure event prevents the Stay from taking place, we will work
                with you in good faith to reschedule or provide a refund, at our sole
                discretion based on the specific circumstances.
              </p>
            </section>

            {/* 16. Termination */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">16. Suspension and Termination</h2>
              <p>
                We reserve the right, at our sole discretion and without prior notice, to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Suspend or terminate your account and access to the Platform for any reason, including breach of these Terms, fraudulent activity, or conduct that we determine to be harmful to {companyName}, other users, or third parties.</li>
                <li>Cancel any pending bookings associated with a suspended or terminated account. The cancellation policy in Section 6.1 applies to bookings cancelled due to account termination for breach.</li>
                <li>Refuse service to anyone for any lawful reason at any time.</li>
              </ul>
              <p className="mt-2">
                Upon termination, your right to use the Platform ceases immediately. Provisions
                of these Terms that by their nature should survive termination — including
                Sections 6, 7, 11, 12, 13, 14, 17, and 18 — shall survive.
              </p>
            </section>

            {/* 17. Dispute Resolution */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">17. Dispute Resolution</h2>
              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">17.1 Informal Resolution</h3>
              <p>
                Before initiating any formal legal action, you agree to first contact us at{' '}
                <strong>enquires@thezurilofts.com</strong> and attempt to resolve the dispute
                informally. Both parties agree to negotiate in good faith for a period of at
                least 30 days.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">17.2 Governing Law</h3>
              <p>
                These Terms are governed by and construed in accordance with the laws of the
                Republic of Kenya, without regard to its conflict of law principles.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">17.3 Jurisdiction</h3>
              <p>
                Any legal action or proceeding arising from or related to these Terms shall
                be brought exclusively in the courts of Nairobi, Kenya. You consent to the
                personal jurisdiction of such courts and waive any objection based on
                inconvenient forum.
              </p>

              <h3 className="text-lg font-semibold text-[#0B0B45] mt-4 mb-2">17.4 Class Action Waiver</h3>
              <p>
                To the fullest extent permitted by law, you agree that any dispute resolution
                proceedings will be conducted on an individual basis only, and not in a class,
                consolidated, or representative action. You waive any right to participate in
                a class action lawsuit or class-wide arbitration.
              </p>
            </section>

            {/* 18. Changes to Terms */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">18. Modifications to These Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. When we make material
                changes, we will:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Post the updated Terms on this page with a revised &ldquo;Last updated&rdquo; date.</li>
                <li>Notify registered users via email at least 14 days before the changes take effect.</li>
                <li>Display a notice on the Platform for at least 7 days after publication.</li>
              </ul>
              <p className="mt-2">
                Your continued use of the Platform after the effective date constitutes
                acceptance of the modified Terms. If you disagree with the changes, you must
                stop using the Platform and may cancel any future bookings in accordance with
                Section 6.1.
              </p>
            </section>

            {/* 19. General Provisions */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">19. General Provisions</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and {companyName} regarding the Platform and supersede all prior agreements and understandings.</li>
                <li><strong>Severability:</strong> If any provision of these Terms is held invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect.</li>
                <li><strong>No Waiver:</strong> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.</li>
                <li><strong>Assignment:</strong> You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign or transfer these Terms without restriction.</li>
                <li><strong>Relationship:</strong> Nothing in these Terms creates a partnership, joint venture, employment, or agency relationship between you and {companyName}.</li>
                <li><strong>Notices:</strong> Any legal notices to {companyName} must be sent to <strong>enquires@thezurilofts.com</strong>. Notices to you will be sent to the email address associated with your account or posted on the Platform.</li>
                <li><strong>Electronic Communications:</strong> You consent to receive communications from us electronically. Electronic communications satisfy any legal requirement that such communications be in writing.</li>
              </ul>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-bold text-[#0B0B45] mb-3">20. Contact</h2>
              <p>
                For questions, concerns, or legal notices regarding these Terms of Service,
                contact us at:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> enquires@thezurilofts.com<br />
                <strong>Website:</strong> thezurilofts.com<br />
                <strong>Address:</strong> Nairobi, Kenya
              </p>
            </section>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default TermsPage;
