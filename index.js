const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');


const app = express();
const PORT = process.env.PORT || 3001;

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());


// Set up multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'duv8beveo',
    api_key: '645289865995663',
    api_secret: 'jpcm0Ci7nSbKL_gDttIzSJSNORo'
});


// Create an HTTP server for the Express app
const server = http.createServer(app);

// Create a new instance of SocketIO and attach it to the HTTP server
const io = socketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    }
});

// Listen for new connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Listen for new messages from clients
    socket.on('new message', (data) => {
        console.log('Received message:', data);

        io.emit('new message', data);
    });

    // Listen for disconnections
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});


// MongoDB connection
mongoose.connect('mongodb://pakman4990:pakman4990@ac-10shuiq-shard-00-00.6tnmxxb.mongodb.net:27017,ac-10shuiq-shard-00-01.6tnmxxb.mongodb.net:27017,ac-10shuiq-shard-00-02.6tnmxxb.mongodb.net:27017/?ssl=true&replicaSet=atlas-x0bs5v-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0/chatApp');
const db = mongoose.connection;

db.once('open', () => {
    console.log('Connected to MongoDB database');
});

// Mongoose Schema for Chat Message
const chatSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const Chat = mongoose.model('Chat', chatSchema);
// //////////////////////////////////////////////// //

// Define a Mongoose schema for user data
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    location: String,
    profileType: String,
    profilePicture: String, // Store path to profile picture
});

// Create a Mongoose model
const User = mongoose.model('User', userSchema);


// ///////////////////////// // //////////////////
// Routes
app.use('/', (req, res) => {
    res.send('Welcome to the Tour Palz APP!');
}
);

// Define a route for user registration
app.post('/register', upload.single('profilePicture'), async (req, res) => {
    try {
        let profilePictureUrl = null; // Initialize profile picture URL
        // Check if a file is uploaded
        if (req.file) {
            // Upload image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path);
            profilePictureUrl = result.secure_url; // Get the secure URL of the uploaded image
        }

        // Create a new user object with data from the request body
        const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            location: req.body.location,
            profileType: req.body.profileType,
            profilePicture: profilePictureUrl // Assign the profile picture URL
        });

        // Save the user to the database
        await newUser.save();

        // Respond with a success message
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        // If an error occurs, respond with an error message
        res.status(500).json({ error: error.message });
    }
});

// get all users
app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { email, password, profileType } = req.body;
        console.log(email + " " + password + " " + profileType);
        const user = await User.findOne({ email, password, profileType });
        if (user) {
            res.status(200).json({ message: 'Login successful', user });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        // If an error occurs, respond with an error message
        res.status(500).json({ error: error.message });
    }
}
);

// use email to get user
app.get('/users/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (user) {
            res.status(200).json({ user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// get all tour guides
app.get('/tourguides', async (req, res) => {
    try {
        const tourguides = await User.find({ profileType: 'tourGuide' });
        res.status(200).json({ tourguides });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// create an api where username is of tourguide and profileType is of traveler
app.get('/travelers/:username', async (req, res) => {
    try {
        // first find the user with the username of the tourguide
        const tourguide = await User.findOne({ username: req.params.username });
        // then find the travelers with the profileType of traveler
        const travelers = await User.find({ profileType: 'traveler' });
        res.status(200).json({ tourguide, travelers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// get all the chats where username is either sender or receiver
app.get('/chats/:username', async (req, res) => {
    try {
        const chats = await Chat.find({ $or: [{ sender: req.params.username }, { receiver: req.params.username }] });
        res.status(200).json({ chats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// get all unique sender names from chats
app.get('/chats/senders/:username', async (req, res) => {
    try {
        const senders = await Chat.find({ receiver: req.params.username }).distinct('sender');
        res.status(200).json({ senders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// /////////////////////////
// Routes for Chats
app.post('/api/chats', async (req, res) => {
    try {
        const { sender, receiver, message } = req.body;
        const chat = new Chat({ sender, receiver, message });
        await chat.save();

        // Emit the new message event for only one time
        io.emit('new message', { sender, receiver, message });

        res.status(201).json({ success: true, message: 'Chat message saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

app.get('/api/chats/:sender/:receiver', async (req, res) => {
    try {
        const { sender, receiver } = req.params;
        const chats = await Chat.find({
            $or: [
                { sender: sender, receiver: receiver },
                { sender: receiver, receiver: sender },
            ],
        }).sort({ timestamp: 1 });
        res.status(200).json({ success: true, chats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
}
);
