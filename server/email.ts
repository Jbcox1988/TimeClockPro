import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

// Initialize SendGrid service if API key is available
if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
  }>;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!mailService) {
    console.error('SendGrid not configured - SENDGRID_API_KEY environment variable not set');
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || undefined,
      html: params.html || undefined,
      attachments: params.attachments?.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: 'attachment'
      })),
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return mailService !== null;
}