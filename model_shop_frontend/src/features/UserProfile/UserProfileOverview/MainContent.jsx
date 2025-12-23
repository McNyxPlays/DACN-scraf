// src/features/UserProfile/UserProfileOverview/MainContent.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";
import { FaUser } from "react-icons/fa";
import PostDetail from "./PostDetail";

const MainContent = ({ activeTab, setActiveTab, user }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    if (activeTab !== "posts" || !user?.user_id) return;

    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/posts", {
          params: { limit: 10, offset: 0, user_id: user.user_id },
        });

        if (response.data.status === "success") {
          const postsData = response.data.posts || [];
          const postsWithImages = await Promise.all(
            postsData.map(async (post) => {
              try {
                const imageResponse = await api.get("/posts/images", {
                  params: { post_id: post.post_id },
                });
                return { ...post, images: imageResponse.data.images || [] };
              } catch (imgErr) {
                console.error("Error fetching images for post:", post.post_id, imgErr);
                return { ...post, images: [] };
              }
            })
          );
          setPosts(postsWithImages);

          // Preload images
          postsWithImages.forEach((post) => {
            if (post.images && post.images.length > 0) {
              post.images.forEach((image) => {
                const filename = image.split('/').pop();
                const fullImageUrl = `/uploads/posts/${filename}`; // Sửa lowercase nếu backend dùng lowercase
                if (!imageLoaded[fullImageUrl]) {
                  const img = new Image();
                  img.src = fullImageUrl;
                  img.onload = () => setImageLoaded((prev) => ({ ...prev, [fullImageUrl]: true }));
                  img.onerror = () => setImageLoaded((prev) => ({ ...prev, [fullImageUrl]: false }));
                }
              });
            }
          });
        } else {
          setError(response.data.message || "Failed to load posts");
        }
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError("Network error or server unavailable");
        Toastify.error("Failed to load posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [activeTab, user?.user_id]);

  const handlePostClick = (post) => {
    setSelectedPost(post);
  };

  const handleCloseDetail = () => {
    setSelectedPost(null);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading posts...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      {activeTab === "posts" ? (
        <div className="space-y-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div
                key={post.post_id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handlePostClick(post)}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {post.profile_image ? (
                      <img
                        src={`http://localhost:80/${post.profile_image}`}
                        alt={post.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <FaUser className="text-gray-500" />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {post.images.map((image, index) => {
                        const filename = image.split('/').pop();
                        const fullImageUrl = `/uploads/posts/${filename}`;
                        return (
                          <div key={index} className="relative">
                            {imageLoaded[fullImageUrl] === undefined ? (
                              <div className="w-full h-48 bg-gray-200 rounded-lg animate-pulse" />
                            ) : (
                              <img
                                src={imageLoaded[fullImageUrl] ? fullImageUrl : "/placeholder.jpg"}
                                alt={`Post image ${index + 1}`}
                                className="w-full h-80 object-cover rounded-lg"
                                onError={(e) => (e.target.src = "/placeholder.jpg")}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span><i className="ri-thumb-up-line" /> {post.like_count || 0} Likes</span>
                      <span><i className="ri-chat-3-line" /> {post.comment_count || 0} Comments</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">No posts yet.</div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center text-gray-500">
          Content for {activeTab} tab coming soon...
        </div>
      )}

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          user={user}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default MainContent;