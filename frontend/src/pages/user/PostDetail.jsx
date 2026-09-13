import PageHeader from "../../components/common/PageHeader.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import PostDetailPanel from "../../components/community/PostDetailPanel.jsx";
import "./PostDetail.css";

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="post-detail-page">
      <PageHeader icon={MessageSquare} backTo="/community" backLabel="หน้าชุมชน">รายละเอียดโพสต์</PageHeader>

      <PostDetailPanel postId={id} onDeleted={() => navigate("/community")} />
    </div>
  );
}

export default PostDetail;
