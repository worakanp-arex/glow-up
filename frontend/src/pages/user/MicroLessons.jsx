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

  useEffect(() => {
    Promise.all([microLessonService.getLessons(), scenarioService.getScenarios()])
      .then(([lessonData, scenarioData]) => {
        setLessons(lessonData);
        setScenarios(scenarioData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="micro-lessons-page">กำลังโหลด...</div>;
  }

  return (
    <div className="micro-lessons-page">
      <h1>
        <MessageCircleWarning size={22} />
        <span>ฝึกทักษะการปฏิเสธ</span>
      </h1>
      <p className="micro-lessons-subtitle">
        บทเรียนสั้นและสถานการณ์จำลอง ช่วยฝึกวิธีปฏิเสธในสถานการณ์เสี่ยงต่างๆ
      </p>

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
