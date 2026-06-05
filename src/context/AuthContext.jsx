import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import apiClient, { setAccessToken, clearAccessToken } from '../api/client.js';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'SET_USER':
      return { ...state, user: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Try to restore session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await apiClient.post('/auth/refresh');
        if (res.data.success && res.data.data) {
          const { user, accessToken } = res.data.data;
          setAccessToken(accessToken);
          dispatch({ type: 'AUTH_SUCCESS', payload: { user, accessToken } });
        } else {
          dispatch({ type: 'AUTH_FAILURE', payload: null });
        }
      } catch {
        dispatch({ type: 'AUTH_FAILURE', payload: null });
      }
    }

    restoreSession();
  }, []);

  // Listen for forced logout from the axios interceptor
  useEffect(() => {
    function handleForceLogout() {
      dispatch({ type: 'LOGOUT' });
    }
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user, accessToken } = res.data.data;
      setAccessToken(accessToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, accessToken } });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message };
    }
  }, []);

  const register = useCallback(async (data) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const res = await apiClient.post('/auth/register', data);
      const { user, accessToken } = res.data.data;
      setAccessToken(accessToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, accessToken } });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore logout API errors
    }
    clearAccessToken();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const handleOAuthCallback = useCallback(async (oauthToken) => {
    dispatch({ type: 'AUTH_START' });
    try {
      setAccessToken(oauthToken);
      const res = await apiClient.get('/auth/me');
      const user = res.data.data;
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, accessToken: oauthToken } });
      return { success: true };
    } catch (err) {
      clearAccessToken();
      const message = 'Google sign-in failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message };
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = {
    ...state,
    login,
    register,
    logout,
    handleOAuthCallback,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
