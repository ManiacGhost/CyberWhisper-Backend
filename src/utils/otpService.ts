import { OTPRepository } from '../repositories/otpRepository';
import { sendEmail } from './emailService';

/**
 * Generate a random 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP email using Brevo
 */
export async function sendOTPEmail(email: string, otpCode: string): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-top: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2c3e50;
          margin: 0;
          font-size: 28px;
        }
        .content {
          margin: 20px 0;
        }
        .otp-box {
          background-color: #f8f9fa;
          border: 2px solid #007bff;
          border-radius: 6px;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #007bff;
          letter-spacing: 4px;
          font-family: 'Courier New', monospace;
        }
        .otp-expiry {
          color: #e74c3c;
          font-size: 14px;
          margin-top: 10px;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #856404;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #7f8c8d;
          font-size: 12px;
        }
        .button {
          display: inline-block;
          background-color: #007bff;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 CyberWhisper Admin</h1>
          <p>Two-Factor Authentication</p>
        </div>

        <div class="content">
          <p>Hello,</p>
          <p>You've requested to log in to your CyberWhisper Admin account. To proceed, please use the following One-Time Password (OTP):</p>

          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
            <div class="otp-expiry">This OTP expires in 10 minutes</div>
          </div>

          <div class="warning">
            <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. Our team will never ask for this code via email or phone. If you didn't request this, please ignore this email.
          </div>

          <p><strong>Steps to complete login:</strong></p>
          <ol>
            <li>Copy the OTP code above</li>
            <li>Return to the admin login page</li>
            <li>Enter the OTP in the verification field</li>
            <li>Click verify to complete your login</li>
          </ol>
        </div>

        <div class="footer">
          <p>© 2026 CyberWhisper. All rights reserved.</p>
          <p>If you have any questions, please contact <a href="mailto:${process.env.SUPPORT_EMAIL}">${process.env.SUPPORT_EMAIL}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
CyberWhisper Admin - Two-Factor Authentication

Your OTP: ${otpCode}

This OTP expires in 10 minutes.

Never share this OTP with anyone. If you didn't request this, please ignore this email.

© 2026 CyberWhisper. All rights reserved.
  `;

  return sendEmail({
    to: email,
    subject: '🔐 CyberWhisper Admin - Your One-Time Password (OTP)',
    html: htmlContent,
    text: textContent,
  });
}

/**
 * Send OTP to admin email and store in database
 */
export async function sendOTPToAdmin(email: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`🔐 Starting OTP process for email: ${email}`);
    
    // Generate OTP
    const otpCode = generateOTP();
    console.log(`✓ OTP generated: ${otpCode}`);

    // Store OTP in database
    await OTPRepository.createOTP(email, otpCode, 10); // 10 minutes expiry
    console.log(`✓ OTP stored in database for ${email}`);

    // Send OTP via email
    console.log(`📧 Sending OTP email to ${email}...`);
    const emailSent = await sendOTPEmail(email, otpCode);

    if (!emailSent) {
      console.error(`❌ Failed to send OTP email to ${email}`);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
      };
    }

    console.log(`✓ OTP sent successfully to ${email}`);
    return {
      success: true,
      message: 'OTP has been sent to your email. Please check your inbox.',
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: 'An error occurred while sending OTP. Please try again later.',
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTPCode(email: string, otpCode: string): Promise<{ valid: boolean; message: string }> {
  try {
    const { valid, otp } = await OTPRepository.verifyOTP(email, otpCode);

    if (!valid || !otp) {
      return {
        valid: false,
        message: 'Invalid or expired OTP. Please request a new one.',
      };
    }

    if (otp.attempt_count >= otp.max_attempts) {
      return {
        valid: false,
        message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
      };
    }

    // Mark OTP as verified
    await OTPRepository.markOTPAsVerified(otp.id);

    console.log(`✓ OTP verified for ${email}`);
    return {
      valid: true,
      message: 'OTP verified successfully.',
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      valid: false,
      message: 'An error occurred while verifying OTP.',
    };
  }
}

/**
 * Handle failed OTP verification attempt
 */
export async function handleFailedOTPAttempt(email: string): Promise<{ message: string; attemptsLeft: number }> {
  try {
    const activeOTP = await OTPRepository.getActiveOTP(email);

    if (!activeOTP) {
      return {
        message: 'No active OTP found.',
        attemptsLeft: 0,
      };
    }

    const updatedOTP = await OTPRepository.incrementAttemptCount(activeOTP.id);
    const attemptsLeft = updatedOTP.max_attempts - updatedOTP.attempt_count;

    return {
      message: `Invalid OTP. ${attemptsLeft} attempts remaining.`,
      attemptsLeft,
    };
  } catch (error) {
    console.error('Error handling failed OTP attempt:', error);
    return {
      message: 'An error occurred.',
      attemptsLeft: 0,
    };
  }
}
