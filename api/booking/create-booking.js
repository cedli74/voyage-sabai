import { createBookingRequest } from '../../integrations/notion.js';
import { sendOwnerNotification } from '../../integrations/email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { prenom, nom, email, tel, format, date, jour, creneau, message } = req.body || {};

  if (!prenom || !nom || !email || !date || !creneau) {
    res.status(400).json({ error: 'Champs requis manquants (prénom, nom, email, date, créneau).' });
    return;
  }

  try {
    const page = await createBookingRequest({
      firstName: prenom,
      lastName: nom,
      email,
      phone: tel,
      format,
      dateISO: date,
      dateLabel: jour,
      slot: creneau,
      notes: message,
    });

    try {
      await sendOwnerNotification({
        fullName: [prenom, nom].filter(Boolean).join(' '),
        email,
        phone: tel,
        format,
        dateLabel: jour,
        slot: creneau,
        notes: message,
        notionUrl: page.url,
      });
    } catch (notifyError) {
      console.error('[booking] Échec de la notification propriétaire:', notifyError.message);
    }

    res.status(200).json({
      ok: true,
      status: 'pending',
      message: "Votre demande de rendez-vous a bien été envoyée. Elle sera confirmée sous peu.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
