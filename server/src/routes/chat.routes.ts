import { Router } from "express";
import {
	createChannel,
	createDM,
	getUserChannels,
	addMember,
	removeMember,
	updateUsername,
	checkUsernameAvailability,
} from "../controllers/chat.controllers.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// ---- CHANNELS ----
router.get("/channels", requireAuth, getUserChannels);
router.post("/channels/create", requireAuth, createChannel);
router.post("/channels/dm", requireAuth, createDM);

// ---- MEMBERS ----
router.post("/channels/add-member", requireAuth, addMember);
router.delete("/channels/remove-member", requireAuth, removeMember);

// ---- USER PROFILE & SEARCH ----
router.put("/profile/username", requireAuth, updateUsername);
router.get("/profile/check-username", checkUsernameAvailability);

export default router;
