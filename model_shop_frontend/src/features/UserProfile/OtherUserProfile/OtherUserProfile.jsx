import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";
import ProfileBanner from "./ProfileBanner";
import SidebarLeft from "./SidebarLeft";
import UserPosts from "./UserPosts";

const OtherUserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    name: "Unknown User",
    handle: "@user",
    bio: "No bio available.",
    followers: 0,
    posts: 0,
    comments: 0,
    profile_image: "",
    banner_image: "",
  });
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    api
      .get("/user")
      .then((response) => {
        if (response.data.status === "success") {
          setCurrentUser(response.data.user);
        }
      })
      .catch((error) => {
        console.error("Error fetching current user data:", error);
        Toastify.error("Failed to load current user data.");
      });
  }, []);

  useEffect(() => {
    api
      .get(`/user?user_id=${userId}`)
      .then((response) => {
        if (response.data.status === "success") {
          const fetchedUser = response.data.user;
          setUserData({
            name: fetchedUser.full_name || "Unknown User",
            handle: fetchedUser.email ? `@${fetchedUser.email.split("@")[0]}` : "@user",
            bio: fetchedUser.bio || "No bio available.",
            profile_image: fetchedUser.profile_image || "",
            banner_image: fetchedUser.banner_image || "",
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        Toastify.error("Failed to load user data.");
      });

    api
      .get(`/user-stats?user_id=${userId}`)
      .then((response) => {
        if (response.data.status === "success") {
          setUserData((prev) => ({
            ...prev,
            followers: response.data.followers,
            posts: response.data.posts,
            comments: response.data.comments,
          }));
        }
      })
      .catch((error) => {
        console.error("Error fetching user stats:", error);
        Toastify.error("Failed to load user stats.");
      });

    api
      .get(`/posts?user_id=${userId}`)
      .then((response) => {
        if (response.data.status === "success") {
          setPosts(response.data.posts || []);
        }
      })
      .catch((error) => {
        console.error("Error fetching posts:", error);
        Toastify.error("Failed to load posts.");
      });
  }, [userId]);

  const handleFollow = () => {
    if (!currentUser) {
      Toastify.error("Please log in to follow users.");
      return;
    }
    setIsFollowing(!isFollowing);
  };

  const handleMessage = () => {
    if (!currentUser) {
      Toastify.error("Please log in to send messages.");
      return;
    }
    navigate(`/messages/${userId}`);
  };

  const handleLike = async (postId) => {
    if (!currentUser) {
      Toastify.error("Please log in to like posts.");
      return;
    }
    try {
      const response = await api.put(`/posts?action=like`, { post_id: postId });
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.post_id === postId
            ? { ...post, is_liked: response.data.liked, like_count: response.data.like_count }
            : post
        )
      );
    } catch (err) {
      console.error("Error liking post:", err);
      Toastify.error("Failed to like post.");
    }
  };

  const handleCommentSubmit = async (postId, content) => {
    if (!currentUser) {
      Toastify.error("Please log in to comment.");
      return;
    }
    if (!content.trim()) return;
    try {
      await api.put(`/posts?action=comment`, { post_id: postId, content });
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.post_id === postId
            ? { ...post, comment_count: (post.comment_count || 0) + 1 }
            : post
        )
      );
      Toastify.success("Comment added successfully!");
    } catch (err) {
      console.error("Error adding comment:", err);
      Toastify.error("Failed to add comment.");
    }
  };

  return (
    <div className="bg-gray-100 text-gray-900 min-h-screen">
      <ProfileBanner
        userData={userData}
        isEditing={false}
        setIsEditing={() => {}}
        handleFollow={handleFollow}
        handleMessage={handleMessage}
        isFollowing={isFollowing}
        currentUser={currentUser}
      />
      <div className="container mx-auto px-4 py-1">
        <div className="flex justify-center mb-2">
          <div className="flex space-x-4 bg-white rounded-lg shadow-md p-2 max-w-md mx-auto">
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeTab === "posts"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab("shop")}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeTab === "shop"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              Shop
            </button>
          </div>
        </div>
        <main className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/4 ml-4">
            <SidebarLeft userData={userData} isEditing={false} setUserData={() => {}} />
          </div>
          <div className="w-full md:w-3/4">
            {activeTab === "posts" && (
              <UserPosts
                posts={posts}
                currentUser={currentUser}
                onLike={handleLike}
                onCommentSubmit={handleCommentSubmit}
              />
            )}
            {activeTab === "shop" && (
              <div className="text-center text-gray-500 py-6">Shop content coming soon.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default OtherUserProfile;