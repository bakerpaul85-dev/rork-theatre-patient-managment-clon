import emailjs from '@emailjs/browser';

const SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY || '';

interface EmailParams {
  subject: string;
  body: string;
  toEmail?: string;
}

export async function sendEmailViaEmailJS(params: EmailParams): Promise<void> {
  const { subject, body, toEmail } = params;

  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.error('EmailJS configuration missing. Check environment variables.');
    throw new Error('Email service is not configured. Please contact support.');
  }

  console.log('Sending email via EmailJS...');
  console.log('Subject:', subject);

  const templateParams: Record<string, string> = {
    subject,
    message: body,
  };

  if (toEmail) {
    templateParams.to_email = toEmail;
  }

  const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
  console.log('EmailJS response:', response.status, response.text);
}
