import { useState, useEffect, useRef } from 'react';

const Chat = ({ streamId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("Ansh");
  const wsRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const keepAliveTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const userId = useRef(`user_${Math.floor(Math.random() * 10000)}`);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    if (!streamId) {
      setConnected(false);
      return;
    }
    
    const ws = new WebSocket('wss://s-usc1a-nss-2038.firebaseio.com/.ws?v=5&p=1:101446963418:web:a32787495440afbce695e3&ns=examdostappx');
    
    ws.onopen = () => {
      setConnected(true);
      setError(null);
      lastActivityRef.current = Date.now();
      
      const initialRequest = {
        t: "d",
        d: {
          r: 7,
          a: "q",
          b: {
            p: `/youtubedata/${streamId}`,
            q: {
              l: 50,
              vf: "r"
            },
            t: 1,
            h: ""
          }
        }
      };
      
      ws.send(JSON.stringify(initialRequest));
    };
    
    ws.onmessage = (event) => {
      lastActivityRef.current = Date.now();
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.t === "d" && data.d && data.d.b && data.d.b.d) {
          const chatData = data.d.b.d;
          
          const newMessages = [];
          for (const key in chatData) {
            if (Object.prototype.hasOwnProperty.call(chatData, key)) {
              const msg = chatData[key];
              if (msg.userComment) {
                newMessages.push({
                  id: key,
                  text: msg.userComment,
                  sender: msg.userName || "Anonymous",
                  timestamp: msg.userTime || new Date(msg.postedAt).toLocaleTimeString(),
                  postedAt: msg.postedAt
                });
              }
            }
          }
          
          if (newMessages.length > 0) {
            setMessages(prevMessages => {
              const combinedMessages = [...prevMessages];
              
              newMessages.forEach(newMsg => {
                const existingIndex = combinedMessages.findIndex(msg => msg.id === newMsg.id);
                if (existingIndex === -1) {
                  combinedMessages.push(newMsg);
                }
              });
              
              return combinedMessages.sort((a, b) => a.postedAt - b.postedAt);
            });
          }
        }
      } catch (error) {
        setError('Error processing message');
      }
    };
    
    ws.onclose = () => {
      setConnected(false);
      
      if (streamId) {
        setTimeout(() => {
          if (wsRef.current === ws) {
            wsRef.current = null;
          }
        }, 3000);
      }
    };
    
    ws.onerror = () => {
      setError('WebSocket connection error');
    };
    
    wsRef.current = ws;
    
    const keepAliveInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (Date.now() - lastActivityRef.current > 60000) {
          wsRef.current.send("0");
          lastActivityRef.current = Date.now();
        }
      }
    }, 60000);
    
    keepAliveTimerRef.current = keepAliveInterval;
    
    setMessages([]);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (keepAliveTimerRef.current) {
        clearInterval(keepAliveTimerRef.current);
        keepAliveTimerRef.current = null;
      }
    };
  }, [streamId]);
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !streamId) {
      return;
    }
    
    lastActivityRef.current = Date.now();
    
    const messageId = `-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageObject = {
      t: "d",
      d: {
        r: 18,
        a: "p",
        b: {
          p: `/youtubedata/${streamId}/${messageId}`,
          d: {
            pinstatus: "0",
            postedAt: timestamp,
            userComment: newMessage,
            userFlag: "0",
            userId: userId.current,
            userName: userName,
            userTime: currentTime
          }
        }
      }
    };
    
    wsRef.current.send(JSON.stringify(messageObject));
    
    setMessages(prevMessages => [
      ...prevMessages,
      {
        id: messageId,
        text: newMessage,
        sender: 'You',
        timestamp: currentTime,
        postedAt: timestamp
      }
    ]);
    
    setNewMessage('');
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4 h-[500px] flex flex-col border border-gray-700">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <h2 className="text-lg font-medium text-blue-400">Live Chat</h2>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-400">{connected ? 'Connected' : 'Disconnected'}</span>
          {streamId && <span className="ml-2 text-xs text-gray-500 truncate max-w-[120px]">({streamId})</span>}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900 bg-opacity-50 text-red-200 text-sm p-2 mb-3 rounded">
          {error}
        </div>
      )}
      
      {!streamId && (
        <div className="bg-yellow-900 bg-opacity-50 text-yellow-200 text-sm p-2 mb-3 rounded">
          No stream ID detected. Please load a video first.
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto mb-3 space-y-2 custom-scrollbar px-1">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center p-4 flex items-center justify-center h-full">
            <div>
              {connected ? 'No messages yet' : streamId ? 'Connecting...' : 'Load a video to see chat messages'}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-2 rounded-lg max-w-[85%] ${
                msg.sender === 'You' 
                  ? 'bg-blue-700 ml-auto' 
                  : 'bg-gray-700 mr-auto'
              } shadow-sm`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`font-medium text-sm ${msg.sender === 'You' ? 'text-blue-200' : 'text-gray-300'}`}>
                  {msg.sender}
                </span>
                <span className="text-xs text-gray-400 ml-2">{msg.timestamp}</span>
              </div>
              <p className="text-sm break-words">{msg.text}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2 mt-auto">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={streamId ? "Type a message..." : "Load a video to chat"}
          disabled={!connected || !streamId}
          className="flex-1 py-2 px-3 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!connected || !newMessage.trim() || !streamId}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors duration-200"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;