import { useLanguage } from '../context/LanguageContext.jsx';
import { PHOTO_CREDITS } from '../data/photoCredits.js';

// Reuses the legal-page shell (op-public-page / op-legal-*) so this page needs no
// stylesheet of its own; every other style here is a Tailwind utility.
function PhotoCreditsPage() {
  const { t } = useLanguage();
  // CC0 images need no credit, so they are listed separately and plainly.
  const credited = PHOTO_CREDITS.filter((photo) => photo.licence !== 'CC0');
  const publicDomain = PHOTO_CREDITS.filter((photo) => photo.licence === 'CC0');

  return (
    <main className="op-public-page op-legal-page">
      <header className="op-public-hero op-legal-hero">
        <div className="op-content-container">
          <span className="op-eyebrow">{t('discovery.credits.eyebrow')}</span>
          <h1>{t('discovery.credits.title')}</h1>
          <p>{t('discovery.credits.intro')}</p>
        </div>
      </header>

      <div className="op-content-container op-legal-layout">
        <article className="op-legal-article">
          <div className="op-legal-content prose prose-slate max-w-none text-[#1f2937] leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('discovery.credits.homesTitle')}</h2>
              <p>{t('discovery.credits.homesBody')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('discovery.credits.placesTitle')}</h2>
              <p>{t('discovery.credits.placesBody')}</p>
              <ul className="mt-3 space-y-2">
                {credited.map((photo) => (
                  <li key={photo.file}>
                    <span className="font-semibold">{photo.title}</span>{' '}
                    {photo.author && <>{t('discovery.credits.by')} {photo.author}.{' '}</>}
                    {t('discovery.credits.licenceLabel')}:{' '}
                    <a href={photo.licenceUrl} target="_blank" rel="noopener noreferrer">{photo.licence}</a>.{' '}
                    <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{t('discovery.credits.original')}</a>
                  </li>
                ))}
              </ul>
              {publicDomain.length > 0 && (
                <>
                  <p className="mt-4">{t('discovery.credits.publicDomain')}</p>
                  <ul className="mt-2 space-y-2">
                    {publicDomain.map((photo) => (
                      <li key={photo.file}>
                        <span className="font-semibold">{photo.title}</span>{' '}
                        {photo.author && <>{t('discovery.credits.by')} {photo.author}.{' '}</>}
                        <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{t('discovery.credits.original')}</a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('discovery.credits.otherTitle')}</h2>
              <p>{t('discovery.credits.otherBody')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#203565] mb-3">{t('discovery.credits.softwareTitle')}</h2>
              <p>{t('discovery.credits.softwareBody')}</p>
              <p className="mt-2"><a href="/third-party-notices.txt">{t('discovery.credits.softwareLink')}</a></p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}

export default PhotoCreditsPage;
