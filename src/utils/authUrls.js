function trimTrailingSlashes(value) {
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL || '/api';
  const base = trimTrailingSlashes(configured.trim());

  if (!base) return '/api';

  if (typeof window !== 'undefined') {
    const currentOrigin = trimTrailingSlashes(window.location.origin);
    if (base === currentOrigin) {
      return `${currentOrigin}/api`;
    }
  }

  return base;
}

export function googleOAuthUrl() {
  return `${getApiBaseUrl()}/auth/google`;
}
