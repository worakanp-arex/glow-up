import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { errorHandler } from "../src/middleware/errorHandler.js";

const response = () => ({ code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });

test("errorHandler converts each known error shape into a clean, stable response", (t) => {
  t.mock.method(console, "error", () => {});

  const duplicate = response();
  errorHandler(Object.assign(new Error("dup"), { code: 11000 }), {}, duplicate, () => {});
  assert.equal(duplicate.code, 409);

  const validation = response();
  errorHandler(Object.assign(new Error("email is required"), { name: "ValidationError" }), {}, validation, () => {});
  assert.equal(validation.code, 400);
  assert.equal(validation.body.message, "email is required");

  const cast = response();
  errorHandler(Object.assign(new Error("cast failed"), { name: "CastError", path: "_id", value: "abc" }), {}, cast, () => {});
  assert.equal(cast.code, 400);
  assert.equal(cast.body.message, "Invalid _id: abc");

  const multer = response();
  errorHandler(Object.assign(new Error("File too large"), { name: "MulterError" }), {}, multer, () => {});
  assert.equal(multer.code, 400);

  const badFileType = response();
  errorHandler(new Error("Invalid file type for avatar"), {}, badFileType, () => {});
  assert.equal(badFileType.code, 400);
});

test("errorHandler hides internal error messages in production but shows them otherwise", (t) => {
  t.mock.method(console, "error", () => {});
  const original = process.env.NODE_ENV;
  t.after(() => { process.env.NODE_ENV = original; });

  process.env.NODE_ENV = "production";
  const prod = response();
  errorHandler(new Error("stack trace with a file path leaked here"), {}, prod, () => {});
  assert.equal(prod.code, 500);
  assert.equal(prod.body.message, "ระบบไม่สามารถทำรายการได้ กรุณาลองอีกครั้ง");
  assert.ok(!prod.body.message.includes("stack trace"));

  process.env.NODE_ENV = "development";
  const dev = response();
  errorHandler(new Error("stack trace with a file path leaked here"), {}, dev, () => {});
  assert.equal(dev.code, 500);
  assert.equal(dev.body.message, "stack trace with a file path leaked here");

  const withStatus = response();
  errorHandler(Object.assign(new Error("teapot"), { status: 418 }), {}, withStatus, () => {});
  assert.equal(withStatus.code, 418);
});
