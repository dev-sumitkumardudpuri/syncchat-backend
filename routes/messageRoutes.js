import express from "express";
import { getGroupMessages } from "../controllers/messageController.js";

const router = express.Router();

router.get("/:groupId", getGroupMessages);

export default router;
