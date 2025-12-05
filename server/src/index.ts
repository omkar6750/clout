import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import passport from "passport";

import "./config/passport.js";
import authRoutes from "./routes/auth.routes.js";
import setupSocket from "./socket.js";

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
const server = createServer(app);

setupSocket(server);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
