// src/features/Community/Community.jsx
import React, { useState, useEffect } from "react";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";
import CreatePost from "./CreatePost";           // ← Dùng CreatePost mới
import PostList from "./PostList";               // ← Dùng PostList mới
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import ForumsSection from "./ForumsSection";
import TutorialsEvents from "./TutorialsEvents";

const BASE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const Community = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // Lấy user từ localStorage (giống như trước)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, []);

  // Fetch posts từ backend mới
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/posts"); // ← API mới
      if (response.data.status === "success") {
        setPosts(response.data.posts || []);
      } else {
        setError(response.data.message || "Failed to fetch posts.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  // Tạo post mới (optimistic UI)
  const handlePostSubmit = (newPost) => {
    const newFullPost = {
      post_id: newPost.post_id,
      content: newPost.content,
      post_time_status: "new",
      created_at: new Date().toISOString(),
      user_id: user?.user_id,
      full_name: user?.full_name,
      profile_image: user?.profile_image || null,
      like_count: 0,
      comment_count: 0,
      is_liked: false,
      images: newPost.images || [],
    };
    setPosts((prev) => [newFullPost, ...prev]);
  };

  // Like post
  const handleLike = async (postId) => {
    if (!user) {
      Toastify.error("Please log in to like posts.");
      return;
    }
    try {
      const response = await api.put("/posts?action=like", { post_id: postId });
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? { ...p, is_liked: response.data.liked, like_count: response.data.like_count }
            : p
        )
      );
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Failed to like post.");
    }
  };

  // Comment post
  const handleCommentSubmit = async (postId, content) => {
    if (!user) {
      Toastify.error("Please log in to comment.");
      return;
    }
    if (!content.trim()) return;

    try {
      await api.put("/posts?action=comment", { post_id: postId, content });
      await fetchPosts(); // Refresh toàn bộ để cập nhật comment_count
      Toastify.success("Comment added successfully!");
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Failed to add comment.");
    }
  };

  // Xóa post
  const handleDeletePost = (postId) => {
    setPosts((prev) => prev.filter((p) => p.post_id !== postId));
    Toastify.success("Post deleted successfully!");
  };

  // Loading & Error UI
  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="bg-gray-50 font-inter">
      <section className="py-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Sidebar */}
            <LeftSidebar />

            {/* Main Content */}
            <div className="flex-1 max-w-[650px] mx-auto space-y-6">
              {/* Tạo bài viết */}
              <CreatePost user={user} onPostSubmit={handlePostSubmit} />

              {/* Danh sách bài viết */}
              <PostList
                posts={posts}
                user={user}
                onLike={handleLike}
                onCommentSubmit={handleCommentSubmit}
                onDeletePost={handleDeletePost}
              />

              {/* Các phần cũ */}
              <ForumsSection />
              <TutorialsEvents />
            </div>

            {/* Right Sidebar */}
            <div className="lg:w-80">
              {user ? <RightSidebar user={user} /> : <div className="hidden lg:block"></div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Community;