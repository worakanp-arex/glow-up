import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageSquare, Pencil, Trash2 } from "lucide-react";
import "./PostCard.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function PostCard({ post, currentUserId, onLike, onUpdated, onDeleted, linkToDetail = true }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content || "");
  const [tagsInput, setTagsInput] = useState((post.tags || []).join(", "));
  const [saving, setSaving] = useState(false);

  const isOwner = post.user?._id === currentUserId;

  function startEdit() {
    setContent(post.content || "");
    setTagsInput((post.tags || []).join(", "));
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
      await onUpdated(post._id, { content, tags });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("ลบโพสต์นี้?")) return;
    await onDeleted(post._id);
  }

  return (
    <li className="post-card">
      <div className="post-card-header">
        <span className="post-card-avatar">
          {post.user?.avatarUrl ? <img src={post.user.avatarUrl} alt="" /> : initials(post.user?.name)}
        </span>
        <div className="post-card-author-block">
          <p className="post-card-author">{post.user?.name}</p>
          <p className="post-card-date">{new Date(post.createdAt).toLocaleDateString("th-TH")}</p>
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

      {editing ? (
        <form className="post-card-edit-form" onSubmit={handleSave}>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} required />
          <input
            type="text"
            placeholder="แท็ก คั่นด้วยจุลภาค เช่น กำลังใจ, หางาน"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          <div className="post-card-edit-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
              ยกเลิก
            </button>
          </div>
        </form>
      ) : linkToDetail ? (
        <Link to={`/community/${post._id}`} className="post-card-content-link">
          <p className="post-card-content">{post.content}</p>
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
        {linkToDetail ? (
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
      </div>
    </li>
  );
}

export default PostCard;
