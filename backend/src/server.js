import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
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
import { ensureAdminAccount } from "./services/authService.js";

const app = express();

app.use(cors({
    origin: (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map(url => url.trim()),
    credentials: true
}));
app.use(express.json({ limit: "15mb" }));
app.use("/uploads", express.static(fileURLToPath(new URL("../uploads/", import.meta.url))));

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

const server = app.listen(PORT, async () => {
    console.log(`✓ Server backend chạy thành công trên cổng http://localhost:${PORT}`);
    await ensureAdminAccount();
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`❌ Cổng ${PORT} đang bị chiếm dụng bởi tiến trình khác (EADDRINUSE).`);
        console.error(`👉 Bạn có thể giải phóng cổng bằng lệnh PowerShell:`);
        console.error(`   Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force`);
    } else {
        console.error("❌ Lỗi khi khởi động server:", err);
    }
});
