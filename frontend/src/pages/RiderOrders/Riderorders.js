import React, { useEffect, useState, useContext } from 'react';
import { Itemcontext } from '../../ShopContextProvider';
import axios from 'axios';
import './Riderorder.css';

const Riderorders = () => {
  const [completedOrders, setCompletedOrders] = useState([]);
  const { riderId } = useContext(Itemcontext);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/rider-completed-orders/${riderId}`);
        const { orders } = response.data; // Correctly access `orders` from `response.data`
        setCompletedOrders(orders); // Set completed orders
        console.log(orders); // Debugging output
      } catch (error) {
        console.error('Error fetching rider orders:', error);
      }
    };

    fetchOrders();
  }, [riderId]); // Fetch orders only when the riderId changes

  return (
    <div className="rider-orders-container">
      <h2 className="rider-orders-header">Your Orders</h2>
      {/* Completed Orders */}
      <div className="rider-completed-orders-container">
        <h3 className="rider-completed-orders-header">Completed Orders</h3>
        {completedOrders.length === 0 ? (
          <p className="rider-no-orders-message">No completed orders.</p>
        ) : (
          <ul className="rider-orders-list">
            {completedOrders.map((order) => (
              <li key={order.orderId} className="rider-order-item">
                <div className="rider-order-details">
  <h4 className="food-name">{order.foodName}</h4>
  <p><span>Quantity:</span> {order.quantity}</p>
  <p><span>Price:</span> ${order.price.toFixed(2)}</p>
  <p><span>Sender Address:</span> {order.seller.address}</p>
  <p><span>Buyer Address:</span> {order.buyer.address}</p>
  <p><span>Status:</span> <strong>Completed</strong></p>
</div>

              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Riderorders;
