import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, MessageCircleWarning, Play } from "lucide-react";
import * as microLessonService from "../../services/microLessonService.js";
import * as scenarioService from "../../services/scenarioService.js";
import "./MicroLessons.css";

function MicroLessons() {
  const [lessons, setLessons] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([microLessonService.getLessons(), scenarioService.getScenarios()])
      .then(([lessonData, scenarioData]) => {
        setLessons(lessonData);
        setScenarios(scenarioData);
      })
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) {
    return <div className="micro-lessons-page"><AsyncState /></div>;
  }

  return (
    <div className="micro-lessons-page">
      <PageHeader icon={MessageCircleWarning} description={<>
        บทเรียนสั้นและสถานการณ์จำลอง ช่วยฝึกวิธีปฏิเสธในสถานการณ์เสี่ยงต่างๆ
      </>}>ฝึกทักษะการปฏิเสธ</PageHeader>

      <section>
        <h2>
          <BookOpen size={18} />
          <span>บทเรียนสั้น</span>
        </h2>
        {lessons.length === 0 ? (
          <p className="micro-lessons-empty">ยังไม่มีบทเรียนในขณะนี้</p>
        ) : (
          <ul className="micro-lessons-list">
            {lessons.map((lesson) => (
              <li key={lesson._id}>
                <Link to={`/learning/${lesson._id}`}>
                  {lesson.category && <span className="micro-lessons-tag">{lesson.category}</span>}
                  <span className="micro-lessons-title">{lesson.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>
          <Play size={18} />
          <span>สถานการณ์จำลอง</span>
        </h2>
        {scenarios.length === 0 ? (
          <p className="micro-lessons-empty">ยังไม่มีสถานการณ์จำลองในขณะนี้</p>
        ) : (
          <ul className="micro-lessons-list">
            {scenarios.map((scenario) => (
              <li key={scenario._id}>
                <Link to={`/learning/scenarios/${scenario._id}`}>
                  <span className="micro-lessons-title">{scenario.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default MicroLessons;
