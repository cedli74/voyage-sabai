export function isGoogleMeetConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN
  );
}

function addMinutesToNaiveISO(naiveISO, minutes) {
  const d = new Date(naiveISO + 'Z');
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 19);
}

async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || "Échec d'authentification Google.");
  return data.access_token;
}

export async function createGoogleMeetLink({ summary, startTimeNaiveISO, durationMinutes }) {
  const token = await getAccessToken();
  const endTimeNaiveISO = addMinutesToNaiveISO(startTimeNaiveISO, durationMinutes);

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        start: { dateTime: startTimeNaiveISO, timeZone: 'Europe/Paris' },
        end: { dateTime: endTimeNaiveISO, timeZone: 'Europe/Paris' },
        conferenceData: {
          createRequest: {
            requestId: `voyage-sabai-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Échec de création de l'événement Google Calendar.");

  return { joinUrl: data.hangoutLink, eventLink: data.htmlLink };
}
