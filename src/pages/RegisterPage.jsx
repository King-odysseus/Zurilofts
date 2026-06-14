import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import logoImg from '../assets/zurilofts-logo.png';
import { zuriImages } from '../assets/images';

// Use the same background treatment as the login page for consistency
const bgImage = zuriImages[14];

function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setLocalError('');

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    if (formData.password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      setSubmitting(false);
      return;
    }

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    });

    if (!result.success) {
      setLocalError(result.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img src={bgImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#262262]/70"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="neu-card auth-card p-8 bg-white/95 backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <img src={logoImg} alt="ZuriLofts" className="h-20 w-auto mx-auto" />
            </Link>
            <h1 className="text-2xl font-bold text-[#262262]">Create Account</h1>
            <p className="text-[#6b7280] mt-2">Join ZuriLofts for premium stays</p>
          </div>

          {(localError || error) && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1f2937] mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="neu-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1f2937] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  className="neu-input w-full px-4 py-3 pr-12 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                  required
                />
                <PasswordToggle
                  shown={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1f2937] mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className="neu-input w-full px-4 py-3 pr-12 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                  required
                />
                <PasswordToggle
                  shown={showConfirm}
                  onClick={() => setShowConfirm((v) => !v)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#C49A6C] text-white font-semibold py-3 rounded-full hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50 mt-6"
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[#6b7280] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#C49A6C] font-semibold hover:text-[#262262] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Eye toggle button shown inside a password field
function PasswordToggle({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#6b7280] hover:text-[#262262] transition-colors"
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

export default RegisterPage;
