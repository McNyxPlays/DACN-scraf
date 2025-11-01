import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MessagesSidebar from "./MessagesSidebar";
import ConversationView from "./ConversationView";
import api from "../../../api/index";

function Messages() {
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndConversations = async () => {
      setLoading(true);
      try {
        const userResponse = await api.get("/user");
        if (userResponse.data.status === "success" && userResponse.data.user) {
          setUser(userResponse.data.user);
        } else {
          console.error("Failed to fetch user:", userResponse.data.message || "No user data");
          navigate("/login");
          setLoading(false);
          return;
        }

        const messagesResponse = await api.get("/messages");
        console.log("Messages API response:", messagesResponse);
        if (messagesResponse.data && typeof messagesResponse.data.success !== "undefined") {
          if (messagesResponse.data.success) {
            setMessages(messagesResponse.data.data || []);
          } else {
            console.error("Failed to fetch conversations:", messagesResponse.data.message || "No message provided");
          }
        } else {
          console.error("Invalid API response structure:", messagesResponse.data);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err.message, err.response?.data, err.response?.status);
        if (err.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndConversations();
  }, [navigate]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <MessagesSidebar
          messages={messages}
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
        />
        <div className="w-full lg:w-3/4">
          {selectedConversation && user ? (
            <ConversationView
              selectedConversation={selectedConversation}
              user={user}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                No Conversation Selected
              </h3>
              <p className="text-gray-500">
                {user ? "Select a conversation from the sidebar to view messages." : "Please log in to view conversations."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messages;