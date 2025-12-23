// src/features/UserProfile/UserProfileOverview/PostDetail.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";

const PostDetail = ({ post, user, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await api.get(`/posts/comments`, {
          params: { post_id: post.post_id },
        });
        if (response.data.status === "success") {
          setComments(response.data.comments || []);
        }
      } catch (err) {
        console.error("Error fetching comments:", err);
        Toastify.error("Failed to load comments");
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
      const response = await api.put("/posts", { action: "like", post_id: post.post_id });
      if (response.data.status === "success") {
        setIsLiked(response.data.liked);
        setLikeCount(response.data.like_count);
      }
    } catch (err) {
      console.error("Error liking post:", err);
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
      const response = await api.put("/posts", {
        action: "comment",
        post_id: post.post_id,
        content: newComment,
      });
      if (response.data.status === "success") {
        const newCommentObj = {
          comment_id: Date.now(), // temporary ID
          content: newComment,
          created_at: new Date().toISOString(),
          full_name: user.full_name || "You",
          profile_image: user.profile_image || null,
        };
        setComments((prev) => [...prev, newCommentObj]);
        setNewComment("");
        Toastify.success("Comment added successfully");
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
      Toastify.error("Failed to post comment");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl"
        >
          ×
        </button>

        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            {post.profile_image ? (
              <img
                src={`http://localhost:80/${post.profile_image}`}
                alt={post.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <i className="ri-user-line ri-lg text-gray-700" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{post.full_name}</h3>
              <p className="text-sm text-gray-500">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-1 gap-4 mb-6">
              {post.images.map((image, index) => {
                const filename = image.split('/').pop();
                const fullImageUrl = `/uploads/posts/${filename}`;
                return (
                  <img
                    key={index}
                    src={fullImageUrl}
                    alt={`Post image ${index + 1}`}
                    className="w-full rounded-lg object-cover"
                    onError={(e) => (e.target.src = "/placeholder.jpg")}
                  />
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-6 text-gray-500">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 ${isLiked ? "text-blue-600" : "hover:text-blue-600"}`}
            >
              <i className={`ri-thumb-up-${isLiked ? "fill" : "line"}`} />
              <span>{likeCount}</span>
            </button>
            <span className="flex items-center gap-2">
              <i className="ri-chat-3-line" />
              {comments.length} Comments
            </span>
          </div>
        </div>

        <div className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Comments</h4>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.comment_id} className="flex gap-3 mb-4">
                {comment.profile_image ? (
                  <img
                    src={`http://localhost:80/${comment.profile_image}`}
                    alt={comment.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <i className="ri-user-line text-gray-700" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{comment.full_name}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </div>
                  <p className="text-gray-800 mt-1">{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No comments yet.</p>
          )}
        </div>

        {user && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center gap-4">
              {user.profile_image ? (
                <img
                  src={`http://localhost:80/${user.profile_image}`}
                  alt="Your profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <i className="ri-user-line text-gray-700" />
                </div>
              )}
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCommentSubmit()}
                  className="flex-1 px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;