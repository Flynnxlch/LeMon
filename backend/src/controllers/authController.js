import config from '../config/index.js';
import * as authService from '../services/authService.js';

export async function login(req, res, next) {
  try {
    const { email, password, rememberMe, rememberDuration } = req.body;
    const result = await authService.login(email, password, !!rememberMe, rememberDuration);
    if (!result) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const { token, user, cookieMaxAgeMs } = result;
    const cookieOptions = {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      path: config.cookie.path,
    };
    if (cookieMaxAgeMs != null && cookieMaxAgeMs > 0) {
      cookieOptions.maxAge = cookieMaxAgeMs;
    }
    res.cookie(config.cookie.name, token, cookieOptions);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  res.clearCookie(config.cookie.name, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
  });
  res.json({ success: true });
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email);
    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const ok = await authService.resetPassword(token, newPassword);
    if (!ok) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

export async function checkEmail(req, res, next) {
  try {
    const { email } = req.body;
    const registered = await authService.checkEmailRegistered(email);
    res.json({ success: true, data: { registered } });
  } catch (err) {
    next(err);
  }
}

export async function requestPasswordChange(req, res, next) {
  try {
    const { email, newPassword } = req.body;
    const requestId = await authService.requestPasswordChange(email, newPassword);
    if (!requestId) {
      return res.status(400).json({ success: false, error: 'User not found or inactive.' });
    }
    res.status(201).json({ success: true, data: { requestId }, message: 'Password change request submitted. Awaiting admin approval.' });
  } catch (err) {
    next(err);
  }
}
