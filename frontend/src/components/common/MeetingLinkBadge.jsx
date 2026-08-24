import { ExternalLink, Video } from "lucide-react";
import { MEETING_PLATFORM_LABELS, MEETING_PLATFORM_COLORS } from "../../constants/meetingPlatform.js";
import "./MeetingLinkBadge.css";

function MeetingLinkBadge({ link, platform }) {
  if (!link) return null;
  const label = MEETING_PLATFORM_LABELS[platform] || MEETING_PLATFORM_LABELS.other;
  const color = MEETING_PLATFORM_COLORS[platform] || MEETING_PLATFORM_COLORS.other;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="meeting-link-badge"
      style={{ "--meeting-color": color }}
    >
      <Video size={15} />
      <span>{label}</span>
      <ExternalLink size={13} />
    </a>
  );
}

export default MeetingLinkBadge;
