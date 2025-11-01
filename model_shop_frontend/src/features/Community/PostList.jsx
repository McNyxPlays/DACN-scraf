// src/features/Community/PostList.jsx
import React, { useState, useEffect } from "react"; // Xóa useCallback, useNavigate
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

  const handleDeletePost = async (postId) => {
    if (!user) {
      Toastify.error("Please log in to delete posts.");
      return;
    }
    try {
      await api.delete("/posts", { data: { post_id: postId } });
      onDeletePost(postId);
      Toastify.success("Post deleted successfully!");
      setDropdownOpen(null);
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Failed to delete post.");
    }
  };

  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const openPostDetail = (post) => {
    setSelectedPost(post);
  };

  const closePostDetail = () => {
    setSelectedPost(null);
  };

  // Preload images
  useEffect(() => {
    posts.forEach((post) => {
      if (post.images && post.images.length > 0) {
        post.images.forEach((image) => {
          const url = getImageUrl(image);
          const img = new Image();
          img.src = url;
        });
      }
    });
  }, [posts]);

  return (
    <div className="space-y-6">
      {Array.isArray(posts) && posts.length > 0 ? (
        posts.map((post) => (
          <div
            key={post.post_id}
            className="bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => openPostDetail(post)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
             {post.profile_image ? (
  <img
    src={`${BASE_BACKEND_URL}/${post.profile_image}`}
    alt="User"
    className="w-10 h-10 rounded-full object-cover"
    onError={(e) => (e.target.src = "/placeholder.jpg")}
  />
) : (
  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
    <i className="ri-user-line ri-lg text-gray-700"></i>
  </div>
)}
                <div>
                  <h3 className="font-medium text-gray-900">{post.full_name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {user && user.user_id === post.user_id && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown(post.post_id);
                    }}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    <i className="ri-more-line ri-xl"></i>
                  </button>
                  {dropdownOpen === post.post_id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-20 border">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(post.post_id);
                        }}
                        className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                      >
                        Delete Post
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-gray-800 mb-4">
              {expandedPosts[post.post_id] ? post.content : post.content.slice(0, 200)}
              {post.content.length > 200 && !expandedPosts[post.post_id] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(post.post_id);
                  }}
                  className="text-blue-600 font-medium ml-1"
                >
                  ... Read more
                </button>
              )}
            </p>

            {post.images && post.images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {post.images.map((image, index) => (
                  <img
                    key={index}
                    src={getImageUrl(image)}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => (e.target.src = "/placeholder.jpg")}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(post.post_id);
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition"
              >
                <i className={`ri-heart-${post.is_liked ? "fill text-red-500" : "line"}`}></i>
                <span>{post.like_count || 0} Likes</span>
              </button>
              <span className="flex items-center gap-2 text-gray-600">
                <i className="ri-chat-3-line"></i>
                <span>{post.comment_count || 0} Comments</span>
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(post.post_id);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <i className={`ri-heart-${post.is_liked ? "fill text-red-500" : "line"}`}></i>
                <span>Like</span>
              </button>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <i className="ri-chat-3-line"></i>
                <span>Comment</span>
              </button>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <i className="ri-share-forward-line"></i>
                <span>Share</span>
              </button>
            </div>

            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                {user && (
                  <>
                    {user.profile_image ? (
                      <img
                        src={`${BASE_BACKEND_URL}/Uploads/avatars/${user.profile_image}`}
                        alt="User"
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => (e.target.src = "/placeholder.jpg")}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <i className="ri-user-line ri-lg text-gray-700"></i>
                      </div>
                    )}
                  </>
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
        <PostDetail post={selectedPost} user={user} onClose={closePostDetail} />
      )}
    </div>
  );
};

export default PostList;