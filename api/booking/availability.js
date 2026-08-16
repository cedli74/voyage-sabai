import { getAvailableSlots } from '../../integrations/notion.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const date = req.query?.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Paramètre date manquant ou invalide (YYYY-MM-DD).' });
    return;
  }

  try {
    const { slots, configured } = await getAvailableSlots(date);
    res.status(200).json({ ok: true, date, slots, configured });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
