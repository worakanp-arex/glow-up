import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import * as microLessonService from "../../services/microLessonService.js";
import "./FamilyGuide.css";

function FamilyGuideDetail() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    microLessonService
      .getLesson(id)
      .then(setLesson)
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false));
  }, [id]);

  const pageHeader = (
    <PageHeader icon={BookOpen} backTo="/family/guide" backLabel="คู่มือสำหรับครอบครัว">
      {lesson?.title || "รายละเอียดบทความ"}
    </PageHeader>
  );

  if (loadError) return <div className="family-guide-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (loading) return <div className="family-guide-page">{pageHeader}<AsyncState /></div>;
  if (!lesson) return <div className="family-guide-page">{pageHeader}ไม่พบบทความนี้</div>;

  return (
    <div className="family-guide-page">
      {pageHeader}
      <div className="family-guide-card">
        {lesson.category && <span className="family-guide-tag">{lesson.category}</span>}
        <p className="family-guide-body">{lesson.body}</p>
      </div>
    </div>
  );
}

export default FamilyGuideDetail;
