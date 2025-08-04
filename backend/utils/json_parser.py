# utils/json_parser.py (or place this near the top of workout_logs.py)

import json
import re

default_structure = {
    "weeks": [
        {
            "week": 1,
            "days": [
                {
                    "day": 1,
                    "label": "Full Body",
                    "exercises": [{"name": "Push Ups", "sets": 3, "reps": 10}]
                }
            ]
        }
    ]
}

def extract_json_from_response(text):
    """
    Try to parse JSON from LLM response. Falls back to a regex-based extraction,
    and returns default_structure if all parsing fails.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract the first JSON-like block
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
    return default_structure
