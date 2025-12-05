import {
	type Request,
	type Response,
	type NextFunction,
	type RequestHandler,
} from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET!;

// Keep this interface so you can use it in your Controllers
export interface AuthRequest extends Request {
	user?: {
		id: string;
	};
}

// Change: Explicitly type the function as 'RequestHandler'
// This ensures it matches exactly what app.use() or router.get() expects.
export const requireAuth: RequestHandler = async (req, res, next) => {
	try {
		const token = req.cookies.auth_token;
		if (!token) {
			// You must return void or the promise of void, so we use 'return' to stop execution,
			// but we don't return the Response object itself in the signature.
			res.status(401).json({ error: "Not authenticated" });
			return;
		}

		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
		});

		if (!user || !user.isVerified) {
			res.status(401).json({ error: "Not verified" });
			return;
		}

		// TYPE ASSERTION:
		// We cast 'req' to 'AuthRequest' to allow attaching the user property
		(req as AuthRequest).user = { id: user.id };

		next();
	} catch (err) {
		res.status(401).json({ error: "Invalid token" });
		return;
	}
};
