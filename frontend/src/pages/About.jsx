import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import Reveal from "../components/common/Reveal.jsx";
import PartnerBadge from "../components/common/PartnerBadge.jsx";
import { PARTNERS } from "../constants/partners.js";
import "./About.css";

const VALUES = [
  {
    icon: HeartHandshake,
    title: "มองเห็นคุณค่าในตัวคน",
    desc: "เราเชื่อว่าทุกคนที่ผ่านการบำบัดสมควรได้รับโอกาสเริ่มต้นใหม่ ไม่ถูกตัดสินจากอดีต",
  },
  {
    icon: ShieldCheck,
    title: "ความเป็นส่วนตัวเป็นอันดับแรก",
    desc: "ข้อมูลการบำบัดและบันทึกสุขภาพใจของผู้ใช้งานจะไม่ถูกเปิดเผยให้นายจ้างเห็นโดยตรง",
  },
  {
    icon: Sparkles,
    title: "ใช้เทคโนโลยีอย่างมีความรับผิดชอบ",
    desc: "นำ AI มาช่วยจับคู่งานอย่างเป็นธรรม ควบคู่กับหลักวิชาการทางการแพทย์และการพยาบาล",
  },
];

function About() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <div className="about-page">
      <section className="about-hero">
        <Reveal className="about-hero-inner">
          <span className="about-eyebrow">เกี่ยวกับเรา</span>
          <h1>โอกาสใหม่ เริ่มต้นได้ ด้วยความร่วมมือของสามหน่วยงาน</h1>
          <p>
            glow-up คือแพลตฟอร์มที่เกิดจากความร่วมมือระหว่างสถาบันทางการแพทย์ การพยาบาล และเทคโนโลยี
            เพื่อเชื่อมผู้ผ่านการบำบัดสารเสพติดเข้ากับโอกาสการทำงานจริง ด้วยการจับคู่ทักษะอย่างเป็นธรรม
            ระบบดูแลสุขภาพใจต่อเนื่อง และการปกป้องความเป็นส่วนตัวของผู้ใช้งานเป็นหัวใจสำคัญ
          </p>
        </Reveal>
      </section>

      <section className="about-values">
        {VALUES.map((value, index) => (
          <Reveal key={value.title} delay={index * 90} className="about-value-card">
            <div className="about-value-icon">
              <value.icon size={22} />
            </div>
            <h2>{value.title}</h2>
            <p>{value.desc}</p>
          </Reveal>
        ))}
      </section>

      <section className="about-partners">
        <Reveal className="about-section-heading">
          <span className="about-section-eyebrow">หน่วยงานพันธมิตร</span>
          <h2>สามพลังที่ร่วมสร้าง glow-up</h2>
          <p>
            แต่ละหน่วยงานนำความเชี่ยวชาญเฉพาะทางมาประกอบกัน ตั้งแต่การบำบัดฟื้นฟู
            การดูแลสุขภาพใจ ไปจนถึงการพัฒนาเทคโนโลยี เพื่อให้แพลตฟอร์มนี้ตอบโจทย์ผู้ใช้งานจริง
          </p>
        </Reveal>

        <div className="about-partners-list">
          {PARTNERS.map((partner, index) => (
            <Reveal
              key={partner.id}
              id={partner.id}
              delay={index * 100}
              className={`about-partner-row${index % 2 === 1 ? " about-partner-row-reverse" : ""}`}
            >
              <div className="about-partner-media">
                <PartnerBadge partner={partner} size="lg" />
              </div>
              <div className="about-partner-copy">
                <span className="about-partner-role">{partner.role}</span>
                <h3>{partner.name}</h3>
                <p>{partner.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal as="section" className="about-cta">
        <h2>อยากเป็นส่วนหนึ่งของโอกาสนี้ไหม?</h2>
        <p>ไม่ว่าคุณจะกำลังมองหางาน หรือเป็นนายจ้างที่อยากร่วมสร้างโอกาส เราพร้อมต้อนรับคุณ</p>
        <div className="about-cta-actions">
          <Link to="/jobs" className="btn btn-primary">
            <span>ค้นหางาน</span>
            <ArrowRight size={18} />
          </Link>
          <Link to="/register" className="btn btn-secondary">
            สมัครสมาชิก
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

export default About;
