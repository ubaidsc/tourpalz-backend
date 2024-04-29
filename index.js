const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;


// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'duv8beveo',
    api_key: '645289865995663',
    api_secret: 'jpcm0Ci7nSbKL_gDttIzSJSNORo'
});

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + file.originalname);
    },
});

const upload = multer({ storage });

// Create an HTTP server for the Express app
const server = http.createServer(app);

// Create a new instance of SocketIO and attach it to the HTTP server
const io = socketIO(server, {
    cors: {

        origin:
            ['http://localhost:3000',
                'https://tourpalz.vercel.app',
                'https://tourpalz-backend.vercel.app'],
        methods: '*',
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

    // Handle location updates
    socket.on('locationUpdate', (data) => {
        const { role, latitude, longitude, address } = data;
        // Broadcast the location update to the appropriate clients
        // based on the user's role (guide or traveler)
        io.emit(`location/${role}`, { latitude, longitude, address });
        console.log(`Location update from ${role}: ${latitude}, ${longitude}, ${address}`);
    });

    // Listen for disconnections
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});


// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/chatApp');
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
// //////////////////////////////////////////////////

// Mongoose Schema for Customer Support
const supportSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    question: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const Support = mongoose.model('Support', supportSchema);


// Define a Mongoose schema for user data
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    location: String,
    profileType: String,
    profilePicture: String, // Store path toprofile picture
});

// Create a Mongoose model
const User = mongoose.model('User', userSchema);

// Define a Mongoose schema for Tour Guide
const tourGuideSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    location: String,
    language: String,
    price: Number,
    profileType: String,
    profilePicture: String,
});

// Create a Mongoose model for Tour Guide
const TourGuide = mongoose.model('TourGuide', tourGuideSchema);


// create a model for tour which these fields: destination, date,special request,no of people, guide
const tourSchema = new mongoose.Schema({
    destination: String,
    date: Date,
    noOfPeople: Number,
    specialRequest: String,
    travelerEmail: String,
    guide: String,
});

const Tour = mongoose.model('Tour', tourSchema);


// model for review. It has these fields: guide name, rating and review
const reviewSchema = new mongoose.Schema({
    guide: String,
    rating: Number,
    review: String,
});

const Review = mongoose.model('Review', reviewSchema);


// ///////////////////////// // //////////////////
// Routes
app.get('/', (req, res) => {
    res.send('Welcome to the Tour Palz APP!');
}
);

// Define a route for user registration
app.post('/register', upload.single('profilePicture'), async (req, res) => {
    try {

        if (req.file) {
            // Upload image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path);
            const profilePictureUrl = result.secure_url; // Get the secure URL of the uploaded image

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
        }
        else {
            // Create a new user object with data from the request body
            const newUser = new User({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                location: req.body.location,
                profileType: req.body.profileType,
            });

            // Save the user to the database
            await newUser.save();

            // Respond with a success message
            res.status(201).json({ message: 'User registered successfully' });
        }
    } catch (error) {
        // If an error occurs, respond with an error message
        res.status(500).json({ error: error.message });
    }
});

app.post('/register/guide', upload.single('profilePicture'), async (req, res) => {
    try {

        if (req.file) {
            // Upload image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path);
            const profilePictureUrl = result.secure_url; // Get the secure URL of the uploaded image

            // Create a new user object with data from the request body for tour guide
            const newUser = new TourGuide({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                location: req.body.location,
                language: req.body.language,
                price: req.body.price,
                profileType: req.body.profileType,
                profilePicture: profilePictureUrl // Assign the profile picture URL
            });

            // Save the user to the database
            await newUser.save();

            // Respond with a success message
            res.status(201).json({ message: 'User registered successfully' });
        }
        else {
            console.log("no file");
        }
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

// Login route for tour guides
app.post('/login/tour', async (req, res) => {
    try {
        const { email, password, profileType } = req.body;
        console.log(email + " " + password + " " + profileType);
        const user = await TourGuide({ email, password, profileType })
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

// ////////////////// For Reviews //////////////////////
// create a review
app.post('/review', async (req, res) => {
    try {
        const { guide, rating, review } = req.body;
        const newReview = new Review({ guide, rating, review });
        await newReview.save();
        res.status(201).json({ message: 'Review created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// get all reviews by guide name
app.get('/reviews/:guide', async (req, res) => {
    try {
        const reviews = await Review.find({ guide: req.params.guide });
        res.status(200).json({ reviews });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
);


////////////////////// For Tours //////////////////////
// create a tour
app.post('/tour', async (req, res) => {
    try {
        const { destination, date, specialRequest, noOfPeople, travelerEmail, guide } = req.body;
        const tour = new Tour({ destination, date, specialRequest, noOfPeople, travelerEmail, guide });
        await tour.save();
        res.status(201).json({ message: 'Tour created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// get all tours
app.get('/tours/:email', async (req, res) => {
    try {
        const tours = await Tour.find({ travelerEmail: req.params.email });
        res.status(200).json({ tours });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// cancel a tour
app.delete('/tour/:id', async (req, res) => {
    try {
        const tour = await Tour.findByIdAndDelete(req.params.id);
        if (tour) {
            res.status(200).json({ message: 'Tour canceled successfully' });
        } else {
            res.status(404).json({ error: 'Tour not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



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

// api to update user profile
app.put('/users/:email', async (req, res) => {
    try {
        console.log(req.body);
        console.log(req.params.email);
        const user = await User.findOne({ email: req.params.email });
        if (user) {
            user.username = req.body.username;
            user.email = req.body.email;
            user.password = req.body.password;
            user.location = req.body.location;
            user.profileType = req.body.profileType;
            await user.save();
            res.status(200).json({ user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
);

// api to update guide profile
app.put('/guides/:email', async (req, res) => {
    try {
        console.log(req.body);
        console.log(req.params.email);
        const guide = await TourGuide.findOne({ email: req.params.email });
        if (guide) {
            guide.username = req.body.username;
            guide.email = req.body.email;
            guide.password = req.body.password;
            guide.location = req.body.location;
            guide.language = req.body.language;
            guide.price = req.body.price;
            guide.profileType = req.body.profileType;
            await guide.save();
            res.status(200).json({ guide });
        } else {
            res.status(404).json({ error: 'Guide not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
);


// use email to get tour guide
app.get('/guides/:email', async (req, res) => {
    try {
        const user = await TourGuide.findOne({ email: req.params.email });
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
        const tourguides = await TourGuide.find();
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

app.post('/api/support', async (req, res) => {
    try {
        const { sender, message } = req.body;
        const support = new Support({ sender, question: message });
        await support.save();
        // Emit the new message event for only one time
        io.emit('new message', { sender, message });
        res.status(201).json({ success: true, message: 'Support message saved successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }

});

// api endpoint to get the chats between given user and the support
app.get('/api/support/:sender', async (req, res) => {
    try {
        const { sender } = req.params;
        const support = await Support.find({ sender: sender });
        res.status(200).json({ success: true, support });
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

// api endpoint to get the search results
app.get('/search', (req, res) => {
    const { location, rating, language, price } = req.query;

    const filtered = tourGuidesData.filter((guide) => {
        const locationMatch = !location || guide.location.toLowerCase() === location.toLowerCase();
        const ratingMatch = !rating || guide.rating >= parseInt(rating);
        const languageMatch = !language || guide.language.toLowerCase() === language.toLowerCase();
        const priceMatch = !price || guide.price <= parseInt(price);

        return locationMatch && ratingMatch && languageMatch && priceMatch;
    });

    res.json(filtered);
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
}
);


