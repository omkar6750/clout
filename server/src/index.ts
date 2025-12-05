import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import passport from "passport";

import "./config/passport.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();

// Middleware
app.use(
	cors({
		origin: process.env.FRONTEND_URL,
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);

// Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: process.env.FRONTEND_URL,
		credentials: true,
	},
});

io.on("connection", (socket) => {
	console.log("Socket connected:", socket.id);
});

// Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
