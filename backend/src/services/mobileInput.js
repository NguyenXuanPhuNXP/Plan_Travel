export function fail(status, code, message) {
    throw { status, code, message };
}

export function idOf(value) {
    if (!/^[1-9]\d{0,19}$/.test(String(value)) || BigInt(value) > 18446744073709551615n) {
        fail(400, 'INVALID_ID', 'Mã dữ liệu không hợp lệ.');
    }
    return BigInt(value);
}

export function pageInput({ limit = 30, cursor } = {}, max = 100) {
    const size = Number(limit);
    if (!Number.isInteger(size) || size < 1 || size > max) fail(400, 'INVALID_PAGE', `Giới hạn phải từ 1 đến ${max}.`);
    return { take: size, before: cursor == null ? null : idOf(cursor) };
}
