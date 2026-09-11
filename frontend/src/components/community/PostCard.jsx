import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Flag, Heart, Lock, MessageSquare, Pencil, Trash2 } from "lucide-react";
import * as postService from "../../services/postService.js";
import "./PostCard.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

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
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content || "");
  const [tagsInput, setTagsInput] = useState((post.tags || []).join(", "));
  const [commentsEnabled, setCommentsEnabled] = useState(post.commentsEnabled !== false);
  const [saving, setSaving] = useState(false);
  const [flagged, setFlagged] = useState(Boolean(post.needsReview));

  const isOwner = post.user?._id === currentUserId;
  const isStaffAuthor = post.user?.role === "counsellor" || post.user?.role === "admin";
  const isLongContent = (post.content || "").length > 180;

  function startEdit() {
    setContent(post.content || "");
    setTagsInput((post.tags || []).join(", "));
    setCommentsEnabled(post.commentsEnabled !== false);
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onUpdated(post._id, { content, tags, commentsEnabled });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("ลบโพสต์นี้?")) return;
    await onDeleted(post._id);
  }

  async function handleFlag() {
    if (flagged || !window.confirm("รายงานเนื้อหาโพสต์นี้ให้เจ้าหน้าที่ตรวจสอบ?")) return;
    await postService.flagPost(post._id);
    setFlagged(true);
  }

  return (
    <li className={`post-card${selected ? " post-card-selected" : ""}`}>
      <div className="post-card-header">
        {isStaffAuthor ? (
          <Link to={`/community/staff/${post.user._id}`} className="post-card-avatar">
            {post.user?.avatarUrl ? <img src={post.user.avatarUrl} alt="" /> : initials(post.user?.name)}
          </Link>
        ) : (
          <span className="post-card-avatar">
            {post.user?.avatarUrl ? <img src={post.user.avatarUrl} alt="" /> : initials(post.user?.name)}
          </span>
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

      <div className="post-card-footer">
        <button
          type="button"
          className={`post-card-like-button${post.likedByMe ? " liked" : ""}`}
          onClick={() => onLike(post._id)}
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
            onClick={handleFlag}
            disabled={flagged}
            aria-label={flagged ? "รายงานแล้ว" : "รายงานเนื้อหา"}
            title={flagged ? "รายงานแล้ว รอเจ้าหน้าที่ตรวจสอบ" : "รายงานเนื้อหา"}
          >
            <Flag size={15} fill={flagged ? "currentColor" : "none"} />
          </button>
        )}
      </div>
    </li>
  );
}

export default PostCard;
