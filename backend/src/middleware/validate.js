import { z } from 'zod';

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error?.issues ?? [];
      const first = issues[0];
      const message = first ? `${(first.path ?? []).join('.')}: ${first.message}` : 'Validation failed';
      return res.status(400).json({ success: false, error: message });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error?.issues ?? [];
      const first = issues[0];
      const message = first ? `${(first.path ?? []).join('.')}: ${first.message}` : 'Validation failed';
      return res.status(400).json({ success: false, error: message });
    }
    req.validatedQuery = result.data;
    next();
  };
}
