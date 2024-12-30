import React from 'react';
import './Sellercard.css';

const ProductCard = ({ item, handleDelete, handleUpdate }) => {
  const { _id, category, name, imageUrl, options, description } = item;

  return (
    <div className="seller-card">
      <img src={imageUrl} alt={name} />
      <h3>{name}</h3>
      <p>Category: {category}</p>
      <p>Description: {description}</p>
      <h4>Options:</h4>
      <ul>
        {options.map((option, index) => (
          <li key={index}>
            {option.type} - Price: {option.price}rs
          </li>
        ))}
      </ul>
      <button onClick={() => handleUpdate(_id)}>Update</button>
      <button onClick={() => handleDelete(_id)}>Delete</button>
    </div>
  );
};

export default ProductCard;
