import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export function createDeadlineNotificationEmail(
  projectTitle: string,
  clientName: string,
  deadline: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Project Deadline Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Project Deadline Reminder</h2>
          <p>This is a reminder that your project deadline is approaching in 3 days.</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Project:</strong> ${projectTitle}</p>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>
          </div>
          
          <p style="color: #e74c3c; font-weight: bold;">Please ensure all tasks are completed before the deadline.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #7f8c8d;">
            This is an automated reminder from your Accounting Task Tracker.
          </p>
        </div>
      </body>
    </html>
  `;
}

