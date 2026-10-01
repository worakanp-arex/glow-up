import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, CalendarCheck, CheckCircle2, ChevronRight, ClipboardList, Flame, Gamepad2, Plus, Target, Trash2 } from "lucide-react";
import PlantGrowth, { stageLabel, streakToStage } from "../../components/user/PlantGrowth.jsx";
import ActivityMissionBoard from "../../components/user/ActivityMissionBoard.jsx";
import MissionBoard from "../../components/user/MissionBoard.jsx";
import * as emotionService from "../../services/emotionService.js";
import * as goalService from "../../services/goalService.js";
import CheckinCalendar from "../../components/user/CheckinCalendar.jsx";
import PointsSummary from "../../components/user/PointsSummary.jsx";
import "./Streak.css";

const TERM_LABELS = { short: "ระยะสั้น", long: "ระยะยาว" };
const STATUS_LABELS = { active: "กำลังดำเนินการ", completed: "สำเร็จแล้ว", abandoned: "ยกเลิกแล้ว" };
const INITIAL_GOAL_FORM = { title: "", description: "", term: "short", targetDate: "" };

function GoalCard({ goal, onSave, onDelete }) {
  const [progress, setProgress] = useState(goal.progress);
  const [saving, setSaving] = useState(false);

  async function handleSaveProgress() {
    setSaving(true);
    try {
      await onSave(goal._id, { progress: Number(progress) });
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      await onSave(goal._id, { status: "completed", progress: 100 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className={`goal-card goal-card-${goal.status}`}>
      <div className="goal-card-body">
        <p className="goal-card-title">
          {goal.title}
          <span className="goal-card-term-tag">{TERM_LABELS[goal.term]}</span>
        </p>
        {goal.description && <p className="goal-card-description">{goal.description}</p>}
        {goal.targetDate && (
          <p className="goal-card-meta">เป้าหมายภายใน {new Date(goal.targetDate).toLocaleDateString("th-TH")}</p>
        )}
        <p className="goal-card-meta">สถานะ: {STATUS_LABELS[goal.status]}</p>

        {goal.status === "active" && (
          <div className="goal-card-progress-row">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
            />
            <span>{progress}%</span>
            <button type="button" className="btn btn-secondary" onClick={handleSaveProgress} disabled={saving}>
              บันทึก
            </button>
          </div>
        )}
        {goal.status !== "active" && (
          <div className="goal-card-progress-row">
            <progress value={goal.progress} max={100} />
            <span>{goal.progress}%</span>
          </div>
        )}
      </div>
      <div className="goal-card-actions">
        {goal.status === "active" && (
          <button type="button" onClick={handleComplete} disabled={saving} title="ทำสำเร็จแล้ว">
            <CheckCircle2 size={16} />
          </button>
        )}
        <button type="button" className="goal-card-delete" onClick={() => onDelete(goal._id)} title="ลบ">
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

function Streak() {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [goals, setGoals] = useState([]);
  const [goalForm, setGoalForm] = useState(INITIAL_GOAL_FORM);
  const [submittingGoal, setSubmittingGoal] = useState(false);
  const [goalError, setGoalError] = useState("");

  useEffect(() => {
    emotionService
      .getMyStreak()
      .then(setStreak)
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    goalService.getMyGoals().then(setGoals).catch(() => setGoals([]));
  }, []);

  async function handleGoalSubmit(e) {
    e.preventDefault();
    setGoalError("");
    setSubmittingGoal(true);
    try {
      const created = await goalService.createGoal({ ...goalForm, targetDate: goalForm.targetDate || undefined });
      setGoals((prev) => [created, ...prev]);
      setGoalForm(INITIAL_GOAL_FORM);
    } catch (err) {
      setGoalError(err.response?.data?.message || "เพิ่มเป้าหมายไม่สำเร็จ");
    } finally {
      setSubmittingGoal(false);
    }
  }

  async function handleSaveGoal(id, payload) {
    const updated = await goalService.updateGoal(id, payload);
    setGoals((prev) => prev.map((g) => (g._id === id ? updated : g)));
  }

  async function handleDeleteGoal(id) {
    if (!window.confirm("ลบเป้าหมายนี้?")) return;
    await goalService.deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g._id !== id));
  }

  const pageHeader = <PageHeader icon={Award} eyebrow="Keep growing" backTo={"/dashboard"} backLabel="หน้าหลัก" description="ดูต้นไม้ของคุณ ภารกิจวันนี้ และเป้าหมายที่กำลังไปให้ถึง">{"ความก้าวหน้าและรางวัล"}</PageHeader>;

  if (loadError) return <div className="streak-page">{pageHeader}<AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;

  if (loading) {
    return (
      <div className="streak-page">
      {pageHeader}
        <div className="streak-loading"><AsyncState /></div>
      </div>
    );
  }

  if (!streak) {
    return (
      <div className="streak-page">
      {pageHeader}
        <p className="streak-loading">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</p>
      </div>
    );
  }

  const stage = streakToStage(streak.currentStreak);

  return (
    <div className="streak-page">
      {pageHeader}

      <section className="streak-hero">
        <div className="streak-hero-plant"><PlantGrowth streak={streak.currentStreak} size={170} /></div>
        <div className="streak-hero-copy">
          <p className="streak-hero-eyebrow">ต้นไม้ของคุณตอนนี้</p>
          <h2 className="page-context-title">{stageLabel(stage)}</h2>
          <p>
            {streak.currentStreak > 0
              ? `เช็คอินต่อเนื่องมาแล้ว ${streak.currentStreak} วัน — เก็บสถิติไว้ให้ต้นไม้ของคุณเติบโตต่อไป`
              : "เริ่มเช็คอินวันนี้เพื่อปลูกต้นไม้ต้นแรกของคุณ"}
          </p>
          {!streak.loggedToday && (
            <Link to="/dashboard" className="ui-btn ui-btn-primary">
              เช็คอินวันนี้
            </Link>
          )}
        </div>
        <div className="streak-stats">
          <div className="streak-stat-card">
            <Flame size={18} />
            <span className="streak-stat-value">{streak.currentStreak}</span>
            <span className="streak-stat-label">วันติดต่อกัน</span>
          </div>
          <div className="streak-stat-card">
            <Award size={18} />
            <span className="streak-stat-value">{streak.longestStreak}</span>
            <span className="streak-stat-label">สถิติสูงสุด</span>
          </div>
          <div className="streak-stat-card">
            <CalendarCheck size={18} />
            <span className="streak-stat-value">{streak.totalCheckIns}</span>
            <span className="streak-stat-label">เช็คอินทั้งหมด</span>
          </div>
        </div>
      </section>

      <div className="streak-layout">
        <div className="streak-main">
          <section className="ui-card streak-activities" id="daily-activities">
            <ActivityMissionBoard />
          </section>

          <MissionBoard />

          <section className="ui-card streak-goals">
            <div className="ui-card-head">
              <div>
                <h2 className="streak-goals-heading">เป้าหมายของฉัน</h2>
                <p>ตั้งเป้าหมายระยะสั้นและระยะยาว แล้วอัปเดตความคืบหน้าของตัวเองได้ตลอดเวลา</p>
              </div>
              <Target size={18} aria-hidden="true" />
            </div>

            <form className="streak-goals-form" onSubmit={handleGoalSubmit}>
              <div className="streak-goals-form-grid">
                <label className="ui-field">
                  ชื่อเป้าหมาย
                  <input
                    type="text"
                    value={goalForm.title}
                    onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </label>
                <label className="ui-field">
                  ระยะเวลา
                  <select value={goalForm.term} onChange={(e) => setGoalForm((f) => ({ ...f, term: e.target.value }))}>
                    <option value="short">ระยะสั้น</option>
                    <option value="long">ระยะยาว</option>
                  </select>
                </label>
                <label className="ui-field">
                  เป้าหมายภายในวันที่ (ถ้ามี)
                  <input
                    type="date"
                    value={goalForm.targetDate}
                    onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))}
                  />
                </label>
              </div>
              <label className="ui-field streak-goals-form-description">
                รายละเอียดเพิ่มเติม
                <textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </label>
              {goalError && <p className="streak-goals-error">{goalError}</p>}
              <button type="submit" className="ui-btn ui-btn-primary" disabled={submittingGoal}>
                <Plus size={16} />
                <span>{submittingGoal ? "กำลังเพิ่ม..." : "เพิ่มเป้าหมาย"}</span>
              </button>
            </form>

            {goals.length === 0 ? (
              <p className="streak-goals-empty">ยังไม่มีเป้าหมาย</p>
            ) : (
              <ul className="goals-list">
                {goals.map((goal) => (
                  <GoalCard key={goal._id} goal={goal} onSave={handleSaveGoal} onDelete={handleDeleteGoal} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="streak-side">
          <PointsSummary />
          <CheckinCalendar history={streak.history} />
          <Link to="/games" className="ui-card streak-games-link">
            <span className="streak-games-icon" aria-hidden="true"><Gamepad2 size={20} /></span>
            <span className="streak-games-copy">
              <strong>พักสักนิด มาเล่นกัน</strong>
              <small>เกมสั้น ๆ ฝึกทักษะและรับ XP</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
          <Link to="/weekly-checkin" className="ui-card streak-games-link">
            <span className="streak-games-icon is-weekly" aria-hidden="true"><ClipboardList size={20} /></span>
            <span className="streak-games-copy">
              <strong>แบบประเมินรายสัปดาห์</strong>
              <small>ใช้เวลาไม่ถึงนาที</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

export default Streak;
