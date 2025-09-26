import { useState, useRef, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  CssBaseline,
  Drawer,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  CircularProgress,
  Paper,
  ThemeProvider,
  createTheme
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

const drawerWidth = 260;

// Custom theme with blue colors from original code
const theme = createTheme({
  palette: {
    primary: {
      main: '#007bff',
    },
    secondary: {
      main: '#00c6ff',
    },
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const [sessionMap, setSessionMap] = useState({});


  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Init default chat
  useEffect(() => {
    if (chatHistory.length === 0) {
      startNewChat();
    }
  }, []);

  const startNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat = { id: newChatId, title: "New Chat", messages: [] };
    setChatHistory((prev) => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([]);
    setInput("");
    setSessionMap((prev) => ({
      ...prev,
      [newChatId]: null // no session ID yet; backend will create it
    }));
  };

  const switchChat = (chatId) => {
    const chat = chatHistory.find((c) => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
    }
  };

  const updateCurrentChat = (updates) => {
    setChatHistory((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId ? { ...chat, ...updates } : chat
      )
    );
  };

  const clearCurrentChat = () => {
    setMessages([]);
    setInput("");
    updateCurrentChat({ messages: [], title: "New Chat" });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Update chat title if first message
    const currentChat = chatHistory.find(c => c.id === currentChatId);
    if (currentChat && currentChat.messages.length === 0) {
      const title = input.length > 30 ? input.substring(0, 30) + "..." : input;
      updateCurrentChat({ messages: newMessages, title });
    } else {
      updateCurrentChat({ messages: newMessages });
    }

    setInput("");
    setLoading(true);

    try {
      // Replace with your actual API call
      const response = await fetch(`${import.meta.env.VITE_API_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "session-id": sessionMap[currentChatId] || ""
        },
        body: JSON.stringify({
          question: input.trim(),
          k: 7
        })
      });

      if (!response.ok) {
        throw new Error(`Query failed with status ${response.status}`);
      }

      const responseData = await response.json();
      if (!sessionMap[currentChatId] && responseData.sessionId) {
        const printsession_id = setSessionMap((prev) => ({
          ...prev,
          [currentChatId]: responseData.sessionId

        }));
        console.log("sessionId for every new chat", printsession_id)
      }

      const aiMessage = {
        sender: "ai",
        text: responseData.answer || "No answer received from the system."
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      updateCurrentChat({ messages: finalMessages });

    } catch (err) {
      console.error("Query error:", err);
      const errorMessage = {
        sender: "ai",
        text: `❌ Error processing query: ${err.message || "Unknown error occurred"}`
      };
      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      updateCurrentChat({ messages: finalMessages });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId));
    if (currentChatId === chatId) {
      const remaining = chatHistory.filter((c) => c.id !== chatId);
      if (remaining.length > 0) switchChat(remaining[0].id);
      else startNewChat();
    }
  };

  const formatText = (text) => {
    if (!text) return text;

    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert *italic* to <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert numbered lists (1. 2. etc.)
    text = text.replace(/^(\d+\.\s+)(.*$)/gm, '<div style="margin: 8px 0; padding-left: 12px;"><span style="font-weight: 600; color: #007bff; margin-right: 8px;">$1</span>$2</div>');

    // Convert bullet points (* or -)
    text = text.replace(/^[\*\-]\s+(.*$)/gm, '<div style="margin: 6px 0; padding-left: 12px;">• $1</div>');

    // Convert headers (## or #)
    text = text.replace(/^###\s+(.*$)/gm, '<h3 style="font-size: 18px; font-weight: 600; color: #34495e; margin: 12px 0 6px 0; line-height: 1.3;">$1</h3>');
    text = text.replace(/^##\s+(.*$)/gm, '<h2 style="font-size: 20px; font-weight: 600; color: #2c3e50; margin: 16px 0 8px 0; line-height: 1.3;">$1</h2>');

    // Convert line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex", width: "100vw", height: "100vh" }}>
        <CssBaseline />

        {/* Sidebar */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={sidebarOpen}
          sx={{
            width: sidebarOpen ? drawerWidth : 0,
            flexShrink: 0,
            transition: 'width 0.3s ease',
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid #e1e5e9",
              boxShadow: "2px 0 8px rgba(0,0,0,0.1)"
            }
          }}
        >
          <Box sx={{ height: '64px' }} /> {/* Spacer for AppBar */}
          <Box sx={{ p: 2 }}>
            <Button
              startIcon={<AddIcon />}
              fullWidth
              variant="outlined"
              onClick={startNewChat}
              sx={{
                color: '#495057',
                borderColor: '#e1e5e9',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                  borderColor: '#e1e5e9'
                }
              }}
            >
              New Chat
            </Button>
          </Box>
          <Divider />
          <List sx={{ flex: 1, overflowY: 'auto' }}>
            {chatHistory.map((chat) => (
              <ListItem
                key={chat.id}
                button
                selected={currentChatId === chat.id}
                onClick={() => switchChat(chat.id)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: '#e3f2fd',
                  },
                  '&:hover': {
                    backgroundColor: currentChatId === chat.id ? '#e3f2fd' : '#f8f9fa',
                  },
                  color: '#495057',
                  fontSize: '14px'
                }}
              >
                <ListItemText
                  primary={`💬 ${chat.title}`}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }
                  }}
                />
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => deleteChat(chat.id, e)}
                  sx={{
                    opacity: currentChatId === chat.id ? 1 : 0,
                    transition: 'opacity 0.2s',
                    color: '#6c757d',
                    '&:hover': {
                      backgroundColor: '#dc3545',
                      color: '#ffffff'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Main Layout - Fixed to properly expand when sidebar is closed */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: sidebarOpen ? `calc(100vw - ${drawerWidth}px)` : '100vw',
            transition: 'width 0.3s ease',
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            minWidth: 0
          }}
        >
          {/* Header */}
          <AppBar
            position="static"
            elevation={0}
            sx={{
              backgroundColor: '#ffffff',
              borderBottom: "1px solid #e1e5e9",
              color: '#495057'
            }}
          >
            <Toolbar>
              <IconButton
                onClick={() => setSidebarOpen(!sidebarOpen)}
                sx={{ color: '#495057', mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Box sx={{ flexGrow: 1, textAlign: "center" }}>
                <Typography
                  variant="h6"
                  sx={{
                    background: "linear-gradient(90deg, #007bff, #00c6ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 600,
                    fontSize: '20px'
                  }}
                >
                  OASIS Co-pilot
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#6c757d",
                    fontSize: '12px',
                    display: 'block'
                  }}
                >
                  AI-Powered Assistant for OASIS-E Guidance
                </Typography>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Chat Area */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              bgcolor: "#f0f2f5"
            }}
          >
            {messages.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  color: '#6c757d',
                  p: 5
                }}
              >
                <Box sx={{ fontSize: '64px', mb: 3 }}>💬</Box>
                <Typography variant="h4" sx={{ color: '#495057', mb: 1.5, fontWeight: 600 }}>
                  Welcome to OASIS Co-pilot
                </Typography>
                <Typography sx={{ mb: 4, maxWidth: 400, lineHeight: 1.5 }}>
                  Your AI assistant for OASIS-E guidance. Ask questions and get instant help.
                </Typography>
             </Box>
            ) : (
              <Box sx={{ p: 2.5 }}>
                {messages.map((msg, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                      mb: 2,
                    }}
                  >
                    <Paper
                      elevation={2}
                      sx={{
                        p: 2.25,
                        maxWidth: "70%",
                        bgcolor: msg.sender === "user" ? "#007bff" : "#ffffff",
                        color: msg.sender === "user" ? "#ffffff" : "#333333",
                        borderRadius: msg.sender === "user"
                          ? "20px 20px 4px 20px"
                          : "20px 20px 20px 4px",
                        border: msg.sender === "ai" ? "1px solid #e9ecef" : "none",
                        wordBreak: 'break-word',
                        fontSize: '15px',
                        lineHeight: 1.6
                      }}
                    >
                      {msg.sender === "ai" ? (
                        <Box
                          dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                        />
                      ) : (
                        <Typography variant="body2" component="div">
                          {msg.text}
                        </Typography>
                      )}
                    </Paper>
                  </Box>
                ))}

                {loading && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-start",
                      mb: 2
                    }}
                  >
                    <Paper
                      elevation={2}
                      sx={{
                        p: 2.25,
                        bgcolor: "#ffffff",
                        border: "1px solid #e9ecef",
                        borderRadius: "20px 20px 20px 4px",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5
                      }}
                    >
                      <CircularProgress size={20} sx={{ color: '#007bff' }} />
                      <Typography variant="body2" sx={{ color: "#6c757d", fontSize: '15px' }}>
                        OASIS Co-pilot is thinking...
                      </Typography>
                    </Paper>
                  </Box>
                )}

                <div ref={messagesEndRef} />
              </Box>
            )}
          </Box>

          {/* Input Area */}
          <Box
            sx={{
              p: 2.5,
              borderTop: "1px solid #e1e5e9",
              bgcolor: "#ffffff"
            }}
          >
            <Box
              sx={{
                maxWidth: 768,
                mx: "auto",
                display: "flex",
                gap: 1.5,
                alignItems: 'flex-end'
              }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask your questions..."
                disabled={loading}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    fontSize: '15px',
                    minHeight: '50px',
                    '&:hover fieldset': {
                      borderColor: '#007bff',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#007bff',
                      borderWidth: '2px'
                    }
                  }
                }}
              />
              <Button
                variant="contained"
                disabled={loading || !input.trim()}
                onClick={sendMessage}
                sx={{
                  minWidth: '80px',
                  height: '50px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  backgroundColor: loading || !input.trim() ? '#adb5bd' : '#007bff',
                  '&:hover': {
                    backgroundColor: loading || !input.trim() ? '#adb5bd' : '#0056b3'
                  }
                }}
              >
                {loading ? "..." : "Ask"}
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={loading || messages.length === 0}
                onClick={clearCurrentChat}
                sx={{
                  fontSize: '15px',
                  fontWeight: 600,
                  borderWidth: '12px',
                  '&:hover': {
                    borderWidth: '2px'
                  },
                  minWidth: '80px',
                  height: '50px',
                }}
              >
                Clear
              </Button>
            </Box>

            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: '#6c757d',
                mt: 1.5,
                maxWidth: 768,
                mx: 'auto'
              }}
            >
              OASIS Co-pilot can make mistakes. Consider verifying important information.
            </Typography>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;