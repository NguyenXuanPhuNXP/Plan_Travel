import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth.js";
import locationRoutes from "./routes/locations.js";

const app = express();

app.use(cors({
    origin: "http://localhost:5173", // Allow frontend URL
    credentials: true
}));
app.use(express.json());

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

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});