import * as settingService from '../services/settingService.js';

export async function getSettings(req, res, next) {
  try {
    const data = await settingService.getSettings();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateReminder(req, res, next) {
  try {
    const data = await settingService.updateReminderSetting(req.body.defaultUpdateIntervalDays);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
