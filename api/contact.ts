import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, organization, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // Use a Gmail App Password
      },
    });

    await transporter.sendMail({
      from: `"\({name}" <\){process.env.GMAIL_USER}>`,
      replyTo: email,
      to: process.env.GMAIL_USER || 'dikshantdahiya8@gmail.com',
      subject: `[Portfolio Inquiry] ${subject}`,
      text: `Name: \({name}\nEmail:\){email}\nPhone: \({phone || 'N/A'}\nOrganization:\){organization || 'N/A'}\n\nMessage:\n${message}`,
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully!' });
  } catch (error: any) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send email.' });
  }
}
