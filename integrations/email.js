export function createEmailClient() {
  return {
    configured: Boolean(process.env.EMAIL_API_KEY),
  };
}
