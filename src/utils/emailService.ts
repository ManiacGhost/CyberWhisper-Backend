import nodemailer from 'nodemailer';

// Configure the transporter using Brevo SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.BREVO_EMAIL || '',
    pass: process.env.BREVO_SMTP_KEY || '',
  },
});

// Verify connection configuration
transporter.verify((_error, _success) => {
  if (_error) {
    console.error('❌ Email service configuration error:', _error.message);
  } else {
    console.log('✓ Email service configured successfully');
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.BREVO_FROM_EMAIL || process.env.BREVO_EMAIL || 'noreply@cyberwhisper.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

/**
 * Send quotation email to user
 */
export const sendQuotationEmail = async (
  name: string,
  email: string,
  phone: string,
  _message?: string
): Promise<boolean> => {
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
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
          margin: -40px -40px 30px -40px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          margin: 30px 0;
        }
        .greeting {
          font-size: 18px;
          color: #667eea;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .body-text {
          font-size: 16px;
          line-height: 1.8;
          margin: 15px 0;
        }
        .highlight {
          background-color: #f0f4ff;
          padding: 20px;
          border-left: 4px solid #667eea;
          margin: 20px 0;
          border-radius: 4px;
        }
        .details {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .detail-item {
          margin: 10px 0;
          font-size: 14px;
        }
        .label {
          font-weight: 600;
          color: #667eea;
        }
        .cta-button {
          display: inline-block;
          background-color: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: 600;
          transition: background-color 0.3s;
        }
        .cta-button:hover {
          background-color: #764ba2;
        }
        .footer {
          border-top: 1px solid #ddd;
          margin-top: 30px;
          padding-top: 20px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .social-links {
          margin-top: 15px;
        }
        .social-links a {
          margin: 0 10px;
          color: #667eea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 CyberWhisper</h1>
          <p>Your Request Has Been Received</p>
        </div>
        
        <div class="content">
          <div class="greeting">Hello ${name},</div>
          
          <div class="body-text">
            Thank you for your interest in <strong>CyberWhisper</strong>! We're excited to help you achieve your goals.
          </div>
          
          <div class="highlight">
            <strong>We've received your quotation request</strong> and our team will review it shortly. We typically respond within 24-48 hours.
          </div>
          
          <div class="body-text">
            Here's a summary of your request:
          </div>
          
          <div class="details">
            <div class="detail-item">
              <span class="label">Name:</span> ${name}
            </div>
            <div class="detail-item">
              <span class="label">Email:</span> ${email}
            </div>
            <div class="detail-item">
              <span class="label">Phone:</span> ${phone}
            </div>
            <div class="detail-item">
              <span class="label">Request Date:</span> ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
          
          <div class="body-text">
            Our team will be in touch with you soon with a customized quotation for your needs. In the meantime, feel free to explore our services and resources.
          </div>
          
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="cta-button">
            Explore Our Services
          </a>
          
          <div class="body-text">
            If you have any urgent questions or need immediate assistance, please don't hesitate to reach out to us directly at:
          </div>
          
          <div class="highlight">
            <strong>Email:</strong> ${process.env.SUPPORT_EMAIL || 'support@cyberwhisper.com'}<br>
            <strong>Phone:</strong> ${process.env.SUPPORT_PHONE || '+1 (555) 123-4567'}
          </div>
          
          <div class="body-text">
            Best regards,<br>
            <strong>The CyberWhisper Team</strong>
          </div>
        </div>
        
        <div class="footer">
          <p>© 2026 CyberWhisper. All rights reserved.</p>
          <div class="social-links">
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
            <a href="#">Facebook</a>
          </div>
          <p>This is an automated response. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: `Quotation Request Received - CyberWhisper`,
    html: htmlContent,
  });
};

/**
 * Send notification email to admin/support
 */
export const sendAdminNotification = async (
  name: string,
  email: string,
  phone: string,
  message?: string
): Promise<boolean> => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.BREVO_EMAIL || '';

  if (!adminEmail) {
    console.warn('⚠️ ADMIN_EMAIL not configured');
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #667eea; color: white; padding: 15px; border-radius: 4px; }
        .details { background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .label { font-weight: bold; color: #667eea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📋 New Quotation Request</h2>
        </div>
        
        <div class="details">
          <p><span class="label">Name:</span> ${name}</p>
          <p><span class="label">Email:</span> ${email}</p>
          <p><span class="label">Phone:</span> ${phone}</p>
          ${message ? `<p><span class="label">Message:</span></p><p>${message.replace(/\n/g, '<br>')}</p>` : ''}
          <p><span class="label">Request Time:</span> ${new Date().toLocaleString()}</p>
        </div>
        
        <p>Please review this request and follow up with the customer promptly.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: adminEmail,
    subject: `[QUOTATION] New Request from ${name}`,
    html: htmlContent,
  });
};
