import nodemailer from 'nodemailer';
import {
  createOtpToken,
  generateOtpCode,
  getAuthSecret,
  isAllowedEmail,
  jsonResponse,
  normalizeEmail,
  OTP_COOKIE_NAME,
  OTP_TTL_SECONDS,
  serializeCookie
} from '../_lib/auth.js';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.communaute-paysbasque.fr';
const SMTP_PORT = Number(process.env.SMTP_PORT || 25);
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@procedureurgence-capb.fr';

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Requête invalide.' }, { status: 400 });
  }

  const email = normalizeEmail(payload?.email);
  if (!email || !isAllowedEmail(email)) {
    return jsonResponse({ ok: false, error: 'Adresse email non autorisée.' }, { status: 400 });
  }

  let secret;
  try {
    secret = getAuthSecret();
  } catch {
    return jsonResponse({ ok: false, error: 'Configuration d’authentification manquante.' }, { status: 500 });
  }

  const code = generateOtpCode();
  const token = createOtpToken(email, code, secret);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    ...(process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
      : {}),
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
    }
  });

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Code d’accès - Procédures d’urgence CAPB',
      text: [
        'Bonjour,',
        '',
        `Votre code d’accès CAPB est : ${code}`,
        '',
        'Ce code est valable 10 minutes.',
        'Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.'
      ].join('\n')
    });
  } catch (error) {
    console.error('send-otp failed', error);
    return jsonResponse({ ok: false, error: 'Envoi du code impossible.' }, { status: 500 });
  }

  return jsonResponse(
    { ok: true, message: 'Code envoyé par email.' },
    {
      headers: {
        'set-cookie': serializeCookie(OTP_COOKIE_NAME, token, {
          maxAge: OTP_TTL_SECONDS,
          sameSite: 'Strict'
        }),
        'cache-control': 'no-store'
      }
    }
  );
}
