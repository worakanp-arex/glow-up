import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Flag, Heart, Lock, MessageSquare, Pencil, Trash2 } from "lucide-react";
import * as postService from "../../services/postService.js";
import { AUDIENCE_ROLES, AUDIENCE_LABEL_BY_VALUE } from "../../constants/postAudience.js";
import { REPORT_REASONS } from "../../constants/reportReasons.js";
import useConfirmDialog from "../common/useConfirmDialog.jsx";
import Avatar from "../common/Avatar.jsx";
import "./PostCard.css";

function PostCard({
  post,
  currentUserId,
  onLike,
  onToggleSave,
  onUpdated,
  onDeleted,
  onSelect,
  selected = false,
  linkToDetail = true,
}) {
  const likePending = useRef(false);
  const [liking, setLiking] = useState(false);
  const [actionError, setActionError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content || "");
  const [tagsInput, setTagsInput] = useState((post.tags || []).join(", "));
  const [commentsEnabled, setCommentsEnabled] = useState(post.commentsEnabled !== false);
  const [visibleToRoles, setVisibleToRoles] = useState(post.visibleToRoles || []);
  const [saving, setSaving] = useState(false);
  // "Reported" is per person: only the people who reported it see it as reported.
  const [flagged, setFlagged] = useState(Boolean(post.reportedByMe));

  const isOwner = post.user?._id === currentUserId;
  const isStaffAuthor = post.user?.role === "counsellor" || post.user?.role === "admin";
  const isLongContent = (post.content || "").length > 180;

  function startEdit() {
    setContent(post.content || "");
    setTagsInput((post.tags || []).join(", "));
    setCommentsEnabled(post.commentsEnabled !== false);
    setVisibleToRoles(post.visibleToRoles || []);
    setEditing(true);
  }

  function toggleAudienceRole(role) {
    setVisibleToRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onUpdated(post._id, { content, tags, commentsEnabled, visibleToRoles });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const { confirm, confirmDialog } = useConfirmDialog();

  function handleDelete() {
    confirm({
      title: "ลบโพสต์",
      message: "ต้องการลบโพสต์นี้ใช่ไหม? การลบไม่สามารถย้อนกลับได้",
      confirmLabel: "ลบโพสต์",
      onConfirm: () => onDeleted(post._id),
    });
  }

  async function handleLike() {
    if (likePending.current) return;
    likePending.current = true;
    setLiking(true);
    setActionError("");
    try { await onLike(post._id, !post.likedByMe); }
    catch { setActionError("ส่งกำลังใจไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { likePending.current = false; setLiking(false); }
  }

  async function handleFlag() {
    setReportBusy(true);
    setReportError("");
    try {
      await postService.flagPost(post._id, { reason: reportReason, detail: reportDetail.trim() || undefined });
      setFlagged(true);
      setReportOpen(false);
    } catch (err) { setReportError(err.response?.data?.message || "รายงานไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setReportBusy(false); }
  }

  function openReport() {
    setReportReason("");
    setReportDetail("");
    setReportError("");
    setReportOpen(true);
  }

  return (
    <li className={`post-card${selected ? " post-card-selected" : ""}`}>
      <div className="post-card-header">
        {isStaffAuthor ? (
          <Link to={`/community/staff/${post.user._id}`} className="post-card-avatar" aria-label={post.user?.name}>
            <Avatar user={post.user} size={44} />
          </Link>
        ) : (
          <span className="post-card-avatar"><Avatar user={post.user} size={44} /></span>
        )}
        <div className="post-card-author-block">
          <p className="post-card-author">
            {isStaffAuthor ? (
              <Link to={`/community/staff/${post.user._id}`} className="post-card-author-name post-card-author-link">
                {post.user?.name}
              </Link>
            ) : (
              <span className="post-card-author-name">{post.user?.name}</span>
            )}
            {isStaffAuthor && <span className="post-card-staff-badge">บุคลากรทางการแพทย์</span>}
          </p>
          <p className="post-card-date">{new Date(post.createdAt).toLocaleDateString("th-TH")}</p>
        </div>

        {isOwner && !editing && (
          <div className="post-card-owner-actions">
            <button type="button" onClick={startEdit} aria-label="แก้ไขโพสต์">
              <Pencil size={14} />
            </button>
            <button type="button" onClick={handleDelete} aria-label="ลบโพสต์">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {post.visibleToRoles?.length > 0 && (
        <p className="post-card-audience-badge">
          เห็นเฉพาะ: {post.visibleToRoles.map((role) => AUDIENCE_LABEL_BY_VALUE[role] || role).join(", ")}
        </p>
      )}

      {post.tags?.length > 0 && (
        <div className="post-card-tags">
          {post.tags.map((tag) => (
            <span key={tag} className="post-card-tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {editing ? (
        <form className="post-card-edit-form" onSubmit={handleSave}>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} required />
          <input
            type="text"
            placeholder="แท็ก คั่นด้วยจุลภาค เช่น กำลังใจ, หางาน"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          <label className="post-card-comments-toggle">
            <input
              type="checkbox"
              checked={commentsEnabled}
              onChange={(e) => setCommentsEnabled(e.target.checked)}
            />
            <span>เปิดให้แสดงความคิดเห็น</span>
          </label>
          {isStaffAuthor && (
            <div className="post-card-audience-edit">
              <span className="post-card-audience-edit-label">ใครเห็นโพสต์นี้ได้บ้าง</span>
              <label className="post-card-comments-toggle">
                <input type="checkbox" checked={visibleToRoles.length === 0} onChange={() => setVisibleToRoles([])} />
                <span>ทุกคน</span>
              </label>
              {AUDIENCE_ROLES.map(({ value, label }) => (
                <label key={value} className="post-card-comments-toggle">
                  <input
                    type="checkbox"
                    checked={visibleToRoles.includes(value)}
                    onChange={() => toggleAudienceRole(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
          <div className="post-card-edit-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
              ยกเลิก
            </button>
          </div>
        </form>
      ) : onSelect ? (
        <button
          type="button"
          className="post-card-content-link post-card-content-button"
          onClick={() => onSelect(post._id)}
        >
          <p className="post-card-content">{post.content}</p>
          {isLongContent && <span className="post-card-read-more">อ่านเพิ่มเติม →</span>}
        </button>
      ) : linkToDetail ? (
        <Link to={`/community/${post._id}`} className="post-card-content-link">
          <p className="post-card-content">{post.content}</p>
          {isLongContent && <span className="post-card-read-more">อ่านเพิ่มเติม →</span>}
        </Link>
      ) : (
        <p className="post-card-content">{post.content}</p>
      )}

      {actionError && <p role="alert" className="dialog-error">{actionError}</p>}
      <div className="post-card-footer">
        <button
          type="button"
          className={`post-card-like-button${post.likedByMe ? " liked" : ""}`}
          onClick={handleLike}
          disabled={liking}
          aria-pressed={Boolean(post.likedByMe)}
        >
          <Heart size={16} fill={post.likedByMe ? "currentColor" : "none"} />
          <span>{post.likes} กำลังใจ</span>
        </button>

        {post.commentsEnabled === false ? (
          <span className="post-card-comments-link post-card-comments-disabled">
            <Lock size={14} />
            <span>ปิดความคิดเห็น</span>
          </span>
        ) : onSelect ? (
          <button type="button" className="post-card-comments-link post-card-comments-button" onClick={() => onSelect(post._id)}>
            <MessageSquare size={16} />
            <span>{post.commentCount ?? 0} ความคิดเห็น</span>
          </button>
        ) : linkToDetail ? (
          <Link to={`/community/${post._id}`} className="post-card-comments-link">
            <MessageSquare size={16} />
            <span>{post.commentCount ?? 0} ความคิดเห็น</span>
          </Link>
        ) : (
          <span className="post-card-comments-link">
            <MessageSquare size={16} />
            <span>{post.commentCount ?? 0} ความคิดเห็น</span>
          </span>
        )}

        {onToggleSave && (
          <button
            type="button"
            className={`post-card-save-button${post.savedByMe ? " saved" : ""}`}
            onClick={() => onToggleSave(post._id)}
            aria-label={post.savedByMe ? "เลิกบันทึกโพสต์" : "บันทึกโพสต์"}
          >
            <Bookmark size={16} fill={post.savedByMe ? "currentColor" : "none"} />
          </button>
        )}

        {!isOwner && (
          <button
            type="button"
            className={`post-card-flag-button${flagged ? " flagged" : ""}`}
            onClick={openReport}
            disabled={flagged}
            aria-label={flagged ? "รายงานแล้ว" : "รายงานเนื้อหา"}
            title={flagged ? "รายงานแล้ว รอเจ้าหน้าที่ตรวจสอบ" : "รายงานเนื้อหา"}
          >
            <Flag size={15} fill={flagged ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      {flagged && <p className="post-report-status" role="status">รายงานแล้ว รอเจ้าหน้าที่ตรวจสอบ</p>}
      {confirmDialog}
      {post.needsReview && !flagged && <p className="post-report-status" role="status">โพสต์นี้ถูกรายงานและรอการตรวจสอบ ซ่อนจากผู้ใช้ทั่วไปไว้ชั่วคราว</p>}
      {reportOpen && (
        <ConfirmDialog title="รายงานเนื้อหา" confirmLabel="ส่งรายงาน" busy={reportBusy} error={reportError} confirmDisabled={!reportReason} onConfirm={handleFlag} onClose={() => setReportOpen(false)}>
          <p>โพสต์จะถูกซ่อนไว้ชั่วคราวระหว่างที่เจ้าหน้าที่ตรวจสอบ และคุณจะได้รับแจ้งผลเมื่อตรวจสอบเสร็จ</p>
          <label className="post-report-field">
            <span>รายงานเรื่องอะไร</span>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} required>
              <option value="">เลือกหัวข้อ</option>
              {REPORT_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
            </select>
          </label>
          <label className="post-report-field">
            <span>รายละเอียดเพิ่มเติม (ไม่บังคับ)</span>
            <textarea value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} rows={3} maxLength={500} placeholder="บอกเจ้าหน้าที่ว่าเนื้อหาส่วนไหนที่เป็นปัญหา" />
          </label>
        </ConfirmDialog>
      )}
    </li>
  );
}

export default PostCard;
