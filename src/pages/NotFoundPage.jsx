import { Link } from 'react-router-dom';
import { Button } from 'flowbite-react';

function NotFoundPage() {
  return (
    <main className="grid min-h-[65vh] place-items-center bg-white px-5 py-16 text-center">
      <div className="max-w-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">404</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">The page you are looking for does not exist or has moved.</p>
        <Button as={Link} to="/" className="mt-6">Go Home</Button>
      </div>
    </main>
  );
}

export default NotFoundPage;
