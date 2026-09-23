/**
 * Recursive sanitizer to remove MongoDB operator injection keys (e.g. $gt, $ne, $where)
 * and dot-notated injection paths while preserving legitimate string content ($ currency, < > code).
 */
const sanitizePayload = (target) => {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      target[i] = sanitizePayload(target[i]);
    }
    return target;
  }

  for (const key of Object.keys(target)) {
    // Prohibit keys starting with '$' or containing '.' (MongoDB operator injection vectors)
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else if (typeof target[key] === 'object' && target[key] !== null) {
      target[key] = sanitizePayload(target[key]);
    } else if (typeof target[key] === 'string') {
      target[key] = target[key].trim();
    }
  }

  return target;
};

export const sanitizeInput = (req, res, next) => {
  if (req.body) sanitizePayload(req.body);
  if (req.query) sanitizePayload(req.query);
  if (req.params) sanitizePayload(req.params);
  next();
};

export default sanitizeInput;
