import { createBookingRequest } from '../../integrations/notion.js';

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
    await createBookingRequest({
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

    res.status(200).json({
      ok: true,
      status: 'pending',
      message: "Votre demande de rendez-vous a bien été envoyée. Elle sera confirmée sous peu.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
