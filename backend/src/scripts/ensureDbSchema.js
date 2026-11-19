import prisma from "../config/db.js";

async function ensureColumn(tableName, columnName, definition) {
    const rows = await prisma.$queryRawUnsafe(
        `SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`
    );

    if (rows.length > 0) {
        console.log(`${tableName}.${columnName} already exists`);
        return;
    }

    await prisma.$executeRawUnsafe(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
    );
    console.log(`Added ${tableName}.${columnName}`);
}

async function main() {
    await ensureColumn("locations", "embedding", "JSON NULL");
}

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
