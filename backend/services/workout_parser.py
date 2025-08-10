# services/workout_parser.py - Enhanced LLM Workout Text Parser

import json
import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from models.workoutLog_model import WorkoutExercise
from models.db import db
from utils.json_parser import extract_json_from_response

class WorkoutTextParser:
    """Enhanced workout text parser with better LLM prompts and fallback strategies"""
    
    def __init__(self, llm_engine):
        self.llm = llm_engine
        self.exercise_patterns = self._compile_exercise_patterns()
        
    def _compile_exercise_patterns(self):
        """Compile regex patterns for exercise parsing"""
        return {
            'exercise_name': re.compile(r'^\s*(?:\d+\.?\s*)?([^(\n]+)(?:\([^)]*\))?', re.MULTILINE),
            'sets_reps': re.compile(r'(\d+)\s*(?:x|×|sets?)\s*(\d+)(?:-(\d+))?\s*(?:reps?)?', re.IGNORECASE),
            'rest_time': re.compile(r'(?:rest|break)?\s*:?\s*(\d+)\s*(?:sec|second|min|minute)s?', re.IGNORECASE),
            'day_header': re.compile(r'(?:###?\s*)?day\s*(\d+)\s*:?\s*(.+?)(?:\n|$)', re.IGNORECASE),
            'week_header': re.compile(r'(?:###?\s*)?week\s*(\d+)', re.IGNORECASE),
            'workout_section': re.compile(r'(?:main\s+workout|workout|exercises?)[\s:]*\n(.*?)(?:\n\s*(?:cool|warm|notes?)|$)', re.IGNORECASE | re.DOTALL)
        }

    def parse_workout_program(self, program_text: str, program_id: int) -> Dict:
        """
        Main method to parse workout program text into structured format
        Returns: Dictionary with weeks, days, and exercises
        """
        try:
            # Strategy 1: Try LLM parsing first
            structured_data = self._parse_with_llm(program_text)
            if self._validate_structure(structured_data):
                return self._transform_to_frontend_structure(structured_data, program_id)
            
            # Strategy 2: Try regex-based parsing
            print("🔄 LLM parsing failed, trying regex parsing...")
            structured_data = self._parse_with_regex(program_text)
            if self._validate_structure(structured_data):
                return self._transform_to_frontend_structure(structured_data, program_id)
            
            # Strategy 3: Use intelligent fallback
            print("🔄 Regex parsing failed, creating intelligent fallback...")
            return self._create_intelligent_fallback(program_text, program_id)
            
        except Exception as e:
            print(f"❌ All parsing strategies failed: {e}")
            return self._create_basic_fallback(program_id)

    def _parse_with_llm(self, program_text: str) -> Dict:
        """Enhanced LLM parsing with better prompts"""
        
        # First, try to detect if it's already JSON
        try:
            return json.loads(program_text)
        except json.JSONDecodeError:
            pass
        
        # Enhanced prompt with examples and clear structure
        prompt = f"""
You are an expert fitness program parser. Extract workout data from the text below and return ONLY valid JSON.

REQUIRED JSON STRUCTURE:
{{
  "weeks": [
    {{
      "week": 1,
      "days": [
        {{
          "day": 1,
          "label": "Push Day",
          "exercises": [
            {{
              "name": "Bench Press",
              "sets": 3,
              "reps": 10,
              "rest_seconds": 90
            }},
            {{
              "name": "Shoulder Press", 
              "sets": 3,
              "reps": 8,
              "rest_seconds": 60
            }}
          ]
        }}
      ]
    }}
  ]
}}

PARSING RULES:
1. Each "Day X:" or "### Day X:" starts a new day
2. Extract ONLY exercises from workout/training sections
3. IGNORE warm-up, cool-down, and notes sections
4. For sets/reps like "3x8-10", use: sets=3, reps=8
5. For rest like "Rest: 90 seconds", use: rest_seconds=90
6. If no rest specified, use: rest_seconds=60
7. Clean exercise names (remove equipment specifications in parentheses)
8. Group days under appropriate weeks
9. Use descriptive labels like "Push Day", "Pull Day", "Legs Day"

EXAMPLE INPUT:
### Week 1
### Day 1: Push Day
**Main Workout:**
1. Bench Press (Barbell) - 3x8-10, Rest: 90 seconds
2. Shoulder Press - 3x8, Rest: 60 seconds

### Day 2: Pull Day  
**Main Workout:**
1. Pull-ups - 3x6-8, Rest: 2 minutes

TEXT TO PARSE:
{program_text}

Return ONLY the JSON structure. No explanations or additional text.
"""
        
        try:
            llm_response = self.llm.invoke(prompt)
            return extract_json_from_response(llm_response)
        except Exception as e:
            print(f"❌ LLM parsing error: {e}")
            raise

    def _parse_with_regex(self, program_text: str) -> Dict:
        """Regex-based parsing as fallback"""
        result = {"weeks": []}
        
        # Split into sections by week
        week_sections = re.split(self.exercise_patterns['week_header'], program_text)
        
        current_week = 1
        for i in range(1, len(week_sections), 2):
            if i + 1 < len(week_sections):
                week_num = int(week_sections[i]) if week_sections[i].isdigit() else current_week
                week_content = week_sections[i + 1]
                
                week_data = {
                    "week": week_num,
                    "days": self._extract_days_from_text(week_content, week_num)
                }
                result["weeks"].append(week_data)
                current_week = week_num + 1
        
        # If no weeks found, treat entire text as one week
        if not result["weeks"]:
            result["weeks"] = [{
                "week": 1,
                "days": self._extract_days_from_text(program_text, 1)
            }]
        
        return result

    def _extract_days_from_text(self, text: str, week_num: int) -> List[Dict]:
        """Extract days and exercises from text section"""
        days = []
        
        # Find day sections
        day_matches = list(self.exercise_patterns['day_header'].finditer(text))
        
        if not day_matches:
            # No explicit days found, create a single day
            exercises = self._extract_exercises_from_text(text)
            if exercises:
                days.append({
                    "day": 1,
                    "label": "Full Body",
                    "exercises": exercises
                })
        else:
            for i, match in enumerate(day_matches):
                day_num = int(match.group(1))
                day_label = match.group(2).strip()
                
                # Get text until next day or end
                start_pos = match.end()
                end_pos = day_matches[i + 1].start() if i + 1 < len(day_matches) else len(text)
                day_content = text[start_pos:end_pos]
                
                exercises = self._extract_exercises_from_text(day_content)
                
                if exercises:
                    days.append({
                        "day": day_num,
                        "label": day_label,
                        "exercises": exercises
                    })
        
        return days

    def _extract_exercises_from_text(self, text: str) -> List[Dict]:
        """Extract exercises from a text section"""
        exercises = []
        
        # Look for main workout section
        workout_match = self.exercise_patterns['workout_section'].search(text)
        if workout_match:
            text = workout_match.group(1)
        
        # Split by lines and process each potential exercise
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        for line in lines:
            # Skip headers, warm-ups, cool-downs
            if any(skip_word in line.lower() for skip_word in 
                   ['warm', 'cool', 'notes', 'tips', 'rest between', '###', '**']):
                continue
            
            exercise = self._parse_exercise_line(line)
            if exercise:
                exercises.append(exercise)
        
        return exercises

    def _parse_exercise_line(self, line: str) -> Optional[Dict]:
        """Parse a single exercise line"""
        # Extract exercise name
        name_match = self.exercise_patterns['exercise_name'].match(line)
        if not name_match:
            return None
        
        exercise_name = name_match.group(1).strip()
        
        # Skip if it looks like a section header
        if any(word in exercise_name.lower() for word in ['day', 'week', 'workout', 'main']):
            return None
        
        # Clean exercise name (remove equipment specifications)
        exercise_name = re.sub(r'\s*\([^)]*\)\s*', '', exercise_name).strip()
        exercise_name = re.sub(r'^\d+\.\s*', '', exercise_name).strip()
        
        if not exercise_name or len(exercise_name) < 3:
            return None
        
        # Extract sets and reps
        sets_reps_match = self.exercise_patterns['sets_reps'].search(line)
        sets = 3  # default
        reps = 10  # default
        
        if sets_reps_match:
            sets = int(sets_reps_match.group(1))
            reps = int(sets_reps_match.group(2))  # Use lower bound if range
        
        # Extract rest time
        rest_match = self.exercise_patterns['rest_time'].search(line)
        rest_seconds = 60  # default
        
        if rest_match:
            rest_value = int(rest_match.group(1))
            # Convert minutes to seconds if necessary
            if 'min' in rest_match.group(0).lower():
                rest_seconds = rest_value * 60
            else:
                rest_seconds = rest_value
        
        return {
            "name": exercise_name,
            "sets": sets,
            "reps": reps,
            "rest_seconds": rest_seconds
        }

    def _validate_structure(self, data: Dict) -> bool:
        """Validate the parsed structure"""
        if not isinstance(data, dict) or 'weeks' not in data:
            return False
        
        if not isinstance(data['weeks'], list) or not data['weeks']:
            return False
        
        for week in data['weeks']:
            if not isinstance(week, dict) or 'days' not in week:
                return False
            
            for day in week.get('days', []):
                if not isinstance(day, dict) or 'exercises' not in day:
                    return False
                
                if not isinstance(day['exercises'], list):
                    return False
                
                # At least one valid exercise
                valid_exercises = [ex for ex in day['exercises'] 
                                 if isinstance(ex, dict) and ex.get('name')]
                if not valid_exercises:
                    return False
        
        return True

    def _create_intelligent_fallback(self, program_text: str, program_id: int) -> Dict:
        """Create a more intelligent fallback based on text analysis"""
        
        # Try to extract any exercise names from the text
        potential_exercises = []
        
        # Common exercise patterns
        exercise_keywords = [
            'press', 'pull', 'push', 'squat', 'deadlift', 'curl', 'row',
            'fly', 'raise', 'extension', 'flexion', 'crunch', 'plank',
            'lunge', 'dip', 'shrug', 'twist', 'bridge'
        ]
        
        lines = program_text.split('\n')
        for line in lines:
            line_clean = line.strip().lower()
            if any(keyword in line_clean for keyword in exercise_keywords):
                # Extract potential exercise name
                exercise_name = re.sub(r'^\d+\.?\s*', '', line.strip())
                exercise_name = re.sub(r'\s*-.*$', '', exercise_name)
                exercise_name = re.sub(r'\s*\([^)]*\)', '', exercise_name)
                
                if len(exercise_name) > 3 and len(exercise_name) < 50:
                    potential_exercises.append(exercise_name.strip())
        
        # Remove duplicates and limit
        potential_exercises = list(dict.fromkeys(potential_exercises))[:10]
        
        # Create structured fallback
        if potential_exercises:
            exercises = [
                {
                    "name": name,
                    "sets": 3,
                    "reps": 10,
                    "rest_seconds": 60
                }
                for name in potential_exercises
            ]
        else:
            # Ultimate fallback with common exercises
            exercises = [
                {"name": "Push Ups", "sets": 3, "reps": 10, "rest_seconds": 60},
                {"name": "Squats", "sets": 3, "reps": 12, "rest_seconds": 60},
                {"name": "Plank", "sets": 3, "reps": 30, "rest_seconds": 60}
            ]
        
        return self._transform_to_frontend_structure({
            "weeks": [{
                "week": 1,
                "days": [{
                    "day": 1,
                    "label": "Full Body",
                    "exercises": exercises
                }]
            }]
        }, program_id)

    def _create_basic_fallback(self, program_id: int) -> Dict:
        """Basic fallback structure"""
        return self._transform_to_frontend_structure({
            "weeks": [{
                "week": 1,
                "days": [{
                    "day": 1,
                    "label": "Full Body",
                    "exercises": [
                        {"name": "Push Ups", "sets": 3, "reps": 10, "rest_seconds": 60},
                        {"name": "Squats", "sets": 3, "reps": 12, "rest_seconds": 60},
                        {"name": "Plank", "sets": 3, "reps": 30, "rest_seconds": 60}
                    ]
                }]
            }]
        }, program_id)

    def _transform_to_frontend_structure(self, data: Dict, program_id: int) -> Dict:
        """Transform parsed data to frontend-compatible structure"""
        result = {}
        
        for week_data in data.get("weeks", []):
            week_num = week_data.get("week", 1)
            week_key = f"Week {week_num}"
            result[week_key] = {}
            
            for day_data in week_data.get("days", []):
                day_num = day_data.get("day", 1)
                day_key = f"Day {day_num}"
                
                # Add unique IDs and completion status to exercises
                exercises = []
                for idx, exercise in enumerate(day_data.get("exercises", [])):
                    exercise_with_meta = {
                        "id": f"{program_id}_{week_num}_{day_num}_{idx}",
                        "name": exercise.get("name", "Unknown Exercise"),
                        "sets": exercise.get("sets", 3),
                        "reps": exercise.get("reps", 10),
                        "rest_seconds": exercise.get("rest_seconds", 60),
                        "completed": False,
                        "notes": ""
                    }
                    exercises.append(exercise_with_meta)
                
                result[week_key][day_key] = {
                    "label": day_data.get("label", f"Day {day_num}"),
                    "exercises": exercises
                }
        
        return result

    def save_exercises_to_db(self, parsed_data: Dict, program_id: int) -> bool:
        """Save parsed exercises to database"""
        try:
            for week_key, week_data in parsed_data.items():
                week_num = int(week_key.replace('Week ', ''))
                
                for day_key, day_data in week_data.items():
                    day_num = int(day_key.replace('Day ', ''))
                    day_label = day_data.get("label", f"Day {day_num}")
                    
                    for exercise in day_data.get("exercises", []):
                        new_exercise = WorkoutExercise(
                            program_id=program_id,
                            week=week_num,
                            day=day_num,
                            day_label=day_label,
                            name=exercise["name"],
                            sets=exercise.get("sets"),
                            reps=exercise.get("reps"),
                            rest_seconds=exercise.get("rest_seconds"),
                            completed=False
                        )
                        db.session.add(new_exercise)
            
            db.session.commit()
            print(f"✅ Successfully saved exercises to database for program {program_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error saving exercises to database: {e}")
            return False


# Enhanced utility functions
def parse_workout_text_enhanced(program_text: str, program_id: int, llm_engine) -> Dict:
    """
    Enhanced wrapper function for workout text parsing
    """
    parser = WorkoutTextParser(llm_engine)
    return parser.parse_workout_program(program_text, program_id)


def save_parsed_workout_enhanced(parsed_data: Dict, program_id: int, llm_engine) -> bool:
    """
    Enhanced wrapper function for saving parsed workout
    """
    parser = WorkoutTextParser(llm_engine)
    return parser.save_exercises_to_db(parsed_data, program_id)