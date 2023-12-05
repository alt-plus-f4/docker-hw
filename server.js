const express = require('express');
const http = require('http');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const socketIO = require('socket.io');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

console.log('Starting application...');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const pool = mysql.createPool(config.mysqlConfig);
let channel;

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(config.rabbitMQConfig);
        channel = await connection.createChannel();
        await channel.assertQueue('messages', { durable: false });
        console.log('Connected to RabbitMQ');

        server.listen(config.port, () => {
            console.log(`Server is running on http://localhost:${config.port}`);
        });
    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
    }
}

connectRabbitMQ();

async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL
      )
    `);

    connection.release();
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
}

initializeDatabase();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

async function addUser(username, email) {
  try {
    const connection = await pool.getConnection();

    await connection.query(`
      INSERT INTO users (username, email)
      VALUES (?, ?)
    `, [username, email]);

    connection.release();

    console.log(`User '${username}' added to the database.`);
  } catch (error) {
    console.error('Error adding user to the database:', error.message);
  }
}

io.on('connection', (socket) => {
  socket.on('login', (data) => {
	const { username: reqUsername, email: reqEmail } = data;
	console.log('Login request:', reqUsername, reqEmail);

	if (!reqUsername || !reqEmail) {
		alert('Please enter a username and email address.');
		return;
	}

	try {
		username = reqUsername;
		email = reqEmail;

		addUser(username, email);

		io.to(socket.id).emit('login', data);

		io.emit('chat message', {
			username: 'Server',
			email: 'server@server.com',
			message: `${data.username} has joined the chat.`,
		});
	} 
	catch (error) {
		console.error('Error:', error);
	}
  	});

	socket.on('chat message', (data) => {
		const { username, email, message } = data;

		io.emit('chat message', {
			username: username,
			email: email,
			message: message,
		});

		channel.sendToQueue('messages', Buffer.from(JSON.stringify(message)));
  	});

  	socket.on('disconnect', () => {
    	console.log('User disconnected');
  	});
});