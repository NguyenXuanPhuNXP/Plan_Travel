import express from "express";
import cors from "cors";
import path from "path";
import "./config/env.js";

import authRoutes from "./routes/auth.js";
import locationRoutes from "./routes/locations.js";
import itineraryRoutes from "./routes/itineraries.js";
import suggestionRoutes from "./routes/suggestions.js";
import sharingRoutes from "./routes/sharing.js";
import adminRoutes from "./routes/admin.js";
import friendRoutes from "./routes/friends.js";
import chatRoutes from "./routes/chat.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";

const app = express();

app.use(cors({
    origin: "http://localhost:5173", // Allow frontend URL
    credentials: true
}));
app.use(express.json({ limit: "15mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

/* =========================
   TEST API
========================= */
app.get("/", (req, res) => {
    res.send("Travel Planner API running...");
});

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/itineraries", itineraryRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/sharing", sharingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chat", chatRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
