import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <main className="op-public-page op-not-found">
      <div className="op-not-found-inner">
        <span className="op-eyebrow">404</span>
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="op-primary-action">Go Home</Link>
      </div>
    </main>
  );
}

export default NotFoundPage;
