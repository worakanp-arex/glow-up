import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ShieldAlert, Trash2 } from "lucide-react";
import * as postService from "../../services/postService.js";
import "./PostsModeration.css";

function PostsModeration() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    postService
      .getFlaggedPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }

  async function handleClear(post) {
    await postService.unflagPost(post._id);
    setPosts((prev) => prev.filter((p) => p._id !== post._id));
  }

  async function handleDelete(post) {
    if (!window.confirm("ลบโพสต์นี้?")) return;
    await postService.deletePost(post._id);
    setPosts((prev) => prev.filter((p) => p._id !== post._id));
  }

  if (loading) {
    return <div className="posts-moderation-page">กำลังโหลด...</div>;
  }

  return (
    <div className="posts-moderation-page">
      <h1>
        <ShieldAlert size={22} />
        <span>ตรวจสอบโพสต์ที่ถูกรายงาน</span>
      </h1>
      <p className="posts-moderation-subtitle">
        โพสต์ที่ผู้ใช้กดรายงานเนื้อหา รอการตรวจสอบความถูกต้อง โดยเฉพาะข้อมูลด้านสุขภาพ
      </p>

      {posts.length === 0 && <p className="posts-moderation-empty">ไม่มีโพสต์ที่รอตรวจสอบในขณะนี้</p>}

      <ul className="posts-moderation-list">
        {posts.map((post) => (
          <li key={post._id}>
            <div className="posts-moderation-info">
              <p className="posts-moderation-author">
                <Link to={`/community/${post._id}`}>{post.user?.name}</Link>
                <span className="posts-moderation-role">
                  {post.user?.role === "counsellor" || post.user?.role === "admin"
                    ? "บุคลากรทางการแพทย์"
                    : "ผู้ใช้ทั่วไป"}
                </span>
              </p>
              <p className="posts-moderation-content">{post.content}</p>
            </div>
            <div className="posts-moderation-actions">
              <button type="button" className="posts-moderation-approve" onClick={() => handleClear(post)}>
                <Check size={16} />
                <span>ตรวจสอบแล้ว</span>
              </button>
              <button type="button" className="posts-moderation-delete" onClick={() => handleDelete(post)} title="ลบ">
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PostsModeration;
