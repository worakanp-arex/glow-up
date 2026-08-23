import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import * as applicationService from "../../services/applicationService.js";
import StatusBadge from "../common/StatusBadge.jsx";
import "./ApplicationStatusCard.css";

const ACTIVE_STATUSES = new Set(["pending", "interview"]);

function ApplicationStatusCard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationService
      .getMyApplications()
      .then(setApplications)
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = applications.filter((app) => ACTIVE_STATUSES.has(app.status)).length;
  const latest = applications[0];

  return (
    <Link to="/my-applications" className="app-status-card">
      <div className="app-status-icon">
        <Briefcase size={20} />
      </div>
      <div className="app-status-body">
        <h2>ใบสมัครงานของฉัน</h2>
        {loading ? (
          <p className="app-status-loading">กำลังโหลด...</p>
        ) : applications.length === 0 ? (
          <p className="app-status-empty">ยังไม่มีใบสมัคร — เริ่มค้นหางานที่ใช่กันเลย</p>
        ) : (
          <>
            <p className="app-status-count">
              มี <strong>{activeCount}</strong> ใบสมัครที่กำลังดำเนินการ จากทั้งหมด {applications.length}
            </p>
            {latest && (
              <span className="app-status-latest">
                ล่าสุด: {latest.job?.title || "ตำแหน่งงาน"} <StatusBadge status={latest.status} />
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

export default ApplicationStatusCard;
