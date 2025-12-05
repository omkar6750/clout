import { type Request, type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET!;

const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
		| "none"
		| "lax"
		| "strict",
	maxAge: 7 * 24 * 60 * 60 * 1000,
};

const issueToken = (userId: string) =>
	jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

// -------------------- EMAIL SIGNUP --------------------
export const signup = async (req: Request, res: Response) => {
	try {
		const { email, password, firstName, lastName, userName } = req.body;

		if (!email || !password || !firstName || !lastName)
			return res.status(400).json({ error: "All fields are required" });

		const exists = await prisma.user.findUnique({ where: { email } });
		if (exists)
			return res.status(400).json({ error: "Email already in use" });

		const hashed = await bcrypt.hash(password, 10);

		const user = await prisma.user.create({
			data: {
				email,
				password: hashed,
				firstName,
				lastName,
				userName,
				isVerified: true, //demo only
				avatarUrl: null,
			},
		});

		res.cookie("auth_token", issueToken(user.id), COOKIE_OPTIONS);
		return res.status(201).json({ user });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Signup failed" });
	}
};

// -------------------- EMAIL LOGIN --------------------
export const login = async (req: Request, res: Response) => {
	const { email, password } = req.body;

	const user = await prisma.user.findUnique({ where: { email } });
	if (!user || !user.password)
		return res.status(400).json({ error: "Invalid credentials" });

	const valid = await bcrypt.compare(password, user.password);
	if (!valid) return res.status(400).json({ error: "Invalid credentials" });

	res.cookie("auth_token", issueToken(user.id), COOKIE_OPTIONS);
	res.json({ user });
};

// -------------------- GOOGLE REDIRECT SUCCESS --------------------
export const googleCallback = async (req: Request, res: Response) => {
	const user = req.user as any;

	const token = issueToken(user.id);
	res.cookie("auth_token", token, COOKIE_OPTIONS);

	return res.redirect(process.env.FRONTEND_URL!);
};

// -------------------- ME --------------------
export const getMe = async (req: Request, res: Response) => {
	try {
		const token = req.cookies.auth_token;
		if (!token) return res.status(401).json({ error: "Not authenticated" });

		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
		});

		if (!user) return res.status(401).json({ error: "User not found" });

		res.json({ user });
	} catch {
		res.status(401).json({ error: "Invalid token" });
	}
};

// -------------------- LOGOUT --------------------
export const logout = (req: Request, res: Response) => {
	res.clearCookie("auth_token", COOKIE_OPTIONS);
	res.json({ message: "Logged out" });
};
