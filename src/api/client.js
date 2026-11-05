import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  // A request the server never answers used to leave the page on its spinner for
  // ever, with no error state and nothing to act on. 30s is longer than the
  // slowest real endpoint (an image upload while sharp re-encodes it) and short
  // enough to fail while the person is still looking at the screen.
  timeout: 30_000,
});

// Track access token in a module-level variable
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

// A refresh that fails because the endpoint is rate-limited or briefly
// unreachable is not a signed-out user: treating it as one bounced every
// protected route to the sign-in screen, so a transient blip looked like the
// account had been logged out. Only a rejection from the server itself (a 401
// for an expired or revoked token) ends the session.
const TRANSIENT_REFRESH_STATUSES = new Set([429, 500, 502, 503, 504]);
const REFRESH_ATTEMPTS = 3;

function isTransientRefreshFailure(err) {
  if (!err?.response) return true;
  return TRANSIENT_REFRESH_STATUSES.has(err.response.status);
}

async function postRefresh() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await axios.post(
        `${apiClient.defaults.baseURL}/auth/refresh`,
        {},
        // Same deadline as every other call: this one runs unattended on page
        // load, so a hung socket would hold the restored session for ever.
        { withCredentials: true, timeout: 15_000 }
      );
    } catch (err) {
      if (attempt >= REFRESH_ATTEMPTS || !isTransientRefreshFailure(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }
}

/**
 * Exchange the refresh cookie for a new access token, deduplicated.
 *
 * The server rotates the refresh token on every exchange, so two exchanges that
 * race on the same cookie desynchronise: the loser is rejected, and that 401
 * clears the cookie, signing the user out mid-session. React StrictMode
 * double-mounts the restore effect on every page load, and a second tab also
 * refreshes on open, so concurrent callers must share one request. Resolves
 * with the raw response so callers can read the user payload.
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = postRefresh()
      .then((res) => {
        const newToken = res.data.data?.accessToken;
        if (!newToken) {
          throw new Error('No token in refresh response');
        }
        setAccessToken(newToken);
        return res;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Request interceptor: attach access token
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: handle 401 -> refresh -> retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Never retry if the failed request was itself a refresh attempt.
    // Retrying `/auth/refresh` when it 401s is pointless - there's no
    // valid refresh token to exchange, so it will just 401 again.
    if (originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const res = await refreshSession();
        const newToken = res.data.data.accessToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed - trigger logout
        clearAccessToken();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
