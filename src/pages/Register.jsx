import { memo, useCallback, useState } from 'react';
import { HiIdentification, HiLockClosed, HiMail, HiPhone, HiUser } from 'react-icons/hi';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button/Button';
import Input from '../components/common/Input/Input';
import { useAuth } from '../context/AuthContext';
import {
    getPasswordStrength,
    validateConfirmPassword,
    validateEmail,
    validateName,
    validatePassword,
    validatePhoneNumber
} from '../utils/validation';

const Register = memo(() => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    nip: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, label: '', color: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update password strength in real-time
    if (name === 'password') {
      setPasswordStrength(getPasswordStrength(value));
    }
    
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
    
    const nameError = validateName(formData.name);
    if (nameError) newErrors.name = nameError;

    if (!formData.nip) newErrors.nip = 'NIP is required';

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const phoneError = validatePhoneNumber(formData.phone);
    if (phoneError) newErrors.phone = phoneError;
    
    const passwordError = validatePassword(formData.password, true);
    if (passwordError) newErrors.password = passwordError;
    
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    
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
      await register({
        name: formData.name.trim(),
        nip: formData.nip.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });
      setShowSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  }, [formData, navigate, register, validateForm]);

  const getStrengthBarColor = () => {
    switch (passwordStrength.color) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Request Sent!</h2>
          <p className="text-neutral-500 mb-6">
            Your Branch Admin account request has been sent. Central Admin will approve and assign your branch before you can sign in.
          </p>
          <p className="text-sm text-neutral-500">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-900 rounded-xl mb-4">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Request Admin Cabang Account
          </h1>
          <p className="text-neutral-500">
            Submit your details to request a Branch Admin account. Central Admin will approve and assign your branch.
          </p>
        </div>
        
        {/* Register Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="User Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
              icon={<HiUser className="w-5 h-5" />}
              error={errors.name}
              autoComplete="name"
              disabled={loading}
            />

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
              label="Phone Number"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+62 812 3456 7890"
              required
              icon={<HiPhone className="w-5 h-5" />}
              error={errors.phone}
              autoComplete="tel"
              disabled={loading}
            />

            <Input
              label="NIP"
              type="text"
              name="nip"
              value={formData.nip}
              onChange={handleChange}
              placeholder="Enter your NIP"
              required
              icon={<HiIdentification className="w-5 h-5" />}
              error={errors.nip}
              disabled={loading}
            />

            <div>
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
                icon={<HiLockClosed className="w-5 h-5" />}
                error={errors.password}
                showPasswordToggle
                autoComplete="new-password"
                disabled={loading}
                helperText="At least 8 characters with uppercase, lowercase, and number"
              />
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-500">Password strength:</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength.color === 'red' ? 'text-red-500' :
                      passwordStrength.color === 'orange' ? 'text-orange-500' :
                      passwordStrength.color === 'yellow' ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getStrengthBarColor()}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              icon={<HiLockClosed className="w-5 h-5" />}
              error={errors.confirmPassword}
              showPasswordToggle
              autoComplete="new-password"
              disabled={loading}
            />

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
            
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Sending Request...' : 'Request Account'}
            </Button>
          </form>
          
          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-neutral-900 hover:underline font-medium transition-colors"
              >
                Sign in
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

Register.displayName = 'Register';

export default Register;
