import { Link } from "react-router-dom";
import { Briefcase, GraduationCap, MapPin, Paperclip, Wallet } from "lucide-react";
import Avatar from "../common/Avatar.jsx";
import StatusBadge from "../common/StatusBadge.jsx";
import "./employer.css";

// One applicant in a list, with enough personal detail to decide whether to
// open the full application: name, age/gender/province, education, a short bio.
export default function ApplicantRow({ application, showJob = false }) {
  const { user, match, job } = application;
  const facts = [user.age ? `อายุ ${user.age} ปี` : null, user.gender || null].filter(Boolean);
  return (
    <li className="ui-card employer-applicant-row">
      <Link to={`/employer/applications/${application._id}`} className="employer-applicant-main">
        <Avatar user={user} size={52} />
        <span className="employer-applicant-text">
          <span className="employer-applicant-name">
            {user.name}
            {user.nickname && <small> ({user.nickname})</small>}
          </span>
          {showJob && job?.title && (
            <span className="employer-applicant-jobbox">
              <span className="employer-applicant-job"><Briefcase size={12} aria-hidden="true" />สมัครตำแหน่ง: {job.title}</span>
              {(job.location || job.salary > 0) && (
                <span className="employer-applicant-jobfacts">
                  {job.location && <span><MapPin size={12} aria-hidden="true" />{job.location}</span>}
                  {job.salary > 0 && <span><Wallet size={12} aria-hidden="true" />{job.salary.toLocaleString()} บาท/เดือน</span>}
                </span>
              )}
              {job.description && <span className="employer-applicant-jobdesc">{job.description}</span>}
            </span>
          )}
          <span className="employer-applicant-facts">
            {facts.length > 0 && <span>{facts.join(" · ")}</span>}
            {user.province && <span><MapPin size={12} aria-hidden="true" />{user.province}</span>}
            {user.education && <span><GraduationCap size={12} aria-hidden="true" />{user.education}</span>}
            {application.attachments?.length > 0 && <span><Paperclip size={12} aria-hidden="true" />{application.attachments.length} ไฟล์แนบ</span>}
          </span>
          {user.bio && <span className="employer-applicant-bio">{user.bio}</span>}
        </span>
      </Link>
      <div className="employer-applicant-side">
        <span className="employer-applicant-match">{match ? `ทักษะตรง ${match.score}% (${match.matchedSkills.length}/${match.totalSkills})` : "งานนี้ไม่ได้ระบุทักษะ"}</span>
        <StatusBadge status={application.status} />
      </div>
    </li>
  );
}
