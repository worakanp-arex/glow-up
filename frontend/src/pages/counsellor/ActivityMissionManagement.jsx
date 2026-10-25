import PageHeader from "../../components/common/PageHeader.jsx";
import { ListTodo } from "lucide-react";
import ActivityMissionManager from "../../components/missions/ActivityMissionManager.jsx";
import "./ActivityMissionManagement.css";

// Daily missions are managed by both counsellors and admins through the same
// manager, so there is one place to create, edit, switch off and delete them.
function ActivityMissionManagement() {
  return (
    <div className="activity-mission-management-page">
      <PageHeader
        art="nurse"
        icon={ListTodo}
        eyebrow="Daily missions"
        description="เพิ่มและแก้ไขภารกิจประจำวันที่ผู้ใช้งานเลือกทำเองได้ กำหนดแต้ม ไอคอน และช่วงเวลาทำภารกิจ รวมถึงอนุมัติภารกิจที่ต้องตรวจสอบ"
      >
        จัดการภารกิจประจำวัน
      </PageHeader>
      <ActivityMissionManager />
    </div>
  );
}

export default ActivityMissionManagement;
