import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { Languages } from 'lucide-react';
import logoImg from '../assets/zurilofts-logo.png';
import { zuriImages } from '../assets/images';
import { useLanguage } from '../context/LanguageContext.jsx';
import { languageOptions } from '../i18n/translations.js';
import RouteBackButton from './RouteBackButton.jsx';

const bgImage = zuriImages[14];

function GlobeIcon() {
  return <Languages className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />;
}

function AuthShell({ children }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <main className="op-auth-page">
      <section className="op-auth-story" style={{ backgroundImage: `linear-gradient(90deg,rgba(11,31,66,.83),rgba(44,67,112,.72)),url("${bgImage}")` }}>
        <Link to="/" className="op-auth-brand"><img src={logoImg} alt="" />ZuriLofts</Link>
        <div className="op-auth-story-copy">
          <span className="op-auth-proof">✦ &nbsp;Verified stays in Nairobi</span>
          <h1>Find your place in Nairobi.</h1>
          <p>Premium furnished apartments in the city’s best neighbourhoods, verified, ready to live in, and supported by people who know Nairobi.</p>
          <ul>
            <li>Identity-checked hosts and secure payments</li>
            <li>High-speed internet, smart lock, hotel-grade linen</li>
            <li>Local support on call, in English and Kiswahili</li>
          </ul>
        </div>
        <div className="op-auth-stars" aria-label="Five-star guest rating">★★★★★</div>
      </section>

      <section className="op-auth-side">
        <div className="op-auth-top">
          <RouteBackButton className="op-auth-back" />
          <div className="op-auth-top-actions">
            <Link to="/guides">Need help?</Link>
            <Dropdown
              inline
              theme={{ inlineWrapper: 'op-auth-language' }}
              label={<span className="op-auth-language-trigger"><GlobeIcon /><span className="sr-only">{t('nav.language')}</span></span>}
              arrowIcon={false}
              placement="bottom-end"
              dismissOnClick
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
        <div className="op-auth-card">{children}</div>
      </section>
    </main>
  );
}

AuthShell.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthShell;
