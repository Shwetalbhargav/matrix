
import express from 'express';
import sdk from 'matrix-js-sdk';
import  {MemoryStore}  from 'matrix-js-sdk/lib/store/memory.js';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
  cors:{
    origin:"http://localhost:3001",
    methods:["GET","POST"]
  }
});
const port = 3000;

app.use(cors({
    origin:'http://localhost:3001',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const filter = {
    room: {
      timeline: {
        limit: 10, // Limit the number of events
        types: ["m.room.message"] // Ensure we include message events
      }
    }
  };

// Create a Matrix client instance with the correct options
const client = sdk.createClient({
    baseUrl: "https://matrix-client.matrix.org/",   
    accessToken: "syt_c2h3ZXRhbHNoYWg_eHIoTUDxbWTaoCbOFXYO_0T3wlz", 
    userId: "@shwetalshah:matrix.org", 
    store: new MemoryStore()         
});

// Start the client
client.startClient({ initialSyncLimit: 10 });

client.once('sync', function(state) {
    if (state === 'PREPARED') {
        console.log("Matrix client is ready and synced!");
    }
});

// Listen for real-time Matrix events and broadcast to frontend
client.on('Room.timeline', (event, room, toStartOfTimeline, removed, data) => {
    if (event.getType() !== "m.room.message") return;
    
    const message = {
      sender: event.getSender(),
      body: event.getContent().body,
      roomId: room.roomId,
    };
    
    io.emit('newMessage', message); // Broadcast new message to all connected clients
  });

// Define a basic route to fetch user messages
app.get('/messages', async (req, res) => {
    const roomId = "!sfWFCehUnzjWIacHWj:matrix.org";  
    try {
        const result = await client.scrollback(roomId, 10);
        console.log(result);

        const messages = result.chunk.filter(event => event.type === 'm.room.message'); 
        res.json(result);  // Send the result as JSON response
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({error: "Error fetching messages"});
    }
});

server.listen(port, () => {
    console.log(`Matrix app listening at http://localhost:${port}`);
});
