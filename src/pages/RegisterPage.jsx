import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import logoImg from '../assets/zurilofts-logo.png';
import { zuriImages } from '../assets/images';

// Use the same background treatment as the login page for consistency
const bgImage = zuriImages[14];

function getDashboardPath(user) {
  if (user?.role === 'HOST' || user?.role === 'ADMIN') return '/admin';
  return '/';
}

function RegisterPage() {
  const [searchParams] = useSearchParams();
  const urlRole = (searchParams.get('role') || '').toUpperCase();
  const isHost = urlRole === 'HOST';

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
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const { user, register, isAuthenticated, isLoading, error, clearError, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      navigate(getDashboardPath(user), { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate]);

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
      role: isHost ? 'HOST' : 'USER',
    });

    if (!result.success) {
      setLocalError(result.message);
      setSubmitting(false);
      return;
    }

    // Upload avatar if one was selected
    if (avatarFile) {
      try {
        const form = new FormData();
        form.append('avatar', avatarFile);
        const avatarRes = await apiClient.post('/users/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Update auth context with the avatar URL
        setUser(avatarRes.data.data);
      } catch {
        // Non-fatal — account is created, avatar can be added later
      }
    }

    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img src={bgImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#0B0B45]/70"></div>
      </div>

      {/* Back button */}
      <Link
        to="/"
        className="fixed top-6 left-6 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
        aria-label="Back to home"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </Link>

      <div className="max-w-md w-full relative z-10">
        <div className="shadow-sm auth-card p-8 bg-white/95 backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <img src={logoImg} alt="ZuriLofts" className="h-20 w-auto mx-auto" />
            </Link>
            <h1 className="text-2xl font-bold text-[#0B0B45]">
              {isHost ? 'Become a Host' : 'Create Account'}
            </h1>
            <p className="text-[#6b7280] mt-2">
              {isHost
                ? 'List your property and start earning with ZuriLofts'
                : 'Join ZuriLofts for premium stays'}
            </p>
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
                  className="auth-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
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
                  className="auth-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
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
                className="auth-input w-full px-4 py-3 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
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
                  className="auth-input w-full px-4 py-3 pr-12 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
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
                  className="auth-input w-full px-4 py-3 pr-12 focus:outline-none bg-white text-[#1f2937] placeholder-[#6b7280]"
                  required
                />
                <PasswordToggle
                  shown={showConfirm}
                  onClick={() => setShowConfirm((v) => !v)}
                />
              </div>
            </div>
            <div className="flex flex-col items-center pt-2">
              <p className="block text-sm font-semibold text-[#1f2937] mb-3">Profile Picture (optional)</p>
              <label className="relative cursor-pointer group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#D9D9D9]"
                  />
                ) : (
                  <div className="w-20 h-20 bg-[#D9D9D9]/30 rounded-full flex items-center justify-center border-2 border-dashed border-[#D9D9D9]">
                    <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      setAvatarPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#C49A6C] text-white font-semibold py-3 rounded-full hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50 mt-6"
            >
              {submitting
                ? 'Creating Account...'
                : isHost ? 'Create Host Account' : 'Create Account'}
            </button>
          </form>

          <Link
            to="/properties"
            className="flex items-center justify-center w-full py-3 mt-4 rounded-full border-2 border-[#D9D9D9] text-[#6b7280] font-semibold hover:border-[#C49A6C] hover:text-[#C49A6C] transition-all duration-200 text-sm"
          >
            Continue Browsing Properties
          </Link>

          <p className="text-center text-sm text-[#6b7280] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#C49A6C] font-semibold hover:text-[#0B0B45] transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Selling Points — Host Registration */}
        {isHost && (
          <div className="mt-6 auth-card rounded-2xl p-6 bg-white/95 backdrop-blur-sm max-w-md w-full">
            <h3 className="text-lg font-bold text-[#0B0B45] mb-4">Why Host with ZuriLofts</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="text-[#C49A6C] font-bold flex-shrink-0">7.5%</span>
                <span className="text-[#1f2937]"><span className="font-semibold">Lowest platform fee in Kenya</span> — less than half of Booking.com (15%)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C49A6C] flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-[#1f2937]"><span className="font-semibold">Guests pay zero markup</span> — unlike Airbnb&apos;s 14% guest fee, your listed price IS the guest price</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C49A6C] flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-[#1f2937]"><span className="font-semibold">Tax handled for you</span> — WHT auto-deducted, remitted to KRA, and you get a downloadable statement anytime</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#C49A6C] flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-[#1f2937]"><span className="font-semibold">Flexible payouts</span> — choose weekly, bi-weekly, or monthly transfers to your bank account</span>
              </li>
            </ul>

            {/* Airbnb comparison */}
            <div className="mt-5 bg-[#0B0B45]/5 rounded-xl p-4">
              <p className="text-xs font-semibold text-[#0B0B45] mb-2 uppercase tracking-wide">Cost Comparison — Guest Pays</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#6b7280] border-b border-[#D9D9D9]">
                    <th className="text-left py-1">Property at KES 8,000/night</th>
                    <th className="text-right py-1">Airbnb</th>
                    <th className="text-right py-1 text-[#C49A6C]">ZuriLofts</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#D9D9D9]/50">
                    <td className="py-1">Nightly rate</td>
                    <td className="text-right">KES 8,000</td>
                    <td className="text-right text-[#C49A6C] font-medium">KES 8,000</td>
                  </tr>
                  <tr className="border-b border-[#D9D9D9]/50">
                    <td className="py-1">Guest service fee</td>
                    <td className="text-right text-red-500">+KES 1,120 (14%)</td>
                    <td className="text-right text-[#C49A6C] font-bold">KES 0</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Guest pays</td>
                    <td className="text-right font-semibold text-red-500">KES 9,120</td>
                    <td className="text-right font-bold text-[#C49A6C]">KES 8,000</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-[#6b7280] mt-2 italic">
                Guests save 12% booking direct — your property attracts more bookings at the same listed price.
              </p>
            </div>
          </div>
        )}
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

export default RegisterPage;
