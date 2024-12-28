import React, { useEffect, useState, useContext } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Itemcontext } from '../../ShopContextProvider';
import './Chat.css';

const BuyerChat = ({ userId, role }) => {
  const [socket, setSocket] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const { buyerId } = useContext(Itemcontext);

  role = "Buyer"; // Fix role assignment

  useEffect(() => {
    const newSocket = io('http://localhost:4000');
    setSocket(newSocket);

    const effectiveUserId = buyerId;
    axios
      .get(`http://localhost:5000/api/inway-orders/${effectiveUserId}`)
      .then((response) => {
        const { orders } = response.data;
        const roomNames = orders.map((order) => order.foodName);
        setRooms(roomNames);
        roomNames.forEach((room) => {
          newSocket.emit('joinRooms', { userId: effectiveUserId, role });
        });
      })
      .catch((error) => console.error('Error fetching orders:', error));

    return () => newSocket.disconnect();
  }, [buyerId, role]);

  useEffect(() => {
    if (socket && currentRoom) {
      // Fetch chat history when a specific room is selected
      socket.emit('joinRooms', { userId: buyerId, role });

      // Listen for chat history when the user joins a room
      socket.on('chatHistory', ({ room, chatHistory }) => {
        if (room === currentRoom) {
          console.log('Received chat history for room:', room);
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

  return (
    <div className="chat-container">
      <div className="rooms">
        <h3>Rooms</h3>
        {rooms.map((room) => (
          <button key={room} onClick={() => setCurrentRoom(room)}>
            {room}
          </button>
        ))}
      </div>

      {/* Show chat only after a room is selected */}
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

export default BuyerChat;
