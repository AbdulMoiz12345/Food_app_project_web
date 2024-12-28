import React, { useState, useContext } from 'react';
import { Itemcontext } from '../../ShopContextProvider';
import { useNavigate, Link } from 'react-router-dom'; // Import Link for navigation
import axios from 'axios'; // Import axios
import './Login.css';

const Login = () => {
  const { setUserState, setBuyerId, setSellerId, setAddress_Buyer, setAddress_Seller, setRiderId } = useContext(Itemcontext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Add password input
  const [role, setRole] = useState('buyer'); // Default role is buyer
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password,
        role,
      });
  
      const { token, success, message, userId, userAddress } = response.data;
  
      if (success) {
        console.log(token)
        localStorage.setItem('token', token);  // Store token in localStorage
        if (role === 'buyer') {
          setUserState('buyer');
          setBuyerId(userId);
          setAddress_Buyer(userAddress);
          navigate('/Buyer');
        } else if (role === 'seller') {
          setUserState('seller');
          setSellerId(userId);
          setAddress_Seller(userAddress);
          navigate('/seller');
        } else if (role === 'rider') {
          setUserState('rider');
          setRiderId(userId);
          navigate('/rider');
        }
      } else {
        alert(message || 'Invalid credentials!');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('An error occurred during login. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <h1>Login</h1>
      <div className="login-form">
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </label>
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </label>
        <label>
          Role:
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="rider">Rider</option> {/* Add rider role */}
          </select>
        </label>
        <button onClick={handleLogin}>Login</button>
      </div>

      {/* Link to Register page if the user is not signed up */}
      <div className="register-link">
        <p>
          Don't have an account?{' '}
          <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
