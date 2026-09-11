import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardList } from "lucide-react";
import * as weeklyCheckInService from "../../services/weeklyCheckInService.js";
import { getIsoWeekKey } from "../../utils/isoWeek.js";
import "./WeeklyCheckInWidget.css";

function WeeklyCheckInWidget() {
  const [doneThisWeek, setDoneThisWeek] = useState(null);

  useEffect(() => {
    weeklyCheckInService
      .getMyWeeklyCheckIns()
      .then((history) => {
        const thisWeekKey = getIsoWeekKey();
        setDoneThisWeek(history.some((entry) => entry.isoWeekKey === thisWeekKey));
      })
      .catch(() => setDoneThisWeek(null));
  }, []);

  if (doneThisWeek === null) return null;

  return (
    <Link to="/weekly-checkin" className={`weekly-checkin-widget${doneThisWeek ? " done" : ""}`}>
      {doneThisWeek ? <CheckCircle2 size={20} /> : <ClipboardList size={20} />}
      <span>
        {doneThisWeek
          ? "ทำแบบประเมินรายสัปดาห์แล้ว — ดูประวัติ"
          : "ยังไม่ได้ทำแบบประเมินสภาพจิตใจสัปดาห์นี้"}
      </span>
    </Link>
  );
}

export default WeeklyCheckInWidget;
