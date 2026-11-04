import { useRef } from 'react';
import { LegalPageContentsDesktop, LegalPageContentsMobile } from '../components/LegalPageContents.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

function TermsPage() {
  const { t } = useLanguage();
  const lastUpdated = '17 June 2026';
  const companyName = 'ZuriLofts';
  // The brand is a trading name only. Kenyan consumer law requires the legal
  // person behind it to be named in the terms, so the operator is stated
  // separately from the brand it trades as.
  const legalEntity = 'BeneAlpha Consulting Limited';
  // Deliberately empty until the CR12 number and the registered office are
  // confirmed: a guessed number or address would be a worse misstatement than
  // no line at all, so each line renders only when its value is known.
  const companyRegistrationNumber = '';
  const companyAddress = '';
  const articleRef = useRef(null);

  return (
    <main className="op-public-page op-legal-page">
      <header className="op-public-hero op-legal-hero">
        <div className="op-content-container">
          <nav className="op-breadcrumbs" aria-label={t('legal.terms.breadcrumbLabel')}>
            <a href="/">{t('legal.terms.breadcrumbHome')}</a><span>/</span><span>{t('legal.terms.breadcrumbTerms')}</span>
          </nav>
          <span className="op-eyebrow">{t('legal.terms.eyebrow')}</span>
          <h1>{t('legal.terms.title')}</h1>
          <p>{t('legal.terms.lastUpdated')}: {lastUpdated}</p>
        </div>
      </header>

      <div className="op-content-container op-legal-layout">
        <div className="op-legal-aside"><LegalPageContentsDesktop containerRef={articleRef} /></div>
        <article className="op-legal-article" ref={articleRef}>
          <LegalPageContentsMobile containerRef={articleRef} />
          <div className="op-legal-content prose prose-slate max-w-none text-[#1f2937] leading-relaxed">

            {/* 1. Acceptance */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s1Title')}</h2>
              <p>
                {t('legal.terms.s1BodyLead', { name: companyName })} <strong>thezurilofts.com</strong>{t('legal.terms.s1BodyTail', { name: companyName })}
              </p>
              <p className="mt-3">
                {t('legal.terms.s1Agreement', { name: companyName })}
              </p>
            </section>

            {/* 1a. The contracting entity */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s1EntityTitle')}</h2>
              <p>
                {t('legal.terms.s1EntityBody', { brand: companyName, entity: legalEntity })}
              </p>
              {companyRegistrationNumber && (
                <p className="mt-3">
                  {t('legal.terms.s1EntityRegistration', { number: companyRegistrationNumber })}
                </p>
              )}
              {companyAddress && (
                <p className="mt-3">
                  {t('legal.terms.s1EntityAddress', { address: companyAddress })}
                </p>
              )}
            </section>

            {/* 2. Definitions */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s2Title')}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>{t('legal.terms.s2BookingTerm')}</strong>{t('legal.terms.s2BookingBody')}</li>
                <li><strong>{t('legal.terms.s2GuestTerm')}</strong>{t('legal.terms.s2GuestBody')}</li>
                <li><strong>{t('legal.terms.s2PropertyTerm')}</strong>{t('legal.terms.s2PropertyBody')}</li>
                <li><strong>{t('legal.terms.s2BedTerm')}</strong>{t('legal.terms.s2BedBody')}</li>
                <li><strong>{t('legal.terms.s2NightlyTerm')}</strong>{t('legal.terms.s2NightlyBody')}</li>
                <li><strong>{t('legal.terms.s2StayTerm')}</strong>{t('legal.terms.s2StayBody')}</li>
              </ul>
            </section>

            {/* 3. Account */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s3Title')}</h2>
              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s31Title')}</h3>
              <p>
                {t('legal.terms.s31Body')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s32Title')}</h3>
              <p>
                {t('legal.terms.s32Body')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s32Password')}</li>
                <li>{t('legal.terms.s32NotifyLead')} <strong>enquires@zurilofts.com</strong>{t('legal.terms.s32NotifyTail')}</li>
                <li>{t('legal.terms.s32Logout')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s32NoLiability')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s33Title')}</h3>
              <p>
                {t('legal.terms.s33Body')}
              </p>
            </section>

            {/* 4. Bookings */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s4Title')}</h2>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s41Title')}</h3>
              <p>
                {t('legal.terms.s41Body')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s42Title')}</h3>
              <p>
                {t('legal.terms.s42Intro')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.terms.s42NightlyTerm')}</strong>{t('legal.terms.s42NightlyBody')}</li>
                <li><strong>{t('legal.terms.s42CleaningTerm')}</strong>{t('legal.terms.s42CleaningBody')}</li>
                <li><strong>{t('legal.terms.s42ServiceTerm')}</strong>{t('legal.terms.s42ServiceBody')}</li>
                <li><strong>{t('legal.terms.s42ExtraTerm')}</strong>{t('legal.terms.s42ExtraBody')}</li>
                <li><strong>{t('legal.terms.s42LateTerm')}</strong>{t('legal.terms.s42LateBody')}</li>
                <li><strong>{t('legal.terms.s42PromoTerm')}</strong>{t('legal.terms.s42PromoBody')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s42Currency')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s43Title')}</h3>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.terms.s43OneTerm')}</strong>{t('legal.terms.s43OneBody')}</li>
                <li><strong>{t('legal.terms.s43TwoTerm')}</strong>{t('legal.terms.s43TwoBody')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s43Max')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s44Title')}</h3>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.terms.s44InTerm')}</strong>{t('legal.terms.s44InBody')}</li>
                <li><strong>{t('legal.terms.s44OutTerm')}</strong>{t('legal.terms.s44OutBody')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s44Early')}
              </p>
            </section>

            {/* 5. Payment */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s5Title')}</h2>
              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s51Title')}</h3>
              <p>{t('legal.terms.s51Intro')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.terms.s51CardTerm')}</strong>{t('legal.terms.s51CardBody')}</li>
                <li><strong>{t('legal.terms.s51MpesaTerm')}</strong>{t('legal.terms.s51MpesaBody')}</li>
                <li><strong>{t('legal.terms.s51BankTerm')}</strong>{t('legal.terms.s51BankBody')}</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s52Title')}</h3>
              <p>
                {t('legal.terms.s52Body')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s53Title')}</h3>
              <p>
                {t('legal.terms.s53Body')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s54Title')}</h3>
              <p>
                {t('legal.terms.s54Body')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s54Apply')}</li>
                <li>{t('legal.terms.s54Combine')}</li>
                <li>{t('legal.terms.s54Void')}</li>
                <li>{t('legal.terms.s54Revoke')}</li>
                <li>{t('legal.terms.s54Cash')}</li>
              </ul>
            </section>

            {/* 6. Cancellation and Refunds */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s6Title')}</h2>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s61Title')}</h3>
              <p>{t('legal.terms.s61Intro')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong>{t('legal.terms.s61MoreTerm')}</strong>{t('legal.terms.s61MoreBody')}</li>
                <li><strong>{t('legal.terms.s61MidTerm')}</strong>{t('legal.terms.s61MidBody')}</li>
                <li><strong>{t('legal.terms.s61LessTerm')}</strong>{t('legal.terms.s61LessBody')}</li>
                <li><strong>{t('legal.terms.s61NoShowTerm')}</strong>{t('legal.terms.s61NoShowBody')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s61ContactLead')} <strong>enquires@zurilofts.com</strong>{t('legal.terms.s61ContactTail')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s62Title')}</h3>
              <p>
                {t('legal.terms.s62Intro')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s62LiUnavailable')}</li>
                <li>{t('legal.terms.s62LiFraud')}</li>
                <li>{t('legal.terms.s62LiPayment')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s62Refund')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s63Title')}</h3>
              <p>
                {t('legal.terms.s63Body')}
              </p>
            </section>

            {/* 7. Guest Obligations */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s7Title')}</h2>
              <p>{t('legal.terms.s7Intro')}</p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s71Title')}</h3>
              <p>
                {t('legal.terms.s71Body')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s72Title')}</h3>
              <p>
                {t('legal.terms.s72Body')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s73Title')}</h3>
              <p>
                {t('legal.terms.s73Body')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s73LiDamage')}</li>
                <li>{t('legal.terms.s73LiCleaning')}</li>
                <li>{t('legal.terms.s73LiMissing')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s73Charge')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s74Title')}</h3>
              <p>{t('legal.terms.s74Intro')}</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s74LiSmoking')}</li>
                <li>{t('legal.terms.s74LiPets')}</li>
                <li>{t('legal.terms.s74LiIllegal')}</li>
                <li>{t('legal.terms.s74LiCommercial')}</li>
                <li>{t('legal.terms.s74LiSubletting')}</li>
                <li>{t('legal.terms.s74LiSafety')}</li>
              </ul>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s75Title')}</h3>
              <p>
                {t('legal.terms.s75Body')}
              </p>
            </section>

            {/* 8. Reviews */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s8Title')}</h2>
              <p>
                {t('legal.terms.s8Intro')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s8LiLicence')}</li>
                <li>{t('legal.terms.s8LiGenuine')}</li>
                <li>{t('legal.terms.s8LiRemove')}</li>
                <li>{t('legal.terms.s8LiPrivate', { name: companyName })}</li>
              </ul>
            </section>

            {/* 9. Messaging */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s9Title')}</h2>
              <p>
                {t('legal.terms.s9Intro', { name: companyName })}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s9LiSpam')}</li>
                <li>{t('legal.terms.s9LiReview')}</li>
                <li>{t('legal.terms.s9LiContact')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s9Suspend')}
              </p>
            </section>

            {/* 10. Favourites */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s10Title')}</h2>
              <p>
                {t('legal.terms.s10Body')}
              </p>
            </section>

            {/* 11. Intellectual Property */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s11Title')}</h2>
              <p>
                {t('legal.terms.s11Body', { name: companyName })}
              </p>
              <p className="mt-2">
                {t('legal.terms.s11Licence')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s11LiCopy')}</li>
                <li>{t('legal.terms.s11LiScrape')}</li>
                <li>{t('legal.terms.s11LiBrand', { name: companyName })}</li>
                <li>{t('legal.terms.s11LiReverse')}</li>
              </ul>
            </section>

            {/* 12. Limitation of Liability */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s12Title')}</h2>
              <p className="font-semibold">
                {t('legal.terms.s12Warning')}
              </p>
              <p className="mt-2">
                {t('legal.terms.s12Intro')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s12LiGeneral', { name: companyName })}</li>
                <li>{t('legal.terms.s12LiCap')}</li>
                <li>{t('legal.terms.s12LiExcluded')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s12Survive')}
              </p>
            </section>

            {/* 13. Indemnification */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s13Title')}</h2>
              <p>
                {t('legal.terms.s13Body', { name: companyName })}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s13LiBreach')}</li>
                <li>{t('legal.terms.s13LiUse')}</li>
                <li>{t('legal.terms.s13LiDamage')}</li>
                <li>{t('legal.terms.s13LiThird')}</li>
              </ul>
            </section>

            {/* 14. Disclaimer of Warranties */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s14Title')}</h2>
              <p>
                {t('legal.terms.s14Body1')}
              </p>
              <p className="mt-2">
                {t('legal.terms.s14Body2')}
              </p>
            </section>

            {/* 15. Force Majeure */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s15Title')}</h2>
              <p>
                {t('legal.terms.s15Body')}
              </p>
              <p className="mt-2">
                {t('legal.terms.s15Relief')}
              </p>
            </section>

            {/* 16. Termination */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s16Title')}</h2>
              <p>
                {t('legal.terms.s16Intro')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s16LiSuspend', { name: companyName })}</li>
                <li>{t('legal.terms.s16LiCancel')}</li>
                <li>{t('legal.terms.s16LiRefuse')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s16Survive')}
              </p>
            </section>

            {/* 17. Dispute Resolution */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s17Title')}</h2>
              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s171Title')}</h3>
              <p>
                {t('legal.terms.s171Lead')} <strong>enquires@zurilofts.com</strong>{t('legal.terms.s171Tail')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s172Title')}</h3>
              <p>
                {t('legal.terms.s172Body')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s173Title')}</h3>
              <p>
                {t('legal.terms.s173Body')}
              </p>

              <h3 className="text-lg font-semibold text-[#203565] mt-4 mb-2">{t('legal.terms.s174Title')}</h3>
              <p>
                {t('legal.terms.s174Body')}
              </p>
            </section>

            {/* 18. Changes to Terms */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s18Title')}</h2>
              <p>
                {t('legal.terms.s18Intro')}
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>{t('legal.terms.s18LiPost')}</li>
                <li>{t('legal.terms.s18LiNotify')}</li>
                <li>{t('legal.terms.s18LiNotice')}</li>
              </ul>
              <p className="mt-2">
                {t('legal.terms.s18Continue')}
              </p>
            </section>

            {/* 19. General Provisions */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s19Title')}</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>{t('legal.terms.s19EntireTerm')}</strong>{t('legal.terms.s19EntireBody', { name: companyName })}</li>
                <li><strong>{t('legal.terms.s19SeverTerm')}</strong>{t('legal.terms.s19SeverBody')}</li>
                <li><strong>{t('legal.terms.s19WaiverTerm')}</strong>{t('legal.terms.s19WaiverBody')}</li>
                <li><strong>{t('legal.terms.s19AssignTerm')}</strong>{t('legal.terms.s19AssignBody')}</li>
                <li><strong>{t('legal.terms.s19RelationTerm')}</strong>{t('legal.terms.s19RelationBody', { name: companyName })}</li>
                <li><strong>{t('legal.terms.s19NoticesTerm')}</strong>{t('legal.terms.s19NoticesLead', { name: companyName })} <strong>enquires@zurilofts.com</strong>{t('legal.terms.s19NoticesTail')}</li>
                <li><strong>{t('legal.terms.s19ElectronicTerm')}</strong>{t('legal.terms.s19ElectronicBody')}</li>
              </ul>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('legal.terms.s20Title')}</h2>
              <p>
                {t('legal.terms.s20Intro')}
              </p>
              <p className="mt-2">
                <strong>{t('legal.terms.s20EntityLabel')}</strong> {legalEntity}<br />
                <strong>{t('legal.terms.s20EmailLabel')}</strong> enquires@zurilofts.com<br />
                <strong>{t('legal.terms.s20WebsiteLabel')}</strong> thezurilofts.com<br />
                <strong>{t('legal.terms.s20AddressLabel')}</strong> {companyAddress || t('legal.terms.s20AddressFallback')}
                {companyRegistrationNumber && (
                  <>
                    <br />
                    <strong>{t('legal.terms.s20RegistrationLabel')}</strong> {companyRegistrationNumber}
                  </>
                )}
              </p>
            </section>

          </div>
        </article>
      </div>
    </main>
  );
}

export default TermsPage;
