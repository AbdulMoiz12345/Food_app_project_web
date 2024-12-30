import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import axios from 'axios';
import { Itemcontext } from '../../ShopContextProvider';
import './Rider.css';

const Rider = () => {
  const { riderId } = useContext(Itemcontext);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [hasOngoingOrder, setHasOngoingOrder] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate for navigation

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/rider-orders', {
          params: { riderId }
        });
        setOrders(response.data.orders);
        setHasOngoingOrder(response.data.hasOngoingOrder);
  
        // Automatically set the ongoing order as selected if exists
        if (response.data.hasOngoingOrder) {
          setSelectedOrder(response.data.orders[0]); // Assuming one ongoing order at a time
        }
      } catch (error) {
        console.error('Error fetching rider orders:', error);
      }
    };
  
    fetchOrders();
  }, [riderId]); // Fetch orders when riderId changes

  // Handle marking an order as complete
  const handleComplete = async (orderId) => {
    try {
      // Send only the riderId and orderId to the backend to mark the order as completed
      await axios.patch('http://localhost:5000/api/completeorder', {
        riderId, // Send the rider's ID
        orderId, // Send the order ID to the backend
      });

      // Remove completed items from the list of orders
      setOrders((prevOrders) => prevOrders.filter((order) => order.orderId !== orderId));
      setSelectedOrder(null); // Clear the selected order
      setHasOngoingOrder(false); // Ensure no ongoing order
    } catch (error) {
      console.error('Error completing the order:', error);
    }
  };

  // Handle taking the order
  const handleTakeOrder = async (order) => {
    try {
      // Send order details to the InWayOrder API
      await axios.post('http://localhost:5000/api/inwayorder', {
        riderId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        items: order.items,
      });

      // Set the selected order and mark it as ongoing
      setSelectedOrder(order);
      setHasOngoingOrder(true); // Update state to show that an order is ongoing
    } catch (error) {
      console.error('Error taking the order:', error);
    }
  };

  // Navigate to chat page
  const handleChat = () => {
    navigate(`/riderChat`); // Redirect to the chat page with order ID
  };

  return (
    <div className="rider-orders">
      {hasOngoingOrder && selectedOrder ? (
        // Popup for ongoing order
        <div className="order-popup">
          <div className="popup-content">
            <h2>In Progress</h2>
            <div className="popup-section">
              <h3>Food Details</h3>
              {selectedOrder.items.map((item, idx) => (
                <div key={item.orderId || idx} className='popup-section-details'>
                  <p><strong>Food Name:</strong> {item.foodName}</p>
                  <p><strong>Quantity:</strong> {item.quantity}</p>
                  <p><strong>Price:</strong> ${item.price}</p>
                </div>
              ))}
            </div>
            <div className="popup-section">
              <h3>Sender Details</h3>
              <div className='popup-section-details'>
                <p><strong>Address:</strong> {selectedOrder.seller.address}</p>
                <p><strong>Phone:</strong> {selectedOrder.seller.phone}</p>
              </div>
            </div>
            <div className="popup-section">
              <h3>Customer Details</h3>
              <div className='popup-section-details'>
                <p><strong>Address:</strong> {selectedOrder.buyer.address}</p>
                <p><strong>Phone:</strong> {selectedOrder.buyer.phone}</p>
              </div>
            </div>
            <div className="popup-actions">
              <button onClick={() => handleComplete(selectedOrder.orderId)}>Complete</button>
              <button onClick={handleChat}>Chat</button>
            </div>
          </div>
        </div>
      ) : (
        // List of available orders
        <>
          <h2>Orders to Deliver</h2>
          {orders.length === 0 ? (
            <p>No orders available for delivery.</p>
          ) : (
            <div className="orders-list">
              {orders.map((order, index) => (
                <div
                  key={order.orderId || index}
                  className="order-card"
                  onClick={() => handleTakeOrder(order)}
                >
                  <div className='order-details'>
                    <h3>Order from Seller: {order.seller.address}</h3>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="item-details">
                        <p><strong>Food Name:</strong> {item.foodName}</p>
                        <p><strong>Quantity:</strong> {item.quantity}</p>
                        <p><strong>Price:</strong> ${item.price}</p>
                      </div>
                    ))}
                    <p><strong>Customer Address:</strong> {order.buyer.address}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Rider;
