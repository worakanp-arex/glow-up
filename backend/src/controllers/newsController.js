import { getRecoveryNews } from "../services/newsService.js";

export async function getNews(req, res) {
  const requested = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 10) : 6;

  const articles = await getRecoveryNews(limit);
  res.json({ articles });
}
