import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';

function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <main className="op-public-page op-not-found">
      <div className="op-not-found-inner">
        <span className="op-eyebrow">404</span>
        <h1>{t('discovery.notFoundTitle')}</h1>
        <p>{t('discovery.notFoundBody')}</p>
        <Link to="/" className="op-primary-action">{t('discovery.notFoundAction')}</Link>
      </div>
    </main>
  );
}

export default NotFoundPage;
