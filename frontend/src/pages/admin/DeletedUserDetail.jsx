import PageHeader from "../../components/common/PageHeader.jsx";
import AsyncState from "../../components/common/AsyncState.jsx";
import Avatar from "../../components/common/Avatar.jsx";
import useConfirmDialog from "../../components/common/useConfirmDialog.jsx";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, RotateCcw } from "lucide-react";
import * as userService from "../../services/userService.js";
import { ROLE_LABELS } from "../../constants/roleLabels.js";
import { happinessByLevel } from "../../constants/happiness.js";
import { COUNSELLING_STATUS_LABELS } from "../../constants/counsellingStatus.js";
import "./Users.css";
import "./DeletedUsers.css";

const DATE = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const RISK_LABELS = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง" };
const AUDIT_LABELS = {
  "account.deleted": "ลบบัญชี",
  "account.restored": "กู้คืนบัญชี",
  "account.anonymized": "ทำให้ไม่ระบุตัวตน",
  "deleted-account.viewed": "เปิดดูข้อมูล",
};
const PROFILE_FIELDS = [["email", "อีเมล"], ["phone", "โทรศัพท์"], ["province", "จังหวัด"], ["age", "อายุ"], ["gender", "เพศ"], ["address", "ที่อยู่"]];

function Section({ title, children }) {
  return (
    <section className="ui-card deleted-user-section">
      <div className="ui-card-head"><h2>{title}</h2></div>
      {children}
    </section>
  );
}

function DeletedUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const { confirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    // Opening this page is recorded in the audit log by the server, once per visit.
    userService
      .getDeletedUser(userId)
      .then(setData)
      .catch(setLoadError);
  }, [userId]);

  function handleRestore() {
    confirm({
      title: "กู้คืนบัญชี",
      message: `ต้องการกู้คืนบัญชีของ "${data.user.name}" ใช่ไหม? เจ้าของบัญชีจะเข้าสู่ระบบได้อีกครั้ง แต่คำขอปรึกษาที่ถูกยกเลิก การเชื่อมต่อครอบครัวที่ถูกยกเลิก และประกาศงานที่ถูกปิดตอนลบ จะไม่กลับมาเอง`,
      confirmLabel: "กู้คืนบัญชี",
      onConfirm: async () => {
        await userService.restoreDeletedUser(userId);
        navigate(`/admin/users/${userId}`);
      },
    });
  }

  if (loadError) {
    return <div className="deleted-user-detail"><AsyncState error title={loadError.response?.status === 404 ? "ไม่พบบัญชีที่ถูกลบนี้" : undefined} description={loadError.response?.data?.message} onRetry={() => window.location.reload()} /></div>;
  }
  if (!data) {
    return <div className="deleted-user-detail"><AsyncState /></div>;
  }

  const { user, history, anonymized } = data;
  const deletedBy = data.deletedBySelf ? "เจ้าของบัญชีเอง" : (data.auditTrail.find((entry) => entry.action === "account.deleted")?.actor?.name || "ผู้ดูแลระบบ");

  return (
    <div className="deleted-user-detail">
      <PageHeader icon={Archive} backTo="/admin/deleted-users" backLabel="บัญชีที่ถูกลบ" description={<>{ROLE_LABELS[user.role]}{!anonymized && <> · {user.email}</>}</>}>
        {user.name}
      </PageHeader>

      <p className={`deleted-user-banner${anonymized ? "" : " is-retained"}`}>
        <span>
          <strong>ลบเมื่อ {DATE.format(new Date(user.deletedAt))} โดย {deletedBy}</strong>
          {anonymized
            ? `ถูกทำให้ไม่ระบุตัวตนแล้วเมื่อ ${DATE.format(new Date(user.anonymizedAt))} จึงไม่มีข้อมูลส่วนบุคคลเหลืออยู่และกู้คืนไม่ได้`
            : `จะถูกทำให้ไม่ระบุตัวตนในวันที่ ${DATE.format(new Date(data.anonymizeOn))} (อีก ${data.daysLeft} วัน) หน้านี้ดูได้อย่างเดียว การเปิดดูถูกบันทึกไว้ในประวัติการเข้าถึง`}
          {user.deletionReason && !anonymized && <><br />เหตุผล: {user.deletionReason}</>}
        </span>
        {!anonymized && (
          <button type="button" className="ui-btn ui-btn-primary" onClick={handleRestore}>
            <RotateCcw size={15} aria-hidden="true" />กู้คืนบัญชี
          </button>
        )}
      </p>
      {confirmDialog}

      {!anonymized && (
        <Section title="ข้อมูลบัญชี">
          <div className="users-info">
            <Avatar user={user} size={52} />
            <dl className="profile-facts">
              {PROFILE_FIELDS.filter(([key]) => user[key]).map(([key, label]) => (
                <div key={key}><dt>{label}</dt><dd>{user[key]}</dd></div>
              ))}
            </dl>
          </div>
        </Section>
      )}

      {history && (
        <>
          <Section title="สิ่งที่เก็บไว้">
            <p className="deleted-user-counts">
              <span>บันทึกอารมณ์ {history.emotionLogs.length} รายการล่าสุด</span>
              <span>คำขอปรึกษา {history.sessions.length}</span>
              <span>ผลประเมินความเสี่ยง {history.riskAssessments.length}</span>
              <span>เหตุการณ์เสี่ยง {history.riskSituations.length}</span>
              <span>เช็กอินรายสัปดาห์ {history.weeklyCheckIns.length}</span>
              <span>การเชื่อมต่อครอบครัว {history.familyLinkCount}</span>
              <span>ใบสมัครงาน {history.applicationCount}</span>
            </p>
          </Section>

          {history.rehabRecords.length > 0 && (
            <Section title="ประวัติการบำบัด">
              <ul>
                {history.rehabRecords.map((record) => (
                  <li key={record._id}>
                    {record.hospitalName} · {record.status === "ongoing" ? "กำลังบำบัด" : "สำเร็จแล้ว"}
                    <small>{record.startDate && DATE.format(new Date(record.startDate))}{record.endDate && ` – ${DATE.format(new Date(record.endDate))}`}</small>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {history.riskAssessments.length > 0 && (
            <Section title="ผลประเมินความเสี่ยง">
              <ul>
                {history.riskAssessments.map((assessment) => (
                  <li key={assessment._id}>
                    ระดับ {RISK_LABELS[assessment.level] || assessment.level} · คะแนน {assessment.riskScore}
                    <small>{DATE_TIME.format(new Date(assessment.createdAt))}{assessment.triggerFactors && ` · ${assessment.triggerFactors}`}</small>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {history.sessions.length > 0 && (
            <Section title="คำขอปรึกษา">
              <ul>
                {history.sessions.map((session) => (
                  <li key={session._id}>
                    <strong>{session.topic}</strong> · {COUNSELLING_STATUS_LABELS[session.status] || session.status}
                    <small>{DATE_TIME.format(new Date(session.createdAt))}{session.counsellor && ` · ผู้ดูแล ${session.counsellor.name}`}</small>
                    <details>
                      <summary>ข้อความและบันทึกผล ({session.messages.length} ข้อความ)</summary>
                      <div className="deleted-user-chat">
                        <p>{session.message}</p>
                        {session.messages.map((message, index) => (
                          <p key={message._id || index}><b>{message.senderRole === "user" ? "ผู้ใช้" : "ผู้ให้คำปรึกษา"}:</b> {message.content}</p>
                        ))}
                        {session.outcome?.summary && <p><b>สรุปผล:</b> {session.outcome.summary}</p>}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {history.riskSituations.length > 0 && (
            <Section title="เหตุการณ์เสี่ยงที่พบจริง">
              <ul>
                {history.riskSituations.map((log) => (
                  <li key={log._id}>
                    {log.situation}
                    <small>{log.occurredAt && DATE.format(new Date(log.occurredAt))} · {log.outcome}</small>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {history.weeklyCheckIns.length > 0 && (
            <Section title="เช็กอินรายสัปดาห์">
              <ul>
                {history.weeklyCheckIns.map((checkIn) => (
                  <li key={checkIn._id}>
                    {checkIn.isoWeekKey} · ความเครียด {checkIn.stressLevel}/5{checkIn.selfHarmRiskFlag && " · รายงานความเสี่ยงทำร้ายตนเอง"}
                    {checkIn.notes && <small>{checkIn.notes}</small>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {history.emotionLogs.length > 0 && (
            <Section title="บันทึกอารมณ์">
              <ul>
                {history.emotionLogs.map((log) => (
                  <li key={log._id}>
                    {log.dateKey} · {happinessByLevel(log.happinessLevel)?.label || log.happinessLevel}
                    {log.cravingLevel != null && ` · ความอยาก ${log.cravingLevel}/10`}
                    {log.note && <small>{log.note}</small>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      <Section title="ประวัติการเข้าถึงและการเปลี่ยนแปลง">
        <ul>
          {data.auditTrail.map((entry) => (
            <li key={entry._id}>
              {AUDIT_LABELS[entry.action] || entry.action}
              <small>{DATE_TIME.format(new Date(entry.createdAt))} · {entry.actor?.name || (entry.action === "account.anonymized" ? "ระบบ (อัตโนมัติ)" : "เจ้าของบัญชี")}</small>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export default DeletedUserDetail;
