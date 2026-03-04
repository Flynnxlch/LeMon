import { prisma } from '../lib/prisma.js';

const KEY_DEFAULT_UPDATE_INTERVAL_DAYS = 'defaultUpdateIntervalDays';

export async function getSettings() {
  const row = await prisma.appSetting.findUnique({
    where: { key: KEY_DEFAULT_UPDATE_INTERVAL_DAYS },
  });
  const days = row ? parseInt(row.value, 10) : 7;
  return { defaultUpdateIntervalDays: isNaN(days) ? 7 : days };
}

export async function updateReminderSetting(value) {
  const days = Math.max(1, Math.min(365, parseInt(String(value), 10) || 7));
  await prisma.appSetting.upsert({
    where: { key: KEY_DEFAULT_UPDATE_INTERVAL_DAYS },
    create: { key: KEY_DEFAULT_UPDATE_INTERVAL_DAYS, value: String(days) },
    update: { value: String(days) },
  });
  return { defaultUpdateIntervalDays: days };
}
