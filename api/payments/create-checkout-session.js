export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    ok: true,
    message: 'Stripe checkout endpoint ready',
  });
}
