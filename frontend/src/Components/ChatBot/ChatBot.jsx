import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  X,
  Bot,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Bus,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";

const ChatBot = ({ setShowChatBot, user }) => {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "bot",
      text: "👋 Hello! I'm your bus booking assistant. I can help you:\n\n• Find buses between cities\n• Check schedules and availability\n• Book seats for you\n• Answer any bus-related questions\n\nJust tell me where you'd like to travel from and to! 🚌",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatMessagesRef = useRef(null);

  const userId = user._id;

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      sender: "user",
      text: message.trim(),
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, userMessage]);
    const currentMessage = message.trim();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          message: currentMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const botReply = {
        sender: "bot",
        text: data.reply || "I'm sorry, I didn't get a proper response.",
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, botReply]);
    } catch (error) {
      console.error("Error sending message:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "🚨 Sorry, I'm having trouble connecting to the server. Please check if the backend is running on port 3001 and try again.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const parseMarkdown = (text) => {
    text = text.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-bold text-blue-700">$1</strong>'
    );

    text = text.replace(
      /\*(.*?)\*/g,
      '<em class="font-medium text-gray-700">$1</em>'
    );
    return text;
  };

  const parsePaymentLinks = (text) => {
    const paymentLinkRegex = /(\/pay\/[a-f0-9-]+)/gi;
    return text.replace(paymentLinkRegex, (match) => {
      const fullUrl = `http://localhost:3001${match}`;
      return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="payment-link-button">Complete Payment 💳</a>`;
    });
  };

  const renderBotMessage = (text) => {
    if (text.includes("<button")) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: text }}
          className="bot-message-content"
        />
      );
    }

    return (
      <div className="whitespace-pre-line">
        {text.split("\n").map((line, index) => {
          const trimmedLine = line.trim();

          if (trimmedLine.startsWith("* ")) {
            const bulletContent = trimmedLine.substring(2);
            let parsedContent = parseMarkdown(bulletContent);
            parsedContent = parsePaymentLinks(parsedContent);
            return (
              <div key={index} className="flex items-start mb-2">
                <span className="text-blue-600 mr-2 mt-1">•</span>
                <div
                  dangerouslySetInnerHTML={{ __html: parsedContent }}
                  className="flex-1"
                />
              </div>
            );
          }

          if (trimmedLine) {
            let parsedLine = parseMarkdown(trimmedLine);
            parsedLine = parsePaymentLinks(parsedLine);
            return (
              <div
                key={index}
                className="mb-1"
                dangerouslySetInnerHTML={{ __html: parsedLine }}
              />
            );
          }

          return <br key={index} />;
        })}
      </div>
    );
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const quickActions = [
    { text: "Find buses from Bangalore to Mumbai", icon: <MapPin size={16} /> },
    { text: "Show buses from Delhi to Goa", icon: <Bus size={16} /> },
    { text: "Check available seats", icon: <Users size={16} /> },
    { text: "Help with booking", icon: <CreditCard size={16} /> },
  ];

  const handleQuickAction = (actionText) => {
    setMessage(actionText);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-4xl h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Bus Booking Assistant</h2>
              <p className="text-blue-100 text-sm">Always here to help! 🚌</p>
            </div>
          </div>
          <button
            onClick={() => setShowChatBot(false)}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
            title="Close chat">
            <X size={20} />
          </button>
        </div>

        {/* Chat Messages */}
        <div
          ref={chatMessagesRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              } items-start space-x-2`}>
              {msg.sender === "bot" && (
                <div className="bg-blue-600 p-2 rounded-full flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : msg.isError
                    ? "bg-red-100 text-red-700 border border-red-200 rounded-bl-md"
                    : "bg-white text-gray-800 shadow-sm border border-gray-200 rounded-bl-md"
                }`}>
                {msg.sender === "bot" ? (
                  renderBotMessage(msg.text)
                ) : (
                  <div className="whitespace-pre-line">{msg.text}</div>
                )}
                <div
                  className={`text-xs mt-2 opacity-70 ${
                    msg.sender === "user" ? "text-blue-100" : "text-gray-500"
                  }`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>

              {msg.sender === "user" && (
                <div className="bg-blue-600 p-2 rounded-full flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start items-start space-x-2">
              <div className="bg-blue-600 p-2 rounded-full">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-md p-4 shadow-sm border border-gray-200">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="Type your message here... (e.g., 'Find buses from Bangalore to Mumbai')"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center ${
                isLoading || !message.trim()
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              } text-white`}
              disabled={isLoading || !message.trim()}>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Powered by AI • Your conversation is secure
          </p>
        </div>
      </div>

      {/* Custom styles for payment buttons */}
      <style jsx>{`
        .bot-message-content button {
          background-color: #22c55e !important;
          color: white !important;
          padding: 8px 16px !important;
          border: none !important;
          border-radius: 8px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          margin-top: 8px !important;
          transition: background-color 0.2s !important;
          text-decoration: none !important;
          display: inline-block !important;
        }
        .bot-message-content button:hover {
          background-color: #16a34a !important;
        }
        .payment-link-button {
          background: linear-gradient(135deg, #22c55e, #16a34a) !important;
          color: white !important;
          padding: 10px 20px !important;
          border: none !important;
          border-radius: 10px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          margin: 8px 4px !important;
          transition: all 0.3s ease !important;
          text-decoration: none !important;
          display: inline-block !important;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3) !important;
        }
        .payment-link-button:hover {
          background: linear-gradient(135deg, #16a34a, #15803d) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4) !important;
        }
        .payment-link-button:active {
          transform: translateY(0px) !important;
        }
      `}</style>
    </div>
  );
};

export default ChatBot;
