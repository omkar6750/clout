// routes/user.routes.ts (or auth.routes.ts)
import { searchUsers } from "../controllers/user.controllers.js";

import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/search", requireAuth, searchUsers);

export default router;
