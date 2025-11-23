// src/features/Community/Community.jsx
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";
import CreatePost from "./CreatePost";
import PostList from "./PostList";
import CommunityLeftSidebar from "./LeftSidebar"; 
import RightSidebar from "./RightSidebar";
import DiscussionForums from "./ForumsSection";
import TutorialsAndEvents from "./TutorialsEvents"; 

const BASE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const Community = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = useSelector((state) => state.user.user);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get("/posts");
      if (response.data.status === "success") {
        setPosts(response.data.posts || []);
      }
    } catch (err) {
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  // Optimistic post add (xóa toast)
  const handlePostSubmit = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleLike = async (postId) => {
    if (!user) return Toastify.error("Please log in to like");
    try {
      const response = await api.put("/posts?action=like", { post_id: postId });
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId ? { ...p, is_liked: response.data.liked, like_count: response.data.like_count } : p
        )
      );
      Toastify.success("Liked!");
    } catch (err) {
      Toastify.error("Failed to like post");
    }
  };

  const handleCommentSubmit = async (postId, content) => {
    if (!user) return Toastify.error("Please log in to comment");
    if (!content.trim()) return;

    try {
      await api.put("/posts?action=comment", { post_id: postId, content });
      fetchPosts(); // Refresh to update comment_count
      Toastify.success("Comment added!");
    } catch (err) {
      Toastify.error("Failed to add comment");
    }
  };

  const handleDeletePost = (postId) => {
    setPosts((prev) => prev.filter((p) => p.post_id !== postId));
    Toastify.success("Post deleted!");
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="bg-gray-50 font-inter">
      <section className="py-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Sidebar */}
            <CommunityLeftSidebar />

            {/* Main Content */}
            <div className="flex-1 max-w-[650px] mx-auto space-y-6">
              {/* Create Post UI – Now shows if user logged in */}
              {user && <CreatePost user={user} onPostSubmit={handlePostSubmit} />}

              {/* Post List */}
              <PostList
                posts={posts}
                user={user}
                onLike={handleLike}
                onCommentSubmit={handleCommentSubmit}
                onDeletePost={handleDeletePost}
              />

              {/* Forums & Tutorials/Events */}
              <DiscussionForums />
              <TutorialsAndEvents />
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