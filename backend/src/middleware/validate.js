import { validationResult } from "express-validator";

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Only say which field failed and why. express-validator also carries the
    // submitted `value`, which for auth routes is a password.
    return res.status(400).json({
      errors: errors.array().map(({ msg, path, location, type }) => ({ type, msg, path, location })),
    });
  }
  next();
}
