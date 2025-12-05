import { type Request, type Response, type RequestHandler } from "express";
import { prisma } from "../db.js";
import { ChannelType, Role } from "@prisma/client";
import type { AuthRequest } from "../middleware/auth.middleware.js";

// ---- CHANNEL MANAGEMENT ----

export const createChannel: RequestHandler = async (req, res) => {
	try {
		// Change 3: Cast 'req' to 'AuthRequest' here to access .user
		const userId = (req as AuthRequest).user!.id;
		const { name, description, isPrivate } = req.body;

		if (!name) {
			res.status(400).json({ error: "Channel name is required" });
			return;
		}

		const channel = await prisma.channel.create({
			data: {
				name,
				description,
				isPrivate: !!isPrivate,
				type: isPrivate ? ChannelType.PRIVATE : ChannelType.PUBLIC,
				members: {
					create: {
						userId,
						role: Role.ADMIN,
					},
				},
			},
		});

		res.status(201).json(channel);
	} catch (error) {
		console.error("Create channel error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const createDM: RequestHandler = async (req, res) => {
	try {
		const userId = (req as AuthRequest).user!.id;
		const { targetUserId } = req.body;

		if (!targetUserId) {
			res.status(400).json({ error: "Target user ID required" });
			return;
		}

		const existingDM = await prisma.channel.findFirst({
			where: {
				type: ChannelType.DM,
				AND: [
					{ members: { some: { userId: userId } } },
					{ members: { some: { userId: targetUserId } } },
				],
			},
		});

		if (existingDM) {
			res.status(200).json(existingDM);
			return;
		}

		const newDM = await prisma.channel.create({
			data: {
				name: "dm_channel",
				type: ChannelType.DM,
				isPrivate: true,
				members: {
					create: [
						{ userId: userId, role: Role.MEMBER },
						{ userId: targetUserId, role: Role.MEMBER },
					],
				},
			},
		});

		res.status(201).json(newDM);
	} catch (error) {
		console.error("Create DM error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getUserChannels: RequestHandler = async (req, res) => {
	try {
		const userId = (req as AuthRequest).user!.id;

		const channels = await prisma.channel.findMany({
			where: {
				members: {
					some: { userId },
				},
			},
			include: {
				members: {
					include: {
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								userName: true,
								avatarUrl: true,
								isOnline: true,
							},
						},
					},
				},
			},
			orderBy: { updatedAt: "desc" },
		});

		res.status(200).json(channels);
	} catch (error) {
		console.error("Get channels error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// ---- MEMBER MANAGEMENT ----

export const addMember: RequestHandler = async (req, res) => {
	try {
		const adminId = (req as AuthRequest).user!.id;
		const { channelId, targetUserId } = req.body;

		const membership = await prisma.channelMember.findUnique({
			where: {
				userId_channelId: { userId: adminId, channelId },
			},
		});

		if (!membership || membership.role !== Role.ADMIN) {
			res.status(403).json({ error: "Only admins can add members" });
			return;
		}

		const newMember = await prisma.channelMember.create({
			data: {
				userId: targetUserId,
				channelId,
				role: Role.MEMBER,
			},
		});

		res.status(200).json(newMember);
	} catch (error) {
		console.error("Add member error:", error);
		res.status(500).json({ error: "Could not add member" });
	}
};

export const removeMember: RequestHandler = async (req, res) => {
	try {
		const adminId = (req as AuthRequest).user!.id;
		const { channelId, targetUserId } = req.body;

		const membership = await prisma.channelMember.findUnique({
			where: {
				userId_channelId: { userId: adminId, channelId },
			},
		});

		if (!membership || membership.role !== Role.ADMIN) {
			res.status(403).json({ error: "Only admins can remove members" });
			return;
		}

		await prisma.channelMember.delete({
			where: {
				userId_channelId: { userId: targetUserId, channelId },
			},
		});

		res.status(200).json({ message: "Member removed successfully" });
	} catch (error) {
		console.error("Remove member error:", error);
		res.status(500).json({ error: "Could not remove member" });
	}
};

// ---- USER PROFILE & SEARCH ----

export const updateUsername: RequestHandler = async (req, res) => {
	try {
		const userId = (req as AuthRequest).user!.id;
		const { username } = req.body;

		if (!username || username.length < 3) {
			res.status(400).json({
				error: "Username must be at least 3 chars",
			});
			return;
		}

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { userName: username },
		});

		res.status(200).json({
			message: "Username updated",
			user: { username: updatedUser.userName },
		});
	} catch (error: any) {
		if (error.code === "P2002") {
			res.status(409).json({ error: "Username already taken" });
			return;
		}
		console.error("Update username error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const checkUsernameAvailability: RequestHandler = async (req, res) => {
	try {
		const { username } = req.query;

		if (!username || typeof username !== "string") {
			res.status(400).json({ error: "Invalid username" });
			return;
		}

		const user = await prisma.user.findUnique({
			where: { userName: username },
			select: { id: true },
		});

		res.status(200).json({ available: !user });
	} catch (error) {
		console.error("Check username error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// NEW: Search Users for DM
