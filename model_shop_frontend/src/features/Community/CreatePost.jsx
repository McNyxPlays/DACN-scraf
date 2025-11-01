// src/features/Community/CreatePost.jsx
import React, { useState } from "react";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";

const BASE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function CreatePost({ user, onPostSubmit }) {
  const [newPost, setNewPost] = useState({
    content: "",
    images: [],
  });

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      Toastify.error("Please log in to post.");
      return;
    }
    if (!newPost.content.trim() && newPost.images.length === 0) {
      Toastify.error("Please add content or an image.");
      return;
    }

    const formData = new FormData();
    formData.append("content", newPost.content);
    formData.append("post_time_status", "new");
    newPost.images.forEach((image, index) => {
      formData.append(`images[${index}]`, image);
    });

    try {
      const response = await api.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.status === "success") {
        onPostSubmit?.(response.data.post);
        setNewPost({ content: "", images: [] });
        Toastify.success("Post created successfully!");
      }
    } catch (err) {
    console.error("Post error:", err.response || err);
    if (err.response?.status === 401) {
      Toastify.error("Session expired. Please log in again.");
    } else {
      Toastify.error(err.response?.data?.message || "Failed to create post.");
    }
  }
};

  return (
    <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
      <div className="flex border-b border-gray-200">
        <button className="flex-1 py-4 px-6 text-blue-600 font-medium border-b-2 border-blue-600">
          Featured
        </button>
        <button className="flex-1 py-4 px-6 text-gray-600 hover:text-gray-900 transition">
          Latest
        </button>
        <button className="flex-1 py-4 px-6 text-gray-600 hover:text-gray-900 transition">
          Popular
        </button>
        {user && (
          <button className="flex-1 py-4 px-6 text-gray-600 hover:text-gray-900 transition">
            Following
          </button>
        )}
      </div>
      {user && (
        <div className="p-4 border-b border-gray-200">
          <form onSubmit={handlePostSubmit}>
            <div className="flex items-start gap-3">
              {user.profile_image ? (
                <img
                  src={`${BASE_BACKEND_URL}/Uploads/avatars/${user.profile_image}`}
                  alt="User Profile"
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => (e.target.src = "/placeholder.jpg")}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <i className="ri-user-line ri-lg text-gray-700"></i>
                </div>
              )}
              <div className="flex-1">
                <textarea
                  placeholder="What's on your mind?"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="3"
                />
                {newPost.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {newPost.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt="Preview"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewPost({
                              ...newPost,
                              images: newPost.images.filter((_, i) => i !== index),
                            })
                          }
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                    <i className="ri-image-add-line text-xl"></i>
                    <span>Photo</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) =>
                        setNewPost({ ...newPost, images: Array.from(e.target.files) })
                      }
                      className="hidden"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={!newPost.content.trim() && newPost.images.length === 0}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default CreatePost;