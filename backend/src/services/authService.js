import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import config, { parseExpiresInMs } from '../config/index.js';
import { prisma } from '../lib/prisma.js';

const SALT_ROUNDS = 10;

/**
 * @param {string} email
 * @param {string} password
 * @param {boolean} [rememberMe=false]
 * @param {string} [rememberDuration] - e.g. '1d', '7d', '30d'
 */
export async function login(email, password, rememberMe = false, rememberDuration) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      status: true,
      password: true,
      branch: { select: { name: true } },
    },
  });
  if (!user || user.status !== 'Active') {
    return null;
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) return null;

  const expiresIn = rememberMe
    ? (rememberDuration || config.jwt.rememberMeExpiresIn)
    : config.jwt.sessionExpiresIn;

  const token = jwt.sign(
    { userId: user.id },
    config.jwt.secret,
    { expiresIn }
  );

  const maxAgeMs = rememberMe ? parseExpiresInMs(expiresIn) : null;

  return {
    token,
    expiresIn,
    cookieMaxAgeMs: maxAgeMs,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch_id: user.branchId,
      branch_name: user.branch?.name ?? null,
    },
  };
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      status: true,
      branch: { select: { name: true } },
    },
  });
  if (!user || user.status !== 'Active') return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch_id: user.branchId,
    branch_name: user.branch?.name ?? null,
  };
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return; // Don't leak existence
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });
  // TODO: send email with reset link
  return { token };
}

export async function resetPassword(token, newPassword) {
  const record = await prisma.passwordResetToken.findFirst({
    where: { token, usedAt: null },
  });
  if (!record || new Date() > record.expiresAt) {
    return false;
  }
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return true;
}

export function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Check if email is registered (Active user). Used for forgot-password verification step. */
export async function checkEmailRegistered(email) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, status: true },
  });
  return !!(user && user.status === 'Active');
}

/** Create a password change request (pending admin approval). */
export async function requestPasswordChange(email, newPassword) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, status: true },
  });
  if (!user || user.status !== 'Active') {
    return null;
  }
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const req = await prisma.passwordChangeRequest.create({
    data: {
      userId: user.id,
      newPasswordHash,
      status: 'Pending',
    },
  });
  return req.id;
}
