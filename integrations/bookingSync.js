import { getPendingConfirmations, markConfirmationSent, generateVideoLink } from './notion.js';
import { sendClientConfirmation } from './email.js';

export async function processPendingConfirmations() {
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
      console.error(`[booking-sync] Échec pour ${booking.id}:`, error.message);
    }
  }

  return { checked: pending.length, sent };
}
