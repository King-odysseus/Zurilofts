import PropTypes from 'prop-types';
import logoImg from '../assets/zurilofts-logo.png';

/**
 * The mark and its wordmark sit on a transparent background, so every surface
 * shows it inside this white rounded tile. The border and shadow give the logo a
 * defined edge on white headers without tinting the artwork.
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
