import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import logoImg from '../assets/zurilofts-logo.png';
import { zuriImages } from '../assets/images';
import { googleOAuthUrl } from '../utils/authUrls.js';

// Use a consistent background image with a dark overlay
const bgImage = zuriImages[14]; // Ely Homes Photography (15 of 20)

function getDashboardPath(user) {
  if (user?.role === 'ADMIN') return '/admin';
  if (user?.role === 'HOST') return '/host/today';
  return '/';
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleHref = googleOAuthUrl();

  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      const returnTo = searchParams.get('returnUrl')
        || getDashboardPath(user);
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate, searchParams]);

  useEffect(() => {
    if (searchParams.get('error')) {
      setLocalError('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setLocalError('');
    const result = await login(email, password);
    if (!result.success) {
      setLocalError(result.message);
    }
    setSubmitting(false);
  }

  return (
    <main className="op-auth-page">
      <section className="op-auth-story" style={{ backgroundImage: `linear-gradient(90deg,rgba(11,31,66,.83),rgba(44,67,112,.72)),url("${bgImage}")` }}>
        <Link to="/" className="op-auth-brand"><img src={logoImg} alt="" />ZuriLofts</Link>
        <div className="op-auth-story-copy"><span className="op-auth-proof">✦ &nbsp;Verified stays in Nairobi</span><h1>Find your place in Nairobi.</h1><p>Premium furnished apartments in the city’s best neighbourhoods — verified, ready to live in, and supported by people who know Nairobi.</p><ul><li>Identity-checked hosts and secure payments</li><li>High-speed internet, smart lock, hotel-grade linen</li><li>Local support on call, in English and Kiswahili</li></ul></div>
        <div className="op-auth-stars">★★★★★</div>
      </section>
      <section className="op-auth-side"><div className="op-auth-top"><Link to="/contact">Need help?</Link><span>English (UK) ⌄</span></div><div className="op-auth-card"><h2>Welcome back</h2><p>Sign in to manage your stays, bookings and saved places.</p>{(localError || error) && <div className="op-auth-error" role="alert">{localError || error}</div>}<form onSubmit={handleSubmit}><label>Email address<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" /></label><label>Password<div className="op-auth-password"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" /><PasswordToggle shown={showPassword} onClick={()=>setShowPassword((v)=>!v)} /></div></label><div className="op-auth-form-row"><label><input type="checkbox" defaultChecked /> Remember me</label><Link to="/forgot-password">Forgot password?</Link></div><button className="op-auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in →'}</button></form><div className="op-auth-divider">or continue with</div><a className="op-auth-google" href={googleHref}><span>G</span> Continue with Google</a><div className="op-auth-switch">New to ZuriLofts? <Link to="/register">Create account</Link></div></div></section>
    </main>
  );
}

// Eye toggle button shown inside a password field
function PasswordToggle({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#6b7280] hover:text-[#0B0B45] transition-colors"
    >
      {shown ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

export default LoginPage;
