// src/features/Community/RightSidebar.jsx
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../../api/index";

const BASE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function RightSidebar({ user: propUser }) {
  const reduxUser = useSelector((state) => state.user.user);
  const userLoading = useSelector((state) => state.user.loading);
  const userError = useSelector((state) => state.user.error);
  const currentUser = propUser || reduxUser;

  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });

  useEffect(() => {
    const fetchUserStats = async () => {
      if (userLoading || userError || !currentUser?.user_id) return; // Skip if loading, error or no user

      try {
        const response = await api.get("/user/stats");
        if (response.data.status === "success") {
          setStats({
            followers: response.data.followers || 0,
            following: response.data.following || 0,
            posts: response.data.posts || 0,
          });
        }
      } catch (err) {
        if (err.response?.status === 401) {
          console.warn("Session expired - logging out silently");
          // Optional: Dispatch logout if needed
        } else {
          console.error("Error fetching user stats:", err);
        }
      }
    };

    fetchUserStats();
  }, [currentUser, userLoading, userError]);

  if (!currentUser) {
    return <div className="hidden lg:block"></div>;
  }

  return (
    <div className="w-full lg:w-80 space-y-6">
      {/* User Profile Card */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          {currentUser.profile_image ? (
            <img
              src={`${BASE_BACKEND_URL}/Uploads/avatars/${currentUser.profile_image}`}
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => (e.target.src = "/placeholder.jpg")}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <i className="ri-user-line ri-lg text-gray-700"></i>
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">
              {currentUser.full_name || "User"}
            </div>
            <div className="text-sm text-gray-500">@{currentUser.email?.split("@")[0]}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center py-3 border-t border-gray-200">
          <div>
            <div className="font-bold text-gray-900">{stats.posts}</div>
            <div className="text-xs text-gray-500">Posts</div>
          </div>
          <div>
            <div className="font-bold text-gray-900">{stats.followers}</div>
            <div className="text-xs text-gray-500">Followers</div>
          </div>
          <div>
            <div className="font-bold text-gray-900">{stats.following}</div>
            <div className="text-xs text-gray-500">Following</div>
          </div>
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-4 px-2">Trending Topics</h3>
        <div className="space-y-3">
          <div className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg">
            <div className="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary rounded-full flex-shrink-0">
              <i className="ri-discuss-line"></i>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">
                What's your favorite panel lining technique?
              </h4>
              <div className="flex items-center text-xs text-gray-500">
                <span>32 replies</span>
                <span className="mx-1">•</span>
                <span>1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <a href="#" className="text-primary text-sm font-medium hover:underline">
            View More
          </a>
        </div>
      </div>

      {/* Community Poll */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-4 px-2">Community Poll</h3>
        <div className="px-2">
          <h4 className="font-medium text-gray-900 mb-3">
            What's your favorite model kit scale?
          </h4>
          <div className="space-y-2 mb-4">
            <label className="flex items-center">
              <input type="radio" name="scale" value="1/144" className="mr-2" />
              <span className="text-gray-700">1/144 Scale</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="scale" value="1/100" className="mr-2" />
              <span className="text-gray-700">1/100 Scale</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="scale" value="1/60" className="mr-2" />
              <span className="text-gray-700">1/60 Scale</span>
            </label>
          </div>
          <button className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition">
            Vote
          </button>
        </div>
      </div>
    </div>
  );
}

export default RightSidebar;