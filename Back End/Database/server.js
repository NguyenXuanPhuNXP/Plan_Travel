import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { pool } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "travel_planner_secret_jwt_key_2026";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// In-memory fallback if MySQL is offline or not configured yet
const memoryUsers = new Map();
let isDbConnected = false;

// Auto initialize tables if MySQL is online
async function initDatabase() {
  try {
    const [result] = await pool.query("SELECT 1");
    isDbConnected = true;
    console.log("✅ MySQL Database connected successfully (127.0.0.1:3306).");

    // 1. Tạo bảng users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        google_id VARCHAR(255) NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        name VARCHAR(255) NOT NULL,
        avatar TEXT NULL,
        role VARCHAR(50) DEFAULT 'user',
        auth_provider VARCHAR(50) DEFAULT 'local',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Tạo bảng categories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Tạo bảng locations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NULL,
        description TEXT NULL,
        image TEXT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        geo_point POINT SRID 4326 NULL,
        category_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default locations if empty
    const [locCount] = await pool.query("SELECT COUNT(*) AS total FROM locations");
    if (locCount[0].total === 0) {
      const seedSql = `
        INSERT INTO locations (name, address, description, image, latitude, longitude, geo_point, category_id)
        VALUES 
        ('Hồ Hoàn Kiếm', 'Hoàn Kiếm, Hà Nội', 'Trái tim của thủ đô Hà Nội với Tháp Rùa cổ kính.', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&q=80&w=800', 21.0285, 105.8542, ST_SRID(POINT(105.8542, 21.0285), 4326), 1),
        ('Văn Miếu - Quốc Tử Giám', '58 Quốc Tử Giám, Đống Đa, Hà Nội', 'Trường đại học đầu tiên của Việt Nam.', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800', 21.0294, 105.8355, ST_SRID(POINT(105.8355, 21.0294), 4326), 2),
        ('Lăng Chủ tịch Hồ Chí Minh', 'Ba Đình, Hà Nội', 'Nơi an nghỉ của Bác Hồ vĩ đại.', 'https://images.unsplash.com/photo-1599708153386-62e259966601?auto=format&fit=crop&q=80&w=800', 21.0368, 105.8346, ST_SRID(POINT(105.8346, 21.0368), 4326), 2);
      `;
      await pool.query(seedSql);
      console.log("🌱 Seeded initial locations into database.");
    }

    console.log("✅ Tables (users, categories, locations) ready in MySQL.");
  } catch (err) {
    isDbConnected = false;
    console.warn("⚠️ MySQL not available (" + err.message + "). Server will use memory fallback for Auth & Locations.");
  }
}
initDatabase();

/* =========================================================
   AUTH ROUTES
   ========================================================= */

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// 1. Google Auth (Supports both real Google idToken and Dev simulation)
app.post("/api/auth/google", async (req, res) => {
  const { credential, email, name, avatar, sub } = req.body;

  let googleUser = {
    sub: sub || `google_${Date.now()}`,
    email: email,
    name: name || "Lữ khách Google",
    avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name || "Google"}`
  };

  if (credential && GOOGLE_CLIENT_ID) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      googleUser = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        avatar: payload.picture,
      };
    } catch (verifyErr) {
      console.warn("Lỗi xác minh token Google, chuyển sang dev payload:", verifyErr.message);
    }
  }

  if (!googleUser.email) {
    return res.status(400).json({ error: "Không tìm thấy thông tin email từ Google" });
  }

  try {
    let user = null;

    if (isDbConnected) {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ? OR google_id = ?", [
        googleUser.email,
        googleUser.sub,
      ]);

      if (rows.length > 0) {
        user = rows[0];
        await pool.query("UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?", [
          googleUser.avatar || user.avatar,
          user.id,
        ]);
      } else {
        const [insertResult] = await pool.query(
          "INSERT INTO users (google_id, email, name, avatar, auth_provider) VALUES (?, ?, ?, ?, 'google')",
          [googleUser.sub, googleUser.email, googleUser.name, googleUser.avatar]
        );
        user = {
          id: insertResult.insertId,
          google_id: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.avatar,
          role: "user",
          auth_provider: "google",
        };
      }
    } else {
      user = memoryUsers.get(googleUser.email) || {
        id: `user_${Date.now()}`,
        google_id: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.avatar,
        role: "user",
        auth_provider: "google",
      };
      memoryUsers.set(googleUser.email, user);
    }

    const token = generateToken(user);
    return res.json({
      message: "Đăng nhập Google thành công",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role || "user",
        authProvider: "google"
      },
      token,
    });
  } catch (err) {
    console.error("Lỗi Google Auth:", err);
    return res.status(500).json({ error: "Lỗi hệ thống khi xử lý đăng nhập Google" });
  }
});

// 2. Regular Register (Email + Password)
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: "Thông tin không hợp lệ, mật khẩu cần ít nhất 6 ký tự" });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`;

    let newUser = null;

    if (isDbConnected) {
      const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Email này đã được đăng ký tài khoản" });
      }

      const [result] = await pool.query(
        "INSERT INTO users (email, password_hash, name, avatar, auth_provider) VALUES (?, ?, ?, ?, 'local')",
        [email, passwordHash, name || "Lữ khách", avatar]
      );
      newUser = { id: result.insertId, email, name, avatar, role: "user", auth_provider: "local" };
    } else {
      if (memoryUsers.has(email)) {
        return res.status(400).json({ error: "Email này đã tồn tại trong hệ thống" });
      }
      newUser = { id: `user_${Date.now()}`, email, passwordHash, name, avatar, role: "user", auth_provider: "local" };
      memoryUsers.set(email, newUser);
    }

    const token = generateToken(newUser);
    return res.json({
      message: "Đăng ký thành công",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        role: "user",
        authProvider: "local"
      },
      token,
    });
  } catch (err) {
    console.error("Lỗi đăng ký:", err);
    return res.status(500).json({ error: "Lỗi hệ thống khi tạo tài khoản" });
  }
});

// 3. Regular Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = null;

    if (isDbConnected) {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      if (rows.length === 0) {
        return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
      }
      user = rows[0];

      if (user.password_hash) {
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
          return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
        }
      }
    } else {
      user = memoryUsers.get(email);
      if (!user) {
        user = {
          id: `user_${Date.now()}`,
          name: email.split("@")[0],
          email,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`,
          role: "user",
          auth_provider: "local"
        };
        memoryUsers.set(email, user);
      }
    }

    const token = generateToken(user);
    return res.json({
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role || "user",
        authProvider: user.auth_provider || "local"
      },
      token,
    });
  } catch (err) {
    console.error("Lỗi đăng nhập:", err);
    return res.status(500).json({ error: "Lỗi hệ thống khi xử lý đăng nhập" });
  }
});

/* =========================================================
   LOCATIONS API
   ========================================================= */

// Get all locations
app.get("/api/locations", async (req, res) => {
  if (!isDbConnected) {
    return res.json([
      { id: 1, name: "Hồ Hoàn Kiếm", latitude: 21.0285, longitude: 105.8542 },
      { id: 2, name: "Văn Miếu - Quốc Tử Giám", latitude: 21.0294, longitude: 105.8355 },
      { id: 3, name: "Lăng Chủ tịch Hồ Chí Minh", latitude: 21.0368, longitude: 105.8346 }
    ]);
  }
  try {
    const [rows] = await pool.query("SELECT * FROM locations ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new location
app.post("/api/locations", async (req, res) => {
  const { name, latitude, longitude, category_id, address, description, image } = req.body;

  if (!isDbConnected) {
    return res.json({ message: "Created (mock)", id: Date.now() });
  }

  try {
    const sql = `
      INSERT INTO locations 
      (name, address, description, image, latitude, longitude, geo_point, category_id)
      VALUES (?, ?, ?, ?, ?, ?, ST_SRID(POINT(?, ?), 4326), ?)
    `;

    const [result] = await pool.query(sql, [
      name,
      address || null,
      description || null,
      image || null,
      latitude,
      longitude,
      longitude,
      latitude,
      category_id || null
    ]);

    res.json({ message: "Created!", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Plan Travel Backend running on http://localhost:${PORT}`);
});
