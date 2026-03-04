import { z } from 'zod';

const email = z.string().email().max(255);
const password = z.string().min(8).max(128);

const rememberDurationSchema = z.enum(['1d', '3d', '7d', '30d']).optional();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
  rememberDuration: rememberDurationSchema,
}).strict();

export const forgotPasswordSchema = z.object({
  email,
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
}).strict();

export const checkEmailSchema = z.object({
  email,
}).strict();

export const requestPasswordChangeSchema = z.object({
  email,
  newPassword: password,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).strict().refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
