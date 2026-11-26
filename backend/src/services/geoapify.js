import axios from "axios";

const GEOAPIFY_GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";
const GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places";
const GEOAPIFY_ROUTING_URL = "https://api.geoapify.com/v1/routing";

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
        timeout: 10000,
        params: {
            text: `${regionName}, Vietnam`,
            format: "json",
            filter: "countrycode:vn",
            lang: "vi",
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
    if (region.lat == null || region.lon == null || !Number.isFinite(Number(region.lat)) || !Number.isFinite(Number(region.lon)) || Math.abs(Number(region.lat)) > 90 || Math.abs(Number(region.lon)) > 180) {
        throw new Error(`Không lấy được tọa độ trung tâm của khu vực "${regionName}"`);
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
        center: { lat: Number(region.lat), lon: Number(region.lon) },
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
    center,
    categories,
    limit = 50,
    offset = 0,
    lang = "vi"
}) {
    const apiKey = getApiKey();

    const filter = `rect:${bbox.lon1},${bbox.lat1},${bbox.lon2},${bbox.lat2}`;

    const response = await axios.get(GEOAPIFY_PLACES_URL, {
        timeout: 10000,
        params: {
            categories: categories.join(","),
            filter,
            ...(center ? { bias: `proximity:${center.lon},${center.lat}` } : {}),
            limit,
            offset,
            lang,
            apiKey
        }
    });

    return response.data?.features || [];
}

export async function fetchRouteEstimate(from, to, transportMode = 'auto') {
    if (!validCoordinate(from) || !validCoordinate(to)) return null;
    if (['flight', 'train'].includes(transportMode)) return null;
    const mode = transportMode === 'motorbike' ? 'motorcycle' : transportMode === 'other' ? 'walk' : 'drive';
    const response = await axios.get(GEOAPIFY_ROUTING_URL, {
        timeout: 8000,
        params: {
            waypoints: `${Number(from.latitude ?? from.lat)},${Number(from.longitude ?? from.lng)}|${Number(to.latitude ?? to.lat)},${Number(to.longitude ?? to.lng)}`,
            mode,
            apiKey: getApiKey()
        }
    });
    const properties = response.data?.features?.[0]?.properties;
    const distanceMeters = Number(properties?.distance);
    const durationSeconds = Number(properties?.time);
    if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) return null;
    return {
        distanceKm: Number((distanceMeters / 1000).toFixed(2)),
        minutes: Math.max(1, Math.ceil(durationSeconds / 60)),
        isEstimated: false
    };
}

function validCoordinate(point) {
    const rawLatitude = point?.latitude ?? point?.lat;
    const rawLongitude = point?.longitude ?? point?.lng;
    if (rawLatitude == null || rawLatitude === '' || rawLongitude == null || rawLongitude === '') return false;
    const latitude = Number(rawLatitude);
    const longitude = Number(rawLongitude);
    return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}
