import { useRef } from 'react';
import { LegalPageContentsDesktop, LegalPageContentsMobile } from '../components/LegalPageContents.jsx';
import { POLICY_VERSION } from '../utils/consent.js';
import { useLanguage } from '../context/LanguageContext.jsx';

function PrivacyPage() {
  const { t } = useLanguage();
  // The date and the version are values, not prose: they stay as data here and
  // are dropped into the translated sentence around them.
  const lastUpdated = '8 August 2026';
  const articleRef = useRef(null);

  return (
    <main className="op-public-page op-legal-page">
      <header className="op-public-hero op-legal-hero">
        <div className="op-content-container">
          <nav className="op-breadcrumbs" aria-label={t('a11y3.breadcrumb')}>
            <a href="/">{t('legal.privacy.home')}</a><span>/</span><span>{t('legal.privacy.privacy')}</span>
          </nav>
          <span className="op-eyebrow">{t('legal.privacy.eyebrow')}</span>
          <h1>{t('legal.privacy.title')}</h1>
          <p>
            {t('legal.privacy.lastUpdatedLabel')} {lastUpdated} · {t('legal.privacy.policyVersionLabel')} {POLICY_VERSION}
          </p>
        </div>
      </header>

      <div className="op-content-container op-legal-layout">
        <div className="op-legal-aside"><LegalPageContentsDesktop containerRef={articleRef} /></div>
        <article className="op-legal-article" ref={articleRef}>
          <LegalPageContentsMobile containerRef={articleRef} />
          <div className="op-legal-content prose prose-slate max-w-none text-[#1f2937] leading-relaxed">

            {/* 1. Introduction */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s1Title')}</h2>
              <p>
                {t('legal.privacy.s1Lead')}{' '}
                <strong>thezurilofts.com</strong>{' '}
                {t('legal.privacy.s1Tail')}
              </p>
              <p className="mt-3">
                {t('legal.privacy.s1Consent')}
              </p>
            </section>

            {/* 2. Data Controller */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s2Title')}</h2>
              <p>
                {t('legal.privacy.s2Body')}
              </p>
              <p className="mt-2">
                <strong>{t('legal.privacy.emailLabel')}</strong> privacy@thezurilofts.com<br />
                <strong>{t('legal.privacy.addressLabel')}</strong> Nairobi, Kenya
              </p>
            </section>

            {/* 3. Information We Collect */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s3Title')}</h2>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.privacy.s31Title')}</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>{t('legal.privacy.s31AccountLabel')}</strong> {t('legal.privacy.s31AccountText')}</li>
                <li><strong>{t('legal.privacy.s31BookingLabel')}</strong> {t('legal.privacy.s31BookingText')}</li>
                <li><strong>{t('legal.privacy.s31PaymentLabel')}</strong> {t('legal.privacy.s31PaymentText')}</li>
                <li><strong>{t('legal.privacy.s31CommunicationLabel')}</strong> {t('legal.privacy.s31CommunicationText')}</li>
                <li><strong>{t('legal.privacy.s31ReviewLabel')}</strong> {t('legal.privacy.s31ReviewText')}</li>
                <li><strong>{t('legal.privacy.s31FavouritesLabel')}</strong> {t('legal.privacy.s31FavouritesText')}</li>
                <li><strong>{t('legal.privacy.s31ContactLabel')}</strong> {t('legal.privacy.s31ContactText')}</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.privacy.s32Title')}</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>{t('legal.privacy.s32UsageLabel')}</strong> {t('legal.privacy.s32UsageText')}</li>
                <li><strong>{t('legal.privacy.s32DeviceLabel')}</strong> {t('legal.privacy.s32DeviceText')}</li>
                <li><strong>{t('legal.privacy.s32CookieLabel')}</strong> {t('legal.privacy.s32CookieText')}</li>
                <li><strong>{t('legal.privacy.s32StorageLabel')}</strong> {t('legal.privacy.s32StorageText')}</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.privacy.s33Title')}</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('legal.privacy.s33IdText')}</li>
                <li>{t('legal.privacy.s33BiometricText')}</li>
                <li>{t('legal.privacy.s33GeoText')}</li>
                <li>{t('legal.privacy.s33ChildrenText')}</li>
              </ul>
            </section>

            {/* 4. Legal Basis for Processing */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s4Title')}</h2>
              <p>{t('legal.privacy.s4Body')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.privacy.s4ContractLabel')}</strong> {t('legal.privacy.s4ContractText')}</li>
                <li><strong>{t('legal.privacy.s4InterestLabel')}</strong> {t('legal.privacy.s4InterestText')}</li>
                <li><strong>{t('legal.privacy.s4ConsentLabel')}</strong> {t('legal.privacy.s4ConsentText')}</li>
                <li><strong>{t('legal.privacy.s4LegalLabel')}</strong> {t('legal.privacy.s4LegalText')}</li>
              </ul>
            </section>

            {/* 5. How We Use Your Information */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s5Title')}</h2>
              <p>{t('legal.privacy.s5Intro')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.privacy.s5Account')}</li>
                <li>{t('legal.privacy.s5Bookings')}</li>
                <li>{t('legal.privacy.s5Communicate')}</li>
                <li>{t('legal.privacy.s5Messaging')}</li>
                <li>{t('legal.privacy.s5Payments')}</li>
                <li>{t('legal.privacy.s5Pricing')}</li>
                <li>{t('legal.privacy.s5Calendar')}</li>
                <li>{t('legal.privacy.s5Reviews')}</li>
                <li>{t('legal.privacy.s5Personalise')}</li>
                <li>{t('legal.privacy.s5Notifications')}</li>
                <li>{t('legal.privacy.s5Fraud')}</li>
                <li>{t('legal.privacy.s5Analyse')}</li>
                <li>{t('legal.privacy.s5Comply')}</li>
              </ul>
              <p className="mt-3">
                {t('legal.privacy.s5NeverLead')} <strong>{t('legal.privacy.s5NeverEmphasis')}</strong>{' '}
                {t('legal.privacy.s5NeverTail')}
              </p>
            </section>

            {/* 6. Data Sharing and Disclosure */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s6Title')}</h2>
              <p>{t('legal.privacy.s6Intro')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.privacy.s6ProvidersLabel')}</strong> {t('legal.privacy.s6ProvidersText')}</li>
                <li><strong>{t('legal.privacy.s6CalendarLabel')}</strong> {t('legal.privacy.s6CalendarText')}</li>
                <li><strong>{t('legal.privacy.s6LegalLabel')}</strong> {t('legal.privacy.s6LegalText')}</li>
                <li><strong>{t('legal.privacy.s6TransferLabel')}</strong> {t('legal.privacy.s6TransferText')}</li>
                <li><strong>{t('legal.privacy.s6ConsentLabel')}</strong> {t('legal.privacy.s6ConsentText')}</li>
              </ul>
            </section>

            {/* 7. Data Retention */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s7Title')}</h2>
              <p>{t('legal.privacy.s7Intro')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.privacy.s7AccountLabel')}</strong> {t('legal.privacy.s7AccountText')}</li>
                <li><strong>{t('legal.privacy.s7BookingLabel')}</strong> {t('legal.privacy.s7BookingText')}</li>
                <li><strong>{t('legal.privacy.s7MessagesLabel')}</strong> {t('legal.privacy.s7MessagesText')}</li>
                <li><strong>{t('legal.privacy.s7ReviewsLabel')}</strong> {t('legal.privacy.s7ReviewsText')}</li>
                <li><strong>{t('legal.privacy.s7UsageLabel')}</strong> {t('legal.privacy.s7UsageText')}</li>
                <li><strong>{t('legal.privacy.s7PaymentLabel')}</strong> {t('legal.privacy.s7PaymentText')}</li>
              </ul>
            </section>

            {/* 8. Data Security */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s8Title')}</h2>
              <p>
                {t('legal.privacy.s8Body')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.privacy.s8Tls')}</li>
                <li>{t('legal.privacy.s8Passwords')}</li>
                <li>{t('legal.privacy.s8Tokens')}</li>
                <li>{t('legal.privacy.s8Access')}</li>
                <li>{t('legal.privacy.s8Reviews')}</li>
                <li>{t('legal.privacy.s8Firewalls')}</li>
              </ul>
              <p className="mt-3">
                {t('legal.privacy.s8Breach')}
              </p>
            </section>

            {/* 9. International Data Transfers */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s9Title')}</h2>
              <p>
                {t('legal.privacy.s9Body')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.privacy.s9Adequate')}</li>
                <li>{t('legal.privacy.s9Clauses')}</li>
                <li>{t('legal.privacy.s9Contract')}</li>
              </ul>
            </section>

            {/* 10. Cookies and Tracking */}
            <section id="cookies" className="scroll-mt-24">
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s10Title')}</h2>
              <p>{t('legal.privacy.s10Intro')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.privacy.s10EssentialLabel')}</strong> {t('legal.privacy.s10EssentialText')}</li>
                <li><strong>{t('legal.privacy.s10PreferenceLabel')}</strong> {t('legal.privacy.s10PreferenceText')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.privacy.s10Control')}
              </p>
            </section>

            {/* 11. Third-Party Processors */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s11Title')}</h2>
              <p>
                {t('legal.privacy.s11Body')}
              </p>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-[#203565] border-b-2 border-[#D9D9D9]">
                      <th className="py-2 pr-4 font-semibold">{t('legal.privacy.s11ColProcessor')}</th>
                      <th className="py-2 pr-4 font-semibold">{t('legal.privacy.s11ColReceives')}</th>
                      <th className="py-2 font-semibold">{t('legal.privacy.s11ColPurpose')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9D9D9]">
                    <tr>
                      <td className="py-3 pr-4 align-top font-medium">Cloudinary</td>
                      <td className="py-3 pr-4 align-top">{t('legal.privacy.s11CloudinaryReceives')}</td>
                      <td className="py-3 align-top">{t('legal.privacy.s11CloudinaryPurpose')}</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-top font-medium">Paystack</td>
                      <td className="py-3 pr-4 align-top">{t('legal.privacy.s11PaystackReceives')}</td>
                      <td className="py-3 align-top">{t('legal.privacy.s11PaystackPurpose')}</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-top font-medium">Google (OAuth)</td>
                      <td className="py-3 pr-4 align-top">{t('legal.privacy.s11GoogleReceives')}</td>
                      <td className="py-3 align-top">{t('legal.privacy.s11GooglePurpose')}</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-top font-medium">{t('legal.privacy.s11PushName')}</td>
                      <td className="py-3 pr-4 align-top">{t('legal.privacy.s11PushReceives')}</td>
                      <td className="py-3 align-top">{t('legal.privacy.s11PushPurpose')}</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-top font-medium">Telegram</td>
                      <td className="py-3 pr-4 align-top">{t('legal.privacy.s11TelegramReceives')}</td>
                      <td className="py-3 align-top">{t('legal.privacy.s11TelegramPurpose')}</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 align-top font-medium">Railway</td>
                      <td className="py-3 pr-4 align-top">{t('legal.privacy.s11RailwayReceives')}</td>
                      <td className="py-3 align-top">{t('legal.privacy.s11RailwayPurpose')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                {t('legal.privacy.s11NoSell')}
              </p>
            </section>

            {/* 12. Your Rights */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s12Title')}</h2>
              <p>{t('legal.privacy.s12Intro')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.privacy.s12AccessLabel')}</strong> {t('legal.privacy.s12AccessText')}</li>
                <li><strong>{t('legal.privacy.s12RectifyLabel')}</strong> {t('legal.privacy.s12RectifyText')}</li>
                <li><strong>{t('legal.privacy.s12EraseLabel')}</strong> {t('legal.privacy.s12EraseText')}</li>
                <li><strong>{t('legal.privacy.s12RestrictLabel')}</strong> {t('legal.privacy.s12RestrictText')}</li>
                <li><strong>{t('legal.privacy.s12PortabilityLabel')}</strong> {t('legal.privacy.s12PortabilityText')}</li>
                <li><strong>{t('legal.privacy.s12ObjectLabel')}</strong> {t('legal.privacy.s12ObjectText')}</li>
                <li><strong>{t('legal.privacy.s12WithdrawLabel')}</strong> {t('legal.privacy.s12WithdrawText')}</li>
                <li><strong>{t('legal.privacy.s12ComplainLabel')}</strong> {t('legal.privacy.s12ComplainText')}</li>
              </ul>
              <p className="mt-3">
                {t('legal.privacy.s12ExerciseIntro')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.privacy.s12AccessPortabilityLabel')}</strong> {t('legal.privacy.s12Use')} <strong>{t('legal.privacy.s12DownloadData')}</strong> {t('legal.privacy.s12InSectionOf')} <em>{t('legal.privacy.s12PrivacyData')}</em> {t('legal.privacy.s12AccessTail')}</li>
                <li><strong>{t('legal.privacy.s12RectificationLabel')}</strong> {t('legal.privacy.s12RectificationLead')} <em>{t('legal.privacy.s12MyInfo')}</em> {t('legal.privacy.s12RectificationTail')}</li>
                <li><strong>{t('legal.privacy.s12ErasureLabel')}</strong> {t('legal.privacy.s12Use')} <strong>{t('legal.privacy.s12DeleteAccount')}</strong> {t('legal.privacy.s12InSectionOf')} <em>{t('legal.privacy.s12PrivacyData')}</em> {t('legal.privacy.s12ErasureTail')}</li>
                <li><strong>{t('legal.privacy.s12WithdrawalLabel')}</strong> {t('legal.privacy.s12Use')} <strong>{t('legal.privacy.s12CookiePreferences')}</strong> {t('legal.privacy.s12WithdrawalTail')}</li>
              </ul>
              <p className="mt-3">
                {t('legal.privacy.s12OtherLead')}{' '}
                <strong>privacy@thezurilofts.com</strong>.{' '}
                {t('legal.privacy.s12OtherTail')}
              </p>
            </section>

            {/* 13. Data Protection for Children */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s13Title')}</h2>
              <p>
                {t('legal.privacy.s13Body')}
              </p>
            </section>

            {/* 14. Changes to This Policy */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s14Title')}</h2>
              <p>
                {t('legal.privacy.s14Body')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.privacy.s14Post')}</li>
                <li>{t('legal.privacy.s14Notify')}</li>
                <li>{t('legal.privacy.s14Display')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.privacy.s14Accept')}
              </p>
            </section>

            {/* 15. Governing Law */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s15Title')}</h2>
              <p>
                {t('legal.privacy.s15Body')}
              </p>
            </section>

            {/* 16. Contact */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.privacy.s16Title')}</h2>
              <p>{t('legal.privacy.s16Body')}</p>
              <p className="mt-2">
                <strong>{t('legal.privacy.emailLabel')}</strong> privacy@thezurilofts.com<br />
                <strong>{t('legal.privacy.generalEnquiriesLabel')}</strong> enquires@zurilofts.com<br />
                <strong>{t('legal.privacy.addressLabel')}</strong> Nairobi, Kenya
              </p>
              <p className="mt-2">
                {t('legal.privacy.s16OdpcLead')}{' '}
                <strong>{t('legal.privacy.s16OdpcTerm')}</strong>{' '}
                {t('legal.privacy.s16OdpcTail')}{' '}
                <a href="https://www.odpc.go.ke" className="text-[#8A6B52] hover:underline" target="_blank" rel="noopener noreferrer">www.odpc.go.ke</a>.
              </p>
            </section>

          </div>
        </article>
      </div>
    </main>
  );
}

export default PrivacyPage;
