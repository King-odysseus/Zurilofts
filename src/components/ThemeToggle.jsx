import PropTypes from 'prop-types';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

function ThemeToggle({ className = '', showLabel = false }) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const label = t(isDark ? 'trust.switchToLightMode' : 'trust.switchToDarkMode');

  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
    >
      <span className="zl-theme-toggle-icon" aria-hidden="true">
        {isDark ? (
          <Sun strokeWidth={1.8} />
        ) : (
          <Moon strokeWidth={1.8} />
        )}
      </span>
      {showLabel && <span>{label}</span>}
    </button>
  );
}

ThemeToggle.propTypes = {
  className: PropTypes.string,
  showLabel: PropTypes.bool,
};

export default ThemeToggle;
