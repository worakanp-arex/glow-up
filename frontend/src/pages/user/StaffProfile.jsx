import AsyncState from "../../components/common/AsyncState.jsx";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Stethoscope } from "lucide-react";
import * as userService from "../../services/userService.js";
import "./StaffProfile.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function StaffProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    userService
      .getPublicProfile(id)
      .then(setProfile)
      .catch((err) => setError(err.response?.data?.message || "ไม่สามารถโหลดข้อมูลได้"))
      .catch((error) => setLoadError(error))
      .finally(() => setLoading(false));
  }, [id]);

  if (loadError) return <AsyncState error description={loadError.response?.data?.message} onRetry={() => window.location.reload()} />;

  if (loading) return <div className="staff-profile-page"><AsyncState /></div>;
  if (error || !profile) return <div className="staff-profile-page">{error || "ไม่พบข้อมูล"}</div>;

  return (
    <div className="staff-profile-page">
      <Link to="/community" className="staff-profile-back">
        <ArrowLeft size={16} />
        กลับไปหน้าชุมชน
      </Link>

      <div className="staff-profile-header">
        <span className="staff-profile-avatar">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initials(profile.name)}
        </span>
        <div>
          <h1>{profile.name}</h1>
          <span className="post-card-staff-badge">บุคลากรทางการแพทย์</span>
        </div>
      </div>

      <div className="staff-profile-details">
        <p>
          <Stethoscope size={16} />
          <span>ความเชี่ยวชาญ: {profile.specialization || "ไม่ระบุ"}</span>
        </p>
        <p>
          <Building2 size={16} />
          <span>สังกัด: {profile.hospital || "ไม่ระบุ"}</span>
        </p>
      </div>
    </div>
  );
}

export default StaffProfile;
