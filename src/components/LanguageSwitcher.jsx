import PropTypes from 'prop-types';
import { Dropdown, DropdownItem } from 'flowbite-react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { languageOptions } from '../i18n/translations.js';

/**
 * The language switcher, in one place.
 *
 * Every workspace header needs this control, and three hand-written copies would
 * drift: a different icon size here, a different menu placement there. The caller
 * supplies only the trigger's look, because the host header, the admin header and
 * the guest navbar each have their own button geometry.
 *
 * The accessible name comes from the dictionary, so a screen reader hears
 * "Lugha" when the rest of the page is Swahili.
 */
function LanguageSwitcher({ triggerClassName = '', placement = 'bottom-end' }) {
  const { t, lang, setLang } = useLanguage();

  return (
    <Dropdown
      inline
      theme={{ inlineWrapper: triggerClassName }}
      label={(
        <>
          <span className="sr-only">{t('nav.language')}</span>
          <span aria-hidden="true">
            <Languages className="h-5 w-5" strokeWidth={1.8} />
          </span>
        </>
      )}
      arrowIcon={false}
      placement={placement}
      aria-label={t('nav.language')}
    >
      {languageOptions.map((option) => (
        <DropdownItem
          key={option.value}
          onClick={() => setLang(option.value)}
        >
          {/* The current language is marked rather than hidden, so the menu says
              what is selected instead of leaving the reader to infer it. */}
          <span aria-current={option.value === lang ? 'true' : undefined} className={option.value === lang ? 'font-semibold' : undefined}>
            {option.label}
          </span>
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

LanguageSwitcher.propTypes = {
  triggerClassName: PropTypes.string,
  placement: PropTypes.string,
};

export default LanguageSwitcher;
