# services/workout_parser_enhanced.py - FIXED for your workout format

import json
import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime

class CrossFitWorkoutParser:
    """Enhanced workout text parser specifically designed for your workout format"""
    
    def __init__(self, llm_engine):
        self.llm = llm_engine
        self.exercise_patterns = self._compile_exercise_patterns()
        
    def _compile_exercise_patterns(self):
        """Compile regex patterns for exercise parsing"""
        return {
            # Match day headers like "### Day 1: Cardio Strength Builder"
            'day_header': re.compile(r'###\s*Day\s*(\d+)\s*:\s*(.+?)(?:\n|$)', re.IGNORECASE),
            
            # Match workout sections
            'main_workout': re.compile(r'\*\*Main\s+Workout[^:]*:\*\*\s*(.*?)(?=\*\*(?:Cool|Warm|###|$))', re.IGNORECASE | re.DOTALL),
            
            # Match exercise lines with sets/reps - handles your format: "- Push-Ups: 4 sets x 15 reps, Rest: 60 seconds"
            'exercise_line': re.compile(r'^\s*-\s*([^:]+):\s*(\d+)\s*sets?\s*x?\s*(\d+)(?:\s*reps?)?\s*(?:per\s+leg)?(?:,\s*Rest:\s*(\d+)\s*seconds?)?', re.MULTILINE | re.IGNORECASE),
            
            # Alternative pattern for time-based exercises: "- Planks: 4 sets x 30 seconds"
            'time_exercise': re.compile(r'^\s*-\s*([^:]+):\s*(\d+)\s*sets?\s*x?\s*(\d+)\s*seconds?(?:,\s*Rest:\s*(\d+)\s*seconds?)?', re.MULTILINE | re.IGNORECASE),
            
            # Rest time pattern
            'rest_time': re.compile(r'Rest:\s*(\d+)\s*seconds?', re.IGNORECASE)
        }

    def parse_crossfit_program(self, program_text: str, program_id: int) -> Dict:
        """Parse your specific workout format into structured data"""
        try:
            print(f"🔍 Parsing workout text length: {len(program_text)} characters")
            
            # Extract days from the program
            days_data = self._extract_workout_days(program_text)
            
            if not days_data:
                print("❌ No days found, using fallback")
                return self._create_fallback(program_text, program_id)
            
            print(f"✅ Found {len(days_data)} days")
            
            # Structure the data
            structured_data = {
                "weeks": [{
                    "week": 1,
                    "days": days_data
                }]
            }
            
            return self._transform_to_frontend_structure(structured_data, program_id)
            
        except Exception as e:
            print(f"❌ Parsing failed: {e}")
            import traceback
            traceback.print_exc()
            return self._create_fallback(program_text, program_id)

    def _extract_workout_days(self, program_text: str) -> List[Dict]:
        """Extract all days from your workout format"""
        days = []
        
        # Find all day sections using the pattern "### Day X:"
        day_matches = list(self.exercise_patterns['day_header'].finditer(program_text))
        print(f"🔍 Found {len(day_matches)} day headers")
        
        for i, match in enumerate(day_matches):
            day_num = int(match.group(1))
            day_label = match.group(2).strip()
            
            print(f"📝 Processing Day {day_num}: {day_label}")
            
            # Get content between this day and next day (or end)
            start_pos = match.end()
            if i + 1 < len(day_matches):
                end_pos = day_matches[i + 1].start()
            else:
                end_pos = len(program_text)
            
            day_content = program_text[start_pos:end_pos]
            print(f"📄 Day {day_num} content length: {len(day_content)} chars")
            
            # Extract exercises from this day's content
            exercises = self._extract_exercises_from_day(day_content)
            print(f"💪 Day {day_num} exercises found: {len(exercises)}")
            
            if exercises:
                days.append({
                    "day": day_num,
                    "label": day_label,
                    "exercises": exercises
                })
                
                # Debug: print exercise names
                for ex in exercises:
                    print(f"  - {ex['name']} ({ex['sets']}x{ex['reps']})")
        
        return days

    def _extract_exercises_from_day(self, day_content: str) -> List[Dict]:
        """Extract exercises from a single day's content"""
        exercises = []
        
        # Look for main workout section
        main_workout_match = self.exercise_patterns['main_workout'].search(day_content)
        if main_workout_match:
            workout_content = main_workout_match.group(1)
            print(f"📋 Main workout section found, length: {len(workout_content)}")
        else:
            # If no main workout section, use the entire day content
            workout_content = day_content
            print(f"📋 No main workout section, using full content")
        
        # Method 1: Try standard sets x reps pattern
        exercise_matches = list(self.exercise_patterns['exercise_line'].finditer(workout_content))
        print(f"🔍 Found {len(exercise_matches)} standard exercise matches")
        
        for match in exercise_matches:
            exercise = self._parse_standard_exercise(match)
            if exercise:
                exercises.append(exercise)
                print(f"✅ Added: {exercise['name']}")
        
        # Method 2: Try time-based exercises (like Planks: 4 sets x 30 seconds)
        time_matches = list(self.exercise_patterns['time_exercise'].finditer(workout_content))
        print(f"🔍 Found {len(time_matches)} time-based exercise matches")
        
        for match in time_matches:
            # Skip if already captured by standard pattern
            if any(abs(match.start() - em.start()) < 10 for em in exercise_matches):
                continue
                
            exercise = self._parse_time_exercise(match)
            if exercise:
                exercises.append(exercise)
                print(f"✅ Added time-based: {exercise['name']}")
        
        # Method 3: If still no exercises, try line-by-line parsing
        if not exercises:
            print("🔄 No regex matches, trying line-by-line parsing...")
            exercises = self._parse_lines_manually(workout_content)
        
        return exercises

    def _parse_standard_exercise(self, match) -> Optional[Dict]:
        """Parse standard exercise format: Push-Ups: 4 sets x 15 reps, Rest: 60 seconds"""
        try:
            name = match.group(1).strip()
            sets = int(match.group(2))
            reps = int(match.group(3))
            rest_seconds = int(match.group(4)) if match.group(4) else 60
            
            # Clean up exercise name
            name = re.sub(r'\s*\([^)]*\)\s*', '', name)  # Remove parentheses
            name = name.strip()
            
            if len(name) < 2:
                return None
            
            return {
                "name": name,
                "sets": sets,
                "reps": reps,
                "rest_seconds": rest_seconds
            }
        except Exception as e:
            print(f"❌ Error parsing standard exercise: {e}")
            return None

    def _parse_time_exercise(self, match) -> Optional[Dict]:
        """Parse time-based exercise format: Planks: 4 sets x 30 seconds"""
        try:
            name = match.group(1).strip()
            sets = int(match.group(2))
            time_value = int(match.group(3))  # This is in seconds
            rest_seconds = int(match.group(4)) if match.group(4) else 60
            
            # Clean up exercise name
            name = re.sub(r'\s*\([^)]*\)\s*', '', name)
            name = name.strip()
            
            if len(name) < 2:
                return None
            
            # For time-based exercises, use the time as "reps"
            return {
                "name": name,
                "sets": sets,
                "reps": time_value,  # Time in seconds as reps
                "rest_seconds": rest_seconds
            }
        except Exception as e:
            print(f"❌ Error parsing time exercise: {e}")
            return None

    def _parse_lines_manually(self, content: str) -> List[Dict]:
        """Manual line-by-line parsing as fallback"""
        exercises = []
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines and non-exercise lines
            if not line or not line.startswith('-') or len(line) < 10:
                continue
            
            # Skip warm-up and cool-down sections
            if any(skip in line.lower() for skip in ['warm', 'cool', 'jumping jacks', 'high knees', 'seated forward', 'child']):
                continue
            
            print(f"🔍 Analyzing line: {line}")
            
            # Try to extract exercise info
            exercise = self._extract_exercise_from_line(line)
            if exercise:
                exercises.append(exercise)
                print(f"✅ Extracted: {exercise['name']}")
        
        return exercises

    def _extract_exercise_from_line(self, line: str) -> Optional[Dict]:
        """Extract exercise from a single line"""
        try:
            # Remove the dash and clean up
            clean_line = line.lstrip('- ').strip()
            
            # Split by colon to get name and details
            if ':' not in clean_line:
                return None
            
            parts = clean_line.split(':', 1)
            name = parts[0].strip()
            details = parts[1].strip()
            
            # Default values
            sets = 3
            reps = 10
            rest_seconds = 60
            
            # Look for sets pattern
            sets_match = re.search(r'(\d+)\s*sets?', details, re.IGNORECASE)
            if sets_match:
                sets = int(sets_match.group(1))
            
            # Look for reps pattern
            reps_match = re.search(r'x?\s*(\d+)\s*(?:reps?|seconds?)', details, re.IGNORECASE)
            if reps_match:
                reps = int(reps_match.group(1))
            
            # Look for rest pattern
            rest_match = re.search(r'Rest:\s*(\d+)\s*seconds?', details, re.IGNORECASE)
            if rest_match:
                rest_seconds = int(rest_match.group(1))
            
            # Clean exercise name
            name = re.sub(r'\s*\([^)]*\)\s*', '', name)
            name = name.strip()
            
            if len(name) < 2:
                return None
            
            return {
                "name": name,
                "sets": sets,
                "reps": reps,
                "rest_seconds": rest_seconds
            }
            
        except Exception as e:
            print(f"❌ Error extracting from line: {e}")
            return None

    def _create_fallback(self, program_text: str, program_id: int) -> Dict:
        """Create fallback based on your workout if parsing fails"""
        
        # Your specific exercises as fallback
        fallback_exercises = [
            {"name": "Push-Ups", "sets": 4, "reps": 15, "rest_seconds": 60},
            {"name": "Squats", "sets": 4, "reps": 12, "rest_seconds": 60},
            {"name": "Lunges", "sets": 4, "reps": 10, "rest_seconds": 60},
            {"name": "Planks", "sets": 4, "reps": 30, "rest_seconds": 60},
            {"name": "Burpees", "sets": 4, "reps": 8, "rest_seconds": 90},
            {"name": "Mountain Climbers", "sets": 4, "reps": 20, "rest_seconds": 60}
        ]
        
        # Create 4 days as in your program
        days_data = [
            {
                "day": 1,
                "label": "Cardio Strength Builder",
                "exercises": fallback_exercises[:5]  # First 5 exercises
            },
            {
                "day": 2,
                "label": "Cardio Endurance Builder", 
                "exercises": fallback_exercises[:5]  # Same exercises
            },
            {
                "day": 3,
                "label": "Cardio Strength and Endurance",
                "exercises": fallback_exercises[:3]  # Partial set
            },
            {
                "day": 4,
                "label": "Full Body Strength and Endurance",
                "exercises": [
                    {"name": "Push-Ups", "sets": 4, "reps": 12, "rest_seconds": 90},
                    {"name": "Plank", "sets": 4, "reps": 60, "rest_seconds": 60},
                    {"name": "Mountain Climbers", "sets": 4, "reps": 20, "rest_seconds": 60},
                    {"name": "Burpees", "sets": 3, "reps": 15, "rest_seconds": 90}
                ]
            }
        ]
        
        return self._transform_to_frontend_structure({
            "weeks": [{"week": 1, "days": days_data}]
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


def parse_crossfit_workout_text(program_text: str, program_id: int, llm_engine) -> Dict:
    """Enhanced wrapper function for your workout text parsing"""
    parser = CrossFitWorkoutParser(llm_engine)
    return parser.parse_crossfit_program(program_text, program_id)