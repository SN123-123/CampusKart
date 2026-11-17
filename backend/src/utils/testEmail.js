require('dotenv').config();
const { verifyEmailConfig, sendOtpEmail } = require('./email');

async function main() {
  const targetEmail = process.argv[2];

  console.log('----------------------------------------------------');
  console.log('           CampusKart Email System Diagnostic        ');
  console.log('----------------------------------------------------');

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || user || 'CampusKart <no-reply@campuskart.local>';

  console.log(`SMTP_HOST : ${host ? host : '(none - Console Dev Mode)'}`);
  console.log(`SMTP_PORT : ${port}`);
  console.log(`SMTP_USER : ${user ? user : '(none)'}`);
  console.log(`SMTP_PASS : ${pass ? '********' : '(none)'}`);
  console.log(`MAIL_FROM : ${from}`);
  console.log('----------------------------------------------------');

  if (!host) {
    console.log('ℹ Status: Running in Development Console mode.');
    console.log('When users register, 6-digit OTP codes will be printed');
    console.log('directly to your backend terminal.\n');

    if (targetEmail) {
      console.log(`Simulating OTP delivery to: ${targetEmail}`);
      await sendOtpEmail(targetEmail, '654321');
    } else {
      console.log('To send real emails, configure your SMTP settings in backend/.env:');
      console.log('Example with Gmail:');
      console.log('  SMTP_HOST=smtp.gmail.com');
      console.log('  SMTP_PORT=587');
      console.log('  SMTP_USER=your-email@gmail.com');
      console.log('  SMTP_PASS=your-16-character-app-password');
      console.log('  MAIL_FROM=CampusKart <your-email@gmail.com>\n');
      console.log('Run with an email parameter to test:');
      console.log('  npm run test:email recipient@example.com');
    }
    return;
  }

  console.log('Verifying SMTP connection...');
  const result = await verifyEmailConfig();

  if (!result.success) {
    console.error('❌ Connection Failed!');
    console.error(`Error details: ${result.error}\n`);
    console.error('Troubleshooting tips:');
    console.error('1. Check that SMTP_HOST and SMTP_PORT are correct.');
    console.error('2. For Gmail, you must generate a 16-character App Password (not your normal password):');
    console.error('   Visit: https://myaccount.google.com/apppasswords');
    console.error('3. Ensure firewall / antivirus is not blocking outbound connections to port ' + port + '.');
    process.exit(1);
  }

  console.log(' Connection verified! Your SMTP server is accepting logins.');

  if (targetEmail) {
    console.log(`\nSending test OTP verification email to: ${targetEmail}...`);
    try {
      const info = await sendOtpEmail(targetEmail, '999888');
      console.log('✅ Test email sent successfully!');
      if (info && info.messageId) {
        console.log(`Message ID: ${info.messageId}`);
      }
    } catch (err) {
      console.error('❌ Failed to send email:', err.message);
      process.exit(1);
    }
  } else {
    console.log('\nTip: To send a real test email to an inbox, run:');
    console.log('  npm run test:email your-email@pes.edu');
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});

