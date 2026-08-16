export function isZoomConfigured() {
  return Boolean(process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET);
}

async function getAccessToken() {
  const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    { method: 'POST', headers: { Authorization: `Basic ${basic}` } }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.reason || data.error || "Échec d'authentification Zoom.");
  return data.access_token;
}

export async function createZoomMeeting({ topic, startTimeISO, durationMinutes }) {
  const token = await getAccessToken();

  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: startTimeISO,
      duration: durationMinutes,
      timezone: 'Europe/Paris',
      settings: {
        join_before_host: true,
        waiting_room: false,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Échec de création de la réunion Zoom.');

  return { joinUrl: data.join_url, startUrl: data.start_url };
}
