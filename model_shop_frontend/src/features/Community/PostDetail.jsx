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

  const getImageUrl = (image) => `${BASE_BACKEND_URL}/${image.startsWith('Uploads/') ? image : `Uploads/posts/${image}`}`;

  const handleLike = async () => {
    if (!user) {
      Toastify.error("Please log in to like posts.");
      return;
    }
    try {
      const response = await api.put("/posts", { action: 'like', post_id: post.post_id }); // Fix: action in body
      setIsLiked(response.data.liked);
      setLikeCount(response.data.like_count);
      Toastify.success(response.data.liked ? "Liked!" : "Unliked!");
    } catch (err) {
      Toastify.error("Failed to like post");
    }
  };

  const handleCommentSubmit = async () => {
    if (!user) {
      Toastify.error("Please log in to comment.");
      return;
    }
    if (!newComment.trim()) return;

    try {
      await api.put("/posts", { action: 'comment', post_id: post.post_id, content: newComment }); // Fix: action in body
      setNewComment("");
      // Refresh comments
      const response = await api.get(`/posts/comments`, { params: { post_id: post.post_id } });
      setComments(response.data.comments || []);
      Toastify.success("Comment added!");
    } catch (err) {
      Toastify.error("Failed to add comment");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-[90vh] rounded-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Post Detail</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            {post.profile_image ? (
              <img src={getImageUrl(post.profile_image)} alt="User" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <i className="ri-user-line ri-lg text-gray-700"></i>
              </div>
            )}
            <div>
              <div className="font-medium text-gray-900">{post.full_name}</div>
              <div className="text-sm text-gray-500">
                {new Date(post.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          <p className="text-gray-800 mb-4">
            {isExpanded || post.content.length <= 200 ? post.content : `${post.content.substring(0, 200)}...`}
            {post.content.length > 200 && !isExpanded && (
              <button onClick={() => setIsExpanded(true)} className="text-blue-600 hover:underline ml-1">
                Read more
              </button>
            )}
          </p>
          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {post.images.map((image, index) => (
                <img key={index} src={getImageUrl(image)} alt="Post" className="w-full rounded-lg" />
              ))}
            </div>
          )}
          <div className="flex items-center gap-6 mb-6 text-gray-600">
            <button onClick={handleLike} className="flex items-center gap-1 hover:text-blue-600">
              <i className={isLiked ? "ri-heart-fill text-red-500" : "ri-heart-line"}></i>
              <span>{likeCount}</span>
            </button>
            <div className="flex items-center gap-1">
              <i className="ri-chat-1-line"></i>
              <span>{comments.length}</span>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            {comments.map((comment) => (
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
            ))}
            {!comments.length && <p className="text-gray-500">No comments yet.</p>}
          </div>
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