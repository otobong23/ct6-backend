import * as nodemailer from 'nodemailer'
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { config } from 'dotenv'
import EmailTemplate from '../mail/mail';
import TransactionMail from '../mail/transactionmail';
import HelpMessageMail from '../mail/helpMessage';
import TransactionStatusEmail from '../mail/TransactionStatusEmail';
config()


const transport = nodemailer.createTransport({
   service: 'gmail',
   host: 'smtp.gmail.com',
   secure: false,
   port: 587,
   tls: {
      rejectUnauthorized: false,  // This is necessary in some environments (e.g., local testing)
   },
   auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
   }
})


export default async function sendResetMail(to: string, username: string, code: string) {
   const from = process.env.EMAIL_USER;
   const htmlContent = renderToStaticMarkup(
      createElement(EmailTemplate, { username, code })
   );

   const mailOptions = {
      from,
      to,
      subject: 'CT6: Reset Code',
      html: htmlContent,
   };

   const sendMail = await transport.sendMail(mailOptions);
   return sendMail.accepted[0] === to
}

export async function sendMail(to: string, email: string, amount: number, transactionId: string, type: string) {
   const from = process.env.EMAIL_USER;
   const htmlContent = renderToStaticMarkup(
      createElement(TransactionMail, { email, amount, transactionId, type })
   );

   const mailOptions = {
      from,
      to,
      subject: 'CT6: Incoming Transaction Request',
      html: htmlContent,
   };

   const sendMail = await transport.sendMail(mailOptions);
   return sendMail.accepted[0] === to
}

export async function sendTransactionStatus(to: string, email: string, amount: number, transactionId: string, type: string, status: 'approved' | 'declined', reason: string) {
   const from = process.env.EMAIL_USER;
   const htmlContent = renderToStaticMarkup(
      createElement(TransactionStatusEmail, { email, transactionId, amount, type, status, reason })
   );

   const mailOptions = {
      from,
      to,
      subject: 'CT6: Incoming Transaction Request',
      html: htmlContent,
   };

   const sendMail = await transport.sendMail(mailOptions);
   return sendMail.accepted[0] === to
}


export async function sendHelpMail(email: string, name: string, message: string) {
   const to = process.env.EMAIL_USER;
   // const htmlContent = renderToStaticMarkup(
   //    createElement(HelpMessageMail, { email, name, message })
   // );

   const mailOptions = {
      from: to,
      to,
      subject: 'CT6: Incoming Support Request',
      // html: htmlContent,
      react: HelpMessageMail({ email, name, message })
   };

   const sendMail = await transport.sendMail(mailOptions);
   return sendMail.accepted[0] === to
}