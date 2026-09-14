import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, ExternalLink, Newspaper } from "lucide-react";
import Reveal from "./Reveal.jsx";
import * as newsService from "../../services/newsService.js";
import "./NewsSection.css";

function formatNewsDate(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

function NewsSection({ limit = 6, title = "อัปเดตความรู้เรื่องการฟื้นฟูและดูแลตัวเอง" }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    newsService
      .getRecoveryNews(limit)
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [limit]);

  return (
    <section id="news" className="news-section">
      <Reveal className="news-section-heading">
        <span className="news-section-eyebrow">
          <Newspaper size={14} />
          ข่าวสารและบทความ
        </span>
        <h2>{title}</h2>
      </Reveal>

      <div className="news-section-grid">
        {loading
          ? Array.from({ length: Math.min(limit, 3) }).map((_, index) => (
              <div key={index} className="news-section-card news-section-skeleton" />
            ))
          : news.map((article, index) => (
              <Reveal
                as="a"
                key={article.id}
                id={`news-${article.id}`}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                delay={index * 80}
                className="news-section-card"
              >
                <div className="news-section-image">
                  {article.image ? <img src={article.image} alt="" loading="lazy" /> : <Newspaper size={28} />}
                </div>
                <div className="news-section-body">
                  {article.publishedAt && (
                    <span className="news-section-date">
                      <CalendarDays size={13} />
                      {formatNewsDate(article.publishedAt)}
                    </span>
                  )}
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <span className="news-section-link">
                    อ่านต่อ <ExternalLink size={13} />
                  </span>
                </div>
              </Reveal>
            ))}
      </div>

      {!loading && news.length === 0 && <p className="news-section-empty">ยังไม่มีข่าวสารในขณะนี้</p>}

      <a className="news-section-source" href="https://www.hfocus.org" target="_blank" rel="noopener noreferrer">
        ข่าวจาก Hfocus เจาะลึกระบบสุขภาพ <ChevronRight size={14} />
      </a>
    </section>
  );
}

export default NewsSection;
