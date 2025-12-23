import React from "react";

const ProfileStats = ({ userData }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <h2 className="font-semibold text-lg mb-4 text-center text-gray-800">Stats</h2>
      <div className="flex justify-around space-x-4">
        <div className="text-center p-3 rounded-lg hover:bg-gray-50 transition-all">
          <div className="text-xl font-semibold text-gray-900">{userData.posts || 0}</div>
          <div className="text-sm text-gray-500">Posts</div>
        </div>
        <div className="text-center p-3 rounded-lg hover:bg-gray-50 transition-all">
          <div className="text-xl font-semibold text-gray-900">{userData.followers || 0}</div>
          <div className="text-sm text-gray-500">Followers</div>
        </div>
        <div className="text-center p-3 rounded-lg hover:bg-gray-50 transition-all">
          <div className="text-xl font-semibold text-gray-900">{userData.following || 0}</div>
          <div className="text-sm text-gray-500">Following</div>
        </div>
      </div>
    </div>
  );
};

export default ProfileStats;