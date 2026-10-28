import prisma from "../config/db.js";

const JOB_TYPE = "geoapify_places";

export async function getOrCreateSeedJob(regionName) {
    let job = await prisma.location_seed_jobs.findFirst({
        where: {
            region_name: regionName,
            job_type: JOB_TYPE
        }
    });

    if (job) {
        return job;
    }

    job = await prisma.location_seed_jobs.create({
        data: {
            region_name: regionName,
            job_type: JOB_TYPE,
            status: "pending",
            last_page: -1,
            last_offset: 0,
            fetched_total: 0,
            inserted_total: 0,
            skipped_total: 0
        }
    });

    return job;
}

export async function markJobRunning(regionName) {
    const job = await getOrCreateSeedJob(regionName);
    
    await prisma.location_seed_jobs.update({
        where: { id: job.id },
        data: {
            status: "running",
            started_at: job.started_at ? undefined : new Date(), // only set if null
            last_error: null,
            updated_at: new Date()
        }
    });
}

export async function updateJobProgress(regionName, progress) {
    const {
        lastPage,
        lastOffset,
        fetchedTotal,
        insertedTotal,
        skippedTotal
    } = progress;

    const job = await getOrCreateSeedJob(regionName);

    await prisma.location_seed_jobs.update({
        where: { id: job.id },
        data: {
            status: "running",
            last_page: lastPage,
            last_offset: lastOffset,
            fetched_total: fetchedTotal,
            inserted_total: insertedTotal,
            skipped_total: skippedTotal,
            updated_at: new Date()
        }
    });
}

export async function markJobDone(regionName, progress) {
    const {
        lastPage,
        lastOffset,
        fetchedTotal,
        insertedTotal,
        skippedTotal
    } = progress;

    const job = await getOrCreateSeedJob(regionName);

    await prisma.location_seed_jobs.update({
        where: { id: job.id },
        data: {
            status: "done",
            last_page: lastPage,
            last_offset: lastOffset,
            fetched_total: fetchedTotal,
            inserted_total: insertedTotal,
            skipped_total: skippedTotal,
            last_error: null,
            finished_at: new Date(),
            updated_at: new Date()
        }
    });
}

export async function markJobFailed(regionName, errorMessage) {
    const job = await getOrCreateSeedJob(regionName);

    await prisma.location_seed_jobs.update({
        where: { id: job.id },
        data: {
            status: "failed",
            last_error: errorMessage,
            updated_at: new Date()
        }
    });
}

export async function getPendingOrResumableJobs() {
    return await prisma.location_seed_jobs.findMany({
        where: {
            job_type: JOB_TYPE,
            status: {
                in: ["pending", "running", "failed"]
            }
        },
        orderBy: {
            region_name: 'asc'
        }
    });
}

export async function getDoneJobs() {
    return await prisma.location_seed_jobs.findMany({
        where: {
            job_type: JOB_TYPE,
            status: "done"
        },
        orderBy: {
            region_name: 'asc'
        }
    });
}