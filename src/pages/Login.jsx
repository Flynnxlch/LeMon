import { memo, useCallback, useEffect, useState } from 'react';
import { HiLockClosed, HiMail } from 'react-icons/hi';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button/Button';
import Input from '../components/common/Input/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail, validatePassword } from '../utils/validation';

const SESSION_EXPIRED_KEY = 'sessionExpired';

const Login = memo(() => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem('rememberMe') === 'true'; } catch { return false; }
  });
  const [rememberDuration, setRememberDuration] = useState('1d');

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_EXPIRED_KEY)) {
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      toast.info('Your session has expired. Please log in again.');
    }
  }, [toast]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [errors]);
  
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      await login(formData.email, formData.password, {
        rememberMe,
        rememberDuration: rememberMe ? rememberDuration : undefined,
      });
      if (rememberMe) {
        try { localStorage.setItem('rememberMe', 'true'); } catch { /* ignore */ }
      } else {
        try { localStorage.removeItem('rememberMe'); } catch { /* ignore */ }
      }
      navigate('/dashboard');
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  }, [formData, login, navigate, validateForm, rememberMe, rememberDuration]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-900 rounded-xl mb-4">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            TrackSTU
          </h1>
          <p className="text-neutral-500">
            Monitor and manage your rental assets
          </p>
        </div>
        
        {/* Login Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            Sign In
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john.doe@example.com"
              required
              icon={<HiMail className="w-5 h-5" />}
              error={errors.email}
              autoComplete="email"
              disabled={loading}
            />
            
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              icon={<HiLockClosed className="w-5 h-5" />}
              error={errors.password}
              showPasswordToggle
              autoComplete="current-password"
              disabled={loading}
            />

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
            
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-neutral-900 border-gray-300 rounded focus:ring-neutral-900 cursor-pointer"
                    aria-label="Remember me"
                  />
                  <span className="ml-2 text-neutral-500">Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-neutral-900 hover:underline font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              {rememberMe && (
                <label className="flex items-center gap-2 text-neutral-500">
                  <span>Keep me signed in for:</span>
                  <select
                    value={rememberDuration}
                    onChange={(e) => setRememberDuration(e.target.value)}
                    className="border border-neutral-300 rounded-md px-2 py-1 text-neutral-900 bg-white focus:ring-neutral-900 focus:border-neutral-900"
                    aria-label="Remember duration"
                  >
                    <option value="1d">1 day</option>
                    <option value="3d">3 days</option>
                    <option value="7d">1 week</option>
                    <option value="30d">30 days</option>
                  </select>
                </label>
              )}
            </div>
            
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-500">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-neutral-900 hover:underline font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-sm text-neutral-500 mt-8">
          © 2026 Rental Asset Monitoring System. All rights reserved.
        </p>
      </div>
    </div>
  );
});

Login.displayName = 'Login';

export default Login;
