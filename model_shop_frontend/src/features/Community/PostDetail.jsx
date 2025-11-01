// src/features/Community/PostDetail.jsx
import React, { useState, useEffect } from "react";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";

const PostDetail = ({ post, user, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isExpanded, setIsExpanded] = useState(false);

  const BASE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await api.get(`/posts/comments`, { params: { post_id: post.post_id } });
        if (response.data.status === "success") {
          setComments(response.data.comments || []);
        }
      } catch (err) {
        console.error("Error fetching comments:", err);
      }
    };
    fetchComments();
  }, [post.post_id]);

  const handleLike = async () => {
    if (!user) {
      Toastify.error("Please log in to like posts.");
      return;
    }
    try {
      const response = await api.put("/posts?action=like", { post_id: post.post_id });
      setIsLiked(response.data.liked);
      setLikeCount(response.data.like_count);
    } catch (err) {
      console.error("Error liking post:", err);
      Toastify.error("Failed to like post.");
    }
  };

  const handleCommentSubmit = async () => {
    if (!user) {
      Toastify.error("Please log in to comment.");
      return;
    }
    if (!newComment.trim()) return;
    try {
      await api.put("/posts?action=comment", {
        post_id: post.post_id,
        content: newComment,
      });
      const newCommentObj = {
        comment_id: Date.now(),
        content: newComment,
        created_at: new Date().toISOString(),
        full_name: user.full_name,
      };
      setComments([...comments, newCommentObj]);
      setNewComment("");
      Toastify.success("Comment added successfully!");
    } catch (err) {
      console.error("Error adding comment:", err);
      Toastify.error("Failed to add comment.");
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <i className="ri-close-line ri-xl"></i>
        </button>
        <div className="flex items-start gap-4 mb-6">
          {post.profile_image ? (
            <img
              src={`${BASE_BACKEND_URL}/Uploads/avatars/${post.profile_image}`}
              alt="User Profile"
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => (e.target.src = "/placeholder.jpg")}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <i className="ri-user-line ri-xl text-gray-700"></i>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{post.full_name}</h2>
            <p className="text-sm text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
          </div>
        </div>
        <p className="text-gray-800 mb-6">
          {isExpanded ? post.content : post.content.slice(0, 300)}
          {post.content.length > 300 && !isExpanded && (
            <button onClick={toggleExpand} className="text-blue-600 font-medium ml-1">
              ... Read more
            </button>
          )}
        </p>
        {post.images && post.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {post.images.map((image, index) => (
              <img
                key={index}
                src={`${BASE_BACKEND_URL}/${image.startsWith('Uploads/') ? image : `Uploads/posts/${image}`}`}
                alt={`Post image ${index + 1}`}
                className="w-full h-auto rounded-lg object-cover"
                onError={(e) => (e.target.src = "/placeholder.jpg")}
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-6 mb-6">
          <button
            onClick={handleLike}
            className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition"
          >
            <i className={`ri-heart-${isLiked ? 'fill text-red-500' : 'line'}`}></i>
            <span>{likeCount} Likes</span>
          </button>
          <span className="flex items-center gap-2 text-gray-600">
            <i className="ri-chat-3-line"></i>
            <span>{comments.length} Comments</span>
          </span>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-medium mb-3">Comments</h3>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.comment_id} className="flex gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <i className="ri-user-line ri-lg text-gray-700"></i>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{comment.full_name}</div>
                  <div className="text-gray-500 text-sm">
                    {new Date(comment.created_at).toLocaleString()}
                  </div>
                  <p className="text-gray-800">{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No comments yet.</p>
          )}
        </div>
        {user && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              {user.profile_image ? (
                <img
                  src={`${BASE_BACKEND_URL}/Uploads/avatars/${user.profile_image}`}
                  alt="User Profile"
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => (e.target.src = "/placeholder.jpg")}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <i className="ri-user-line ri-lg text-gray-700"></i>
                </div>
              )}
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCommentSubmit()}
                className="flex-1 px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;