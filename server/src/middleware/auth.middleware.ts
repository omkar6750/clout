// src/middleware/auth.ts
import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthRequest extends Request {
	user?: {
		id: string;
	};
}

export const requireAuth = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		const token = req.cookies.auth_token;
		if (!token) return res.status(401).json({ error: "Not authenticated" });

		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
		});
		if (!user || !user.isVerified) {
			return res.status(401).json({ error: "Not verified" });
		}

		req.user = { id: user.id };
		next();
	} catch {
		return res.status(401).json({ error: "Invalid token" });
	}
};
