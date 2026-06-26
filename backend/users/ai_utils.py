import os
import json
import requests
import re
from difflib import SequenceMatcher
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

print("\n" + "="*40)
if OPENROUTER_API_KEY:
    print(f"✅ API Key Loaded: {OPENROUTER_API_KEY[:10]}...")
else:
    print("❌ ERROR: OPENROUTER_API_KEY not found in .env file!")
print("="*40 + "\n")

def call_ai(prompt):
    """Call AI API with proper error handling"""
    if not OPENROUTER_API_KEY:
        raise Exception("AI API Error: API Key is missing. Check your .env file.")

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Virtual Internship Portal",
            },
            json={
                "model": "google/gemini-2.5-flash",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,  # Add some creativity but not too much
                "max_tokens": 2000,   # Limit response length
            },
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"DEBUG: Status {response.status_code}, Response: {response.text}")
        
        response.raise_for_status()
        data = response.json()

        if "choices" not in data:
            raise Exception(f"AI API Error: Unexpected response format: {data}")

        return data["choices"][0]["message"]["content"]

    except requests.exceptions.RequestException as e:
        raise Exception(f"Network Error: {str(e)}")

def generate_quiz(domain, level, num_questions):
    """Generate quiz questions"""
    prompt = f"""
    Generate {num_questions} Multiple Choice Questions.
    Domain: {domain}
    Difficulty: {level}

    Return ONLY a valid JSON array in this format:
    [
      {{
        "question": "Question text here?",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correct_answer": "Option 1"
      }}
    ]
    """
    content = call_ai(prompt)
    try:
        clean_content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_content)
    except json.JSONDecodeError:
        raise Exception("AI returned invalid JSON format for Quiz.")

def recommend_project(domain, level):
    """Recommend a project based on domain and level"""
    prompt = f"""
    Suggest ONE project idea for a student.
    Domain: {domain}
    Level: {level}

    Keep it SHORT and SIMPLE (max 2-3 lines total).

    Return ONLY a valid JSON object:
    {{
      "title": "Short Project Title",
      "description": "One sentence description of what the project does"
    }}
    """
    content = call_ai(prompt)
    try:
        clean_content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_content)
    except json.JSONDecodeError:
        return {"title": f"{domain} Project", "description": f"Build a {domain} application"}

def generate_project_details(title, domain, level):
    """Generate SHORT, CONCISE project requirements"""
    
    # Determine number of tasks based on level
    if level.lower() == "beginner":
        num_tasks = 3
    else:
        num_tasks = 4
    
    prompt = f"""
    Create a BRIEF project guide for a student. Keep it SHORT and PRACTICAL.

    Project: {title}
    Domain: {domain}
    Level: {level}

    Return in THIS EXACT FORMAT (no extra text, no markdown, just plain text):

    # PROJECT: {title}

    ## GOAL
    [2-3 lines max - what student will build]

    ## REQUIREMENTS (MANDATORY)
    - [Requirement 1 - one line]
    - [Requirement 2 - one line]
    - [Requirement 3 - one line]
    - [Requirement 4 - one line if level >= intermediate]
    - [Requirement 5 - one line if level >= advanced]

    ## TASKS ({num_tasks} tasks max)
    1. [Task 1 - one line]
    2. [Task 2 - one line]
    3. [Task 3 - one line]
    {f'4. [Task 4 - one line]' if num_tasks >= 4 else ''}

    ## EVALUATION CRITERIA
    - Correctness: 40%
    - Functionality: 30%  
    - Code Quality: 30%

    Keep each line SHORT. Total response should be under 500 words.
    """
    
    content = call_ai(prompt)
    
    # Clean up any markdown
    content = content.replace("```", "").strip()
    
    return {
        "requirements_text": content,
        "overview": extract_section(content, "GOAL"),
        "requirements_list": extract_list(content, "REQUIREMENTS"),
        "tasks_list": extract_list(content, "TASKS"),
        "evaluation_criteria": extract_section(content, "EVALUATION")
    }

def extract_section(text, section_name):
    """Extract a section from the requirements text"""
    try:
        start = text.find(f"## {section_name}")
        if start == -1:
            return ""
        
        # Find next ## or end
        next_section = text.find("##", start + 10)
        if next_section == -1:
            return text[start:].strip()
        
        return text[start:next_section].strip()
    except:
        return ""

def extract_list(text, section_name):
    """Extract list items from a section"""
    try:
        section = extract_section(text, section_name)
        if not section:
            return []
        
        lines = section.split('\n')
        items = []
        for line in lines:
            line = line.strip()
            if line.startswith('-') or line.startswith('•') or (line and line[0].isdigit() and '.' in line[:3]):
                # Remove bullet points and numbers
                clean_line = line.lstrip('-•0123456789. ').strip()
                if clean_line and len(clean_line) < 200:  # Limit line length
                    items.append(clean_line)
        return items[:8]  # Max 8 items
    except:
        return []


def chat_with_ai(user_message):
    """Simple chatbot for student queries"""
    prompt = f"""You are an AI Career Mentor and Programming Teacher.
Answer the student's question briefly and helpfully.

Student: {user_message}

Keep response under 100 words. Be practical and encouraging."""
    
    return call_ai(prompt)

def check_plagiarism(solution, student_email=None):
    """
    Check for plagiarism in student solution
    Returns plagiarism score and details
    """
    solution_lower = solution.lower().strip()
    
    # 1. Check for common placeholder/gibberish text
    gibberish_patterns = [
        (r'(\b\w{1,2}\b\s+){10,}', "Too many very short words"),
        (r'(abc|test|sample|lorem|ipsum|dolor|sit|amet)', "Contains placeholder text"),
        (r'(\S{20,})', "Contains very long words without spaces"),
        (r'^.{0,50}$', "Solution too short"),
    ]
    
    for pattern, reason in gibberish_patterns:
        if re.search(pattern, solution_lower):
            return {
                "plagiarism_risk": "high",
                "plagiarism_score": 95,
                "reason": reason,
                "suggestion": "Please provide an original solution"
            }
    
    # 2. Check solution length
    if len(solution.strip()) < 100:
        return {
            "plagiarism_risk": "medium",
            "plagiarism_score": 60,
            "reason": "Solution is very short",
            "suggestion": "Add more details to your solution"
        }
    
    # 3. Check for common code patterns that might be copied
    common_code_patterns = [
        ("print('Hello World')", "Basic print statement"),
        ("def main():", "Common function definition"),
        ("if __name__ == '__main__':", "Common Python pattern"),
    ]
    
    copied_indicators = 0
    for pattern, desc in common_code_patterns:
        if pattern.lower() in solution_lower:
            copied_indicators += 1
    
    if copied_indicators > 2:
        return {
            "plagiarism_risk": "medium",
            "plagiarism_score": 40,
            "reason": "Contains common boilerplate patterns",
            "suggestion": "Try to write more original code"
        }
    
    # 4. Check for uniqueness (character variety)
    unique_chars = len(set(solution))
    if unique_chars < 20 and len(solution) > 200:
        return {
            "plagiarism_risk": "medium",
            "plagiarism_score": 50,
            "reason": "Limited character variety",
            "suggestion": "Use more diverse vocabulary"
        }
    
    return {
        "plagiarism_risk": "low",
        "plagiarism_score": 10,
        "reason": "Solution appears original",
        "suggestion": None
    }


def check_grammar_and_quality(solution, domain="general"):
    """
    Check grammar, spelling, and writing quality
    """
    solution_lower = solution.lower()
    
    issues = []
    suggestions = []
    
    # 1. Check for common grammar issues
    grammar_patterns = [
        (r'\bi\s+', "Use capital 'I'", "Use 'I' instead of 'i'"),
        (r'\s+\.', "Space before period", "Remove space before period"),
        (r'\.{2,}', "Multiple periods", "Use single period"),
        (r'!!+', "Multiple exclamation marks", "Use single exclamation mark"),
        (r'\?{2,}', "Multiple question marks", "Use single question mark"),
        (r',\s*,', "Multiple commas", "Fix comma usage"),
    ]
    
    for pattern, issue, suggestion in grammar_patterns:
        if re.search(pattern, solution):
            issues.append(issue)
            suggestions.append(suggestion)
    
    # 2. Check sentence length
    sentences = re.split(r'[.!?]+', solution)
    long_sentences = [s for s in sentences if len(s.split()) > 30]
    if long_sentences:
        issues.append(f"Found {len(long_sentences)} very long sentences")
        suggestions.append("Break long sentences into shorter ones")
    
    # 3. Check for repeated words
    words = re.findall(r'\b\w+\b', solution_lower)
    word_count = {}
    for word in words:
        if len(word) > 3:  # Ignore short words
            word_count[word] = word_count.get(word, 0) + 1
    
    repeated_words = [w for w, c in word_count.items() if c > 5]
    if repeated_words:
        issues.append(f"Words repeated too often: {', '.join(repeated_words[:3])}")
        suggestions.append("Use more varied vocabulary")
    
    # 4. Domain-specific checks
    if domain.lower() == "programming":
        # Check code quality indicators
        if "def " not in solution and "function" not in solution.lower():
            issues.append("No functions defined")
            suggestions.append("Organize code into functions")
        
        if "class " not in solution and domain == "programming" and "oop" in solution.lower():
            issues.append("Missing class definitions for OOP")
            suggestions.append("Use classes for object-oriented design")
        
        # Check for proper indentation hints
        if "\t" in solution:
            suggestions.append("Consider using spaces instead of tabs for consistency")
    
    elif domain.lower() == "graphic design":
        issues.append("Design quality cannot be fully evaluated by AI")
        suggestions.append("Share screenshots or design files for better review")
    
    elif domain.lower() == "content writing":
        # Check word count
        word_count_total = len(words)
        if word_count_total < 200:
            issues.append(f"Content too short ({word_count_total} words)")
            suggestions.append("Add more detailed content (aim for 300+ words)")
        
        # Check paragraph count
        paragraphs = [p for p in solution.split('\n\n') if p.strip()]
        if len(paragraphs) < 3:
            issues.append("Too few paragraphs")
            suggestions.append("Break content into multiple paragraphs")
    
    grammar_score = max(0, 100 - (len(issues) * 10))
    
    return {
        "grammar_score": grammar_score,
        "issues": issues[:5],
        "suggestions": suggestions[:5],
        "has_issues": len(issues) > 0
    }


def check_domain_specific_quality(domain, solution):
    """
    Domain-specific quality checks
    """
    result = {
        "domain": domain,
        "quality_score": 70,
        "feedback": [],
        "suggestions": []
    }
    
    if domain.lower() == "programming":
        # Programming-specific checks
        has_functions = bool(re.search(r'def\s+\w+\s*\(|function\s+\w+\s*\(', solution))
        has_loops = bool(re.search(r'for\s+|while\s+', solution))
        has_conditionals = bool(re.search(r'if\s+|else\s+|elif\s+', solution))
        has_comments = bool(re.search(r'#|//|/\*', solution))
        
        if has_functions:
            result["feedback"].append("✅ Good use of functions")
        else:
            result["suggestions"].append("Use functions to organize code")
        
        if has_loops:
            result["feedback"].append("✅ Uses loops effectively")
        else:
            result["suggestions"].append("Consider using loops for repetitive tasks")
        
        if has_conditionals:
            result["feedback"].append("✅ Good use of conditional logic")
        
        if has_comments:
            result["feedback"].append("✅ Code is well commented")
        else:
            result["suggestions"].append("Add comments to explain your code")
        
        result["quality_score"] = 50 + (has_functions * 10) + (has_loops * 10) + (has_conditionals * 10) + (has_comments * 10)
    
    elif domain.lower() == "data science":
        # Data science specific checks
        has_data_loading = bool(re.search(r'load|read|csv|excel|json', solution.lower()))
        has_analysis = bool(re.search(r'mean|sum|average|count|group|plot|visuali', solution.lower()))
        
        if has_data_loading:
            result["feedback"].append("✅ Data loading implemented")
        if has_analysis:
            result["feedback"].append("✅ Data analysis performed")
        
        result["quality_score"] = 60 + (has_data_loading * 15) + (has_analysis * 15)
    
    elif domain.lower() == "web development":
        has_html = bool(re.search(r'<html|<div|<span|<p|<h', solution.lower()))
        has_css = bool(re.search(r'style|color|font|margin|padding', solution.lower()))
        has_js = bool(re.search(r'function|const|let|var|document|window', solution.lower()))
        
        if has_html:
            result["feedback"].append("✅ HTML structure present")
        if has_css:
            result["feedback"].append("✅ Styling implemented")
        if has_js:
            result["feedback"].append("✅ JavaScript functionality added")
        
        result["quality_score"] = 40 + (has_html * 20) + (has_css * 20) + (has_js * 20)
    
    return result


def evaluate_project_solution(title, solution, requirements_text):
    """
    COMPLETE evaluation with plagiarism, grammar, and domain-specific checks
    """
    
    # Extract domain from title or requirements
    domain = "general"
    if "programming" in title.lower() or "code" in title.lower():
        domain = "programming"
    elif "design" in title.lower():
        domain = "graphic design"
    elif "writing" in title.lower() or "content" in title.lower():
        domain = "content writing"
    elif "data" in title.lower():
        domain = "data science"
    elif "web" in title.lower():
        domain = "web development"
    
    # 1. Plagiarism Check
    plagiarism_result = check_plagiarism(solution)
    
    # 2. Grammar and Quality Check
    grammar_result = check_grammar_and_quality(solution, domain)
    
    # 3. Domain-specific Quality Check
    domain_result = check_domain_specific_quality(domain, solution)
    
    # 4. AI-based evaluation (existing)
    prompt = f"""
You are an EXPERT PROJECT EVALUATOR. Evaluate this student project HONESTLY.

PROJECT TITLE: {title}
DOMAIN: {domain}

=== PROJECT REQUIREMENTS ===
{requirements_text[:2000]}

=== STUDENT SOLUTION ===
{solution[:3000]}

=== ADDITIONAL CHECKS ===
Plagiarism Risk: {plagiarism_result['plagiarism_risk']}
Grammar Issues: {grammar_result['has_issues']}
Domain Quality Score: {domain_result['quality_score']}

SCORING RULES:
- 90-100: Excellent, all requirements met, high quality
- 75-89: Good, most requirements met
- 60-74: Average, some requirements met
- 40-59: Poor, few requirements met
- 0-39: Very poor, not acceptable

If plagiarism risk is HIGH, score should be below 20.
If solution is very short (<100 chars), score should be below 10.

Return ONLY JSON:
{{
  "score": <0_to_100>,
  "strengths": ["max 3 strengths"],
  "weaknesses": ["max 3 weaknesses"],
  "missing_requirements": ["max 3 missing items"],
  "improvements": ["max 3 specific improvements"],
  "final_feedback": "One paragraph (max 150 words) with honest feedback"
}}
"""
    
    content = call_ai(prompt)
    
    try:
        clean = content.replace("```json", "").replace("```", "").strip()
        start = clean.find('{')
        end = clean.rfind('}') + 1
        if start != -1 and end != 0:
            clean = clean[start:end]
        
        result = json.loads(clean)
        
        # Adjust score based on plagiarism
        if plagiarism_result['plagiarism_risk'] == 'high':
            result['score'] = min(result.get('score', 50), 20)
            if 'plagiarism_warning' not in result:
                result['weaknesses'].append(f"⚠️ PLAGIARISM RISK: {plagiarism_result['reason']}")
                result['improvements'].append(plagiarism_result['suggestion'])
        
        # Add grammar issues to weaknesses
        if grammar_result['has_issues']:
            for issue in grammar_result['issues'][:2]:
                result['weaknesses'].append(f"Grammar: {issue}")
            for suggestion in grammar_result['suggestions'][:2]:
                result['improvements'].append(suggestion)
        
        # Add domain-specific feedback
        if domain_result['feedback']:
            for fb in domain_result['feedback'][:2]:
                if fb not in result['strengths']:
                    result['strengths'].append(fb)
        
        # Validate score
        if "score" in result:
            score = result["score"]
            if score < 0 or score > 100:
                result["score"] = 50
            # Adjust for very short solutions
            if len(solution.strip()) < 100 and score > 30:
                result["score"] = max(10, min(score, 30))
        
        # Ensure all fields exist
        defaults = {
            "strengths": ["Solution submitted"],
            "weaknesses": ["Needs improvement"],
            "missing_requirements": ["Review all requirements"],
            "improvements": ["Add more details"],
            "final_feedback": "Keep working on improving your solution."
        }
        
        for key, default_value in defaults.items():
            if key not in result or not result[key]:
                result[key] = default_value
        
        # Add plagiarism info to result
        result['plagiarism_check'] = {
            'risk': plagiarism_result['plagiarism_risk'],
            'score': plagiarism_result['plagiarism_score']
        }
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        return {
            "score": 40,
            "strengths": ["Solution was submitted"],
            "weaknesses": ["Could not fully evaluate", plagiarism_result.get('reason', 'Check required')],
            "missing_requirements": ["Check all requirements"],
            "improvements": ["Resubmit with clearer formatting"],
            "final_feedback": f"Please make sure your solution is clearly written and addresses all requirements.",
            "plagiarism_check": plagiarism_result
        }