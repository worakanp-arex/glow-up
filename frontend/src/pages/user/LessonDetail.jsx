import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Play } from "lucide-react";
import * as microLessonService from "../../services/microLessonService.js";
import * as scenarioService from "../../services/scenarioService.js";
import "./LessonDetail.css";

function LessonDetail() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([microLessonService.getLesson(id), scenarioService.getScenarios()])
      .then(([lessonData, allScenarios]) => {
        setLesson(lessonData);
        setScenarios(allScenarios.filter((s) => s.lesson === id));
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [id]);

  const pageHeader = <PageHeader icon={BookOpen} backTo={"/learning"} backLabel="บทเรียนทั้งหมด">{lesson?.title || "รายละเอียดบทเรียน"}</PageHeader>;

  if (loadError) return <div className="lesson-detail-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return <div className="lesson-detail-page">{pageHeader}<AsyncState /></div>;
  }
  if (!lesson) {
    return <div className="lesson-detail-page">{pageHeader}ไม่พบบทเรียนนี้</div>;
  }

  return (
    <div className="lesson-detail-page">
      {pageHeader}
      <div className="lesson-detail-card">
        {lesson.category && <span className="lesson-detail-category">{lesson.category}</span>}

        <p className="lesson-detail-body">{lesson.body}</p>
      </div>

      {scenarios.length > 0 && (
        <div className="lesson-detail-scenarios">
          <h2>
            <Play size={16} />
            <span>ฝึกสถานการณ์ที่เกี่ยวข้อง</span>
          </h2>
          <ul>
            {scenarios.map((scenario) => (
              <li key={scenario._id}>
                <Link to={`/learning/scenarios/${scenario._id}`}>{scenario.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LessonDetail;
