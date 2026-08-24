import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PostDetailPanel from "../../components/community/PostDetailPanel.jsx";
import "./PostDetail.css";

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="post-detail-page">
      <Link to="/community" className="post-detail-back">
        <ArrowLeft size={16} />
        กลับไปหน้าชุมชน
      </Link>

      <PostDetailPanel postId={id} onDeleted={() => navigate("/community")} />
    </div>
  );
}

export default PostDetail;
