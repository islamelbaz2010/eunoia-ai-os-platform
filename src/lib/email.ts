import "server-only";

import { Resend } from "resend";
import { logger } from "@/lib/logger";

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

export async function sendInviteEmail({
  to,
  inviterName,
  orgName,
  role,
  inviteUrl,
}: {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
}): Promise<void> {
  const client = getResendClient();
  if (!client) {
    logger.warn("[email] RESEND_API_KEY not set — invite link must be shared manually", { to });
    return;
  }

  const from = process.env.FROM_EMAIL ?? "Eunoia AI OS <noreply@eunoiaos.com>";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  try {
    await client.emails.send({
      from,
      to,
      subject: `You're invited to join ${orgName} on Eunoia AI OS`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="font-size: 20px; margin-bottom: 8px;">You have been invited</h2>
  <p style="color: #444; margin-bottom: 24px;">
    <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong>
    as a <strong>${roleLabel}</strong> on Eunoia AI OS.
  </p>
  <a href="${inviteUrl}"
     style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none;
            padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">
    Accept Invitation
  </a>
  <p style="margin-top: 24px; font-size: 12px; color: #888;">
    This invite expires in 14 days. If you weren't expecting this, you can safely ignore it.
  </p>
</body>
</html>`,
    });
  } catch (err) {
    logger.error("[email] Failed to send invite email", { to, error: String(err) });
  }
}

export async function sendDemoRequestEmail({
  name,
  email,
  property,
  propertyType,
  message,
}: {
  name: string;
  email: string;
  property: string;
  propertyType: string;
  message: string;
}): Promise<void> {
  const client = getResendClient();
  const from = process.env.FROM_EMAIL ?? "Eunoia AI OS <noreply@eunoiaos.com>";
  const to = process.env.DEMO_REQUEST_EMAIL ?? "hello@eunoiaos.com";

  if (!client) {
    logger.warn("[email] RESEND_API_KEY not set — demo request not emailed", { from: email });
    return;
  }

  try {
    await client.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Demo request from ${name} — ${property}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="font-size: 18px; margin-bottom: 4px;">New Demo Request</h2>
  <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 140px;">Name</td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${name}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Email</td><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Property</td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${property}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${propertyType || "Not specified"}</td></tr>
    <tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 8px 0;">${message || "No message provided"}</td></tr>
  </table>
  <p style="margin-top: 24px; font-size: 12px; color: #888;">Reply directly to this email to reach ${name}.</p>
</body>
</html>`,
    });
  } catch (err) {
    logger.error("[email] Failed to send demo request email", { error: String(err) });
    throw err;
  }
}
