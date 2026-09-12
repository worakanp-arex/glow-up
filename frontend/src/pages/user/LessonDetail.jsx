import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Play } from "lucide-react";
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

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="lesson-detail-page"><AsyncState /></div>;
  }
  if (!lesson) {
    return <div className="lesson-detail-page">ไม่พบบทเรียนนี้</div>;
  }

  return (
    <div className="lesson-detail-page">
      <Link to="/learning" className="lesson-detail-back">
        <ArrowLeft size={16} />
        บทเรียนทั้งหมด
      </Link>

      <div className="lesson-detail-card">
        <div className="lesson-detail-icon">
          <BookOpen size={22} />
        </div>
        {lesson.category && <span className="lesson-detail-category">{lesson.category}</span>}
        <h1>{lesson.title}</h1>
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
