import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";
import ProfileBanner from "./ProfileBanner";
import SidebarLeft from "./SidebarLeft";
import MainContent from "./MainContent";

const UserProfileOverview = ({ user }) => {
  const [activeTab, setActiveTab] = useState("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    name: user?.full_name || "Unknown User",
    handle: user?.email ? `@${user.email.split("@")[0]}` : "@user",
    location: user?.address || "Not specified",
    created_at: user?.created_at
      ? new Date(user.created_at).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : "Unknown",
    bio: "Passionate model builder.",
    followers: 0,
    following: 0,
    posts: 0,
    profile_image: user?.profile_image || "",
    banner_image: user?.banner_image || "",
    profile_completion: user ? 85 : 50,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/user/stats");
        if (response.data.status === "success") {
          setUserData((prev) => ({
            ...prev,
            followers: response.data.followers,
            following: response.data.following,
            posts: response.data.posts,
          }));
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
        Toastify.error("Failed to load user stats.");
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-gray-100 text-gray-900 min-h-screen">
      <ProfileBanner
        userData={userData}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
      />
      <main className="container mx-auto px-2 py-6 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4 flex flex-col gap-6">
          <SidebarLeft
            userData={userData}
            isEditing={isEditing}
            setUserData={setUserData}
          />
        </div>
        <div className="w-full md:w-2/4">
          <div className="bg-white rounded-lg shadow-md p-2 mb-4 flex justify-around text-sm font-medium">
            <button
              className={`px-4 py-2 rounded ${activeTab === "posts" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}
              onClick={() => setActiveTab("posts")}
            >
              My Posts
            </button>
            <button
              className={`px-4 py-2 rounded ${activeTab === "collections" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}
              onClick={() => setActiveTab("collections")}
            >
              Collections
            </button>
            <button
              className={`px-4 py-2 rounded ${activeTab === "likes" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}
              onClick={() => setActiveTab("likes")}
            >
              Likes
            </button>
            <button
              className={`px-4 py-2 rounded ${activeTab === "comments" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}
              onClick={() => setActiveTab("comments")}
            >
              Comments
            </button>
          </div>
          <MainContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}  // Pass user for user_id in fetches
          />
        </div>
      </main>
    </div>
  );
};

export default UserProfileOverview;