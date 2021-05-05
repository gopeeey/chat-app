const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const cors = require('cors');
const SessionStore = require('./sessionStore');
const MessageStore = require('./messageStore');
const io = require('socket.io')(server, {
    cors: {
        origin: 'https://gopeeey-chat.vercel.app',
        methods: ["GET", "POST"]
    }
});

const sessionStore = new SessionStore();
const messageStore = new MessageStore();

app.use(cors());
io.use((socket, next) => {
    
    const username = socket.handshake.auth.username;
        const session = sessionStore.findSession(username);
        if (session) {
            socket.username = session.username;
            return next();
        }
    
    if (!username) {
        return next(Error('Invalid username'));
    }
    socket.username = username;
    next()
});

// listener for a connection from a browser
io.on('connection', (socket) => {

    // send auth params for reconnection purposes
    socket.emit('session', {
        username: socket.username
    });

    // this user joins room identified by their own username
    // in order to receive messages
    socket.join(socket.username);
    
    // persist the user's session on the server
    sessionStore.saveSession(socket.username, {
        username: socket.username,
        messages: [],
        connected: true,
      });

    
    const users = [];

    const messagesPerUser = new Map();

    // get all messages to and from this user
    // and map them by username of the users to which
    // those messages were sent 
    messageStore.findMessagesForUser(
        socket.username
        ).forEach((message) => {
            const {to, from} = message;
            const otherUser = socket.username === from ? (to) : (from);
            if (messagesPerUser.has(otherUser)) {
                messagesPerUser.get(otherUser).push(message)
            } else {
                messagesPerUser.set(otherUser, [message])
            }
    });

    // get all existing users
    sessionStore.findAllSessions().forEach((session) => {
        users.push({
          username: session.username,
          connected: session.connected,
          messages: messagesPerUser.get(session.username) || [],
        });
      });

    // give the user who connected the list of the existing users
    socket.emit("users", users);

    // then alert the existing users that a new user just joined
    const user = {
        username: socket.username,
        messages: [],
        connected: true
    }
    socket.broadcast.emit('newUser', user);
    
    // return the current user ID to the current user
    socket.emit("self", user);

    // private message listener
    socket.on('private message', ({content, to}) => {
        const message = {
            content,
            from: socket.username,
            to,
        }
    // send message to destined user and this user
    socket.to(to).to(socket.username).emit('private message', message);

    // persist the message on the server
    messageStore.saveMessage(message);
})

    // handle reconnection
    socket.on('connect', () => {
        socket.broadcast.emit('newUser', user);
    });

    // handle disconnection
    socket.on('disconnect', async () => {
        const matchingSockets = await io.in(socket.username).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
    socket.broadcast.emit('disconnected', socket.username);
    sessionStore.saveSession(socket.username, {
        username: socket.username,
        connected: false,
  });
    }
        
    });
});


server.listen(process.env.PORT || 3030, 'localhost', () => {
    console.log(`Server started on port ${process.env.PORT || 3030}`);
})