import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageSquare, Users } from "lucide-react";
import * as postService from "../../services/postService.js";
import "./CommunityPreviewWidget.css";

function initials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "?";
}

function CommunityPreviewWidget() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postService
      .getPosts()
      .then((posts) => setPost(posts[0] || null))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Link to="/community" className="community-widget">
      <div className="community-widget-icon">
        <Users size={20} />
      </div>
      <div className="community-widget-body">
        <h2>ชุมชนฟื้นฟู</h2>
        {loading ? (
          <p className="community-widget-loading">กำลังโหลด...</p>
        ) : !post ? (
          <p className="community-widget-empty">ยังไม่มีโพสต์ในชุมชนตอนนี้</p>
        ) : (
          <>
            <div className="community-widget-author">
              <span className="community-widget-avatar">
                {post.user?.avatarUrl ? <img src={post.user.avatarUrl} alt="" /> : initials(post.user?.name)}
              </span>
              <span className="community-widget-name">{post.user?.name}</span>
            </div>
            <p className="community-widget-content">{post.content}</p>
            <div className="community-widget-meta">
              <span>
                <Heart size={13} fill={post.likedByMe ? "currentColor" : "none"} />
                {post.likes}
              </span>
              <span>
                <MessageSquare size={13} />
                {post.commentCount ?? 0}
              </span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

export default CommunityPreviewWidget;
