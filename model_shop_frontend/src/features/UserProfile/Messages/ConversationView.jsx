import React, { useState, useEffect, useRef } from "react";
import api from "../../../api/index";
import { FaUser } from "react-icons/fa";

function ConversationView({ selectedConversation, user }) {
  const [conversationMessages, setConversationMessages] = useState([]);
  const [otherUserName, setOtherUserName] = useState("Unknown");
  const [newMessage, setNewMessage] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) {
        setConversationMessages([]);
        setOtherUserName("Unknown");
        return;
      }

      try {
        const response = await api.get(`/messages?conversation_id=${selectedConversation}`);
        if (response.data.success) {
          setConversationMessages(response.data.data || []);
          setOtherUserName(response.data.other_user_name || "Unknown");
        }
      } catch (err) {
        console.error("Failed to fetch messages: " + (err.message || "Unknown error"));
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversationMessages]);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4"];
      const maxSize = 10 * 1024 * 1024;
      if (!validTypes.includes(file.type)) {
        return;
      }
      if (file.size > maxSize) {
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !mediaFile) return;

    try {
      const formData = new FormData();
      // Use other_user_id from the conversation to determine receiver_id
      const response = await api.get(`/messages?conversation_id=${selectedConversation}`);
      const otherUserId = response.data.other_user_id;
      formData.append("receiver_id", otherUserId);
      formData.append("message", newMessage);
      if (mediaFile) {
        formData.append("media", mediaFile);
      }

      const sendResponse = await api.post("/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (sendResponse.data.success) {
        const newMsg = {
          message_id: Date.now(),
          message: newMessage,
          created_at: new Date().toISOString(),
          is_sent: true,
          media_url: mediaFile ? URL.createObjectURL(mediaFile) : null,
          media_type: mediaFile ? mediaFile.type : null,
        };
        setConversationMessages([...conversationMessages, newMsg]);
        setNewMessage("");
        setMediaFile(null);
        setMediaPreview(null);
      }
    } catch (err) {
      console.error("Failed to send message: " + (err.message || "Unknown error"));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <FaUser className="text-gray-700" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{otherUserName}</h2>
      </div>
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationMessages.map((msg) => (
          <div
            key={msg.message_id}
            className={`flex ${msg.is_sent ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.is_sent ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.media_url && (
                <div className="mb-2">
                  {msg.media_type.startsWith("image") ? (
                    <img
                      src={msg.media_url}
                      alt="Media"
                      className="max-w-full rounded-lg"
                    />
                  ) : (
                    <video
                      src={msg.media_url}
                      className="max-w-full rounded-lg"
                      controls
                    />
                  )}
                </div>
              )}
              <p>{msg.message}</p>
              <div className="text-xs mt-1 opacity-75">
                {new Date(msg.created_at).toLocaleTimeString()}
                {msg.is_sent && (
                  <span className="ml-2">
                    {msg.is_read ? "✔️ Seen" : "✔️ Delivered"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-gray-200">
        {mediaPreview && (
          <div className="mb-2 flex items-center gap-2">
            {mediaFile.type.startsWith("image") ? (
              <img
                src={mediaPreview}
                alt="Media preview"
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <video
                src={mediaPreview}
                className="w-16 h-16 object-cover rounded-lg"
                controls
              />
            )}
            <button
              onClick={() => {
                setMediaFile(null);
                setMediaPreview(null);
              }}
              className="text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows="2"
          />
          <label className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg cursor-pointer">
            <span>Attach</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,video/mp4"
              onChange={handleMediaChange}
              className="hidden"
            />
          </label>
          <button
            onClick={handleSendMessage}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConversationView;