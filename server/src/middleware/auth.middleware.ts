import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authRequired = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const token = req.cookies.auth_token;
	if (!token) return res.status(401).json({ error: "Unauthorized" });

	try {
		req.user = jwt.verify(token, process.env.JWT_SECRET!) as any;
		next();
	} catch {
		return res.status(401).json({ error: "Invalid token" });
	}
};
