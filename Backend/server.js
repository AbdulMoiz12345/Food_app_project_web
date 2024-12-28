const express = require('express');
const connectToMongo = require('./db'); // MongoDB connection
const User = require('./models/User'); // User model
const FoodItem = require('./models/FoodItem'); // FoodItem model (assuming you created it)
const Orders=require('./models/Orders');
const Chat = require('./models/Chat'); // Replace with your correct model path
const MadeOrder = require('./models/MadeOrder'); // Model for made orders table
const CompletedOrder=require('./models/CompletedOrder');
const InWayOrder=require('./models/InWayOrder');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer'); // Import multer for file handling
const path = require('path');
const app = express();
const port = 5000;
const authenticateJWT = require('./middleware/authMiddleware'); // Adjust path as needed
const http = require('http');
const { Server } = require('socket.io');


// Connect to MongoDB
connectToMongo();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test Route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Register Route
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});



// communication things going here____________________________________________________________________________________________________

// Endpoint to fetch in-way orders
app.get('/api/inway-orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await InWayOrder.find({
      $or: [{ buyerId: userId }, { riderId: userId }],
    });

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'No orders found for this user' });
    }

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // When a user joins a room
  socket.on('joinRooms', ({ userId, role }) => {
    InWayOrder.find(role === 'Buyer' ? { buyerId: userId } : { riderId: userId })
      .then((orders) => {
        orders.forEach((order) => {
          const roomName = order.foodName;
          socket.join(roomName);
          console.log(`${role} joined room: ${roomName}`);

          // Fetch chat history from the database for the room
          Chat.find({ foodName: roomName })
            .then((chatHistory) => {
              // Emit the chat history to the frontend
              io.to(roomName).emit('chatHistory', {
                room: roomName,
                chatHistory
              });
              console.log('Chat history sent to room:', roomName);
            })
            .catch((err) => {
              console.error('Error fetching chat history:', err);
            });
        });
      })
      .catch((error) => console.error('Error joining rooms:', error));
  });

  // Handle sending new messages
  socket.on('sendMessage', ({ foodName, sender, message }) => {
    const newMessage = new Chat({
      foodName,
      sender,
      message,
      timestamp: new Date()
    });

    newMessage.save()
      .then(() => {
        io.to(foodName).emit('receiveMessage', { sender, message, foodName });
        console.log(`Message in room ${foodName}: ${sender} says ${message}`);
      })
      .catch((error) => console.error('Error saving message:', error));
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


server.listen(4000, () => {
  console.log('Server is running on port 4000');
});


//communication things ending here_____________________________________________________________________________________________________

app.post('/api/register', async (req, res) => {
  try {
    const { email, password, address, phone, role } = req.body;

    // Validate input
    if (!email || !password || !address || !phone || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

    // Create new user
    const newUser = new User({ email, password: hashedPassword, address, phone, role });
    await newUser.save();

  
    // Send response with token
    res.status(201).json({
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Error while registering user:', error);

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
});


// Login Route
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, role: user.role }, 'your_jwt_secret', {
      expiresIn: '1h', // Token expiry
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token, // Send token to frontend
      userId: user._id,
      userAddress: user.address,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Setup Multer for file uploading
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify the uploads directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Create unique filenames
  },
});

const upload = multer({ storage });

// Add Food Route
app.post('/api/add-food', upload.single('image'), async (req, res) => {
  const { category, name, options, description, sellerId } = req.body;

  try {
    const newFoodItem = new FoodItem({
      category,
      name,
      imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`, // Full URL
      options: JSON.parse(options), // Parse options JSON
      description,
      sellerId,
    });

    await newFoodItem.save();
    res.status(200).json({ success: true, message: 'Food item added successfully!' });
  } catch (error) {
    console.error('Error saving food item:', error);
    res.status(500).json({ success: false, message: 'Failed to add food item.' });
  }
});

// Get all food items for a seller
app.get('/api/seller-foods/:sellerId', async (req, res) => {
    try {
      const sellerId = req.params.sellerId;
      console.log(sellerId)
      const foodItems = await FoodItem.find({ sellerId }); // Find items by sellerId
      res.status(200).json(foodItems);
    } catch (error) {
      console.error('Error fetching food items:', error);
      res.status(500).json({ message: 'Failed to fetch food items' });
    }
  });

  // Delete food item
app.delete('/api/delete-food/:id', async (req, res) => {
    try {
      const foodItemId = req.params.id;
      const deletedFoodItem = await FoodItem.findByIdAndDelete(foodItemId);
  
      if (!deletedFoodItem) {
        return res.status(404).json({ message: 'Food item not found' });
      }
  
      res.status(200).json({ message: 'Food item deleted successfully' });
    } catch (error) {
      console.error('Error deleting food item:', error);
      res.status(500).json({ message: 'Failed to delete food item' });
    }
  });



// Fetch food item by ID
app.get('/api/food/:foodid', async (req, res) => {
  const { foodid } = req.params;  // Make sure to use the correct parameter name

  try {
    const foodItem = await FoodItem.findById(foodid);  // Use FoodItem here
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json(foodItem);
  } catch (error) {
    console.error('Error fetching food item:', error);
    res.status(500).json({ message: 'Error fetching food item' });
  }
});

  
const fs = require('fs'); // Also ensure you have fs imported for file operations

app.put('/api/update-food/:foodid', upload.single('image'), async (req, res) => {
    const { foodid } = req.params;
    const { category, name, options, description } = req.body;
    const image = req.file ? req.file.filename : null;

    // Check if required fields are provided
    if (!category || !name || !options || !description) {
        return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    try {
        // Find the food item by ID
        const foodItem = await FoodItem.findById(foodid);

        if (!foodItem) {
            return res.status(404).json({ success: false, message: 'Food item not found.' });
        }

        // Update food item properties
        foodItem.category = category;
        foodItem.name = name;
        foodItem.description = description;
        foodItem.options = JSON.parse(options);

        // If a new image is uploaded, replace the old one
        if (image) {
            // Remove the old image file from the server (optional)
            if (foodItem.image) {
                const oldImagePath = path.join(__dirname, 'uploads', foodItem.image);
                fs.unlink(oldImagePath, (err) => {
                    if (err) {
                        console.error('Error deleting old image:', err);
                    }
                });
            }
            foodItem.image = image;
        }

        // Save the updated food item to the database
        await foodItem.save();

        return res.status(200).json({ success: true, message: 'Food item updated successfully!' });
    } catch (error) {
        console.error('Error updating food item:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while updating the food item.' });
    }
});

app.post('/api/seller-orders', async (req, res) => {
  const { sellerId } = req.body;
  console.log("moiz")
  console.log(sellerId)
  try {
    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID is required' });
    }

    const orders = await Orders.find({ sellerId });
    res.status(200).json({ orders });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





app.patch('/api/orders/:orderId/complete', async (req, res) => {
  const { orderId } = req.params;
  console.log(orderId)
  try {
    // Find the order by ID
    const order = await Orders.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Create a new record in the madeOrders table
    const madeOrder = new MadeOrder({
      sellerId: order.sellerId,
      buyerId: order.buyerId, // Assuming buyerId maps to customerId
      foodName: order.name,
      quantity: order.quantity,
      amount: order.amount,
      price:order.price,
    });
    await madeOrder.save();

    // Remove the order from the orders table
    await Orders.findByIdAndDelete(orderId);

    res.status(200).json({ message: 'Order completed successfully' });
  } catch (error) {
    console.error('Error marking order as complete:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/api/seller-completed-orders/:sellerId', async (req, res) => {
  const sellerId = req.params.sellerId;
  try {

    // Fetch completed orders
    const completedOrders = await CompletedOrder.find({ sellerId: sellerId }); // Use find() with buyerId
    res.json({
      completedOrders, // Orders that are completed
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Server Error');
  }
});




// Buyer section ____________________________________________________________________________________________________________________//


app.get('/api/get-foods', async (req, res) => {
  try {
    const foods = await FoodItem.find(); // Fetch all food items from the database
    res.status(200).json(foods); // Send foods data as response
  } catch (error) {
    console.error('Error fetching food items:', error);
    res.status(500).json({ message: 'Failed to fetch food items' });
  }
});

// Endpoint to receive and save orders
app.post('/api/orders', async (req, res) => {
  try {
    console.log("hello")
    console.log(req.body)
    const { sellerId, buyerId, foodId, name,amount, quantity, price, orderedAt } = req.body;

    // Validate required fields
    if (!sellerId || !buyerId || !foodId || !name || !quantity || !price || !orderedAt) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create a new order
    const newOrder = new Orders({
      sellerId,
      buyerId,
      foodId,
      name,
      amount,
      quantity,
      price,
      orderedAt,
    });

    // Save the order to the database
    const savedOrder = await newOrder.save();

    res.status(201).json({ message: 'Order created successfully', order: savedOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.get('/api/customer-orders/:buyerId', async (req, res) => {
  const buyerId = req.params.buyerId;
  console.log(buyerId);

  try {
    // Fetch all orders (pending)
    const orders = await Orders.find({ buyerId: buyerId }); // Use find() with buyerId

    // Fetch made orders (pending)
    const madeOrders = await InWayOrder.find({ buyerId: buyerId }); // Use find() with buyerId

    // Fetch completed orders
    const completedOrders = await CompletedOrder.find({ buyerId: buyerId }); // Use find() with buyerId

    console.log(madeOrders); // Check the console for results

    res.json({
      orders,
      madeOrders,      // Orders that are pending
      completedOrders, // Orders that are completed
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Server Error');
  }
});



//Rider section___________________________________________________________________________________________________________________//

app.post('/api/inwayorder', async (req, res) => {
  try {
    const { riderId, buyerId,sellerId, foodName, orderId,quantity,price } = req.body;
    console.log("new checking")
    console.log(sellerId)
    console.log(buyerId)
    console.log(quantity)
    console.log(price)
    if (!riderId || !buyerId || !foodName || !orderId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save to InWayOrder
    const inWayOrder = new InWayOrder({ riderId, buyerId,sellerId, foodName, orderId ,quantity,price});
    await inWayOrder.save();

    // Remove the order from MadeOrder
    await MadeOrder.findByIdAndDelete(orderId);

    res.status(201).json({ message: 'Order is on the way' });
  } catch (error) {
    console.error('Error creating in-way order:', error);
    res.status(500).json({ error: 'Failed to create in-way order' });
  }
});


// Fetch orders for the rider
app.get('/api/rider-orders', async (req, res) => {
  try {
    const { riderId } = req.query;

    if (!riderId) {
      return res.status(400).json({ success: false, message: 'Rider ID is required' });
    }

    // Check if the rider has orders in InWayOrder
    const inWayOrders = await InWayOrder.find({ riderId });
    if (inWayOrders.length > 0) {
      // Get buyer and seller details for inWayOrders
      const ordersWithDetails = await Promise.all(
        inWayOrders.map(async (order) => {
          const buyer = await User.findById(order.buyerId);
          const seller = await User.findById(order.sellerId);

          return {
            orderId: order.orderId,
            foodName: order.foodName,
            quantity: order.quantity,
          price: order.price,
            buyer: {
              address: buyer?.address,
              phone: buyer?.phone,
              email: buyer?.email,
            },
            seller: {
              address: seller?.address,
              phone: seller?.phone,
              email: seller?.email,
            },
          };
        })
      );

      return res.status(200).json({ success: true, hasOngoingOrder: true, orders: ordersWithDetails });
    }

    // If no orders in InWayOrder, fetch all available orders
    const madeOrders = await MadeOrder.find();

    const ordersWithDetails = await Promise.all(
      madeOrders.map(async (order) => {
        const buyer = await User.findById(order.buyerId);
        const seller = await User.findById(order.sellerId);

        return {
          orderId: order._id,
          foodName: order.foodName,
          quantity: order.quantity,
          price: order.price,
          buyerId:order.buyerId,
          sellerId:order.sellerId,
          buyer: {
            address: buyer?.address,
            phone: buyer?.phone,
            email: buyer?.email,
          },
          seller: {
            address: seller?.address,
            phone: seller?.phone,
            email: seller?.email,
          },
        };
      })
    );

    res.status(200).json({ success: true, hasOngoingOrder: false, orders: ordersWithDetails });
  } catch (error) {
    console.error('Error fetching rider orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


app.patch('/api/rider-orders/:orderId/complete', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { riderId } = req.body; // Retrieve the riderId from the request body

    console.log("Marking order as complete with riderId:", riderId);

    // Find and remove the order using `orderId`
    const completedOrder = await InWayOrder.findOneAndDelete({ orderId: orderId });
    if (!completedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log(completedOrder);

    // Save the order to CompletedOrder table, including riderId
    const newCompletedOrder = new CompletedOrder({
      foodName: completedOrder.foodName,
      quantity: completedOrder.quantity,
      price: completedOrder.price,
      buyerId: completedOrder.buyerId,
      sellerId: completedOrder.sellerId,
      riderId // Include riderId in the new record
    });

    console.log("Completed order details:", newCompletedOrder);
    await newCompletedOrder.save();

    res.status(200).json({ success: true, message: 'Order marked as complete' });
  } catch (error) {
    console.error('Error marking order as complete:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



app.get('/api/rider-orders/:riderId', async (req, res) => {
  const riderId = req.params.riderId;

  try {
    // Fetch completed orders for the rider
    const completedOrders = await CompletedOrder.find({ riderId: riderId });

    // Enhance completed orders with buyer and seller details
    const ordersWithDetails = await Promise.all(
      completedOrders.map(async (order) => {
        const buyer = await User.findById(order.buyerId);
        const seller = await User.findById(order.sellerId);

        return {
          orderId: order._id,
          foodName: order.foodName,
          quantity: order.quantity,
          price: order.price,
          amount: order.amount,
          buyer: {
            address: buyer?.address || 'Unknown',
            phone: buyer?.phone || 'Unknown',
            email: buyer?.email || 'Unknown',
          },
          seller: {
            address: seller?.address || 'Unknown',
            phone: seller?.phone || 'Unknown',
            email: seller?.email || 'Unknown',
          },
        };
      })
    );
    console.log(ordersWithDetails)
    res.status(200).json({ success: true, orders: ordersWithDetails });
  } catch (error) {
    console.error('Error fetching completed rider orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

