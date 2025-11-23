// src/features/Community/PostList.jsx
import React, { useState } from "react";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";
import PostDetail from "./PostDetail";

const BASE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const PostList = ({ posts, user, onLike, onCommentSubmit, onDeletePost }) => {
  const [commentInputs, setCommentInputs] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({});

  const getImageUrl = (image) => {
    return `${BASE_BACKEND_URL}/${image.startsWith('Uploads/') ? image : `Uploads/posts/${image}`}`;
  };

  const handleCommentChange = (postId, value) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  const handleCommentSubmitWrapper = async (postId) => {
    const content = (commentInputs[postId] || "").trim();
    if (!content) return;

    await onCommentSubmit(postId, content);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const toggleDropdown = (postId) => {
    setDropdownOpen((prev) => (prev === postId ? null : postId));
  };

  const handleDeletePostWrapper = async (postId) => {
    if (!user) return Toastify.error("Please log in to delete posts");
    try {
      await api.delete("/posts", { data: { post_id: postId } });
      onDeletePost(postId);
    } catch (err) {
      Toastify.error("Failed to delete post");
    }
  };

  const handleLikeWrapper = async (postId) => {
    await onLike(postId);
  };

  const openPostDetail = (post) => {
    setSelectedPost(post);
  };

  const closePostDetail = () => {
    setSelectedPost(null);
  };

  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="space-y-6">
      {posts.length > 0 ? (
        posts.map((post) => (
          <div key={post.post_id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {post.profile_image ? (
                  <img
                    src={`${BASE_BACKEND_URL}/Uploads/avatars/${post.profile_image}`}
                    alt="User"
                    className="w-10 h-10 rounded-full object-cover"
                  />
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
              {user?.user_id === post.user_id && (
                <div className="relative">
                  <button onClick={() => toggleDropdown(post.post_id)} className="text-gray-500 hover:text-gray-700">
                    <i className="ri-more-2-line ri-lg"></i>
                  </button>
                  {dropdownOpen === post.post_id && (
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border z-50">
                      <button
                        onClick={() => handleDeletePostWrapper(post.post_id)}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4" onClick={() => openPostDetail(post)}>
              <p className="text-gray-800 mb-3">
                {expandedPosts[post.post_id] || post.content.length <= 200 ? post.content : `${post.content.substring(0, 200)}...`}
                {post.content.length > 200 && !expandedPosts[post.post_id] && (
                  <button onClick={(e) => { e.stopPropagation(); toggleExpand(post.post_id); }} className="text-blue-600 hover:underline ml-1">
                    Read more
                  </button>
                )}
              </p>
              {post.images && post.images.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {post.images.map((image, index) => (
                    <img key={index} src={getImageUrl(image)} alt="Post" className="w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-gray-600 text-sm">
              <button onClick={() => handleLikeWrapper(post.post_id)} className="flex items-center gap-1 hover:text-blue-600">
                <i className={post.is_liked ? "ri-heart-fill text-red-500" : "ri-heart-line"}></i>
                <span>{post.like_count || 0}</span>
              </button>
              <button className="flex items-center gap-1 hover:text-blue-600">
                <i className="ri-chat-1-line"></i>
                <span>{post.comment_count || 0}</span>
              </button>
              <button className="flex items-center gap-1 hover:text-blue-600">
                <i className="ri-share-forward-line"></i>
                <span>Share</span>
              </button>
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                {user && (
                  <img
                    src={`${BASE_BACKEND_URL}/Uploads/avatars/${user.profile_image || 'placeholder.jpg'}`}
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentInputs[post.post_id] || ""}
                  onChange={(e) => handleCommentChange(post.post_id, e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCommentSubmitWrapper(post.post_id)}
                  className="flex-1 px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">No posts yet.</div>
      )}

      {posts.length > 0 && (
        <div className="text-center mt-6">
          <button className="text-blue-600 font-medium hover:underline">
            View More Posts
          </button>
        </div>
      )}

      {selectedPost && (
        <PostDetail post={selectedPost} user={user} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
};

export default PostList;