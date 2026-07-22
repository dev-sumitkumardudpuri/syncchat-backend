import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { seedDefaultGroups } from "./config/seedRooms.js";
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import Message from "./models/Message.js";
import User from "./models/User.js";

dotenv.config();

connectDB().then(() => {
  seedDefaultGroups();
});

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const socketUserMap = new Map();

const getOnlineUsersArray = () => {
  return Array.from(new Set(socketUserMap.values()));
};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("user_connected", async (userId) => {
    if (userId) {
      socketUserMap.set(socket.id, userId);
      socket.userId = userId;

      socket.join(userId);

      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
      } catch (err) {
        console.error("Error updating online status:", err);
      }

      io.emit("get_online_users", getOnlineUsersArray());
    }
  });

  socket.on("join_group", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  socket.on("join_all_groups", (groupIds) => {
    if (Array.isArray(groupIds)) {
      groupIds.forEach((gId) => {
        if (gId) socket.join(gId.toString());
      });
      console.log(`User ${socket.id} joined ${groupIds.length} groups.`);
    }
  });

  socket.on("new_group_created", (groupData) => {
    io.emit("group_created", groupData);
  });

  socket.on("send_message", async (data, ackCallback) => {
    const { groupId, senderId, text, targetUserId } = data;

    try {
      const newMessage = await Message.create({
        groupId,
        sender: senderId,
        text,
      });

      await newMessage.populate("sender", "name email avatar");

      const isDm = groupId?.startsWith("dm_") || !!targetUserId;

      const payload = {
        ...newMessage.toObject(),
        groupId,
        isDirect: isDm,
      };

      let recipientId = targetUserId;
      if (!recipientId && groupId && groupId.startsWith("dm_")) {
        const parts = groupId.split("_");
        recipientId = parts.find(
          (id) => id !== "dm" && id !== senderId?.toString(),
        );
      }

      if (isDm) {
        if (recipientId) {
          socket.to(recipientId).emit("receive_message", payload);
        } else if (groupId) {
          socket.to(groupId).emit("receive_message", payload);
        }
      } else {
        if (groupId) {
          socket.to(groupId).emit("receive_message", payload);
        } else {
          socket.broadcast.emit("receive_message", payload);
        }
      }

      if (typeof ackCallback === "function") {
        ackCallback({ success: true, message: payload });
      }
    } catch (error) {
      console.error("Error saving message:", error);
      if (typeof ackCallback === "function") {
        ackCallback({ success: false, error: "Failed to send message" });
      }
    }
  });

  socket.on("typing", (data) => {
    socket.to(data.roomId).emit("display_typing", data);
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.roomId).emit("display_stop_typing", data);
  });

  socket.on("user_logout", async (userId) => {
    if (userId) {
      for (let [sId, uId] of socketUserMap.entries()) {
        if (uId === userId) {
          socketUserMap.delete(sId);
        }
      }
      try {
        await User.findByIdAndUpdate(userId, { isOnline: false });
      } catch (err) {
        console.error("Error updating logout status:", err);
      }
      io.emit("get_online_users", getOnlineUsersArray());
    }
  });

  socket.on("disconnect", async () => {
    console.log(`User Disconnected: ${socket.id}`);

    const userId = socketUserMap.get(socket.id);
    if (userId) {
      socketUserMap.delete(socket.id);

      const isStillConnected = Array.from(socketUserMap.values()).includes(
        userId,
      );
      if (!isStillConnected) {
        try {
          await User.findByIdAndUpdate(userId, { isOnline: false });
        } catch (err) {
          console.error("Error updating offline status:", err);
        }
      }

      io.emit("get_online_users", getOnlineUsersArray());
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("SyncChat API Server is Running...");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
});
