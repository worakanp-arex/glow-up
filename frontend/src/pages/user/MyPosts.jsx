import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import * as postService from "../../services/postService.js";
import PostCard from "../../components/community/PostCard.jsx";
import "./Community.css";

function MyPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postService
      .getMyPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  async function handleLike(postId) {
    const updated = await postService.likePost(postId);
    setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, ...updated } : p)));
  }

  async function handleToggleSave(postId) {
    const { savedByMe } = await postService.toggleSavePost(postId);
    setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, savedByMe } : p)));
  }

  async function handleUpdated(postId, payload) {
    const updated = await postService.updatePost(postId, payload);
    setPosts((prev) => prev.map((p) => (p._id === postId ? updated : p)));
  }

  async function handleDeleted(postId) {
    await postService.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  }

  if (loading) {
    return <div className="community-page">กำลังโหลด...</div>;
  }

  return (
    <div className="community-page">
      <div className="community-header">
        <div>
          <Link to="/community" className="community-back-link">
            <ArrowLeft size={14} />
            <span>กลับไปหน้าชุมชน</span>
          </Link>
          <h1>โพสต์ของฉัน</h1>
        </div>
      </div>

      <ul className="community-list community-list-full">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            currentUserId={user._id}
            onLike={handleLike}
            onToggleSave={handleToggleSave}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        ))}
        {posts.length === 0 && <p className="community-empty">คุณยังไม่มีโพสต์</p>}
      </ul>
    </div>
  );
}

export default MyPosts;
