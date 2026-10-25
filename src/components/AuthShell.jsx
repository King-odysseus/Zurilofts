import PropTypes from 'prop-types';
import BrandLogo from './BrandLogo.jsx';
import { Link } from 'react-router-dom';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { Check, Languages, Star } from 'lucide-react';
import { zuriImages } from '../assets/images';
import { useLanguage } from '../context/LanguageContext.jsx';
import { languageOptions } from '../i18n/translations.js';
import RouteBackButton from './RouteBackButton.jsx';

const bgImage = zuriImages[14];

const PROOFS = [
  'Identity-checked hosts and secure payments',
  'High-speed internet, smart lock, hotel-grade linen',
  'Local support on call, in English and Kiswahili',
];

function GlobeIcon() {
  return <Languages className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />;
}

/**
 * Two-pane auth frame: a photo panel that carries the brand, and a white form
 * column. There is no card, no shadow and no tinted page behind the form: on
 * this design the only colour on the screen is the photograph.
 */
function AuthShell({ children }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <main className="min-h-screen bg-white text-ink lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      <section className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <img src={bgImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#0B1F42]/70" aria-hidden="true" />

        <Link to="/" className="relative flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <BrandLogo imgClassName="h-8 w-auto" />
          ZuriLofts
        </Link>

        <div className="relative max-w-[540px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/80">Verified stays in Nairobi</p>
          <h2 className="mt-4 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] xl:text-[44px]">
            Find your place in Nairobi.
          </h2>
          <p className="mt-4 max-w-[470px] text-[15px] leading-relaxed text-white/85">
            Premium furnished apartments in the city&apos;s best neighbourhoods, verified, ready to live in, and supported by people who know Nairobi.
          </p>
          <ul className="mt-8 space-y-3.5">
            {PROOFS.map((proof) => (
              <li key={proof} className="flex items-start gap-3 text-sm text-white/90">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {proof}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-sm text-white/80" aria-label="Five-star guest rating">
          <span className="flex gap-0.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((star) => <Star key={star} className="h-4 w-4 fill-current text-primary" strokeWidth={0} />)}
          </span>
          Rated five stars by guests who stayed with us
        </div>
      </section>

      <section className="flex min-h-screen flex-col bg-white px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <RouteBackButton className="!bg-white !px-2.5 hover:!bg-inset" />
          <div className="flex items-center gap-1">
            <Link
              to="/guides"
              className="rounded-full px-3 py-2 text-sm font-medium text-ink underline-offset-4 hover:bg-inset hover:underline"
            >
              Need help?
            </Link>
            <Dropdown
              inline
              arrowIcon={false}
              placement="bottom-end"
              dismissOnClick
              label={(
                <span className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-inset">
                  <GlobeIcon />
                  <span className="sr-only">{t('nav.language')}</span>
                </span>
              )}
            >
              {languageOptions.map((option) => (
                <DropdownItem key={option.value} onClick={() => setLang(option.value)}>
                  <span className="flex w-full items-center justify-between gap-6">
                    <span>{option.label}</span>
                    {String(lang) === String(option.value) && <span aria-hidden="true">✓</span>}
                  </span>
                </DropdownItem>
              ))}
            </Dropdown>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          {children}
        </div>

        <p className="mx-auto w-full max-w-[400px] text-center text-xs text-muted">
          ZuriLofts, Nairobi, Kenya
        </p>
      </section>
    </main>
  );
}

AuthShell.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthShell;
