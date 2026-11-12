# NexusChat+ — Real-Time Chat Application

NexusChat+ is a responsive multi-room chat application built with Node.js, Express and Socket.IO. Users can join channels, exchange live messages, see who is online, and react to messages.

## Features
- Real-time messaging with Socket.IO
- Three channels: `general`, `random` and `tech`
- Live online-member list
- Typing indicators
- Last 100 messages saved per channel (in server memory)
- Emoji reactions: ❤️ 😂 👍 🎉 😮
- Search messages in the current channel
- Light/dark theme toggle
- Responsive layout for mobile and desktop
- Username validation and 500-character message limit

## Technologies
HTML5 · CSS3 · JavaScript · Node.js · Express · Socket.IO

## Project structure
```text
NexusChat_Plus/
├── public/
│   └── index.html
├── package.json
├── server.js
└── README.md
```

## Run the project
1. Install Node.js (LTS).
2. Open this project folder in VS Code or a terminal.
3. Install packages:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open **http://localhost:3000** in your browser.
6. To test live chat, open the same address in two or more tabs and join with different names.

For automatic server restart during development, run `npm run dev`.

## Server status
Visit `http://localhost:3000/api/status` to see the server status, online users and room counts.

## Notes
- **Do not use Live Server** for this project. Socket.IO requires the Node.js server.
- Message history is stored in memory and resets when the server restarts.
- This is an internship demonstration project; it does not include database persistence or production-grade authentication.

## Internship
**CODTECH Internship — Task 2: Chat Application**
