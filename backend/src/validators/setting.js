import { z } from 'zod';

export const updateReminderSchema = z.object({
  defaultUpdateIntervalDays: z.coerce.number().min(1).max(365),
});
