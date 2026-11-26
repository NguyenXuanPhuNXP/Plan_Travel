// shortcut: counters are per API process; use a shared store before scaling to multiple replicas.
export function rateLimit({ limit, windowMs }) {
    const buckets = new Map();
    return (req, res, next) => {
        const now = Date.now();
        for (const [key, entry] of buckets) if (entry.until <= now) buckets.delete(key);
        const key = req.user?.id || req.ip;
        const entry = buckets.get(key) || { count: 0, until: now + windowMs };
        buckets.set(key, entry);
        if (++entry.count > limit) {
            res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
            return res.status(429).json({ code: 'RATE_LIMITED', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' });
        }
        next();
    };
}
