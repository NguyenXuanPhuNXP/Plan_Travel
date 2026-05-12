import axios from "axios";

const GEOAPIFY_GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";
const GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places";

function getApiKey() {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
        throw new Error("Thiếu GEOAPIFY_API_KEY trong file .env");
    }
    return apiKey;
}

/**
 * Geocode khu vực trong phạm vi Việt Nam để lấy bbox
 * Ví dụ: "Da Nang, Vietnam"
 */
export async function geocodeRegionInVietnam(regionName) {
    const apiKey = getApiKey();

    const response = await axios.get(GEOAPIFY_GEOCODE_URL, {
        params: {
            text: `${regionName}, Vietnam`,
            format: "json",
            filter: "countrycode:vn",
            limit: 1,
            apiKey
        }
    });

    const results = response.data?.results || [];
    if (!results.length) {
        throw new Error(`Không tìm thấy khu vực "${regionName}" trong Việt Nam`);
    }

    const region = results[0];

    if (region.country_code !== "vn") {
        throw new Error(`Khu vực "${regionName}" không thuộc Việt Nam`);
    }

    if (
        region.bbox?.lon1 === undefined ||
        region.bbox?.lat1 === undefined ||
        region.bbox?.lon2 === undefined ||
        region.bbox?.lat2 === undefined
    ) {
        throw new Error(`Không lấy được bbox cho khu vực "${regionName}"`);
    }

    return {
        name: region.formatted || regionName,
        country: region.country,
        state: region.state,
        city: region.city,
        bbox: {
            lon1: region.bbox.lon1,
            lat1: region.bbox.lat1,
            lon2: region.bbox.lon2,
            lat2: region.bbox.lat2
        }
    };
}

/**
 * Lấy địa điểm theo bbox
 */
export async function fetchPlacesByBbox({
    bbox,
    categories,
    limit = 50,
    offset = 0,
    lang = "vi"
}) {
    const apiKey = getApiKey();

    const filter = `rect:${bbox.lon1},${bbox.lat1},${bbox.lon2},${bbox.lat2}`;

    const response = await axios.get(GEOAPIFY_PLACES_URL, {
        params: {
            categories: categories.join(","),
            filter,
            limit,
            offset,
            lang,
            apiKey
        }
    });

    return response.data?.features || [];
}