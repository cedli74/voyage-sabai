import { processPendingConfirmations } from '../../integrations/bookingSync.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};

  if (body.verification_token) {
    console.log('[notion-webhook] Verification token:', body.verification_token);
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const result = await processPendingConfirmations();
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('[notion-webhook] Échec:', error.message);
    res.status(200).json({ ok: false });
  }
}
