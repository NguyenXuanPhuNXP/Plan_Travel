import { generateAutoPlan, getSuggestions } from "../services/aiSuggestionService.js";
import { parseAiPlannerInput } from '../services/aiPlannerInput.js';

export async function getDestinationSuggestions(req, res) {
    const { region, days, budget, preferences } = parseAiPlannerInput(req.body);

    if (!region) {
        throw { status: 400, message: "Vui lòng nhập địa điểm." };
    }

    const suggestions = await getSuggestions({
        region,
        days: days || null,
        budget,
        preferences: preferences || []
    });

    res.json({
        region,
        total: suggestions.length,
        suggestions
    });
}

export async function createAutoPlan(req, res) {
    const input = parseAiPlannerInput(req.body);
    const { region, days, budget, preferences, selectedLocationIds, focusLocationId } = input;

    if (!region) {
        throw { status: 400, message: "Vui lòng nhập địa điểm." };
    }

    const plan = await generateAutoPlan({
        ...input,
        region,
        days: days || 3,
        budget,
        preferences: preferences || [],
        selectedLocationIds: selectedLocationIds || [],
        focusLocationId: focusLocationId || null
    });

    res.json(plan);
}
