export function createNotionClient() {
  return {
    configured: Boolean(process.env.NOTION_API_KEY),
  };
}
