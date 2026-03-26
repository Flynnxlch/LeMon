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
        setError('Tidak ditemukan akun dengan alamat email ini.');
      }
    } catch {
      setError('Verifikasi gagal. Silakan coba lagi.');
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
      setError(err.message || 'Gagal mengirim permintaan. Silakan coba lagi.');
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
              Permintaan Terkirim
            </h2>
            <p className="text-neutral-500 mb-6">
              Permintaan perubahan kata sandi Anda telah dikirim untuk persetujuan admin.
            </p>
            <p className="text-sm text-neutral-500 mb-6">
              Anda dapat masuk dengan kata sandi baru setelah admin menyetujui permintaan Anda.
            </p>
            <Link to="/login">
              <Button variant="primary" size="lg" fullWidth>
                Kembali ke Login
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
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <img src="/lemon-18.svg" alt="Lease Monitor logo" className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Atur Kata Sandi Baru
            </h1>
            <p className="text-neutral-500">
              Masukkan kata sandi baru Anda. Permintaan akan dikirim untuk persetujuan admin.
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Terverifikasi: {email}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <form onSubmit={handleRequestPasswordChange} className="space-y-5" noValidate>
              <Input
                label="Kata Sandi Baru"
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                required
                icon={<HiLockClosed className="w-5 h-5" />}
                error={passwordError || undefined}
                helperText="Minimal 8 karakter, termasuk huruf besar, huruf kecil, dan angka"
                disabled={loading}
                autoComplete="new-password"
              />
              <Input
                label="Konfirmasi Kata Sandi Baru"
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
                {loading ? 'Mengirim...' : 'Kirim untuk Persetujuan Admin'}
              </Button>
            </form>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleBackToEmail}
                className="flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors w-full"
              >
                <HiArrowLeft className="w-4 h-4" />
                Gunakan email lain
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
            Lupa Kata Sandi?
          </h1>
          <p className="text-neutral-500">
            Masukkan email Anda untuk memverifikasi akun
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleVerification} className="space-y-5" noValidate>
            <Input
              label="Alamat Email"
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
              helperText="Masukkan alamat email yang terhubung dengan akun Anda"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!emailValid || loading}
            >
              {loading ? 'Memverifikasi...' : 'Verifikasi'}
            </Button>
          </form>
          <div className="mt-6">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" />
              Kembali ke Login
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
