import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  ClipboardCheck,
  HeartHandshake,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import Reveal from "../components/common/Reveal.jsx";
import PartnerBadge from "../components/common/PartnerBadge.jsx";
import NewsSection from "../components/common/NewsSection.jsx";
import { PARTNERS } from "../constants/partners.js";
import "./Home.css";

const DASHBOARD_BY_ROLE = {
  user: "/dashboard",
  employer: "/employer/dashboard",
  admin: "/admin",
};

const FEATURES = [
  {
    icon: Search,
    title: "ค้นหางานที่ใช่",
    desc: "ค้นหาและสมัครงานที่ตรงกับทักษะและประสบการณ์ของคุณได้โดยตรง",
  },
  {
    icon: Users,
    title: "สำหรับนายจ้าง",
    desc: "ประกาศงานและพบผู้สมัครที่มีศักยภาพ พร้อมสถานะยืนยันตัวตนที่น่าเชื่อถือ",
  },
  {
    icon: ShieldCheck,
    title: "ความเป็นส่วนตัวมาก่อน",
    desc: "ข้อมูลการบำบัดและบันทึกส่วนตัวของคุณจะไม่ถูกเปิดเผยให้นายจ้างเห็นโดยตรง",
  },
  {
    icon: HeartHandshake,
    title: "ชุมชนที่พร้อมรับฟัง",
    desc: "บันทึกอารมณ์ ติดตามความเสี่ยง และพูดคุยกับชุมชนที่เข้าใจในสิ่งที่คุณกำลังผ่านมา",
  },
];

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "สร้างโปรไฟล์และประเมินความพร้อม",
    desc: "บอกเล่าทักษะ ประสบการณ์ และความพร้อมของคุณ ข้อมูลส่วนตัวถูกเก็บเป็นความลับเสมอ",
  },
  {
    icon: Sparkles,
    title: "รับการจับคู่งานที่เหมาะสมด้วย AI",
    desc: "ระบบช่วยแนะนำงานที่ตรงกับทักษะและบริบทของคุณ เพื่อการเริ่มต้นที่ตรงจุด",
  },
  {
    icon: Briefcase,
    title: "เริ่มงานพร้อมระบบดูแลต่อเนื่อง",
    desc: "ติดตามอารมณ์ ความเสี่ยง และพูดคุยกับชุมชนได้ตลอดเส้นทางการทำงาน",
  },
];

function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-blob home-hero-blob-1" aria-hidden="true" />
        <div className="home-hero-blob home-hero-blob-2" aria-hidden="true" />
        <div className="home-hero-blob home-hero-blob-3" aria-hidden="true" />

        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-eyebrow">
              <Sparkles size={14} />
              พื้นที่ปลอดภัยสำหรับการเริ่มต้นใหม่
            </span>
            <h1>เริ่มต้นบทใหม่ของชีวิตการทำงาน ไปด้วยกัน</h1>
            <p>
              พื้นที่ที่เชื่อมผู้ผ่านการบำบัดเข้ากับโอกาสการทำงานจริง ด้วยการจับคู่ทักษะอย่างเป็นธรรม
              และดูแลความเป็นส่วนตัวของคุณเป็นอันดับแรก
            </p>
            <div className="home-hero-actions">
              <Link to="/jobs" className="btn btn-primary">
                <Search size={18} />
                <span>ค้นหางาน</span>
              </Link>
              {isAuthenticated ? (
                <Link to={DASHBOARD_BY_ROLE[user.role] || "/"} className="btn btn-secondary">
                  ไปที่แผงควบคุมของฉัน
                </Link>
              ) : (
                <Link to="/register" className="btn btn-secondary">
                  สมัครสมาชิก
                </Link>
              )}
            </div>
          </div>

          <div className="home-hero-visual" aria-hidden="true">
            <div className="home-hero-card home-hero-card-main">
              <div className="home-hero-card-icon">
                <HeartHandshake size={20} />
              </div>
              <p className="home-hero-card-title">ทุกคนควรมีโอกาสเริ่มต้นใหม่</p>
              <p className="home-hero-card-sub">
                จับคู่งานอย่างเป็นธรรม ดูแลความเป็นส่วนตัวของคุณเป็นอันดับแรก
              </p>

              <div className="home-hero-card home-hero-card-float home-hero-card-float-1">
                <ShieldCheck size={16} />
                <span>ข้อมูลถูกเก็บเป็นความลับ</span>
              </div>
              <div className="home-hero-card home-hero-card-float home-hero-card-float-2">
                <Sparkles size={16} />
                <span>จับคู่งานด้วย AI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-partners">
        <p className="home-partners-label">ภายใต้ความร่วมมือของ</p>
        <div className="home-partners-row">
          {PARTNERS.map((partner) => (
            <Link key={partner.id} to={`/about#${partner.id}`} className="home-partner-item">
              <PartnerBadge partner={partner} size="sm" />
              <span>{partner.shortName}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-features">
        {FEATURES.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 80} className="home-feature-card">
            <div className="home-feature-icon">
              <feature.icon size={22} />
            </div>
            <h2>{feature.title}</h2>
            <p>{feature.desc}</p>
          </Reveal>
        ))}
      </section>

      <section className="home-steps">
        <Reveal className="home-section-heading">
          <span className="home-section-eyebrow">ขั้นตอนการใช้งาน</span>
          <h2>เริ่มต้นได้ง่ายๆ ใน 3 ขั้นตอน</h2>
        </Reveal>
        <div className="home-steps-row">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 100} className="home-step">
              <div className="home-step-number">{index + 1}</div>
              <div className="home-step-icon">
                <step.icon size={20} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="home-news-wrap">
        <NewsSection />
      </div>

      <Reveal as="section" className="home-cta-banner">
        <h2>พร้อมเริ่มต้นบทใหม่หรือยัง?</h2>
        <p>สมัครสมาชิกวันนี้ เพื่อเริ่มค้นหางานที่ใช่ และรับการดูแลตลอดเส้นทางการกลับสู่สังคม</p>
        <div className="home-hero-actions">
          <Link to="/jobs" className="btn btn-primary">
            <span>ค้นหางานตอนนี้</span>
            <ArrowRight size={18} />
          </Link>
          {!isAuthenticated && (
            <Link to="/register" className="btn btn-ghost">
              สมัครสมาชิกฟรี
            </Link>
          )}
        </div>
      </Reveal>
    </div>
  );
}

export default Home;
