import { getPendingConfirmations, markConfirmationSent, generateVideoLink } from '../../integrations/notion.js';
import { sendClientConfirmation } from '../../integrations/email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const pending = await getPendingConfirmations();
    let sent = 0;

    for (const booking of pending) {
      const videoLink = booking.format === 'Visioconférence' ? generateVideoLink(booking.id) : null;

      try {
        await sendClientConfirmation({
          fullName: booking.fullName,
          email: booking.email,
          dateLabel: booking.dateLabel,
          slot: booking.slot,
          format: booking.format,
          videoLink,
        });
        await markConfirmationSent(booking.id, videoLink);
        sent += 1;
      } catch (error) {
        console.error(`[sync-confirmations] Échec pour ${booking.id}:`, error.message);
      }
    }

    res.status(200).json({ ok: true, checked: pending.length, sent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
