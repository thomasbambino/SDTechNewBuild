import { Resend } from "resend";
import { storage } from "./storage";

// Resend wrapper. Soft-fails when RESEND_API_KEY isn't set — the app still
// works for everything else; we just log a warning so the admin notices.
let resendClient: Resend | null = null;
let warnedOnce = false;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    if (!warnedOnce) {
      console.warn("[email] RESEND_API_KEY not set — transactional emails are disabled.");
      warnedOnce = true;
    }
    return null;
  }
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

interface BrandCtx {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  appUrl: string;
}

async function getBrand(): Promise<BrandCtx> {
  const settings = await storage.getSettings().catch(() => null);
  const appUrl = process.env.APP_URL || "https://www.sdtechpros.com";
  return {
    companyName: settings?.companyName || "SD Tech Pros",
    logoUrl: settings?.logoPath ? `${appUrl}${settings.logoPath}` : null,
    primaryColor: settings?.primaryColor || "#2B5A94",
    appUrl,
  };
}

/** Escape user-provided text before inlining into HTML. */
function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface LayoutOpts {
  brand: BrandCtx;
  preview: string;    // Hidden snippet inboxes show next to the subject
  heading: string;
  body: string;       // Pre-built HTML (already escaped)
  cta?: { label: string; href: string };
  footer?: string;
}

/**
 * Email-safe HTML scaffold. Table-based because many clients still
 * mishandle flexbox/grid. Inlined styles for Gmail/Outlook. Light mode
 * only — most inboxes ignore dark-mode CSS anyway.
 */
function renderLayout({ brand, preview, heading, body, cta, footer }: LayoutOpts): string {
  const header = brand.logoUrl
    ? `<img src="${esc(brand.logoUrl)}" alt="${esc(brand.companyName)}" height="32" style="display:block;height:32px;width:auto;max-width:180px;" />`
    : `<div style="font:700 20px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#161b22;">${esc(brand.companyName)}</div>`;

  const ctaBlock = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
         <tr>
           <td align="center" bgcolor="${esc(brand.primaryColor)}" style="border-radius:8px;">
             <a href="${esc(cta.href)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font:600 15px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;text-decoration:none;border-radius:8px;">${esc(cta.label)}</a>
           </td>
         </tr>
       </table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#161b22;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f6f5f1;">${esc(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f5f1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;box-shadow:0 1px 2px rgba(22,27,34,0.06);overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 20px;border-bottom:1px solid #dcd9d1;">
              ${header}
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font:600 22px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#161b22;">${esc(heading)}</h1>
              <div style="font:400 15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#2a313a;">
                ${body}
              </div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #dcd9d1;background:#fafafa;">
              <p style="margin:0;font:400 12.5px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#687079;">
                ${esc(footer || "")} ${footer ? "<br/>" : ""}
                <a href="${esc(brand.appUrl)}" style="color:#687079;text-decoration:underline;">${esc(brand.appUrl.replace(/^https?:\/\//, ""))}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Flatten HTML to a reasonable plaintext for the text/plain part. */
function toPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

async function send({ to, subject, html }: SendArgs): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  const from = process.env.RESEND_FROM || "SD Tech Pros <noreply@sdtechpros.com>";
  try {
    const { error } = await client.emails.send({
      from,
      to,
      subject,
      html,
      text: toPlainText(html),
    });
    if (error) {
      console.error("[email] Resend returned error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

// ─── Specific email types ────────────────────────────────────────────────────

/**
 * Sent when an admin creates a client login OR adds a team member. Contains the
 * one-time generated password. The admin still sees it on-screen as a fallback.
 */
export async function sendNewAccountEmail(opts: {
  to: string;
  name: string;
  username: string;
  temporaryPassword: string;
}): Promise<boolean> {
  const brand = await getBrand();
  const loginUrl = `${brand.appUrl}/auth`;
  const html = renderLayout({
    brand,
    preview: `Your ${brand.companyName} portal account is ready.`,
    heading: `Welcome${opts.name ? `, ${esc(opts.name.split(" ")[0])}` : ""}.`,
    body: `
      <p style="margin:0 0 12px;">Your <strong>${esc(brand.companyName)}</strong> portal account is ready. Use the credentials below to sign in and follow your project.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background:#f6f5f1;border-radius:8px;width:100%;">
        <tr>
          <td style="padding:14px 16px;">
            <div style="font:500 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#687079;text-transform:uppercase;letter-spacing:0.1em;">Username</div>
            <div style="font:600 15px/1.3 ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#161b22;margin-top:4px;">${esc(opts.username)}</div>
            <div style="font:500 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#687079;text-transform:uppercase;letter-spacing:0.1em;margin-top:14px;">Temporary password</div>
            <div style="font:600 15px/1.3 ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#161b22;margin-top:4px;">${esc(opts.temporaryPassword)}</div>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 4px;">We recommend changing the password after you sign in. If you weren't expecting this, you can ignore the email.</p>
    `,
    cta: { label: "Sign in", href: loginUrl },
    footer: `This message was sent to ${esc(opts.to)}.`,
  });
  return send({ to: opts.to, subject: `Your ${brand.companyName} portal account`, html });
}

/**
 * Sent when a user (or admin on their behalf) requests a reset link. The
 * recipient clicks it to set a new password themselves — no temporary
 * password is ever exposed.
 */
export async function sendPasswordResetLinkEmail(opts: {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<boolean> {
  const brand = await getBrand();
  const html = renderLayout({
    brand,
    preview: `Reset your ${brand.companyName} password.`,
    heading: "Reset your password",
    body: `
      <p style="margin:0 0 12px;">Hi${opts.name ? ` ${esc(opts.name.split(" ")[0])}` : ""}, someone — hopefully you — asked to reset the password on your <strong>${esc(brand.companyName)}</strong> portal account.</p>
      <p style="margin:0 0 12px;">Click the button below to pick a new password. The link is good for <strong>${opts.expiresInMinutes} minutes</strong> and can only be used once.</p>
      <p style="margin:0;color:#687079;">If you didn't ask for this, you can ignore the email — your password won't change.</p>
    `,
    cta: { label: "Set a new password", href: opts.resetUrl },
    footer: `This message was sent to ${esc(opts.to)}.`,
  });
  return send({ to: opts.to, subject: `${brand.companyName}: reset your password`, html });
}

/** Sent when an admin resets a user's password. */
export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  temporaryPassword: string;
}): Promise<boolean> {
  const brand = await getBrand();
  const loginUrl = `${brand.appUrl}/auth`;
  const html = renderLayout({
    brand,
    preview: `Your ${brand.companyName} password was reset.`,
    heading: "Your password was reset",
    body: `
      <p style="margin:0 0 12px;">Hi${opts.name ? ` ${esc(opts.name.split(" ")[0])}` : ""}, an administrator reset your <strong>${esc(brand.companyName)}</strong> portal password. Your new temporary password is below.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background:#f6f5f1;border-radius:8px;width:100%;">
        <tr>
          <td style="padding:14px 16px;">
            <div style="font:500 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#687079;text-transform:uppercase;letter-spacing:0.1em;">Temporary password</div>
            <div style="font:600 15px/1.3 ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#161b22;margin-top:4px;">${esc(opts.temporaryPassword)}</div>
          </td>
        </tr>
      </table>
      <p style="margin:0;">Sign in and change it right away. If you didn't request this, contact us so we can secure your account.</p>
    `,
    cta: { label: "Sign in and change password", href: loginUrl },
    footer: `This message was sent to ${esc(opts.to)}.`,
  });
  return send({ to: opts.to, subject: `${brand.companyName}: password reset`, html });
}
