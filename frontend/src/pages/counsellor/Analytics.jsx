import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import StatTile from "../../components/common/StatTile.jsx";
import TrendChart from "../../components/counsellor/TrendChart.jsx";
import BarList from "../../components/counsellor/BarList.jsx";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BarChart3, CalendarClock, CheckCircle2, ShieldAlert, Trophy, XCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as overviewService from "../../services/overviewService.js";
import { COUNSELLING_STATUS_LABELS, COUNSELLING_STATUS_CLASS } from "../../constants/counsellingStatus.js";
import "./Analytics.css";

const TABS = [
  { key: "overview", label: "ภาพรวม" },
  { key: "activity", label: "ภารกิจและเกม" },
  { key: "exams", label: "บททดสอบ" },
  { key: "appointments", label: "นัดหมาย" },
];

const GAME_LABELS = { wheel: "วงล้อก้าวเล็ก ๆ", memory: "จับคู่ ดูแลใจ", quiz: "เลือกทางของคุณ (แบบทดสอบ)", breathing: "หายใจผ่อนคลาย 4-7-8", emotion: "ฝึกจดจำอารมณ์" };
const DAY_ROW = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "short" });
const DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });

function formatDayRow(dateKey) {
  return DAY_ROW.format(new Date(`${dateKey}T00:00:00+07:00`));
}

// เรียก `loader` ใหม่ทุกครั้งที่ `key` เปลี่ยน (fixture ของ Playwright
// ตอบ endpoint ที่ไม่รู้จักด้วย [] ซึ่งถือเป็น "ไม่มีข้อมูล")
function useLoad(loader, key) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const loaderRef = useRef(loader);
  useEffect(() => { loaderRef.current = loader; });
  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    loaderRef.current()
      .then((data) => { if (!cancelled) setState({ data: Array.isArray(data) ? null : data, error: null, loading: false }); })
      .catch((error) => { if (!cancelled) setState({ data: null, error, loading: false }); });
    return () => { cancelled = true; };
  }, [key]);
  return state;
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="counsellor-analytics-section">
      <h2><Icon size={16} aria-hidden="true" /><span>{title}</span></h2>
      {children}
    </section>
  );
}

function OverviewTab({ data }) {
  const { user } = useAuth();
  const leaderboard = data.leaderboard || [];
  // รายการความเสี่ยงรายบุคคลมีไว้สำหรับผู้ให้คำปรึกษาเท่านั้น แอดมินเห็นเป็นตัวเลข
  const riskLink = user.role === "counsellor" ? "/counsellor/overview/risk" : undefined;
  const byRole = data.activeUsers.byRole;
  // ทุกคนที่ล็อกอินนับรวมหมด คำใบ้บอกว่าแบ่งเป็นผู้ป่วย ครอบครัว และเจ้าหน้าที่อย่างไร
  const activeHint = byRole ? `ผู้ใช้ ${byRole.user} · ครอบครัว ${byRole.family} · บุคลากร ${byRole.counsellor + byRole.admin}${byRole.employer ? ` · นายจ้าง ${byRole.employer}` : ""}` : "กดเพื่อดูว่าเป็นใคร";
  return (
    <>
      <div className="counsellor-analytics-stat-grid">
        <StatTile label={`ใช้งานใน ${data.activeUsers.windowDays} วันล่าสุด`} value={data.activeUsers.count} tone="neutral" to="/counsellor/overview/active" hint={activeHint} />
        <StatTile label="ความเสี่ยงต่ำ" value={data.risk.byLevel.low} tone="good" />
        <StatTile label="ความเสี่ยงปานกลาง" value={data.risk.byLevel.medium} tone="warning" to={riskLink} hint={riskLink ? "กดเพื่อดูรายชื่อ" : undefined} />
        <StatTile label="ความเสี่ยงสูง" value={data.risk.byLevel.high} tone="critical" to={riskLink} hint={riskLink ? "กดเพื่อดูรายชื่อ" : undefined} />
        <StatTile label="นัดหมายวันนี้" value={data.appointments.today} tone="neutral" to="/counsellor/overview/appointments" hint="กดเพื่อดูรายการนัด" />
      </div>

      <Section icon={BarChart3} title="แนวโน้มการใช้งานรายวัน (14 วันล่าสุด)">
        {data.loginTrend.every((d) => d.count === 0) ? (
          <p className="counsellor-analytics-empty">ยังไม่มีข้อมูลการเข้าใช้งานในช่วงนี้</p>
        ) : (
          <TrendChart trend={data.loginTrend} days={14} />
        )}
      </Section>

      <Section icon={CalendarClock} title="นัดหมายรายวัน (7 วันข้างหน้า)">
        {data.appointments.byDay.length === 0 ? (
          <p className="counsellor-analytics-empty">ยังไม่มีนัดหมายในช่วงนี้</p>
        ) : (
          <ul className="counsellor-analytics-day-list">
            {data.appointments.byDay.map((d) => (
              <li key={d.dateKey}>
                <span>{formatDayRow(d.dateKey)}</span>
                <strong>{d.count} คน</strong>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={Trophy} title="อันดับผู้ใช้งานบ่อย (30 วันล่าสุด)">
        {leaderboard.length === 0 ? (
          <p className="counsellor-analytics-empty">ยังไม่มีข้อมูลเพียงพอสำหรับจัดอันดับ</p>
        ) : (
          <ol className="counsellor-analytics-leaderboard">
            {leaderboard.map((entry, index) => (
              <li key={entry.userId}>
                <span className="counsellor-analytics-rank">{index + 1}</span>
                <span className="counsellor-analytics-leaderboard-name">{entry.name}</span>
                <span className="counsellor-analytics-leaderboard-days">{entry.days} วัน</span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}

function ActivityTab({ days, setDays }) {
  const { data, error, loading } = useLoad(() => overviewService.getActivityOverview(days), days);
  return (
    <>
      <div className="counsellor-analytics-range" role="group" aria-label="ช่วงเวลา">
        {[7, 30, 90].map((value) => (
          <button key={value} type="button" aria-pressed={days === value} onClick={() => setDays(value)}>{value} วันล่าสุด</button>
        ))}
      </div>
      {error ? <AsyncState error description={error.response?.data?.message} onRetry={() => window.location.reload()} /> : loading || !data ? <AsyncState /> : (
        <>
          <Section icon={BarChart3} title="ภารกิจประจำวันที่คนทำมากที่สุด">
            <BarList
              items={data.topMissions.map((mission) => ({ key: mission.missionId, label: mission.title, value: mission.count, hint: `${mission.users} คนร่วมทำ` }))}
              unit="ครั้ง"
              emptyText="ยังไม่มีผู้ทำภารกิจประจำวันในช่วงนี้"
            />
          </Section>
          <Section icon={BarChart3} title="เกมที่ถูกเล่น">
            <BarList
              items={data.games.map((game) => ({ key: game.gameType, label: GAME_LABELS[game.gameType] || game.gameType, value: game.plays, hint: `${game.users} คนเล่น · ได้รับ ${game.points} แต้มรวม` }))}
              unit="ครั้ง"
              emptyText="ยังไม่มีการเล่นเกมในช่วงนี้"
            />
          </Section>
          <Section icon={BarChart3} title="บทเรียนสถานการณ์จำลอง (ทักษะปฏิเสธ)">
            {data.scenarios.length === 0 ? <p className="counsellor-analytics-empty">ยังไม่มีผู้ฝึกสถานการณ์จำลองในช่วงนี้</p> : (
              <ul className="counsellor-analytics-table">
                {data.scenarios.map((scenario) => (
                  <li key={scenario.scenarioId}>
                    <span className="counsellor-analytics-table-main"><strong>{scenario.title}</strong><small>{scenario.users} คนฝึก</small></span>
                    <span>{scenario.attempts} ครั้ง</span>
                    <span className="counsellor-analytics-pass">ผ่าน {scenario.passRate}%</span>
                    <Link to={`/counsellor/analytics?tab=exams&scenario=${scenario.scenarioId}`}>ดูคำตอบ</Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section icon={Trophy} title="ผู้ที่มีคะแนนสะสมสูงสุด">
            {data.topScorers.length === 0 ? <p className="counsellor-analytics-empty">ยังไม่มีข้อมูลคะแนน</p> : (
              <ol className="counsellor-analytics-leaderboard">
                {data.topScorers.map((entry, index) => (
                  <li key={entry.userId}>
                    <span className="counsellor-analytics-rank">{index + 1}</span>
                    <span className="counsellor-analytics-leaderboard-name"><Avatar user={entry} size={28} />{entry.name}</span>
                    <span className="counsellor-analytics-leaderboard-days">{entry.points.toLocaleString("th-TH")} แต้ม</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </>
      )}
    </>
  );
}

function ExamsTab({ days, scenario }) {
  const { data, error, loading } = useLoad(() => overviewService.getAttempts({ days, ...(scenario ? { scenario } : {}) }), `${days}-${scenario}`);
  if (error) return <AsyncState error description={error.response?.data?.message} onRetry={() => window.location.reload()} />;
  if (loading || !data) return <AsyncState />;
  return (
    <>
      {scenario && <p className="counsellor-analytics-filter">แสดงเฉพาะสถานการณ์ที่เลือก · <Link to="/counsellor/analytics?tab=exams">ดูทั้งหมด</Link></p>}
      {data.hidden > 0 && <p className="counsellor-analytics-note"><ShieldAlert size={14} aria-hidden="true" /><span>มี {data.hidden} รายการของผู้ใช้งานที่คุณไม่ได้ดูแล จึงไม่แสดงคำตอบ</span></p>}

      <Section icon={CheckCircle2} title={`ใครทำแบบฝึกสถานการณ์อะไร และตอบอะไร (${data.windowDays} วันล่าสุด)`}>
        {data.scenarioAttempts.length === 0 ? <p className="counsellor-analytics-empty">ไม่มีรายการในช่วงนี้</p> : (
          <ul className="counsellor-analytics-attempts">
            {data.scenarioAttempts.map((attempt) => (
              <li key={attempt._id}>
                <Avatar user={attempt.user} size={36} />
                <div className="counsellor-analytics-attempt-body">
                  <strong>{attempt.user.name}</strong>
                  <span className="counsellor-analytics-attempt-scenario">{attempt.scenario.title}</span>
                  <span>ตอบว่า: “{attempt.chosenText}”</span>
                  {!attempt.passed && attempt.correctText && <small>คำตอบที่เหมาะสม: {attempt.correctText}</small>}
                </div>
                <span className={`counsellor-analytics-result ${attempt.passed ? "is-pass" : "is-fail"}`}>
                  {attempt.passed ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}{attempt.passed ? "ผ่าน" : "ยังไม่ผ่าน"}
                </span>
                <small className="counsellor-analytics-attempt-date">{DATE.format(new Date(attempt.attemptedAt))}</small>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {!scenario && (
        <Section icon={Trophy} title="แบบทดสอบความรู้ประจำวัน (ในเกม)">
          {data.quizPlays.length === 0 ? <p className="counsellor-analytics-empty">ไม่มีผู้เล่นแบบทดสอบในช่วงนี้</p> : (
            <ul className="counsellor-analytics-attempts">
              {data.quizPlays.map((play) => (
                <li key={play._id}>
                  <Avatar user={play.user} size={36} />
                  <div className="counsellor-analytics-attempt-body">
                    <strong>{play.user.name}</strong>
                    <span>ตอบถูก {play.resultLabel}</span>
                  </div>
                  <span className="counsellor-analytics-result is-pass">+{play.pointsAwarded} แต้ม</span>
                  <small className="counsellor-analytics-attempt-date">{play.dateKey}</small>
                </li>
              ))}
            </ul>
          )}
          <p className="counsellor-analytics-note"><ShieldAlert size={14} aria-hidden="true" /><span>แบบทดสอบในเกมเก็บเฉพาะคะแนนรวมของแต่ละวัน ไม่เก็บรายข้อ</span></p>
        </Section>
      )}
    </>
  );
}

function AppointmentsTab({ days }) {
  const { data, error, loading } = useLoad(() => overviewService.getActivityOverview(days), days);
  if (error) return <AsyncState error description={error.response?.data?.message} onRetry={() => window.location.reload()} />;
  if (loading || !data) return <AsyncState />;
  const { byStatus, recent } = data.appointments;
  return (
    <>
      <div className="counsellor-analytics-stat-grid">
        <StatTile label="รอรับเคส" value={byStatus.pending} tone="warning" />
        <StatTile label="กำลังดำเนินการ" value={byStatus.active + byStatus.scheduled} tone="neutral" />
        <StatTile label="เข้ารับคำปรึกษาแล้ว (ปิดเคส)" value={byStatus.closed} tone="good" />
        <StatTile label="ยกเลิก" value={byStatus.cancelled} tone="neutral" />
      </div>
      <Section icon={CalendarClock} title={`ประวัติการเข้านัดหมาย (${data.windowDays} วันล่าสุด)`}>
        {recent.length === 0 ? <p className="counsellor-analytics-empty">ยังไม่มีนัดหมายที่ผ่านมาในช่วงนี้</p> : (
          <ul className="counsellor-analytics-table">
            {recent.map((session) => (
              <li key={session._id}>
                <span className="counsellor-analytics-table-main"><strong>{session.user?.name || "ผู้ใช้งาน"}</strong><small>{session.topic}</small></span>
                <span>{DATE.format(new Date(session.scheduledAt))}</span>
                <span>{session.counsellor?.name || "ยังไม่มีผู้ดูแล"}</span>
                <span className={`counselling-status-badge ${COUNSELLING_STATUS_CLASS[session.status] || ""}`}>{COUNSELLING_STATUS_LABELS[session.status] || session.status}</span>
                <Link to={`/counsellor/requests/${session._id}`}>ดูรายละเอียด</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some((item) => item.key === requested) ? requested : "overview";
  const scenario = searchParams.get("scenario") || "";
  const [days, setDays] = useState(30);
  const overview = useLoad(() => overviewService.getOverview(), "overview");

  const header = (
    <PageHeader art="nurse" icon={BarChart3} description={<>ข้อมูลสรุปการใช้งานของผู้ผ่านการบำบัด สำหรับบุคลากรทางการแพทย์</>}>ภาพรวมผู้ใช้งาน</PageHeader>
  );

  if (overview.error) return <div className="counsellor-analytics-page">{header}<AsyncState error description={overview.error.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  if (overview.loading) return <div className="counsellor-analytics-page">{header}<AsyncState /></div>;
  if (!overview.data) return <div className="counsellor-analytics-page">{header}ไม่สามารถโหลดข้อมูลภาพรวมได้</div>;

  return (
    <div className="counsellor-analytics-page">
      {header}

      <div className="ui-tabs" role="tablist" aria-label="ส่วนของภาพรวม">
        {TABS.map((item) => (
          <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className="ui-tab" onClick={() => setSearchParams(item.key === "overview" ? {} : { tab: item.key })}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab data={overview.data} />}
      {tab === "activity" && <ActivityTab days={days} setDays={setDays} />}
      {tab === "exams" && <ExamsTab days={Math.max(days, 30)} scenario={scenario} />}
      {tab === "appointments" && <AppointmentsTab days={Math.max(days, 30)} />}

      <p className="counsellor-analytics-note">
        <ShieldAlert size={14} />
        <span>
          &quot;จำนวนคนเสี่ยง&quot; นับเฉพาะผู้ที่เคยกดประเมินความเสี่ยงด้วยตนเองอย่างน้อยหนึ่งครั้ง
          ใช้เกณฑ์คำนวณอัตโนมัติแบบง่าย ไม่ใช่การวินิจฉัยทางการแพทย์
        </span>
      </p>
    </div>
  );
}

export default Analytics;
