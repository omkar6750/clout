import { type Request, type Response } from "express";
import { prisma } from "../db.js"; // Adjust path to your db instance
import { type AuthRequest } from "../middleware/auth.middleware.js";
import { ChannelType, Role } from "@prisma/client";

// ---- CHANNEL MANAGEMENT ----

export const createChannel = async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user!.id;
		const { name, description, isPrivate } = req.body;

		if (!name)
			return res.status(400).json({ error: "Channel name is required" });

		// Atomic transaction: Create channel AND add creator as ADMIN
		const channel = await prisma.channel.create({
			data: {
				name,
				description,
				isPrivate: !!isPrivate,
				type: isPrivate ? ChannelType.PRIVATE : ChannelType.PUBLIC,
				members: {
					create: {
						userId,
						role: Role.ADMIN, // Creator is Admin
					},
				},
			},
		});

		return res.status(201).json(channel);
	} catch (error) {
		console.error("Create channel error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const createDM = async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user!.id;
		const { targetUserId } = req.body;

		if (!targetUserId)
			return res.status(400).json({ error: "Target user ID required" });

		// 1. Check if a DM already exists between these two users
		// We look for a DM channel where BOTH users are members
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
			return res.status(200).json(existingDM);
		}

		// 2. Create new DM
		// Note: Channel 'name' is required in your schema. We use a placeholder for DMs.
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

		return res.status(201).json(newDM);
	} catch (error) {
		console.error("Create DM error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const getUserChannels = async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user!.id;

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
								avatarUrl: true,
								isOnline: true,
							},
						},
					},
				},
			},
			orderBy: { updatedAt: "desc" },
		});

		return res.status(200).json(channels);
	} catch (error) {
		console.error("Get channels error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

// ---- MEMBER MANAGEMENT ----

export const addMember = async (req: AuthRequest, res: Response) => {
	try {
		const adminId = req.user!.id;
		const { channelId, targetUserId } = req.body;

		// 1. Verify requester is ADMIN of this channel
		const membership = await prisma.channelMember.findUnique({
			where: {
				userId_channelId: { userId: adminId, channelId },
			},
		});

		if (!membership || membership.role !== Role.ADMIN) {
			return res
				.status(403)
				.json({ error: "Only admins can add members" });
		}

		// 2. Add the new member
		const newMember = await prisma.channelMember.create({
			data: {
				userId: targetUserId,
				channelId,
				role: Role.MEMBER,
			},
		});

		return res.status(200).json(newMember);
	} catch (error) {
		console.error("Add member error:", error);
		return res.status(500).json({ error: "Could not add member" });
	}
};

export const removeMember = async (req: AuthRequest, res: Response) => {
	try {
		const adminId = req.user!.id;
		const { channelId, targetUserId } = req.body;

		// 1. Verify requester is ADMIN
		const membership = await prisma.channelMember.findUnique({
			where: {
				userId_channelId: { userId: adminId, channelId },
			},
		});

		if (!membership || membership.role !== Role.ADMIN) {
			return res
				.status(403)
				.json({ error: "Only admins can remove members" });
		}

		// 2. Remove the member
		await prisma.channelMember.delete({
			where: {
				userId_channelId: { userId: targetUserId, channelId },
			},
		});

		return res.status(200).json({ message: "Member removed successfully" });
	} catch (error) {
		console.error("Remove member error:", error);
		return res.status(500).json({ error: "Could not remove member" });
	}
};

// ---- USER PROFILE ----

export const updateUsername = async (req: AuthRequest, res: Response) => {
	try {
		const userId = req.user!.id;
		const { username } = req.body;

		if (!username || username.length < 3) {
			return res
				.status(400)
				.json({ error: "Username must be at least 3 chars" });
		}

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { userName: username },
		});

		return res.status(200).json({
			message: "Username updated",
			user: { username: updatedUser.userName },
		});
	} catch (error: any) {
		// Prisma error code for unique constraint violation
		if (error.code === "P2002") {
			return res.status(409).json({ error: "Username already taken" });
		}
		console.error("Update username error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const checkUsernameAvailability = async (
	req: Request,
	res: Response
) => {
	try {
		const { username } = req.query;

		if (!username || typeof username !== "string") {
			return res.status(400).json({ error: "Invalid username" });
		}

		const user = await prisma.user.findUnique({
			where: { userName: username },
			select: { id: true }, // Optimization: select only ID
		});

		return res.status(200).json({ available: !user });
	} catch (error) {
		console.error("Check username error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};
