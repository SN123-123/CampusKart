const nodemailer = require('nodemailer');

let transporter;

/**
 * Returns the nodemailer transporter instance, or null if SMTP is not configured.
 */
function getTransporter() {
  if (transporter !== undefined) return transporter;

  const host = (process.env.SMTP_HOST || '').trim();
  if (!host) {
    transporter = null;
    return transporter;
  }

  const user = (process.env.SMTP_USER || '').trim();
  // App passwords from Google frequently have spaces like "xxxx xxxx xxxx xxxx"
  const pass = (process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');

  let config;
  if (host.toLowerCase() === 'gmail' || host.toLowerCase() === 'smtp.gmail.com') {
    config = {
      service: 'gmail',
      auth: { user, pass },
    };
  } else {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    config = {
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    };
  }

  transporter = nodemailer.createTransport(config);
  return transporter;
}

/**
 * Base email layout wrapper with modern, responsive styling
 */
function wrapHtmlEmail({ title, preheader, bodyContent }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding: 40px 16px;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      padding: 24px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 4px 0 0;
      color: #e0e7ff;
      font-size: 13px;
    }
    .content {
      padding: 32px 32px 24px;
    }
    .otp-box {
      margin: 24px 0;
      padding: 18px;
      background-color: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      text-align: center;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #1e293b;
      margin: 0;
    }
    .notice {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 13px;
      color: #92400e;
    }
    .badge-approved {
      display: inline-block;
      padding: 4px 10px;
      background-color: #dcfce7;
      color: #15803d;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-rejected {
      display: inline-block;
      padding: 4px 10px;
      background-color: #fee2e2;
      color: #b91c1c;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-sold {
      display: inline-block;
      padding: 4px 10px;
      background-color: #e0e7ff;
      color: #4338ca;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .btn {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      margin: 16px 0;
    }
    .footer {
      padding: 20px 32px;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>CampusKart</h1>
        <p>PES University Marketplace</p>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p style="margin: 0;">This email was sent by <strong>CampusKart</strong>.</p>
        <p style="margin: 4px 0 0;">Student marketplace exclusively for PES University.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send OTP verification code during registration
 */
async function sendOtpEmail(to, otp) {
  const t = getTransporter();
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@campuskart.local';

  if (!t) {
    // Development mode: no SMTP credentials configured, output to console
    console.log('\n======================================================');
    console.log(' [DEV MODE] CampusKart Mail System (No SMTP Configured)');
    console.log(` To:      ${to}`);
    console.log(` Code:    ${otp}`);
    console.log(` Expires: In 10 minutes`);
    console.log('======================================================\n');
    return { dev: true, otp };
  }

  const subject = 'Your CampusKart verification code';
  const text = `Your CampusKart verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not try to register on CampusKart, please ignore this email.`;

  const bodyContent = `
    <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Verify your college email</h2>
    <p style="line-height: 1.6; font-size: 15px;">
      Welcome to CampusKart! Use the 6-digit verification code below to verify your student account:
    </p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
    </div>
    <div class="notice">
      ⏰ <strong>Note:</strong> This verification code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      If you did not request this registration code, you can safely ignore this email.
    </p>
  `;

  const html = wrapHtmlEmail({
    title: subject,
    bodyContent,
  });

  try {
    const info = await t.sendMail({
      from: mailFrom,
      to,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL] Verification code successfully sent to ${to} (MessageId: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send verification code to ${to}:`, err.message);
    const emailErr = new Error(`Email delivery failed: ${err.message}. Please check your SMTP configuration in .env.`);
    emailErr.status = 502;
    throw emailErr;
  }
}

/**
 * Send listing status email (approved / rejected)
 */
async function sendListingStatusEmail(to, { sellerName, title, status, reason, listingId }) {
  const t = getTransporter();
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@campuskart.local';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!t) {
    console.log(`\n=== [DEV] Listing ${status.toUpperCase()} email for ${to}: "${title}" ===\n`);
    return { dev: true };
  }

  const isApproved = status === 'approved';
  const subject = isApproved
    ? `Your listing "${title}" is now live!`
    : `Update regarding your listing "${title}"`;

  const bodyContent = isApproved
    ? `
      <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Listing Approved! 🎉</h2>
      <p style="line-height: 1.6; font-size: 15px;">
        Hi ${sellerName || 'there'}, your item <span class="badge-approved">Approved</span> has been reviewed and is now visible to other PES students.
      </p>
      <p style="margin: 20px 0; font-weight: 600; color: #1e293b; font-size: 16px;">
        "${title}"
      </p>
      <a href="${frontendUrl}/listings/${listingId}" class="btn">View Your Listing</a>
    `
    : `
      <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Listing Not Approved</h2>
      <p style="line-height: 1.6; font-size: 15px;">
        Hi ${sellerName || 'there'}, your listing <span class="badge-rejected">Rejected</span> was not approved by the moderators.
      </p>
      <p style="margin: 16px 0; font-weight: 600; color: #1e293b;">
        "${title}"
      </p>
      <div class="notice">
        <strong>Reason:</strong> ${reason || 'Does not meet CampusKart community guidelines.'}
      </div>
      <p style="font-size: 14px; color: #64748b;">
        You can review or update your listing from your dashboard.
      </p>
      <a href="${frontendUrl}/my-listings" class="btn">Go to My Listings</a>
    `;

  const text = isApproved
    ? `Hi ${sellerName || 'there'},\n\nYour listing "${title}" was approved and is now live on CampusKart!\nView it at: ${frontendUrl}/listings/${listingId}`
    : `Hi ${sellerName || 'there'},\n\nYour listing "${title}" was not approved.\nReason: ${reason || 'Guidelines violation'}\nManage it at: ${frontendUrl}/my-listings`;

  return await t.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html: wrapHtmlEmail({ title: subject, bodyContent }),
  });
}

/**
 * Send email notification when an item is marked as sold to a buyer
 */
async function sendItemSoldEmail(to, { buyerName, sellerName, title, listingId }) {
  const t = getTransporter();
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@campuskart.local';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!t) {
    console.log(`\n=== [DEV] Item Sold email for ${to}: "${title}" sold by ${sellerName} ===\n`);
    return { dev: true };
  }

  const subject = `Purchase confirmed: "${title}"`;
  const bodyContent = `
    <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Purchase Recorded! 🛍️</h2>
    <p style="line-height: 1.6; font-size: 15px;">
      Hi ${buyerName || 'there'}, <strong>${sellerName}</strong> has marked their listing as sold to you:
    </p>
    <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <span class="badge-sold">Purchased</span>
      <h3 style="margin: 8px 0 0; color: #1e293b; font-size: 16px;">${title}</h3>
    </div>
    <a href="${frontendUrl}/purchases" class="btn">View in My Purchases</a>
  `;

  const text = `Hi ${buyerName || 'there'},\n\n${sellerName} marked "${title}" as sold to you on CampusKart!\nView it under Purchases: ${frontendUrl}/purchases`;

  return await t.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html: wrapHtmlEmail({ title: subject, bodyContent }),
  });
}

/**
 * Diagnostics helper to verify SMTP credentials and connection
 */
async function verifyEmailConfig() {
  const host = (process.env.SMTP_HOST || '').trim();
  if (!host) {
    return {
      configured: false,
      message: 'SMTP_HOST is not set. The app is running in Development Console mode (verification codes are printed to the terminal).',
    };
  }

  const t = getTransporter();
  try {
    await t.verify();
    return {
      configured: true,
      success: true,
      host,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      message: 'SMTP connection established successfully! Ready to deliver emails.',
    };
  } catch (error) {
    return {
      configured: true,
      success: false,
      host,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      error: error.message,
      message: `Failed to connect to SMTP server: ${error.message}`,
    };
  }
}

module.exports = {
  getTransporter,
  sendOtpEmail,
  sendListingStatusEmail,
  sendItemSoldEmail,
  verifyEmailConfig,
};
