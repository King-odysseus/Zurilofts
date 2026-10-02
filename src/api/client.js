import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
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
    refreshPromise = axios
      .post(
        `${apiClient.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      )
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
