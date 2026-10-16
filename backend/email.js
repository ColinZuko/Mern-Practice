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
  const link = `${SITE_URL}/verify-email?token=${token}`;
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
  const link = `${SITE_URL}/reset-password?token=${token}`;
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

// ---- New-recipe emails ----

const API_URL = (process.env.API_URL || "https://api.pickleandpan.com").replace(/\/$/, "");
const BATCH_SIZE = 100; // Resend's maximum per batch request

// Signed link that unsubscribes one person without logging in. Signing it with the server
// secret means nobody can unsubscribe someone else by guessing.
function unsubscribeToken(userId) {
  return crypto.createHmac("sha256", process.env.SECRETKEY).update(`unsubscribe:${userId}`).digest("hex").slice(0, 32);
}

function isValidUnsubscribeToken(userId, token) {
  const expected = unsubscribeToken(userId);
  return typeof token === "string" && token.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

function shorten(text = "", max) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

// A taste of the recipe: the intro, or else the first ingredients
function recipeTeaser(post) {
  if (post.content?.trim()) return shorten(post.content, 220);
  const ingredients = (post.recipe?.ingredients || "")
    .split("\n").map((l) => l.trim().replace(/^[-*•]\s*/, "")).filter((l) => l && !l.endsWith(":"));
  return ingredients.length ? `You'll need: ${shorten(ingredients.slice(0, 6).join(", "), 200)}` : "";
}

function newRecipeEmail(post, recipient) {
  const recipeUrl = `${SITE_URL}/recipe/${post._id}`;
  const imageUrl = post.imageId ? `${API_URL}/images/${encodeURIComponent(post.imageId)}/og?v=2` : `${SITE_URL}/og-default.png`;
  const query = `u=${recipient.id}&t=${unsubscribeToken(recipient.id)}`;
  const unsubscribePage = `${SITE_URL}/unsubscribe?${query}`;
  const teaser = recipeTeaser(post);
  const by = post.authorName ? ` by ${post.authorName}` : "";

  return {
    from: EMAIL_FROM,
    to: recipient.email,
    subject: `New recipe: ${post.title}`,
    // Lets Gmail, Outlook and Apple Mail show their own one-click unsubscribe button
    headers: {
      "List-Unsubscribe": `<${API_URL}/users/unsubscribe?${query}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    text: `New on Pickle & Pan: ${post.title}${by}\n\n${post.description || ""}\n\n${teaser}\n\nRead the recipe: ${recipeUrl}\n\nYou get this because you asked to hear about new recipes. Unsubscribe: ${unsubscribePage}`,
    html: `
      <div style="background: #fbf8f2; padding: 24px 12px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; font-family: Arial, sans-serif; color: #2b2622;">
          <a href="${recipeUrl}"><img src="${imageUrl}" alt="${escapeHtml(post.title)}" width="560" style="display: block; width: 100%; height: auto; border: 0;"></a>
          <div style="padding: 28px 28px 8px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #4f1d3a;">New recipe${escapeHtml(by)}</p>
            <h1 style="margin: 0 0 12px; font-family: Georgia, serif; font-size: 28px; line-height: 1.2;">${escapeHtml(post.title)}</h1>
            ${post.description ? `<p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6;">${escapeHtml(post.description)}</p>` : ""}
            ${teaser ? `<p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #6b625b;">${escapeHtml(teaser)}</p>` : ""}
            <p style="margin: 0 0 28px;">
              <a href="${recipeUrl}" style="display: inline-block; background: #4f1d3a; color: #ffffff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold;">Read the recipe</a>
            </p>
          </div>
          <div style="padding: 16px 28px 24px; border-top: 1px solid #eee5d8; font-size: 12px; line-height: 1.6; color: #8a8178;">
            You get this email because you asked Pickle &amp; Pan to tell you about new recipes.<br>
            <a href="${unsubscribePage}" style="color: #4f1d3a;">Unsubscribe</a> or change it in your
            <a href="${SITE_URL}/profile" style="color: #4f1d3a;">account settings</a>.
          </div>
        </div>
      </div>`,
  };
}

// Sends one personal email per subscriber (never one email with everyone in it).
// Returns the number of emails Resend accepted.
async function sendNewRecipeEmails(post, recipients) {
  const emails = recipients.map((r) => newRecipeEmail(post, r));
  if (!process.env.RESEND_API_KEY) {
    for (const e of emails) {
      console.log(`[email not sent: RESEND_API_KEY is not set]\nTo: ${e.to}\nSubject: ${e.subject}\nList-Unsubscribe: ${e.headers["List-Unsubscribe"]}\n${e.text}\n`);
    }
    return 0;
  }

  let sent = 0;
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (response.ok) sent += batch.length;
    else console.error("Resend rejected a batch of recipe emails:", response.status, await response.text());
  }
  return sent;
}

module.exports = {
  newRecipeEmail,
  unsubscribeToken,
  isValidUnsubscribeToken,
  sendNewRecipeEmails,
  createVerificationToken,
  createResetToken,
  hashToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
