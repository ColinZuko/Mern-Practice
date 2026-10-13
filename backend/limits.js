// Rate limits for the routes people could abuse (guessing passwords, mass sign-ups).
// Visitors behind the same proxy can share an IP, so login is limited per IP *and* email.
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const MINUTE = 60 * 1000;

function tooMany(message) {
  return (request, response) => response.status(429).json({ message });
}

function emailOf(request) {
  return typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
}

// 10 wrong passwords per 15 minutes for one account from one place; correct logins don't count
const loginLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (request) => `${ipKeyGenerator(request.ip)}|${emailOf(request)}`,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooMany("Too many failed login attempts. Please wait 15 minutes and try again."),
});

const signupLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooMany("Too many accounts created from here. Please try again later."),
});

// Stops anyone from trying verification links at random
const verifyEmailLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooMany("Too many attempts. Please wait a few minutes and try again."),
});

module.exports = { loginLimiter, signupLimiter, verifyEmailLimiter };
