import { generateAutoPlan, getSuggestions } from "../services/aiSuggestionService.js";

export async function getDestinationSuggestions(req, res) {
    const { region, days, budget, preferences } = req.body;

    if (!region) {
        throw { status: 400, message: "Vui lòng nhập địa điểm." };
    }

    const suggestions = await getSuggestions({
        region,
        days: days || null,
        budget: budget || null,
        preferences: preferences || []
    });

    res.json({
        region,
        total: suggestions.length,
        suggestions
    });
}

export async function createAutoPlan(req, res) {
    const { region, days, budget, preferences, selectedLocationIds, focusLocationId } = req.body;

    if (!region) {
        throw { status: 400, message: "Vui lòng nhập địa điểm." };
    }

    const plan = await generateAutoPlan({
        region,
        days: days || 3,
        budget: budget || null,
        preferences: preferences || [],
        selectedLocationIds: selectedLocationIds || [],
        focusLocationId: focusLocationId || null
    });

    res.json(plan);
}
