import '../config/env.js';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../../', import.meta.url));
const target = new URL(process.env.DATABASE_URL);
const name = decodeURIComponent(target.pathname.slice(1));
if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('Invalid database name');
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
    throw new Error('Automatic database initialization is restricted to localhost.');
}
target.pathname = '/mysql';
const admin = new PrismaClient({ datasources: { db: { url: target.toString() } } });
try {
    // Create only if missing: existing tables and user records are preserved.
    await admin.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
} finally {
    await admin.$disconnect();
}
execFileSync(process.execPath, [fileURLToPath(new URL('../../node_modules/prisma/build/index.js', import.meta.url)), 'migrate', 'deploy'], {
    cwd: backendRoot, stdio: 'inherit'
});
execFileSync(process.execPath, [fileURLToPath(new URL('./seedDemo.js', import.meta.url))], { cwd: backendRoot, stdio: 'inherit' });
