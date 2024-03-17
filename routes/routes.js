const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const Chat = require('../models/chatModel');

const app = express();



// Routes
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