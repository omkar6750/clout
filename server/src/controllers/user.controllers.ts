import type { RequestHandler } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { prisma } from "../db.js";

export const searchUsers: RequestHandler = async (req, res) => {
	try {
		const currentUserId = (req as AuthRequest).user!.id;
		const { query } = req.query;

		if (!query || typeof query !== "string") {
			res.status(400).json({ error: "Search query required" });
			return;
		}

		const users = await prisma.user.findMany({
			where: {
				userName: {
					contains: query,
					mode: "insensitive",
				},
				id: {
					not: currentUserId,
				},
			},
			take: 10, // Limit results
			select: {
				id: true,
				userName: true,
				firstName: true,
				lastName: true,
				avatarUrl: true,
				isOnline: true,
			},
		});

		res.status(200).json(users);
	} catch (error) {
		console.error("Search users error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};
