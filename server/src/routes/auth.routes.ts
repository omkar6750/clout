import { Router } from "express";
import passport from "passport";
import {
	signup,
	login,
	getMe,
	logout,
	googleCallback,
} from "../controllers/auth.controller.js";

const router = Router();

// — Email Authentication —
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", getMe);

// — Google OAuth —
router.get(
	"/google",
	passport.authenticate("google", {
		scope: ["profile", "email"],
	})
);

router.get(
	"/google/callback",
	passport.authenticate("google", { session: false }),
	googleCallback
);

export default router;
