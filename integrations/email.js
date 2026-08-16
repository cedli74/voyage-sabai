import { Resend } from 'resend';

export function createEmailClient() {
  if (!process.env.EMAIL_API_KEY) return null;
  return new Resend(process.env.EMAIL_API_KEY);
}

export function isEmailConfigured() {
  return Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM_ADDRESS);
}

export async function sendOwnerNotification({ fullName, email, phone, format, dateLabel, slot, notes, notionUrl }) {
  const resend = createEmailClient();
  if (!resend || !isEmailConfigured() || !process.env.OWNER_NOTIFICATION_EMAIL) {
    console.warn('[email] Notification propriétaire ignorée (email non configuré).');
    return;
  }

  const notionAppUrl = notionUrl ? notionUrl.replace(/^https:/, 'notion:') : null;

  const lines = [
    `<p><strong>${fullName}</strong> souhaite un appel le <strong>${dateLabel}</strong> à <strong>${slot}</strong> (${format || 'format non précisé'}).</p>`,
    `<p>Email : ${email}${phone ? ` · Téléphone : ${phone}` : ''}</p>`,
    notes ? `<p>Message : ${notes}</p>` : '',
    notionAppUrl ? `<p><a href="${notionAppUrl}">Ouvrir dans l'app Notion</a> (<a href="${notionUrl}">ou dans le navigateur</a>)</p>` : '',
    `<p>Validez le rendez-vous en passant son statut à "Confirmé" dans Notion pour déclencher l'email de confirmation au client.</p>`,
  ];

  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM_ADDRESS,
    to: process.env.OWNER_NOTIFICATION_EMAIL,
    subject: `Nouvelle demande de rendez-vous — ${fullName}`,
    html: lines.filter(Boolean).join('\n'),
  });
  if (result.error) throw new Error(result.error.message);
}

export async function sendClientConfirmation({ fullName, email, dateLabel, slot, format, videoLink }) {
  const resend = createEmailClient();
  if (!resend || !isEmailConfigured()) {
    console.warn('[email] Confirmation client ignorée (email non configuré).');
    return;
  }

  const lines = [
    `<p>Bonjour ${fullName},</p>`,
    `<p>Votre appel avec Voyage Sabai est confirmé pour le <strong>${dateLabel}</strong> à <strong>${slot}</strong>.</p>`,
    format ? `<p>Format : ${format}</p>` : '',
    videoLink ? `<p>Lien de visioconférence : <a href="${videoLink}">${videoLink}</a></p>` : '',
    `<p>À très vite !</p>`,
  ];

  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM_ADDRESS,
    to: email,
    subject: 'Votre appel Voyage Sabai est confirmé',
    html: lines.filter(Boolean).join('\n'),
  });
  if (result.error) throw new Error(result.error.message);
}
