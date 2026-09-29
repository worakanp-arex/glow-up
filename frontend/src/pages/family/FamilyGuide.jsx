import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import * as microLessonService from "../../services/microLessonService.js";
import "./FamilyGuide.css";

function FamilyGuide() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    microLessonService
      .getLessons()
      .then(setLessons)
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false));
  }, []);

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;
  if (loading) return <div className="family-guide-page"><AsyncState /></div>;

  return (
    <div className="family-guide-page">
      <PageHeader icon={BookOpen} description="บทความและคำแนะนำสำหรับครอบครัวและผู้ดูแล เพื่อช่วยสนับสนุนเส้นทางฟื้นฟูของคนที่คุณรัก">
        คู่มือสำหรับครอบครัว
      </PageHeader>

      {lessons.length === 0 ? (
        <p className="family-guide-empty">ยังไม่มีบทความสำหรับครอบครัวในขณะนี้</p>
      ) : (
        <ul className="family-guide-list">
          {lessons.map((lesson) => (
            <li key={lesson._id}>
              <Link to={`/family/guide/${lesson._id}`}>
                {lesson.category && <span className="family-guide-tag">{lesson.category}</span>}
                <span className="family-guide-title">{lesson.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FamilyGuide;
