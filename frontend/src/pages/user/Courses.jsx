import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as courseService from "../../services/courseService.js";
import "./Courses.css";

function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      courseService.getCourses(),
      user.role === "user" ? courseService.getMyCourses() : Promise.resolve([]),
    ])
      .then(([allCourses, enrolled]) => {
        setCourses(allCourses);
        setMyCourses(enrolled);
      })
      .finally(() => setLoading(false));
  }, [user.role]);

  async function handleEnroll(courseId) {
    const enrollment = await courseService.enrollCourse(courseId);
    setMyCourses((prev) => [...prev, enrollment]);
  }

  if (loading) {
    return <div className="courses-page">กำลังโหลด...</div>;
  }

  return (
    <div className="courses-page">
      <h1>
        <GraduationCap size={22} />
        <span>คอร์สเรียน</span>
      </h1>
      <p className="courses-subtitle">พัฒนาทักษะใหม่ๆ เพื่อเปิดโอกาสในการทำงานให้กว้างขึ้น</p>

      {courses.length === 0 ? (
        <p className="courses-empty">ยังไม่มีคอร์สเรียนในระบบ</p>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => {
            const enrollment = myCourses.find((e) => e.course._id === course._id);
            return (
              <div key={course._id} className="course-card">
                <Link to={`/courses/${course._id}`} className="course-card-link">
                  <div className="course-card-icon">
                    <BookOpen size={20} />
                  </div>
                  {course.category && <span className="course-card-category">{course.category}</span>}
                  <h2>{course.title}</h2>
                </Link>

                {user.role === "user" &&
                  (enrollment ? (
                    <div className="course-card-progress">
                      <div className="course-card-progress-track">
                        <div
                          className="course-card-progress-fill"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                      <span className="course-card-progress-label">{enrollment.progress}% เสร็จแล้ว</span>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={() => handleEnroll(course._id)}>
                      ลงทะเบียน
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Courses;
