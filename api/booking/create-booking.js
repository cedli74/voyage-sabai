export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { name, email, type } = req.body || {};

  if (!name || !email || !type) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  res.status(200).json({
    ok: true,
    message: 'Booking request received',
    data: { name, email, type },
  });
}
