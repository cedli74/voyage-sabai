import { getPendingConfirmations, markConfirmationSent } from './notion.js';
import { sendClientConfirmation } from './email.js';
import { isZoomConfigured, createZoomMeeting } from './zoom.js';
import { isGoogleMeetConfigured, createGoogleMeetLink } from './googleMeet.js';

function parseSlot(slot) {
  const match = slot.match(/(\d{2}):(\d{2})\s*–\s*(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, startH, startM, endH, endM] = match;
  const duration = (Number(endH) * 60 + Number(endM)) - (Number(startH) * 60 + Number(startM));
  return { startTime: `${startH}:${startM}`, durationMinutes: duration > 0 ? duration : 60 };
}

async function getVideoLinks(booking) {
  const parsed = booking.dateISO ? parseSlot(booking.slot) : null;
  const topic = `Appel Voyage Sabai — ${booking.fullName}`;

  if (isGoogleMeetConfigured() && parsed) {
    try {
      const { joinUrl } = await createGoogleMeetLink({
        summary: topic,
        startTimeNaiveISO: `${booking.dateISO}T${parsed.startTime}:00`,
        durationMinutes: parsed.durationMinutes,
      });
      if (joinUrl) return { joinUrl, startUrl: null };
    } catch (error) {
      console.error(`[booking-sync] Échec de création Google Meet pour ${booking.id}, repli:`, error.message);
    }
  }

  if (isZoomConfigured() && parsed) {
    try {
      const { joinUrl, startUrl } = await createZoomMeeting({
        topic,
        startTimeISO: `${booking.dateISO}T${parsed.startTime}:00`,
        durationMinutes: parsed.durationMinutes,
      });
      return { joinUrl, startUrl };
    } catch (error) {
      console.error(`[booking-sync] Échec de création Zoom pour ${booking.id}:`, error.message);
    }
  }

  console.warn(`[booking-sync] Aucun lien de visioconférence n'a pu être généré pour ${booking.id}.`);
  return { joinUrl: null, startUrl: null };
}

export async function processPendingConfirmations() {
  const pending = await getPendingConfirmations();
  let sent = 0;

  for (const booking of pending) {
    const isVideo = booking.format === 'Visioconférence';
    const { joinUrl, startUrl } = isVideo ? await getVideoLinks(booking) : { joinUrl: null, startUrl: null };

    try {
      await sendClientConfirmation({
        fullName: booking.fullName,
        email: booking.email,
        dateLabel: booking.dateLabel,
        slot: booking.slot,
        format: booking.format,
        videoLink: joinUrl,
      });
      await markConfirmationSent(booking.id, joinUrl, startUrl);
      sent += 1;
    } catch (error) {
      console.error(`[booking-sync] Échec pour ${booking.id}:`, error.message);
    }
  }

  return { checked: pending.length, sent };
}
