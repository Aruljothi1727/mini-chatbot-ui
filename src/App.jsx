import { useState } from "react";
import axios from "axios";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const formatText = (text) => {
    if (!text) return text;

    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert *italic* to <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert numbered lists (1. 2. etc.)
    text = text.replace(/^(\d+\.\s+)(.*$)/gm, '<div class="list-item"><span class="list-number">$1</span>$2</div>');

    // Convert bullet points (* or -)
    text = text.replace(/^[\*\-]\s+(.*$)/gm, '<div class="bullet-item">• $1</div>');

    // Convert headers (## or #)
    text = text.replace(/^###\s+(.*$)/gm, '<h3 class="chat-h3">$1</h3>');
    text = text.replace(/^#\s+(.*$)/gm, '<h2 class="chat-h2">$1</h2>');

    // Convert line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const newMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      // Call your backend (replace URL later)
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/chat`, {
        params: { query: input },
      });

      // Add AI response
      setMessages((prev) => [...prev, { sender: "ai", text: res.data.response }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: "ai", text: "⚠️ Error fetching response" }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",   // full screen height
      width: "100vw"     // full screen width
    }}>
      <div style={{
        maxWidth: "2000px",
        margin: "20px 20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        height: "calc(100vh - 40px)",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "20px"
          }}
        >
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              margin: 0,
              background: "linear-gradient(90deg, #007bff, #00c6ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            NeuraChat
          </h1>
          <p style={{ textAlign: "center", fontSize: "14px", color: "#6c757d", marginTop: "6px" }}>
            AI-Powered Conversational Assistant
          </p>
        </div>

        {/* Chat Window */}
        <div style={{
          flex: 1,
          border: "1px solid #e1e5e9",
          borderRadius: "12px",
          margin: "20px 0",
          padding: "20px",
          overflowY: "auto",
          backgroundColor: "#f8f9fa",
          position: "relative"
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: "center",
              color: "#6c757d",
              marginTop: "50px",
              fontSize: "16px"
            }}>
              👋 Hello! Start a conversation by typing a message below.
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                margin: "15px 0",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "12px 16px",
                  borderRadius: "18px",
                  backgroundColor: msg.sender === "user" ? "#007bff" : "#ffffff",
                  color: msg.sender === "user" ? "#ffffff" : "#333333",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  border: msg.sender === "ai" ? "1px solid #e1e5e9" : "none",
                  lineHeight: "1.5",
                  fontSize: "14px"
                }}
              >
                {msg.sender === "ai" ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                    style={{
                      // Styles for formatted content
                      '--chat-h2-color': '#2c3e50',
                      '--chat-h3-color': '#34495e',
                      '--list-item-margin': '8px 0',
                      '--bullet-item-margin': '4px 0'
                    }}
                  />
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{
              display: "flex",
              justifyContent: "flex-start",
              margin: "15px 0"
            }}>
              <div style={{
                padding: "12px 16px",
                borderRadius: "18px",
                backgroundColor: "#ffffff",
                border: "1px solid #e1e5e9",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  color: "#6c757d",
                  fontSize: "14px"
                }}>
                  <div style={{
                    display: "inline-block",
                    width: "20px",
                    height: "20px",
                    border: "2px solid #f3f3f3",
                    borderTop: "2px solid #007bff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginRight: "8px"
                  }}></div>
                  NeuraChat is typing...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{
          display: "flex",
          gap: "10px",
          padding: "0 0 20px 0"
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "25px",
              border: "2px solid #e1e5e9",
              outline: "none",
              fontSize: "14px",
              transition: "border-color 0.2s",
            }}
            placeholder="Type your message here..."
            disabled={loading}
            onFocus={(e) => e.target.style.borderColor = "#007bff"}
            onBlur={(e) => e.target.style.borderColor = "#e1e5e9"}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: "12px 24px",
              borderRadius: "25px",
              border: "none",
              backgroundColor: loading || !input.trim() ? "#6c757d" : "#007bff",
              color: "#ffffff",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s"
            }}
          >
            {loading ? "..." : "Send"}
          </button>
          <button
            onClick={clearChat}
            style={{
              padding: "12px 20px",
              borderRadius: "25px",
              border: "2px solid #dc3545",
              backgroundColor: "transparent",
              color: "#dc3545",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#dc3545";
              e.target.style.color = "#ffffff";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#dc3545";
            }}
          >
            Clear History
          </button>
        </div>

        {/* CSS Styles */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .chat-h2 {
            font-size: 18px;
            font-weight: 600;
            color: var(--chat-h2-color);
            margin: 16px 0 8px 0;
            line-height: 1.3;
          }
          
          .chat-h3 {
            font-size: 16px;
            font-weight: 600;
            color: var(--chat-h3-color);
            margin: 12px 0 6px 0;
            line-height: 1.3;
          }
          
          .list-item {
            margin: var(--list-item-margin);
            padding-left: 8px;
          }
          
          .list-number {
            font-weight: 600;
            color: #007bff;
          }
          
          .bullet-item {
            margin: var(--bullet-item-margin);
            padding-left: 8px;
          }
          
          /* Scrollbar styling */
          ::-webkit-scrollbar {
            width: 6px;
          }
          
          ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
        `
        }} />
      </div>
    </div>
  );
}

export default App;
