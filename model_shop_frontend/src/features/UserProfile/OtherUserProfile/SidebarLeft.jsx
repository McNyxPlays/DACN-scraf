import React, { useEffect, useState } from "react";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";

const SidebarLeft = ({ userData, isEditing, setUserData, className }) => {
  const [socialLinks, setSocialLinks] = useState([]);
  const [bioInput, setBioInput] = useState(userData.bio);

  useEffect(() => {
    api
      .get("/social-links")
      .then((response) => {
        if (response.data.status === "success") {
          setSocialLinks(response.data.social_links);
          if (response.data.social_links.length > 0 && response.data.social_links[0].bio) {
            setBioInput(response.data.social_links[0].bio);
            setUserData((prev) => ({ ...prev, bio: response.data.social_links[0].bio }));
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching social links:", error);
        Toastify.error("Failed to load social links.");
      });
  }, [setUserData]);

  const handleBioUpdate = () => {
    if (!isEditing) return;
    api
      .put("/social-links", {
        link_id: socialLinks.length > 0 ? socialLinks[0].link_id : null,
        platform: socialLinks.length > 0 ? socialLinks[0].platform : "other",
        link_url: socialLinks.length > 0 ? socialLinks[0].link_url : "",
        display_name: socialLinks.length > 0 ? socialLinks[0].display_name : "",
        bio: bioInput,
      })
      .then((response) => {
        if (response.data.status === "success") {
          setUserData((prev) => ({ ...prev, bio: bioInput }));
          Toastify.success("Bio updated successfully!");
        }
      })
      .catch((error) => {
        console.error("Error updating bio:", error);
        Toastify.error("Failed to update bio.");
      });
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-200 ml-2">
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
          <p className="text-base text-gray-700 mb-4">{userData.bio || "No bio available."}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 ml-2">
        <h2 className="font-semibold text-lg mb-4 text-gray-900">Social Links</h2>
        <div className="space-y-3">
          {socialLinks.length > 0 ? (
            socialLinks.map((link) => (
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
            ))
          ) : (
            <p className="text-gray-500 text-sm">No social links available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidebarLeft;