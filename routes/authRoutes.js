import express from "express";
import {
  registerUser,
  loginUser,
  googleAuth,
  getAllUsers,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);

// Get All Database Users
router.get("/users", getAllUsers);

export default router;
