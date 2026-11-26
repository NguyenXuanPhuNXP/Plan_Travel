import { generateAutoPlan, getSuggestions, recalculateGeneratedPlan } from "../services/aiSuggestionService.js";
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

export async function reviseAutoPlan(req, res) {
    const body = req.body || {};
    const plan = body.plan;
    if (!plan || !Array.isArray(plan.days) || plan.days.length < 1 || plan.days.length > 30 || plan.days.some(day => !Array.isArray(day.items) || day.items.length > 100)) {
        throw { status: 400, message: 'Lịch trình cần điều chỉnh không hợp lệ.' };
    }
    const input = parseAiPlannerInput({ ...body, region: 'revision', days: plan.days.length });
    const dayNumber = Number(body.dayNumber);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > plan.days.length) throw { status: 400, message: 'Ngày cần điều chỉnh không hợp lệ.' };
    const revised = await recalculateGeneratedPlan({
        plan,
        action: body.action,
        dayNumber,
        locationId: body.locationId,
        locationName: body.locationName,
        ...input,
        budget: input.budget
    });
    res.json(revised);
}
