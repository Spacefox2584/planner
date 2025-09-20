export default async function handler(req, res) {
  res.status(200).json({
    KV_REST_API_URL: !!process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN
  });
}
