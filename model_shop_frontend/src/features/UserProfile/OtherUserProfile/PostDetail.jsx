import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";

const PostDetail = ({ post, user, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await api.get(`/comments?post_id=${post.post_id}`);
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

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <i className="ri-close-line ri-lg"></i>
        </button>
        <div className="flex gap-3 mb-4">
          {post.profile_image ? (
            <img
              src={`/Uploads/avatars/${post.profile_image}`}
              alt="User Profile"
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => (e.target.src = "/placeholder.jpg")}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <i className="ri-user-line ri-lg text-gray-700"></i>
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{post.full_name}</div>
            <div className="text-gray-500 text-sm">
              {new Date(post.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-gray-800">
            {isExpanded ? post.content : `${post.content.substring(0, 200)}...`}
            {post.content.length > 200 && (
              <button
                onClick={toggleExpand}
                className="text-blue-600 hover:underline ml-1"
              >
                {isExpanded ? "See less" : "See more"}
              </button>
            )}
          </p>
        </div>
        {post.images && post.images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {post.images.map((image, index) => (
              <img
                key={index}
                src={`/Uploads/posts/${image}`}
                alt={`Post image ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
                onError={(e) => (e.target.src = "/placeholder.jpg")}
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 ${isLiked ? "text-blue-600" : "text-gray-600"} hover:text-blue-700`}
          >
            <i className={`ri-thumb-up-${isLiked ? "fill" : "line"}`}></i>
            {likeCount} Likes
          </button>
          <div className="flex items-center gap-1 text-gray-600">
            <i className="ri-chat-1-line"></i>
            {post.comment_count || 0} Comments
          </div>
        </div>
        <div className="space-y-4 mb-4">
          <h3 className="font-semibold text-gray-900">Comments</h3>
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
                  src={`/Uploads/avatars/${user.profile_image}`}
                  alt="User Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <i className="ri-user-line ri-lg text-gray-700"></i>
                </div>
              )}
              <input
                id={`modal-comment-${post.post_id}`}
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