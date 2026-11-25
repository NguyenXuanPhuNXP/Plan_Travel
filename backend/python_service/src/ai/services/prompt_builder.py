import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
PROMPTS_DIR = BASE_DIR / "ai" / "prompts"


def read_prompt_file(filename: str) -> str:
    file_path = Path(PROMPTS_DIR) / filename
    return file_path.read_text(encoding="utf-8")


def load_fewshot_examples() -> list:
    file_path = Path(PROMPTS_DIR) / "planner_fewshot.json"
    return json.loads(file_path.read_text(encoding="utf-8"))


def build_messages(
    destination_type: str,
    place_types: list[str],
    region: str | None,
    weather: str | None,
    budget: int,
    retrieved_context: str
) -> list[dict]:
    system_prompt = read_prompt_file("system_prompt.txt")
    user_template = read_prompt_file("planner_user_prompt.txt")

    preferred_place_types = ", ".join(place_types) if place_types else "không có"
    region_value = region or "không có"
    weather_value = weather or "không có"

    user_prompt = user_template.format(
        retrieved_context=retrieved_context,
        destination_type=destination_type,
        preferred_place_types=preferred_place_types,
        region=region_value,
        weather=weather_value,
        budget=budget
    )

    messages = [
        {"role": "system", "content": system_prompt}
    ]

    for example in load_fewshot_examples():
        messages.append({
            "role": "user",
            "content": f"Ví dụ input: {json.dumps(example['input'], ensure_ascii=False)}"
        })
        messages.append({
            "role": "assistant",
            "content": "{\"plans\":[{\"title\":\"Ví dụ plan 1\"},{\"title\":\"Ví dụ plan 2\"},{\"title\":\"Ví dụ plan 3\"}]}"
        })

    messages.append({"role": "user", "content": user_prompt})
    return messages