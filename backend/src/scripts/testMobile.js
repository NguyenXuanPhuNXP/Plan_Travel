import '../config/env.js';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Never run integration tests against the application's configured database.
const dbName = `plantravel_mobile_test_${randomBytes(6).toString('hex')}`;
const admin = new PrismaClient();
const url = new URL(process.env.DATABASE_URL);
url.pathname = `/${dbName}`;
const root = fileURLToPath(new URL('../../', import.meta.url));
const env = { ...process.env, DATABASE_URL: url.toString(), MOBILE_TEST_DATABASE_URL: url.toString(), JWT_SECRET: 'isolated-mobile-integration-secret', SMTP_HOST: '', GEMINI_API_KEY: '', GEOAPIFY_API_KEY: '', PYTHON_AI_URL: 'http://127.0.0.1:9' };
let created = false;
try {
    await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { cwd: root, env, stdio: 'inherit' });
    execFileSync(process.execPath, ['--test', 'tests/mobileIntegration.test.js'], { cwd: root, env, stdio: 'inherit' });
    if (process.argv.includes('--regression') || process.argv.includes('--serve')) {
        execFileSync(process.execPath, ['src/scripts/seedDemo.js'], { cwd: root, env, stdio: 'inherit' });
    }
    if (process.argv.includes('--regression')) {
        execFileSync(process.execPath, ['--test', ...['accountIsolation', 'planEditing', 'checklist', 'packingCatalogAndTripHistory', 'tripGroupChat', 'tripExpensesPersistence', 'community', 'businessFlow', 'migrationSafety'].map(name => `tests/${name}.test.js`)], { cwd: root, env, stdio: 'inherit' });
    }
    if (process.argv.includes('--serve')) {
        Object.assign(process.env, env, { PORT: '5011', ADMIN_EMAIL: '', ADMIN_PASSWORD: '' });
        const { server } = await import('../server.js');
        console.log('Disposable mobile preview at http://localhost:5011/api. Ctrl+C cleans up the test database.');
        await new Promise(resolve => {
            const stop = () => server.close(resolve);
            process.once('SIGINT', stop); process.once('SIGTERM', stop);
        });
        const { default: client } = await import('../config/db.js');
        await client.$disconnect();
    }
} catch (error) {
    console.error('Mobile checks failed:', error.code || error.name || 'UNKNOWN_ERROR');
    process.exitCode = 1;
} finally {
    if (created) await admin.$executeRawUnsafe(`DROP DATABASE \`${dbName}\``);
    await admin.$disconnect();
}
