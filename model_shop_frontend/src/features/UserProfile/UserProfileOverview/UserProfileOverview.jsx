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
    posts: 0,
    comments: 0,
    profile_image: "",
    banner_image: "",
    profile_completion: user ? 85 : 50,
  });

  useEffect(() => {
    api
      .get("/user")
      .then((response) => {
        if (response.data.status === "success") {
          const fetchedUser = response.data.user;
          setUserData((prev) => ({
            ...prev,
            name: fetchedUser.full_name,
            handle: fetchedUser.email ? `@${fetchedUser.email.split("@")[0]}` : "@user",
            location: fetchedUser.address || "Not specified",
            created_at: fetchedUser.created_at
              ? new Date(fetchedUser.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
              : "Unknown",
            profile_image: fetchedUser.profile_image || "",
            banner_image: fetchedUser.banner_image || "",
          }));
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        Toastify.error("Failed to load user data.");
      });

    api
      .get("/user-stats")
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
          />
        </div>
      </main>
    </div>
  );
};

export default UserProfileOverview;