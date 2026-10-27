import { body, param, query } from "express-validator";
import { passwordProblem, PASSWORD_MAX_LENGTH } from "../utils/passwordPolicy.js";

export function objectIdParam(name) {
  return param(name).isMongoId().withMessage(`${name} must be a valid id`);
}

export function paginationQuery() {
  return [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit must be between 1 and 50"),
  ];
}

// JSON lets a client send a number, array or object where text is expected, and
// the string validators below would quietly stringify it (an array of emails
// even passes isEmail). Every auth field is checked to be real text first.
export function emailBody(field = "email") {
  return body(field)
    .isString().withMessage("valid email is required").bail()
    .isLength({ max: 254 }).withMessage("valid email is required").bail()
    .isEmail().withMessage("valid email is required")
    .normalizeEmail();
}

// A password being *entered* (login, current password): any text, but bounded so
// a huge value can't be used to burn CPU in bcrypt.
export function passwordEntryBody(field) {
  return body(field)
    .isString().withMessage(`${field} is required`).bail()
    .isLength({ min: 1, max: PASSWORD_MAX_LENGTH }).withMessage(`${field} is required`);
}

// A password being *chosen*: held to the password policy.
export function newPasswordBody(field) {
  return body(field).custom((value) => {
    const problem = passwordProblem(value);
    if (problem) throw new Error(problem);
    return true;
  });
}

// A link that people will be sent to or shown: http(s) only, with the scheme
// spelled out. Without this "javascript:", "data:", "file:" or an app-specific
// scheme could be stored and offered to someone as a harmless-looking link.
export function urlBody(field, { max = 500, required = false } = {}) {
  const chain = body(field);
  if (!required) chain.optional({ values: "falsy" });
  return chain
    .isString().withMessage(`${field} must be a link`).bail()
    .trim()
    .isLength({ max }).withMessage(`${field} must be at most ${max} characters`).bail()
    .isURL({ protocols: ["http", "https"], require_protocol: true }).withMessage("ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://");
}

export function textBody(field, { max = 200, required = false } = {}) {
  const chain = body(field);
  if (!required) chain.optional({ values: "falsy" });
  return chain
    .isString().withMessage(`${field} must be text`).bail()
    .trim()
    .isLength({ min: required ? 1 : 0, max }).withMessage(required ? `${field} is required and at most ${max} characters` : `${field} must be at most ${max} characters`);
}
