import { useState, useRef } from "react";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isDocumentUploaded, setIsDocumentUploaded] = useState(false);
  const fileInputRef = useRef(null);

  // Maximum file size: 10MB (recommended for PDF/DOC processing)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  /**
   * formatText: Converts markdown-style text to HTML
   * - Handles bold (**text**), italic (*text*), headers (# ##), lists
   * - Used for AI responses to display formatted content
   */
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
    text = text.replace(/^##\s+(.*$)/gm, '<h2 class="chat-h2">$1</h2>');

    // Convert line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
  };

  /**
   * validateFile: Checks file extension, MIME type, and size
   * - Ensures only PDF and DOC files are uploaded
   * - Prevents oversized files that could crash the backend
   */
  const validateFile = (file) => {
    console.log('Validating file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      maxSize: MAX_FILE_SIZE
    });

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      console.log('Invalid extension for file:', fileName);
      return `Only PDF and DOC/DOCX files are allowed. You selected: ${file.name}`;
    }

    // Check MIME type for additional security (more lenient check)
    // Some browsers might not set MIME type correctly, so we'll be more flexible
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      console.log('Invalid MIME type:', file.type);
      return `Invalid file type detected. Expected: PDF or DOC/DOCX, Got: ${file.type}`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      console.log(`File too large: ${fileSizeMB}MB, max: ${maxSizeMB}MB`);
      return `File size (${fileSizeMB}MB) exceeds the maximum limit of ${maxSizeMB}MB`;
    }

    console.log('File validation passed');
    return null; // Valid file
  };

  /**
   * handleFileUpload: Processes file selection and validation
   * - Validates file before setting it for upload
   * - Displays error messages for invalid files
   */
  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    // Clear previous errors and file
    setUploadError("");
    setUploadedFile(null);

    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.size, 'bytes');

    const validationError = validateFile(file);
    if (validationError) {
      console.log('Validation failed:', validationError);
      setUploadError(validationError);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    console.log('File validation successful, setting uploaded file');
    setUploadedFile(file);
  };

  /**
   * removeFile: Clears uploaded file and resets input
   * - Allows user to remove selected file before sending
   */
  const removeFile = () => {
    setUploadedFile(null);
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * uploadDocument: Uploads document to backend and stores it in vector DB
   * - Called when user wants to upload a document for processing
   */
  const uploadDocument = async () => {
    if (!uploadedFile) return;

    setLoading(true);

    // Add user message indicating document upload
    const uploadMessage = {
      sender: "user",
      text: "📄 Uploading document...",
      file: { name: uploadedFile.name, size: uploadedFile.size }
    };
    setMessages((prev) => [...prev, uploadMessage]);

    try {
      // Prepare FormData to send file
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const responseData = await response.json();

      // Add success message
      const successMessage = {
        sender: "ai",
        text: `✅ ${responseData.message}\n\n**Document Details:**\n- Filename: ${responseData.details.filename}\n- Status: ${responseData.details.status}\n\nYou can now ask questions about this document!`
      };

      setMessages((prev) => [...prev, successMessage]);
      setIsDocumentUploaded(true);

    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = {
        sender: "ai",
        text: `❌ Failed to upload document: ${err.message || "Unknown error occurred"}`
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      removeFile(); // Clear uploaded file after processing
    }
  };

  /**
   * sendMessage: Handles text queries to the backend
   * - Sends questions about uploaded documents or general queries
   */
  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = {
      sender: "user",
      text: input.trim()
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setLoading(true);

    try {
      let responseData;

      // if (isDocumentUploaded) {
        // Query the uploaded document
        const response = await fetch("http://localhost:8000/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: currentInput,
            k: 3 // Retrieve top 3 relevant chunks
          })
        });

        if (!response.ok) {
          throw new Error(`Query failed with status ${response.status}`);
        }

        responseData = await response.json();

        // Format the AI response
        const aiMessage = {
          sender: "ai",
          text: responseData.answer || "No answer received from the system."
        };
        setMessages((prev) => [...prev, aiMessage]);

      // } else {
      //   // No document uploaded - provide general response
      //   const generalResponse = {
      //     sender: "ai",
      //     text: `You asked: "${currentInput}"\n\n💡 **Tip:** Upload a document (PDF or DOC) first to ask specific questions about its content. Without a document, I can only provide general responses.`
      //   };
      //   setMessages((prev) => [...prev, generalResponse]);
      // }

    } catch (err) {
      console.error("Query error:", err);
      const errorMessage = {
        sender: "ai",
        text: `❌ Error processing query: ${err.message || "Unknown error occurred"}`
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * clearChat: Resets the entire chat state
   * - Clears messages, input, and uploaded file
   */
  const clearChat = () => {
    setMessages([]);
    setInput("");
    setIsDocumentUploaded(false);
    removeFile();
  };

  /**
   * handleKeyPress: Enables Enter to send (Shift+Enter for new line)
   * - Prevents default Enter behavior when sending
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /**
   * formatFileSize: Converts bytes to human-readable format
   * - Used to display file size in a user-friendly way
   */
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1048576) + ' MB';
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",   // Full viewport height for centering
      width: "100vw",    // Full viewport width
      backgroundColor: "#f0f2f5" // Light background for better contrast
    }}>
      <div style={{
        maxWidth: "1200px", // Reasonable max width for readability
        width: "90%",       // Responsive width
        margin: "20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        height: "calc(100vh - 40px)", // Full height minus margins
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Header Section */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "20px",
          padding: "20px 0"
        }}>
          <h1 style={{
            fontSize: "32px",
            fontWeight: "700",
            margin: 0,
            background: "linear-gradient(90deg, #007bff, #00c6ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textAlign: "center"
          }}>
            NeuraChat Pro
          </h1>
          <p style={{
            textAlign: "center",
            fontSize: "16px",
            color: "#6c757d",
            marginTop: "8px",
            fontWeight: "400"
          }}>
            AI-Powered Assistant with Document Processing
          </p>

          {/* Document Status Indicator */}
          {isDocumentUploaded && (
            <div style={{
              marginTop: "12px",
              padding: "8px 16px",
              backgroundColor: "#d4edda",
              color: "#155724",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid #c3e6cb"
            }}>
              <span>✅</span>
              Document uploaded - Ready for questions!
            </div>
          )}
        </div>

        {/* Chat Window - Dynamic height based on content */}
        <div style={{
          flex: 1, // Takes remaining space, making it expandable
          border: "1px solid #e1e5e9",
          borderRadius: "16px",
          padding: "24px",
          overflowY: "auto", // Scrollable when content overflows
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
          position: "relative",
          // Minimum height when no messages - keeps chat window visible but compact
          minHeight: messages.length === 0 ? "200px" : "auto",
          display: "flex",
          flexDirection: "column"
        }}>

          {/* Empty state - shown when no messages */}
          {messages.length === 0 && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1, // Centers content vertically in available space
              textAlign: "center",
              color: "#6c757d",
              fontSize: "16px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
              <h3 style={{ margin: "0 0 8px 0", color: "#495057" }}>Welcome to NeuraChat Pro</h3>
              {/* <p style={{ margin: 0, fontSize: "14px" }}>
                Upload a document (PDF, DOC) first, then ask questions about it
              </p> */}
            </div>
          )}

          {/* Messages Container - expands as messages are added */}
          <div style={{ flex: messages.length > 0 ? 1 : 0 }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                  margin: "16px 0",
                }}
              >
                <div style={{
                  maxWidth: "75%",
                  padding: "14px 18px",
                  borderRadius: msg.sender === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  backgroundColor: msg.sender === "user" ? "#007bff" : "#f8f9fa",
                  color: msg.sender === "user" ? "#ffffff" : "#333333",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  border: msg.sender === "ai" ? "1px solid #e9ecef" : "none",
                  lineHeight: "1.6",
                  fontSize: "15px",
                  position: "relative"
                }}>

                  {/* File attachment indicator */}
                  {msg.file && (
                    <div style={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      marginBottom: "8px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span>📄</span>
                      <span>{msg.file.name}</span>
                      <span style={{ opacity: 0.8 }}>({formatFileSize(msg.file.size)})</span>
                    </div>
                  )}

                  {/* Message content */}
                  {msg.sender === "ai" ? (
                    <div dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Loading indicator */}
          {loading && (
            <div style={{
              display: "flex",
              justifyContent: "flex-start",
              margin: "16px 0"
            }}>
              <div style={{
                padding: "14px 18px",
                borderRadius: "20px 20px 20px 4px",
                backgroundColor: "#f8f9fa",
                border: "1px solid #e9ecef",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <div className="loading-spinner"></div>
                <span style={{ color: "#6c757d", fontSize: "15px" }}>
                  NeuraChat is {uploadedFile ? 'processing document' : 'thinking'}...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* File Upload Section */}
        <div style={{
          padding: "16px 0 8px 0",
          borderTop: messages.length > 0 ? "1px solid #e9ecef" : "none"
        }}>

          {/* File upload error - More prominent display */}
          {uploadError && (
            <div style={{
              backgroundColor: "#f8d7da",
              color: "#721c24",
              padding: "16px 20px",
              borderRadius: "12px",
              marginBottom: "16px",
              fontSize: "15px",
              border: "2px solid #f1aeb5",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 2px 8px rgba(220, 53, 69, 0.15)"
            }}>
              <span style={{ fontSize: "20px" }}>🚫</span>
              <div>
                <strong>Upload Error:</strong> {uploadError}
              </div>
            </div>
          )}

          {/* Selected file display */}
          {uploadedFile && (
            <div style={{
              backgroundColor: "#d1ecf1",
              color: "#0c5460",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "12px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #bee5eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📄</span>
                <span><strong>{uploadedFile.name}</strong> ({formatFileSize(uploadedFile.size)})</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={uploadDocument}
                  disabled={loading}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#28a745",
                    color: "#ffffff",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}
                >
                  Upload
                </button>
                <button
                  onClick={removeFile}
                  disabled={loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0c5460",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "18px",
                    padding: "4px 8px",
                    borderRadius: "4px"
                  }}
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* File upload input */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "2px solid #6c757d",
                backgroundColor: "transparent",
                color: "#6c757d",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = "#6c757d";
                  e.target.style.color = "#ffffff";
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#6c757d";
                }
              }}
            >
              📎 Select Document
            </button>
            <span style={{ fontSize: "12px", color: "#6c757d" }}>
              PDF, DOC, DOCX (max {MAX_FILE_SIZE / (1024 * 1024)}MB)
            </span>
          </div>
        </div>

        {/* Input Area */}
        <div style={{
          display: "flex",
          gap: "12px",
          padding: "0 0 20px 0",
          alignItems: "flex-end"
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: "12px",
              border: "2px solid #e1e5e9",
              outline: "none",
              fontSize: "15px",
              transition: "border-color 0.2s",
              resize: "none",
              minHeight: "50px",
              maxHeight: "120px",
              fontFamily: "inherit"
            }}
            placeholder={isDocumentUploaded ? "Ask a question about your document..." : "Ask your Questions..."}
            disabled={loading}
            onFocus={(e) => e.target.style.borderColor = "#007bff"}
            onBlur={(e) => e.target.style.borderColor = "#e1e5e9"}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: "14px 24px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: (loading || !input.trim()) ? "#adb5bd" : "#007bff",
              color: "#ffffff",
              cursor: (loading || !input.trim()) ? "not-allowed" : "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "background-color 0.2s",
              minWidth: "80px",
              height: "50px"
            }}
          >
            {loading ? "..." : "Ask"}
          </button>
          <button
            onClick={clearChat}
            disabled={loading}
            style={{
              padding: "14px 20px",
              borderRadius: "12px",
              border: "2px solid #dc3545",
              backgroundColor: "transparent",
              color: "#dc3545",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "15px",
              fontWeight: "600",
              transition: "all 0.2s",
              height: "50px"
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "#dc3545";
                e.target.style.color = "#ffffff";
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#dc3545";
              }
            }}
          >
            Clear
          </button>
        </div>

        {/* CSS Styles */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          .chat-h2 {
            font-size: 20px;
            font-weight: 600;
            color: #2c3e50;
            margin: 16px 0 8px 0;
            line-height: 1.3;
          }
          
          .chat-h3 {
            font-size: 18px;
            font-weight: 600;
            color: #34495e;
            margin: 12px 0 6px 0;
            line-height: 1.3;
          }
          
          .list-item {
            margin: 8px 0;
            padding-left: 12px;
          }
          
          .list-number {
            font-weight: 600;
            color: #007bff;
            margin-right: 8px;
          }
          
          .bullet-item {
            margin: 6px 0;
            padding-left: 12px;
          }
          
          /* Scrollbar styling */
          ::-webkit-scrollbar {
            width: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          
          /* Textarea auto-resize */
          textarea {
            overflow-y: hidden;
          }
        `
        }} />
      </div>
    </div>
  );
}

export default App;