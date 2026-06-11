import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(backendRoot, "..");

const envFiles = [
    path.join(projectRoot, ".env"),
    path.join(backendRoot, ".env")
];

for (const envFile of envFiles) {
    dotenv.config({ path: envFile });
}

if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    const user = encodeURIComponent(process.env.DB_USER);
    const password = encodeURIComponent(process.env.DB_PASSWORD || "");
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT || "3306";
    const database = encodeURIComponent(process.env.DB_NAME);

    process.env.DATABASE_URL = `mysql://${user}:${password}@${host}:${port}/${database}`;
}
