import PageHeader from "../../components/common/PageHeader.jsx";
import { ListTodo } from "lucide-react";
import ActivityMissionManager from "../../components/missions/ActivityMissionManager.jsx";
import "./ActivityMissionManagement.css";

// ภารกิจประจำวันถูกจัดการโดยทั้งผู้ให้คำปรึกษาและแอดมินผ่านตัวจัดการเดียวกัน
// จึงมีที่เดียวสำหรับสร้าง แก้ไข ปิด และลบ
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
