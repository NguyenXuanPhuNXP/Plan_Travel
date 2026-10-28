function estimateCostByCategory(categories = []) {
    const joined = categories.join(",");

    if (joined.includes("catering.cafe")) return 60000;
    if (joined.includes("catering.restaurant")) return 180000;
    if (joined.includes("accommodation.hotel")) return 800000;
    if (joined.includes("entertainment.museum")) return 80000;
    if (joined.includes("tourism")) return 50000;

    return 50000;
}

function estimateDuration(categories = []) {
    const joined = categories.join(",");

    if (joined.includes("catering.cafe")) return "1-2 giờ";
    if (joined.includes("catering.restaurant")) return "1-2 giờ";
    if (joined.includes("accommodation.hotel")) return "qua đêm";
    if (joined.includes("entertainment.museum")) return "2-3 giờ";
    if (joined.includes("tourism")) return "2-4 giờ";

    return "1-2 giờ";
}

function buildTags(categories = [], properties = {}) {
    const tags = new Set();
    const joined = categories.join(",");

    if (joined.includes("catering.cafe")) tags.add("cafe");
    if (joined.includes("catering.restaurant")) tags.add("quan-an");
    if (joined.includes("tourism")) tags.add("du-lich");
    if (joined.includes("entertainment.museum")) tags.add("bao-tang");
    if (joined.includes("accommodation.hotel")) tags.add("khach-san");

    const text = `${properties.name || ""} ${properties.formatted || ""}`.toLowerCase();

    if (text.includes("beach") || text.includes("biển")) tags.add("bien");
    if (text.includes("mountain") || text.includes("núi")) tags.add("nui");
    if (text.includes("lake") || text.includes("hồ")) tags.add("ho");
    if (text.includes("cầu")) tags.add("tham-quan");
    if (text.includes("chợ")) tags.add("mua-sam");

    return Array.from(tags);
}

function pickCategory(categories = []) {
    return categories[0] || null;
}

function pickSubcategory(categories = []) {
    if (categories.length <= 1) return null;
    return categories.slice(1, 3).join(", ");
}

function normalizeCountryName(country) {
    if (!country) return null;

    const c = country.trim().toLowerCase();

    if (c === "vietnam" || c === "việt nam" || c === "viet nam") {
        return "Vietnam";
    }

    return country;
}

export function isVietnamLocation(location) {
    const code = (location.country_code || "").toLowerCase();
    if (code === "vn") return true;

    const normalizedCountry = normalizeCountryName(location.country);
    return normalizedCountry === "Vietnam";
}

export function mapGeoapifyFeatureToLocation(feature, fallbackRegion = null) {
    const p = feature?.properties || {};
    const categories = p.categories || [];

    return {
        external_id: p.place_id,
        source: "geoapify",
        name: p.name || p.address_line1 || "Không rõ tên",
        address: p.formatted || null,
        country: normalizeCountryName(p.country || null),
        country_code: (p.country_code || "").toLowerCase() || null,
        province: p.state || null,
        city: p.city || null,
        district: p.district || null,
        region: fallbackRegion || p.city || p.state || null,
        category: pickCategory(categories),
        subcategory: pickSubcategory(categories),
        description: null,
        latitude: p.lat,
        longitude: p.lon,
        estimated_cost: estimateCostByCategory(categories),
        suggested_duration: estimateDuration(categories),
        image_url: null,
        rating: null,
        tags: buildTags(categories, p),
        raw_json: feature
    };
}