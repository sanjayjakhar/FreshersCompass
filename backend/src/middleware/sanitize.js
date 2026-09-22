/**
 * Express middleware to sanitize incoming request bodies and query parameters.
 * Strips dangerous injection and scripting characters (<, >, $) to protect endpoints.
 */
export const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/[<>$]/g, '').trim();
      }
    }
  }

  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/[<>$]/g, '').trim();
      }
    }
  }

  next();
};

export default sanitizeInput;
