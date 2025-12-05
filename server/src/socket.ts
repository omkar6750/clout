// ▶️ For DM

// dm:send

// dm:receive

// dm:fetch

// dm:page

// ▶️ For Channels

// channel:send

// channel:receive

// channel:fetch

// channel:page

import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";
import type { ChannelType, User } from "@prisma/client";
import cookie from "cookie"; // You might need to install this: npm install cookie

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
	throw new Error("JWT_SECRET is not set in environment variables");
}

// ---- CONFIGURABLE LIMITS ---- //
const MAX_USER_MESSAGES = 50; // per user across all channels
const MAX_CHANNEL_MESSAGES = 250; // per channel
const MAX_CHANNEL_HASHTAGS = 10; // FIFO limit for stored channel hashtags

const HASHTAG_REGEX = /#([A-Za-z0-9_-]+)\b/g;

interface AuthedSocket extends Socket {
	userId?: string;
}

// Incoming payload for sending a message
interface SendMessagePayload {
	channelId: string;
	content: string;
	parentId?: string | null;
}

// Incoming payload for fetching messages (pagination)
interface FetchMessagesPayload {
	channelId: string;
	limit?: number;
	cursor?: string | null; // message id to paginate from
}

// Map of userId -> set of socketIds (for multi-device support)
const userSockets = new Map<string, Set<string>>();

// ---- UTILS: USER SOCKET MAP ---- //
function addUserSocket(userId: string, socketId: string) {
	const existing = userSockets.get(userId);
	if (existing) {
		existing.add(socketId);
	} else {
		userSockets.set(userId, new Set([socketId]));
	}
}

function removeUserSocket(userId: string, socketId: string): number {
	const existing = userSockets.get(userId);
	if (!existing) return 0;
	existing.delete(socketId);
	if (existing.size === 0) {
		userSockets.delete(userId);
		return 0;
	}
	return existing.size;
}

function getUserSocketIds(userId: string): string[] {
	return Array.from(userSockets.get(userId) ?? []);
}

// ---- AUTH: SOCKET JWT VERIFICATION ---- //
interface TokenPayload {
	userId: string;
}

/**
 * Verifies the socket using JWT (sent by frontend as handshake.auth.token)
 * and ensures the user exists and is verified.
 */
async function authenticateSocket(socket: Socket): Promise<User | null> {
	try {
		// 1. Try to get token from handshake auth (Manual Bearer)
		let token =
			(socket.handshake.auth as any)?.token ||
			(socket.handshake.query?.token as string | undefined);

		// 2. If no manual token, try to read from Cookies (HttpOnly method)
		if (!token && socket.handshake.headers.cookie) {
			const cookies = cookie.parse(socket.handshake.headers.cookie);
			// "jwt" should match the name of the cookie you set in your authRoutes
			token = cookies.auth_token;
		}

		if (!token) {
			socket.emit("error", "not-authenticated");
			return null;
		}

		const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload;

		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
		});

		if (!user || !user.isVerified) {
			socket.emit("error", "not-verified");
			return null;
		}

		return user;
	} catch (err) {
		console.error("Socket auth error:", err);
		socket.emit("error", "invalid-token");
		return null;
	}
}

// ---- HASHTAG HELPERS ---- //
function extractHashtags(content: string): string[] {
	const tags = new Set<string>();
	let match: RegExpExecArray | null;

	while ((match = HASHTAG_REGEX.exec(content)) !== null) {
		// match[0] includes the '#', e.g. "#topic"
		tags.add(match[0]);
	}

	return Array.from(tags);
}

async function updateChannelHashtags(
	channelId: string,
	newTags: string[]
): Promise<void> {
	if (newTags.length === 0) return;

	const channel = await prisma.channel.findUnique({
		where: { id: channelId },
		select: { hashtags: true },
	});

	if (!channel) return;

	const combined = [...(channel.hashtags ?? []), ...newTags];

	// FIFO: keep only the last MAX_CHANNEL_HASHTAGS
	const trimmed =
		combined.length > MAX_CHANNEL_HASHTAGS
			? combined.slice(combined.length - MAX_CHANNEL_HASHTAGS)
			: combined;

	await prisma.channel.update({
		where: { id: channelId },
		data: { hashtags: trimmed },
	});
}

// ---- LIMIT ENFORCEMENT HELPERS ---- //
async function enforceUserMessageLimit(userId: string) {
	if (!MAX_USER_MESSAGES) return;

	const count = await prisma.message.count({
		where: { userId },
	});

	if (count <= MAX_USER_MESSAGES) return;

	const excess = count - MAX_USER_MESSAGES;

	const oldest = await prisma.message.findMany({
		where: { userId },
		orderBy: { createdAt: "asc" },
		take: excess,
		select: { id: true },
	});

	if (oldest.length === 0) return;

	await prisma.message.deleteMany({
		where: { id: { in: oldest.map((m) => m.id) } },
	});
}

async function enforceChannelMessageLimit(channelId: string) {
	if (!MAX_CHANNEL_MESSAGES) return;

	const count = await prisma.message.count({
		where: { channelId },
	});

	if (count <= MAX_CHANNEL_MESSAGES) return;

	const excess = count - MAX_CHANNEL_MESSAGES;

	const oldest = await prisma.message.findMany({
		where: { channelId },
		orderBy: { createdAt: "asc" },
		take: excess,
		select: { id: true },
	});

	if (oldest.length === 0) return;

	await prisma.message.deleteMany({
		where: { id: { in: oldest.map((m) => m.id) } },
	});
}

// ---- MESSAGE HELPERS ---- //
async function ensureChannelMembership(userId: string, channelId: string) {
	const membership = await prisma.channelMember.findUnique({
		where: {
			userId_channelId: {
				userId,
				channelId,
			},
		},
	});

	return membership;
}

async function broadcastToChannelMembers(
	channelId: string,
	event: string,
	payload: any
) {
	// Fetch all members of the channel
	const members = await prisma.channelMember.findMany({
		where: { channelId },
		select: { userId: true },
	});

	for (const { userId } of members) {
		const socketIds = getUserSocketIds(userId);
		socketIds.forEach((sid) => {
			payload.io.to(sid).emit(event, payload.data);
		});
	}
}

// ---- MAIN SETUP FUNCTION ---- //
const setupSocket = (server: HttpServer) => {
	const io = new SocketIOServer(server, {
		cors: {
			origin: process.env.FRONTEND_URL,
			methods: ["GET", "POST"],
			credentials: true,
		},
	});

	// Helper that uses the io instance
	const emitToChannelMembers = async (
		channelId: string,
		event: string,
		data: any
	) => {
		const members = await prisma.channelMember.findMany({
			where: { channelId },
			select: { userId: true },
		});

		for (const { userId } of members) {
			const socketIds = getUserSocketIds(userId);
			socketIds.forEach((sid) => {
				io.to(sid).emit(event, data);
			});
		}
	};

	io.on("connection", async (socket: Socket) => {
		const s = socket as AuthedSocket;
		console.log("Socket connected:", socket.id);

		const user = await authenticateSocket(socket);
		if (!user) {
			socket.disconnect();
			return;
		}

		s.userId = user.id;
		addUserSocket(user.id, socket.id);

		// Mark user online
		try {
			await prisma.user.update({
				where: { id: user.id },
				data: { isOnline: true },
			});
		} catch (err) {
			console.error("Failed to set user online:", err);
		}

		// ---- SEND MESSAGE ---- //
		socket.on("message:send", async (payload: SendMessagePayload) => {
			try {
				if (!s.userId) return;
				const { channelId, content, parentId } = payload;

				// Ensure membership
				const membership = await ensureChannelMembership(
					s.userId,
					channelId
				);
				if (!membership) {
					socket.emit("error", "not-a-channel-member");
					return;
				}

				const channel = await prisma.channel.findUnique({
					where: { id: channelId },
					select: { type: true },
				});

				if (!channel) {
					socket.emit("error", "channel-not-found");
					return;
				}

				// Extract hashtags
				const hashtags = extractHashtags(content);

				// Create message
				const createdMessage = await prisma.message.create({
					data: {
						content,
						type: "TEXT",
						hashtags,
						userId: s.userId,
						channelId,
						parentId: parentId ?? null,
					},
					include: {
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								userName: true,
								avatarUrl: true,
							},
						},
					},
				});

				// Update channel hashtag list (FIFO)
				await updateChannelHashtags(channelId, hashtags);

				// Enforce limits
				await Promise.all([
					enforceUserMessageLimit(s.userId),
					enforceChannelMessageLimit(channelId),
				]);

				const members = await prisma.channelMember.findMany({
					where: { channelId },
					select: { userId: true },
				});

				const OUT_EVENT =
					channel.type === "DM" ? "dm:receive" : "channel:receive";

				for (const { userId } of members) {
					const socketIds = getUserSocketIds(userId);
					socketIds.forEach((sid) => {
						io.to(sid).emit(OUT_EVENT, createdMessage);
					});
				}
			} catch (err) {
				console.error("Error in message:send:", err);
				socket.emit("error", "message-send-failed");
			}
		});

		// ---- FETCH PAGINATED MESSAGES ---- //
		socket.on("messages:fetch", async (payload: FetchMessagesPayload) => {
			try {
				if (!s.userId) return;

				const { channelId, limit = 20, cursor } = payload;

				// Ensure membership
				const membership = await ensureChannelMembership(
					s.userId,
					channelId
				);
				if (!membership) {
					socket.emit("error", "not-a-channel-member");
					return;
				}

				// Fetch channel to check type
				const channel = await prisma.channel.findUnique({
					where: { id: channelId },
					select: { type: true },
				});

				const OUT_EVENT =
					channel?.type === "DM" ? "dm:page" : "channel:page";

				// Build query object
				const pageSize = Math.min(Math.max(limit, 1), 100);

				const query: any = {
					where: { channelId },
					orderBy: { createdAt: "desc" },
					take: pageSize,
					include: {
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								userName: true,
								avatarUrl: true,
							},
						},
					},
				};

				if (cursor) {
					query.cursor = { id: cursor };
					query.skip = 1;
				}

				// Fetch messages
				const messages = await prisma.message.findMany(query);

				const nextCursor =
					messages.length === pageSize
						? messages[messages.length - 1]?.id
						: null;

				socket.emit(OUT_EVENT, {
					channelId,
					messages,
					nextCursor,
				});
			} catch (err) {
				console.error("Error in messages:fetch:", err);
				socket.emit("error", "messages-fetch-failed");
			}
		});

		// ---- DISCONNECT ---- //
		socket.on("disconnect", async () => {
			console.log("Socket disconnected:", socket.id);

			if (!s.userId) return;

			const remaining = removeUserSocket(s.userId, socket.id);

			if (remaining === 0) {
				// No more active sockets for this user => mark offline
				try {
					await prisma.user.update({
						where: { id: s.userId },
						data: { isOnline: false },
					});
				} catch (err) {
					console.error("Failed to set user offline:", err);
				}
			}
		});
	});
};

export default setupSocket;
