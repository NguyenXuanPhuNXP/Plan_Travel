import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   TEST API
========================= */
app.get("/", (req, res) => {
    res.send("API running...");
});

/* =========================
   GET LOCATIONS
========================= */
app.get("/api/locations", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM locations");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =========================
   CREATE LOCATION
========================= */
app.post("/api/locations", async (req, res) => {
    const { name, latitude, longitude, category_id } = req.body;

    try {
        const sql = `
            INSERT INTO locations 
            (name, latitude, longitude, geo_point, category_id)
            VALUES (?, ?, ?, ST_SRID(POINT(?, ?), 4326), ?)
        `;

        await pool.query(sql, [
            name,
            latitude,
            longitude,
            longitude,
            latitude,
            category_id
        ]);

        res.json({ message: "Created!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT, () => {
    console.log("Server running on port", process.env.PORT);
});

// node server.js