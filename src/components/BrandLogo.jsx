import PropTypes from 'prop-types';
import logoImg from '../assets/zurilofts-logo.png';

/**
 * The mark is thin bronze line work on a transparent background, so it fades away
 * against white headers. Every surface that shows it puts it on this warm rounded
 * tile instead, which lifts the bronze lines and keeps the wordmark readable.
 */
function BrandLogo({ className = '', imgClassName = 'h-8 w-auto', alt = 'ZuriLofts' }) {
  return (
    <span className={`op-brand-tile ${className}`.trim()}>
      <img src={logoImg} alt={alt} className={imgClassName} />
    </span>
  );
}

BrandLogo.propTypes = {
  className: PropTypes.string,
  imgClassName: PropTypes.string,
  alt: PropTypes.string,
};

export default BrandLogo;
