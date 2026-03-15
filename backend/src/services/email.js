import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendInvitationEmail({ to, username, password, fullName }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('Email not configured — skipping invitation email for', username);
    return;
  }

  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const displayName = fullName || username;

  await transporter.sendMail({
    from: `"TGDC Platform" <${process.env.SMTP_USER}>`,
    to,
    subject: 'You have been invited to Joto Ardhi Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px; border-radius: 12px;">
        <div style="background: #1e3a5f; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Joto Ardhi</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">IoT Monitoring Platform</p>
        </div>

        <p style="color: #374151; font-size: 16px;">Hello <strong>${displayName}</strong>,</p>

        <p style="color: #374151; font-size: 15px;">
          You have been invited to the <strong>Joto Ardhi IoT Monitoring Platform</strong>. Your account has been created and is ready to use.
        </p>

        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #1e3a5f; margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 110px;">Username:</td>
              <td style="padding: 6px 0; color: #111827; font-weight: bold; font-size: 14px;">${username}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Password:</td>
              <td style="padding: 6px 0; color: #111827; font-weight: bold; font-size: 14px; font-family: monospace;">${password}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${loginUrl}" style="background: #1e3a5f; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
            Login to Platform
          </a>
        </div>

        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          Please change your password after your first login. If you did not expect this invitation, you can ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">TGDC &mdash; Joto Ardhi IoT Monitoring Platform</p>
      </div>
    `,
  });
}
