import React, { useEffect, useState, useContext } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Itemcontext } from '../../ShopContextProvider';

const RiderChat = ({ userId, role }) => {
  const [socket, setSocket] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [newMessages, setNewMessages] = useState({});
  const { riderId } = useContext(Itemcontext);

  role = "Rider"; // Fix role assignment

  useEffect(() => {
    const newSocket = io('http://localhost:4000');
    setSocket(newSocket);

    const effectiveUserId = riderId;
    axios
      .get(`http://localhost:5000/api/inway-orders/${effectiveUserId}`)
      .then((response) => {
        const { orders } = response.data;
        const roomNames = orders.map((order) => order.items.map(item => item.foodName).join(', '));
        setRooms(roomNames);
        if (roomNames.length > 0) {
          // Automatically select the first order's room
          setCurrentRoom(roomNames[0]);
        }

        roomNames.forEach((room) => {
          newSocket.emit('joinRooms', { userId: effectiveUserId, role });
        });
      })
      .catch((error) => console.error('Error fetching orders:', error));

    return () => newSocket.disconnect();
  }, [riderId, role]);

  useEffect(() => {
    if (socket) {
      // Listen for chat history when the user joins a room
      socket.on('chatHistory', ({ room, chatHistory }) => {
        if (room === currentRoom) {
          setMessages(chatHistory.map(msg => ({
            sender: msg.sender,
            text: msg.message,
            timestamp: msg.timestamp,
          })));
        }
      });

      // Listen for new messages
      socket.on('receiveMessage', ({ sender, message, foodName }) => {
        if (foodName === currentRoom) {
          setMessages(prevMessages => [
            ...prevMessages,
            { sender, text: message }
          ]);

          // Mark the room as having a new message
          setNewMessages(prev => ({ ...prev, [foodName]: true }));
        }
      });
    }
  }, [socket, currentRoom]);

  const handleSendMessage = () => {
    if (message && currentRoom) {
      console.log('Sending message:', message, 'to room:', currentRoom);
      socket.emit('sendMessage', { foodName: currentRoom, sender: role, message });
      setMessage(''); // Clear input field
    }
  };

  const handleRoomSelect = (room) => {
    setCurrentRoom(room);
    setNewMessages(prev => ({ ...prev, [room]: false })); // Reset new message flag when room is selected
  };

  return (
    <div className="chat-container">
      <div className="rooms">
        <h3>Rooms</h3>
        {rooms.map((room) => (
          <button 
            key={room} 
            onClick={() => handleRoomSelect(room)}
            style={{ 
              position: 'relative', 
              backgroundColor: currentRoom === room ? 'lightgray' : 'transparent', 
              color: 'black', // Ensures the room name (food name) is always black
            }}
          >
            {room} 
            {newMessages[room] && <span style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'red',
            }} />}
          </button>
        ))}
      </div>

      {/* Show chat immediately for the selected room */}
      {currentRoom && (
        <div className="chat">
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className={msg.sender === role ? 'self' : 'other'}>
                <strong>{msg.sender}:</strong> {msg.text}
              </div>
            ))}
          </div>

          {/* Message input box visible only when room is selected */}
          <div className="message-input">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderChat;
