import { Client } from '@notionhq/client';

const CALL_HOURS = { start: 9, end: 19 };

export function createNotionClient() {
  if (!process.env.NOTION_API_KEY) return null;
  return new Client({ auth: process.env.NOTION_API_KEY });
}

export function isNotionConfigured() {
  return Boolean(process.env.NOTION_API_KEY && process.env.NOTION_DB_BOOKINGS);
}

export function generateDaySlots() {
  const slots = [];
  for (let h = CALL_HOURS.start; h < CALL_HOURS.end; h++) {
    const start = String(h).padStart(2, '0') + ':00';
    const end = String(h + 1).padStart(2, '0') + ':00';
    slots.push(`${start} – ${end}`);
  }
  return slots;
}

export async function getAvailableSlots(dateISO) {
  const allSlots = generateDaySlots();
  const notion = createNotionClient();
  if (!notion || !isNotionConfigured()) {
    return { slots: allSlots, configured: false };
  }

  const response = await notion.databases.query({
    database_id: process.env.NOTION_DB_BOOKINGS,
    filter: {
      and: [
        { property: 'Date', date: { equals: dateISO } },
        { property: 'Statut', select: { equals: 'Confirmé' } },
      ],
    },
  });

  const taken = new Set(
    response.results
      .map((page) => page.properties['Créneau']?.rich_text?.[0]?.plain_text)
      .filter(Boolean)
  );

  return { slots: allSlots.filter((slot) => !taken.has(slot)), configured: true };
}

export async function createBookingRequest({ firstName, lastName, email, phone, format, dateISO, dateLabel, slot, notes }) {
  const notion = createNotionClient();
  if (!notion || !isNotionConfigured()) {
    throw new Error("La prise de rendez-vous n'est pas encore configurée (NOTION_API_KEY / NOTION_DB_BOOKINGS manquants).");
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  const properties = {
    Name: { title: [{ text: { content: fullName || email } }] },
    Email: { email },
    Date: { date: { start: dateISO } },
    'Créneau': { rich_text: [{ text: { content: slot } }] },
    Statut: { select: { name: 'En attente' } },
  };

  if (phone) properties['Téléphone'] = { phone_number: phone };
  if (format) properties['Format'] = { select: { name: format } };
  if (dateLabel) properties['Jour (libellé)'] = { rich_text: [{ text: { content: dateLabel } }] };
  if (notes) properties.Notes = { rich_text: [{ text: { content: notes } }] };

  return notion.pages.create({
    parent: { database_id: process.env.NOTION_DB_BOOKINGS },
    properties,
  });
}

export function generateVideoLink(pageId) {
  const slug = 'VoyageSabai-' + pageId.replace(/-/g, '').slice(0, 16);
  return `https://meet.jit.si/${slug}`;
}

export async function getPendingConfirmations() {
  const notion = createNotionClient();
  if (!notion || !isNotionConfigured()) return [];

  const response = await notion.databases.query({
    database_id: process.env.NOTION_DB_BOOKINGS,
    filter: {
      and: [
        { property: 'Statut', select: { equals: 'Confirmé' } },
        { property: 'Confirmation envoyée', checkbox: { equals: false } },
      ],
    },
  });

  return response.results.map((page) => ({
    id: page.id,
    fullName: page.properties.Name?.title?.[0]?.plain_text || '',
    email: page.properties.Email?.email || '',
    format: page.properties.Format?.select?.name || '',
    dateLabel: page.properties['Jour (libellé)']?.rich_text?.[0]?.plain_text
      || page.properties.Date?.date?.start
      || '',
    slot: page.properties['Créneau']?.rich_text?.[0]?.plain_text || '',
  }));
}

export async function markConfirmationSent(pageId, videoLink) {
  const notion = createNotionClient();
  const properties = { 'Confirmation envoyée': { checkbox: true } };
  if (videoLink) properties['Lien visio'] = { url: videoLink };

  await notion.pages.update({ page_id: pageId, properties });
}
