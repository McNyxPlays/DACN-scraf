import React, { useState } from "react";

const SidebarLeft = ({ userData, isEditing, setUserData, className }) => {
  const [socialLinks] = useState([]);  // Empty array to keep UI but no content
  const [bioInput, setBioInput] = useState(userData.bio);

  const handleBioUpdate = () => {
    // Local update only, no backend save (users table no bio)
    setUserData((prev) => ({ ...prev, bio: bioInput }));
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
        <h2 className="font-semibold text-lg mb-4 text-gray-900">About</h2>
        {isEditing ? (
          <textarea
            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            value={bioInput}
            onChange={(e) => setBioInput(e.target.value)}
            onBlur={handleBioUpdate}
          />
        ) : (
          <p className="text-base text-gray-700 mb-4">{userData.bio || "Chưa có thông tin"}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h2 className="font-semibold text-lg mb-4 text-gray-900">Social Links</h2>
        <div className="space-y-3">
          {socialLinks.map((link) => (
            <div key={link.link_id} className="flex items-center">
              <i
                className={`fab fa-${link.platform} text-${
                  link.platform === "instagram"
                    ? "pink"
                    : link.platform === "youtube"
                    ? "red"
                    : link.platform === "twitter"
                    ? "blue"
                    : "blue"
                }-600 w-8 text-lg mr-2`}
              />
              <a
                href={link.link_url}
                className="text-sm text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.display_name}
              </a>
            </div>
          ))}
          {socialLinks.length === 0 && <p className="text-gray-500 text-sm">No social links added.</p>}
        </div>
      </div>
    </div>
  );
};

export default SidebarLeft;