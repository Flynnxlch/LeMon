import { memo, useCallback, useState } from 'react';
import { HiArrowLeft, HiCheckCircle, HiLockClosed, HiMail } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button/Button';
import Input from '../components/common/Input/Input';
import { api } from '../api/client';
import { validateEmail, validatePassword, validateConfirmPassword } from '../utils/validation';

const ForgotPassword = memo(() => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailValid = !validateEmail(email);
  const passwordError = validatePassword(newPassword, true);
  const confirmError = validateConfirmPassword(newPassword, confirmPassword);
  const canSubmitPassword = newPassword && confirmPassword && !passwordError && !confirmError;

  const handleEmailChange = useCallback((e) => {
    setEmail(e.target.value);
    if (error) setError('');
  }, [error]);

  const handleVerification = useCallback(async (e) => {
    e.preventDefault();
    if (!emailValid) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.checkEmail(email.trim());
      if (res?.data?.registered) {
        setStep(2);
      } else {
        setError('No account found with this email address.');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, emailValid]);

  const handleRequestPasswordChange = useCallback(async (e) => {
    e.preventDefault();
    if (!canSubmitPassword) return;
    setLoading(true);
    setError('');
    try {
      await api.auth.requestPasswordChange({
        email: email.trim(),
        newPassword,
        confirmPassword,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, newPassword, confirmPassword, canSubmitPassword]);

  const handleBackToEmail = useCallback(() => {
    setStep(1);
    setError('');
    setNewPassword('');
    setConfirmPassword('');
  }, []);

  // Success: request submitted for admin approval
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <HiCheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-3">
              Request Submitted
            </h2>
            <p className="text-neutral-500 mb-6">
              Your password change request has been sent for admin approval.
            </p>
            <p className="text-sm text-neutral-500 mb-6">
              You will be able to sign in with your new password after an admin approves your request.
            </p>
            <Link to="/login">
              <Button variant="primary" size="lg" fullWidth>
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Set new password & send for admin approval
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-900 rounded-xl mb-4">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Set New Password
            </h1>
            <p className="text-neutral-500">
              Enter your new password. Request will be sent for admin approval.
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Verified: {email}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <form onSubmit={handleRequestPasswordChange} className="space-y-5" noValidate>
              <Input
                label="New Password"
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                required
                icon={<HiLockClosed className="w-5 h-5" />}
                error={passwordError || undefined}
                helperText="Min 8 characters, include uppercase, lowercase, and number"
                disabled={loading}
                autoComplete="new-password"
              />
              <Input
                label="Confirm New Password"
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                required
                icon={<HiLockClosed className="w-5 h-5" />}
                error={confirmError || undefined}
                disabled={loading}
                autoComplete="new-password"
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canSubmitPassword || loading}
              >
                {loading ? 'Submitting...' : 'Send for Admin Approval'}
              </Button>
            </form>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleBackToEmail}
                className="flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors w-full"
              >
                <HiArrowLeft className="w-4 h-4" />
                Use a different email
              </button>
            </div>
          </div>
          <p className="text-center text-sm text-neutral-500 mt-8">
            © 2026 Rental Asset Monitoring System. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  // Step 1: Email verification
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-900 rounded-xl mb-4">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Forgot Password?
          </h1>
          <p className="text-neutral-500">
            Enter your email to verify your account
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleVerification} className="space-y-5" noValidate>
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="john.doe@example.com"
              required
              icon={<HiMail className="w-5 h-5" />}
              error={error || undefined}
              autoComplete="email"
              disabled={loading}
              helperText="Enter the email address associated with your account"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!emailValid || loading}
            >
              {loading ? 'Verifying...' : 'Verification'}
            </Button>
          </form>
          <div className="mt-6">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>
        <p className="text-center text-sm text-neutral-500 mt-8">
          © 2026 Rental Asset Monitoring System. All rights reserved.
        </p>
      </div>
    </div>
  );
});

ForgotPassword.displayName = 'ForgotPassword';

export default ForgotPassword;
