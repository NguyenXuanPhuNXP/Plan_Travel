import { pool } from "../db.js";

const JOB_TYPE = "geoapify_places";

export async function getOrCreateSeedJob(regionName) {
    const [rows] = await pool.query(
        `
      SELECT * 
      FROM location_seed_jobs
      WHERE region_name = ? AND job_type = ?
      LIMIT 1
    `,
        [regionName, JOB_TYPE]
    );

    if (rows.length > 0) {
        return rows[0];
    }

    await pool.query(
        `
      INSERT INTO location_seed_jobs (
        region_name, job_type, status, last_page, last_offset,
        fetched_total, inserted_total, skipped_total
      )
      VALUES (?, ?, 'pending', -1, 0, 0, 0, 0)
    `,
        [regionName, JOB_TYPE]
    );

    const [newRows] = await pool.query(
        `
      SELECT * 
      FROM location_seed_jobs
      WHERE region_name = ? AND job_type = ?
      LIMIT 1
    `,
        [regionName, JOB_TYPE]
    );

    return newRows[0];
}

export async function markJobRunning(regionName) {
    await pool.query(
        `
      UPDATE location_seed_jobs
      SET status = 'running',
          started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
          last_error = NULL
      WHERE region_name = ? AND job_type = ?
    `,
        [regionName, JOB_TYPE]
    );
}

export async function updateJobProgress(regionName, progress) {
    const {
        lastPage,
        lastOffset,
        fetchedTotal,
        insertedTotal,
        skippedTotal
    } = progress;

    await pool.query(
        `
      UPDATE location_seed_jobs
      SET status = 'running',
          last_page = ?,
          last_offset = ?,
          fetched_total = ?,
          inserted_total = ?,
          skipped_total = ?
      WHERE region_name = ? AND job_type = ?
    `,
        [
            lastPage,
            lastOffset,
            fetchedTotal,
            insertedTotal,
            skippedTotal,
            regionName,
            JOB_TYPE
        ]
    );
}

export async function markJobDone(regionName, progress) {
    const {
        lastPage,
        lastOffset,
        fetchedTotal,
        insertedTotal,
        skippedTotal
    } = progress;

    await pool.query(
        `
      UPDATE location_seed_jobs
      SET status = 'done',
          last_page = ?,
          last_offset = ?,
          fetched_total = ?,
          inserted_total = ?,
          skipped_total = ?,
          last_error = NULL,
          finished_at = CURRENT_TIMESTAMP
      WHERE region_name = ? AND job_type = ?
    `,
        [
            lastPage,
            lastOffset,
            fetchedTotal,
            insertedTotal,
            skippedTotal,
            regionName,
            JOB_TYPE
        ]
    );
}

export async function markJobFailed(regionName, errorMessage) {
    await pool.query(
        `
      UPDATE location_seed_jobs
      SET status = 'failed',
          last_error = ?
      WHERE region_name = ? AND job_type = ?
    `,
        [errorMessage, regionName, JOB_TYPE]
    );
}

export async function getPendingOrResumableJobs() {
    const [rows] = await pool.query(
        `
      SELECT *
      FROM location_seed_jobs
      WHERE job_type = ?
        AND status IN ('pending', 'running', 'failed')
      ORDER BY region_name ASC
    `,
        [JOB_TYPE]
    );

    return rows;
}

export async function getDoneJobs() {
    const [rows] = await pool.query(
        `
      SELECT *
      FROM location_seed_jobs
      WHERE job_type = ?
        AND status = 'done'
      ORDER BY region_name ASC
    `,
        [JOB_TYPE]
    );

    return rows;
}