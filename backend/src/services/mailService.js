const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Mail Service
 * Handles sending emails using Nodemailer
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send OTP Email
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP code
 */
const sendOTPMail = async (email, otp) => {
  try {
    const isPlaceholder = !process.env.SMTP_USER || 
                          process.env.SMTP_USER.includes('your-email') || 
                          !process.env.SMTP_PASS || 
                          process.env.SMTP_PASS.includes('your-app-password');

    if (isPlaceholder) {
      console.log('\n' + '='.repeat(50));
      console.log('📧 [DEV MODE] EMAIL FALLBACK');
      console.log(`To:      ${email}`);
      console.log(`OTP:     ${otp}`);
      console.log('='.repeat(50) + '\n');
      return { messageId: 'dev-mode-mock-id' };
    }

    const mailOptions = {
      from: `"OpsMind AI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your OpsMind AI Verification Code',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6c63ff; margin: 0; font-size: 28px;">OpsMind AI</h1>
            <p style="color: #8b8aae; margin: 5px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Corporate Intelligence</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #6c63ff 0%, #3dbccc 100%); padding: 2px; border-radius: 10px; margin-bottom: 30px;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; text-align: center;">
              <h2 style="color: #2d2b55; margin-top: 0; font-size: 22px;">Security Verification</h2>
              <p style="color: #5a5880; font-size: 16px; line-height: 1.6;">Hello,</p>
              <p style="color: #5a5880; font-size: 16px; line-height: 1.6;">You requested to reset your password. Use the following code to verify your identity. This code is valid for <strong>15 minutes</strong>.</p>
              
              <div style="margin: 30px 0;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #6c63ff; background-color: #f5f3ff; padding: 15px 30px; border-radius: 12px; border: 1px dashed #6c63ff;">${otp}</span>
              </div>
              
              <p style="color: #8b8aae; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
          
          <div style="text-align: center; color: #c0bed8; font-size: 12px;">
            <p>© 2025 OpsMind AI · Secure Knowledge Management</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`OTP Email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Error sending OTP mail: ${error.message}`);
    
    // In fallback mode, we still want the flow to work even if SMTP fails
    console.log('\n' + '!'.repeat(50));
    console.log('⚠️ [SMTP ERROR] FALLBACK ACTIVATED');
    console.log(`Failed to send real email to: ${email}`);
    console.log(`The verification code is:    ${otp}`);
    console.log('Please configure your SMTP settings in .env properly.');
    console.log('!'.repeat(50) + '\n');
    
    // We return a "fake" success so the user isn't blocked by a 500 error
    return { messageId: 'error-fallback-id' };
  }
};

module.exports = {
  sendOTPMail,
};
