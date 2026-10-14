const crypto = require("crypto");
require("dotenv").config({ path: require("path").join(__dirname, "config.env") });

// Settings (config.env locally, Environment on Render):
//   RESEND_API_KEY - from resend.com; without it, emails are printed to the server log instead
//   EMAIL_FROM     - verified sender, e.g. "Pickle & Pan <hello@pickleandpan.com>"
//   SITE_URL       - public address of the site, used in links in emails
const SITE_URL = (process.env.SITE_URL || "https://pickleandpan.com").replace(/\/$/, "");
const EMAIL_FROM = process.env.EMAIL_FROM || "Pickle & Pan <hello@pickleandpan.com>";
const VERIFY_LINK_HOURS = 24;
const RESET_LINK_HOURS = 1;

// Links carry a random token; only its hash is stored, so a database leak can't be used to
// verify accounts or reset passwords
function createToken(hours) {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hash: hashToken(token),
    expires: new Date(Date.now() + hours * 60 * 60 * 1000),
  };
}

function createVerificationToken() {
  return createToken(VERIFY_LINK_HOURS);
}

function createResetToken() {
  return createToken(RESET_LINK_HOURS);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email not sent: RESEND_API_KEY is not set]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text }),
  });

  if (!response.ok) {
    console.error("Resend rejected the email:", response.status, await response.text());
    return false;
  }
  return true;
}

// Returns true if the email was handed to Resend
async function sendVerificationEmail({ to, name, token }) {
  const link = `${SITE_URL}/#/verify-email?token=${token}`;
  const safeName = escapeHtml(name || "there");

  return sendEmail({
    to,
    subject: "Confirm your email for Pickle & Pan",
    text: `Hi ${name || "there"},\n\nPlease confirm your email address by opening this link:\n${link}\n\nThe link works for ${VERIFY_LINK_HOURS} hours. If you didn't create a Pickle & Pan account, you can ignore this email.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #2b2622;">
        <h1 style="font-size: 26px; margin: 0 0 16px;">Pickle &amp; Pan</h1>
        <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">Hi ${safeName},</p>
        <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
          Thanks for signing up. Please confirm your email address so you can save your favourite recipes.
        </p>
        <p style="margin: 28px 0;">
          <a href="${link}" style="background: #4f1d3a; color: #ffffff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-family: Arial, sans-serif; font-weight: bold;">
            Confirm my email
          </a>
        </p>
        <p style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #6b625b;">
          The button works for ${VERIFY_LINK_HOURS} hours. If it doesn't open, copy this link into your browser:<br>
          <a href="${link}" style="color: #4f1d3a; word-break: break-all;">${link}</a>
        </p>
        <p style="font-family: Arial, sans-serif; font-size: 13px; color: #6b625b;">
          If you didn't create a Pickle &amp; Pan account, you can ignore this email.
        </p>
      </div>`,
  });
}

// Returns true if the email was handed to Resend
async function sendPasswordResetEmail({ to, name, token }) {
  const link = `${SITE_URL}/#/reset-password?token=${token}`;
  const safeName = escapeHtml(name || "there");

  return sendEmail({
    to,
    subject: "Reset your Pickle & Pan password",
    text: `Hi ${name || "there"},\n\nSomeone (hopefully you) asked to reset the password for your Pickle & Pan account. Choose a new password here:\n${link}\n\nThe link works for ${RESET_LINK_HOURS} hour and can be used once. If you didn't ask for this, you can ignore this email; your password stays the same.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #2b2622;">
        <h1 style="font-size: 26px; margin: 0 0 16px;">Pickle &amp; Pan</h1>
        <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">Hi ${safeName},</p>
        <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
          Someone (hopefully you) asked to reset the password for your Pickle &amp; Pan account.
        </p>
        <p style="margin: 28px 0;">
          <a href="${link}" style="background: #4f1d3a; color: #ffffff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-family: Arial, sans-serif; font-weight: bold;">
            Choose a new password
          </a>
        </p>
        <p style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #6b625b;">
          The button works for ${RESET_LINK_HOURS} hour and can be used once. If it doesn't open, copy this link into your browser:<br>
          <a href="${link}" style="color: #4f1d3a; word-break: break-all;">${link}</a>
        </p>
        <p style="font-family: Arial, sans-serif; font-size: 13px; color: #6b625b;">
          If you didn't ask for this, you can ignore this email. Your password stays the same.
        </p>
      </div>`,
  });
}

module.exports = {
  createVerificationToken,
  createResetToken,
  hashToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
