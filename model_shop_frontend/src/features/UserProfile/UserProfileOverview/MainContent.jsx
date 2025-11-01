import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";
import { FaUser } from "react-icons/fa";
import PostDetail from "./PostDetail";

const MainContent = ({ activeTab, setActiveTab, className }) => {
  const [posts, setPosts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState([]);
  const [userData, setUserData] = useState({
    name: "Unknown User",
    profile_image: "",
    user_id: null,
  });
  const [imageLoaded, setImageLoaded] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    if (activeTab === "posts") {
      api
        .get("/posts", {
          params: { limit: 10, offset: 0, user_id: "current" },
        })
        .then(async (response) => {
          if (response.data.status === "success") {
            const postsData = response.data.posts;
            const postsWithImages = await Promise.all(
              postsData.map(async (post) => {
                const imageResponse = await api.get("/posts-images", {
                  params: { post_id: post.post_id },
                });
                return { ...post, images: imageResponse.data.images || [] };
              })
            );
            setPosts(postsWithImages);
            postsWithImages.forEach((post) => {
              if (post.images && post.images.length > 0) {
                post.images.forEach((image) => {
                  const fullImageUrl = `/Uploads/posts/${image.split('/').pop()}`;
                  if (!imageLoaded[fullImageUrl]) {
                    const img = new Image();
                    img.src = fullImageUrl;
                    img.onload = () =>
                      setImageLoaded((prev) => ({ ...prev, [fullImageUrl]: true }));
                    img.onerror = () =>
                      setImageLoaded((prev) => ({ ...prev, [fullImageUrl]: false }));
                  }
                });
              }
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching posts:", error);
          Toastify.error("Failed to load posts.");
        });

      api
        .get("/user")
        .then((response) => {
          if (response.data.status === "success") {
            setUserData({
              name: response.data.user.full_name,
              profile_image: response.data.user.profile_image,
              user_id: response.data.user.user_id,
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
          Toastify.error("Failed to load user data.");
        });
    }
  }, [activeTab]);

  const handlePostSubmit = async () => {
    if (!userData.user_id) {
      Toastify.error("Please log in to post.");
      return;
    }
    if (!postContent.trim() && postImages.length === 0) return;

    const formData = new FormData();
    formData.append("content", postContent);
    formData.append("post_time_status", "new");
    postImages.forEach((image, index) => {
      formData.append(`images[${index}]`, image);
    });

    try {
      const response = await api.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.status === "success") {
        setPostContent("");
        setPostImages([]);
        // Refresh posts
        api
          .get("/posts", {
            params: { limit: 10, offset: 0, user_id: "current" },
          })
          .then(async (response) => {
            if (response.data.status === "success") {
              const postsData = response.data.posts;
              const postsWithImages = await Promise.all(
                postsData.map(async (post) => {
                  const imageResponse = await api.get("/posts-images", {
                    params: { post_id: post.post_id },
                  });
                  return { ...post, images: imageResponse.data.images || [] };
                })
              );
              setPosts(postsWithImages);
            }
          })
          .catch((error) => {
            console.error("Error refreshing posts:", error);
          });
        Toastify.success("Post created successfully!");
      }
    } catch (err) {
      console.error("Error creating post:", err);
      Toastify.error("Failed to create post.");
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setPostImages((prev) => [...prev, ...files]);
  };

  const handleRemoveImage = (index) => {
    setPostImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDropdown = (postId) => {
    setDropdownOpen(dropdownOpen === postId ? null : postId);
  };

  const handleDeletePost = async (postId) => {
    if (!userData.user_id) {
      Toastify.error("Please log in to delete posts.");
      return;
    }
    try {
      await api.delete(`/posts?id=${postId}`);
      setPosts((prev) => prev.filter((post) => post.post_id !== postId));
      Toastify.success("Post deleted successfully!");
    } catch (err) {
      console.error("Error deleting post:", err);
      Toastify.error("Failed to delete post.");
    }
  };

  const openPostDetail = (post) => {
    setSelectedPost(post);
  };

  const handleCloseDetail = () => {
    setSelectedPost(null);
  };

  const toggleExpand = (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className={`w-full ${className}`}>
      {activeTab === "posts" && (
        <div className="space-y-6">
          {userData.user_id && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex gap-3 mb-4">
                {userData.profile_image ? (
                  <img
                    src={`/Uploads/avatars/${userData.profile_image}`}
                    alt="User Profile"
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => (e.target.src = "/placeholder.jpg")}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <i className="ri-user-line ri-lg text-gray-700"></i>
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    placeholder="What's on your mind?"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="3"
                  />
                  {postImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {postImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt="Preview"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                      <i className="ri-image-add-line text-xl"></i>
                      <span>Photo</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handlePostSubmit}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.post_id} className="bg-white rounded-lg shadow-sm p-4">
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
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{post.full_name}</div>
                    <div className="text-gray-500 text-sm">
                      {new Date(post.created_at).toLocaleString()}
                    </div>
                  </div>
                  {post.user_id === userData.user_id && (
                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown(post.post_id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <i className="ri-more-line ri-lg"></i>
                      </button>
                      {dropdownOpen === post.post_id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => handleDeletePost(post.post_id)}
                            className="block w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-gray-800 mb-4">
                  {expandedPosts[post.post_id] ? post.content : `${post.content.substring(0, 200)}...`}
                  {post.content.length > 200 && (
                    <button
                      onClick={() => toggleExpand(post.post_id)}
                      className="text-blue-600 hover:underline ml-1"
                    >
                      {expandedPosts[post.post_id] ? "See less" : "See more"}
                    </button>
                  )}
                </p>
                {post.images && post.images.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {post.images.map((image, index) => {
                      const fullImageUrl = `/Uploads/posts/${image.split('/').pop()}`;
                      return (
                        <div key={index} className="relative">
                          {imageLoaded[fullImageUrl] === undefined ? (
                            <div className="w-full h-48 bg-gray-200 rounded-lg animate-pulse"></div>
                          ) : (
                            <div className="w-full h-80 bg-black flex items-center justify-center rounded-lg">
                              <img
                                src={
                                  imageLoaded[fullImageUrl] ? fullImageUrl : "/Uploads/placeholder.jpg"
                                }
                                alt="Post Image"
                                className="max-w-full h-80 object-contain border-l-2 border-r-2 border-gray-700 rounded-lg"
                                onError={(e) => (e.target.src = "/Uploads/placeholder.jpg")}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-1 text-gray-500">
                    <i className="ri-thumb-up-fill text-blue-600"></i>
                    <span>{post.like_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500">
                    <span>{post.comment_count || 0} comments</span>
                    <span>shares</span>
                  </div>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <div className="text-center text-gray-500 py-6">No posts yet.</div>
            )}
          </div>
        </div>
      )}
      {activeTab !== "posts" && (
        <div className="p-6 text-center text-gray-500">
          Content for {activeTab} tab coming soon...
        </div>
      )}
      {selectedPost && (
        <PostDetail
          post={selectedPost}
          user={userData}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default MainContent;