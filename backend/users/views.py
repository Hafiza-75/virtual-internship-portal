import bcrypt
from bson import ObjectId
from datetime import datetime
import json
import re 

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .db import users_collection, assessments_collection, projects_collection, mentor_feedback_collection
from .jwt_utils import generate_token

from .ai_utils import (
    generate_quiz,
    recommend_project,
    generate_project_details,
    evaluate_project_solution,
    call_ai
)

from .utils import calculate_score, get_level
from django.http import JsonResponse
from .db_connection import reports_col

# 1. Admin Stats (Dashboard ke cards ke liye)
@api_view(['GET'])
def get_admin_stats(request):
    try:
        total_students = users_collection.count_documents({"role": "student"})
        total_mentors = users_collection.count_documents({"role": "mentor"})
        total_projects = projects_collection.count_documents({})
        
        data = {
            "total_students": total_students,
            "total_mentors": total_mentors,
            "total_projects": total_projects,
            "system_status": "99.9%"
        }
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# 2. Get All Users (User Management Table ke liye)
@api_view(['GET'])
def get_all_users(request):
    try:
        users = list(users_collection.find({}, {"_id": 1, "name": 1, "email": 1, "role": 1}))
        # MongoDB ID ko string mein convert karna zaroori hai
        for user in users:
            user["id"] = str(user["_id"])
            del user["_id"]
            
        return JsonResponse(users, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# 3. Get All Reports (Reports Section ke liye)
@api_view(['GET'])
def get_all_reports(request):
    try:
        reports = list(reports_col.find({}))
        for report in reports:
            report["id"] = str(report["_id"])
            del report["_id"]
            
        return JsonResponse(reports, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# 4. Delete User (Admin action)
@api_view(['DELETE'])
def delete_user(request, user_id):
    try:
        users_collection.delete_one({"_id": ObjectId(user_id)})
        return JsonResponse({"message": "User deleted successfully"}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# ======================================================
# REGISTER
# ======================================================
@api_view(['POST'])
def register(request):
    data = request.data

    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')

    if not name or not email or not password:
        return Response({"error": "All fields required"}, status=400)

    if users_collection.find_one({"email": email}):
        return Response({"error": "User already exists"}, status=400)

    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    user = {
        "name": name,
        "email": email,
        "password": hashed_pw,
        "role": role,
        "created_at": datetime.now()
    }

    result = users_collection.insert_one(user)
    user["_id"] = str(result.inserted_id)

    token = generate_token(user)

    return Response({
        "message": "User registered",
        "token": token,
        "user": {
            "name": name,
            "email": email,
            "role": role
        }
    })


# ======================================================
# LOGIN
# ======================================================
@api_view(['POST'])
def login(request):
    data = request.data

    email = data.get('email')
    password = data.get('password')

    user = users_collection.find_one({"email": email})

    if not user:
        return Response({"error": "User not found"}, status=404)

    if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return Response({"error": "Invalid credentials"}, status=400)

    token = generate_token(user)

    return Response({
        "message": "Login successful",
        "token": token,
        "user": {
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    })


# ======================================================
# GENERATE QUIZ
# ======================================================
@api_view(["POST"])
def generate_quiz_api(request):
    domain = request.data.get("domain")
    level = request.data.get("level")
    num_questions = request.data.get("num_questions", 10)

    if not domain or not level:
        return Response({"error": "domain and level required"}, status=400)

    try:
        quiz = generate_quiz(domain, level, num_questions)
        return Response({"quiz": quiz})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================================================
# SUBMIT QUIZ (Creates ONLY suggested projects - NO enrolled)
# ======================================================
@api_view(["POST"])
def submit_quiz(request):
    domain = request.data.get("domain")
    level = request.data.get("level")
    questions = request.data.get("questions")
    answers = request.data.get("answers")
    email = request.data.get("email")

    if not all([domain, level, questions, answers, email]):
        return Response({"error": "Missing required fields"}, status=400)

    try:
        score = calculate_score(questions, answers)
        final_level = get_level(score)

        project = recommend_project(domain, final_level)

        recommendation_text = f"Your level is {final_level}. Score: {score}%. Focus on improving concepts and build real-world projects."

        # Save assessment
        assessment_result = assessments_collection.insert_one({
            "domain": domain,
            "level_taken": level,
            "final_level": final_level,
            "score": score,
            "recommendation": recommendation_text,
            "project": project,
            "email": email,
            "completed_at": str(datetime.now())
        })

        # Check if project already exists for this user
        existing_project = projects_collection.find_one({
            "email": email,
            "title": project.get("title")
        })
        
        if not existing_project:
            # Generate detailed requirements
            project_details = generate_project_details(
                project.get("title"),
                domain,
                final_level
            )
            
            # Save project with "suggested" status (NOT enrolled)
            projects_collection.insert_one({
                "title": project.get("title"),
                "description": project.get("description"),
                "domain": domain,
                "level": final_level,
                "status": "suggested",  # Always suggested, never enrolled
                "email": email,
                "assessment_id": str(assessment_result.inserted_id),
                "details": project_details,
                "solution": "",
                "feedback": None,
                "score": 0,
                "created_at": str(datetime.now())
            })

        return Response({
            "success": True,
            "score": score,
            "level": final_level,
            "recommendation": recommendation_text,
            "project": project
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================================================
# GET PROJECTS 
# ======================================================
@api_view(['GET'])
def get_projects(request):
    email = request.GET.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)

    # ONLY show 'suggested' and 'completed' - NO 'enrolled'
    projects = list(projects_collection.find({
        "email": email,
        "status": {"$in": ["suggested", "completed"]}
    }))

    for p in projects:
        p["_id"] = str(p["_id"])
        
        # Ensure details is properly formatted
        if p.get("details") is None:
            p["details"] = {}
        elif isinstance(p["details"], str):
            try:
                p["details"] = json.loads(p["details"])
            except:
                p["details"] = {"requirements_text": p["details"]}
        
        # Ensure all required fields exist
        if p.get("solution") is None:
            p["solution"] = ""
        if p.get("feedback") is None:
            p["feedback"] = None
        if p.get("score") is None:
            p["score"] = 0
        if p.get("final_score") is None:
            p["final_score"] = p.get("score", 0)
        if p.get("task_evaluations") is None:
            p["task_evaluations"] = []
        if p.get("tasks") is None:
            p["tasks"] = []
        if p.get("mentor_feedback_given") is None:
            p["mentor_feedback_given"] = False
        if p.get("mentor_rating") is None:
            p["mentor_rating"] = None
        if p.get("mentor_feedback_text") is None:
            p["mentor_feedback_text"] = None

    return Response(projects)

# ======================================================
# SAVE SOLUTION (AUTO SAVE)
# ======================================================
@api_view(['POST'])
def save_solution(request):
    pid = request.data.get("id")
    solution = request.data.get("solution")

    if not pid:
        return Response({"error": "Project ID required"}, status=400)

    try:
        projects_collection.update_one(
            {"_id": ObjectId(pid)},
            {"$set": {"solution": solution}}
        )
        return Response({"message": "Solution saved successfully"})
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================================================
# EVALUATE PROJECT WITH PROPER AI CHECKING (HONEST SCORING)
# ======================================================
@api_view(['POST'])
def evaluate_project(request):
    pid = request.data.get("id")
    solution = request.data.get("solution", "")

    if not pid:
        return Response({"error": "Project ID required"}, status=400)

    try:
        project = projects_collection.find_one({"_id": ObjectId(pid)})

        if not project:
            return Response({"error": "Project not found"}, status=404)

        # AUTO-SAVE solution first
        if solution:
            projects_collection.update_one(
                {"_id": ObjectId(pid)},
                {"$set": {"solution": solution}}
            )
        else:
            solution = project.get("solution", "")
        
        if not solution:
            return Response({"error": "No solution provided to evaluate"}, status=400)

        # Get requirements text from details
        requirements_text = ""
        if project.get("details"):
            if isinstance(project["details"], dict):
                requirements_text = project["details"].get("requirements_text", "")
            elif isinstance(project["details"], str):
                requirements_text = project["details"]
        
        # If no requirements, generate them
        if not requirements_text:
            # Generate on the fly
            details = generate_project_details(
                project["title"],
                project.get("domain", "General"),
                project.get("level", "Beginner")
            )
            requirements_text = details.get("requirements_text", "")
            # Save for future
            projects_collection.update_one(
                {"_id": ObjectId(pid)},
                {"$set": {"details": details}}
            )

        # PROPER EVALUATION with requirements (honest scoring)
        result = evaluate_project_solution(
            project["title"],
            solution,
            requirements_text
        )

        # Update project with feedback and status
        projects_collection.update_one(
            {"_id": ObjectId(pid)},
            {
                "$set": {
                    "feedback": result,
                    "status": "completed",  # Auto-mark as completed after evaluation
                    "evaluated_at": str(datetime.now()),
                    "score": result.get("score", 0)
                }
            }
        )

        return Response({
            "success": True,
            "feedback": result,
            "message": f"✓ Project evaluated! Score: {result.get('score', 0)}/100"
        })
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================================================
# GENERATE PROJECT REQUIREMENTS ON DEMAND
# ======================================================
@api_view(['POST'])
def generate_project_requirements_api(request):
    """Generate clean project requirements for a suggested project"""
    project_id = request.data.get("project_id")
    
    if not project_id:
        return Response({"error": "Project ID required"}, status=400)
    
    try:
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        
        if not project:
            return Response({"error": "Project not found"}, status=404)
        
        # Generate fresh requirements
        details = generate_project_details(
            project["title"],
            project.get("domain", "General"),
            project.get("level", "Beginner")
        )
        
        # Update project
        projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"details": details}}
        )
        
        return Response({
            "success": True,
            "requirements": details.get("requirements_text", ""),
            "details": details
        })
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================================================
# GET USER RESULTS
# ======================================================
@api_view(['GET'])
def my_results(request):
    email = request.GET.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)

    try:
        results = list(assessments_collection.find({"email": email}))
        
        # Format results properly
        formatted_results = []
        for result in results:
            formatted_results.append({
                "domain": result.get("domain"),
                "score": result.get("score"),
                "level": result.get("final_level", result.get("level")),
                "recommendation": result.get("recommendation"),
                "project": result.get("project"),
                "completed_at": result.get("completed_at", str(datetime.now()))
            })
        
        return Response(formatted_results)
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================================================
# DASHBOARD STATS
# ======================================================
@api_view(['GET'])
def dashboard_stats(request):
    email = request.GET.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    try:
        # Get all assessments
        assessments = list(assessments_collection.find({"email": email}))
        
        total_assessments = len(assessments)
        
        # Calculate average score
        avg_score = 0
        if total_assessments > 0:
            total_score = sum(a.get("score", 0) for a in assessments)
            avg_score = round(total_score / total_assessments)
        
        # Determine level based on average score
        if avg_score >= 80:
            level = "Advanced"
        elif avg_score >= 50:
            level = "Intermediate"
        else:
            level = "Beginner"
        
        # Get projects count (only suggested and completed)
        projects = list(projects_collection.find({"email": email}))
        total_projects = len(projects)
        completed_projects = len([p for p in projects if p.get("status") == "completed"])
        suggested_projects = len([p for p in projects if p.get("status") == "suggested"])
        
        return Response({
            "average_score": avg_score,
            "total_assessments": total_assessments,
            "level": level,
            "total_projects": total_projects,
            "completed_projects": completed_projects,
            "suggested_projects": suggested_projects,
            "enrolled_projects": 0  # Always 0 since we removed enrolled
        })
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================================================
# AI CHATBOT
# ======================================================
@api_view(['POST'])
def chat_with_ai(request):
    user_query = request.data.get("message")

    if not user_query:
        return Response({"error": "No message provided"}, status=400)

    try:
        system_prompt = f"You are an AI Career Mentor. Answer this: {user_query}"
        response = call_ai(system_prompt)

        return Response({"reply": response})

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================================================
# DELETE PROJECT (Optional - if needed)
# ======================================================
@api_view(['DELETE'])
def delete_project(request):
    project_id = request.data.get("id")
    email = request.data.get("email")
    
    if not project_id or not email:
        return Response({"error": "Project ID and email required"}, status=400)
    
    try:
        # Only allow deletion of suggested projects (not completed)
        result = projects_collection.delete_one({
            "_id": ObjectId(project_id),
            "email": email,
            "status": "suggested"  
        })
        
        if result.deleted_count == 0:
            return Response({"error": "Project not found or cannot be deleted"}, status=404)
        
        return Response({"message": "Project deleted successfully"})
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    

# ======================================================
# REATTEMPT PROJECT (Create fresh copy for reattempt)
# ======================================================
@api_view(['POST'])
def reattempt_project(request):
    """
    Student wants to reattempt a completed project.
    Creates a fresh copy with 'suggested' status.
    """
    old_project_id = request.data.get("project_id")
    email = request.data.get("email")
    
    if not old_project_id or not email:
        return Response({"error": "Project ID and email required"}, status=400)
    
    try:
        # Get the completed project
        old_project = projects_collection.find_one({
            "_id": ObjectId(old_project_id),
            "email": email,
            "status": "completed"
        })
        
        if not old_project:
            return Response({"error": "Completed project not found"}, status=404)
        
        # Check if student already has an in-progress version of same project
        existing_suggested = projects_collection.find_one({
            "email": email,
            "title": old_project["title"],
            "status": "suggested"
        })
        
        if existing_suggested:
            return Response({
                "error": "You already have a suggested version of this project. Complete or delete that first.",
                "existing_project_id": str(existing_suggested["_id"])
            }, status=400)
        
        # Create NEW project with fresh data
        new_project = {
            "title": old_project["title"],
            "description": old_project["description"],
            "domain": old_project["domain"],
            "level": old_project["level"],
            "status": "suggested",  
            "email": email,
            "details": old_project.get("details", {}),  # Same requirements
            "solution": "",  # Empty solution
            "feedback": None,
            "score": 0,
            "reattempt_of": str(old_project["_id"]),  # Track original
            "reattempt_count": old_project.get("reattempt_count", 0) + 1,
            "created_at": str(datetime.now())
        }
        
        result = projects_collection.insert_one(new_project)
        new_project["_id"] = str(result.inserted_id)
        
        return Response({
            "success": True,
            "message": "New attempt created! You can now work on this project again.",
            "project": new_project
        })
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ======================================================
# GET PROJECT ATTEMPT HISTORY
# ======================================================
@api_view(['GET'])
def project_attempts(request):
    """
    Get all attempts of a specific project (by title)
    """
    title = request.GET.get("title")
    email = request.GET.get("email")
    
    if not title or not email:
        return Response({"error": "Title and email required"}, status=400)
    
    try:
        # Get all projects with same title
        all_attempts = list(projects_collection.find({
            "email": email,
            "title": title
        }).sort("created_at", -1))  # Latest first
        
        for attempt in all_attempts:
            attempt["_id"] = str(attempt["_id"])
        
        return Response({
            "attempts": all_attempts,
            "total_attempts": len(all_attempts)
        })
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
# ======================================================
# MENTOR FEEDBACK SYSTEM - NEW APIS
# ======================================================

# Get user profile (for mentor profile)
@api_view(['GET'])
def get_user_profile(request):
    email = request.GET.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    user = users_collection.find_one({"email": email})
    if not user:
        return Response({"error": "User not found"}, status=404)
    
    return Response({
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "bio": user.get("bio", "Expert mentor helping students grow their skills."),
        "role": user.get("role", "")
    })


# Get mentor's skills
@api_view(['GET'])
def get_skills(request):
    email = request.GET.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    user = users_collection.find_one({"email": email})
    skills = user.get("skills", []) if user else []
    
    return Response({"skills": skills})


# Update mentor/student skills
@api_view(['POST'])
def update_skills(request):
    email = request.data.get("email")
    skills = request.data.get("skills", [])
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    result = users_collection.update_one(
        {"email": email},
        {"$set": {"skills": skills}}
    )
    
    if result.modified_count == 0:
        return Response({"error": "User not found"}, status=404)
    
    return Response({"message": "Skills updated successfully", "skills": skills})


# Get matched projects for mentor (students with matching skills)
@api_view(['GET'])
def mentor_matched_projects(request):
    mentor_email = request.GET.get("email")
    
    if not mentor_email:
        return Response({"error": "Email required"}, status=400)
    
    # Get mentor info with skills
    mentor = users_collection.find_one({"email": mentor_email})
    if not mentor:
        return Response({"error": "Mentor not found"}, status=404)
    
    mentor_skills = mentor.get("skills", [])
    
    # If mentor has no skills, return empty
    if not mentor_skills:
        return Response({
            "projects": [],
            "pending_projects": [],
            "completed_projects": [],
            "total_matched_students": 0,
            "message": "Please add skills to your profile to see matched projects"
        })
    
    # Get ALL completed projects (students ke completed projects)
    all_projects = list(projects_collection.find({
        "status": "completed"
    }).sort("created_at", -1))
    
    matched_projects = []
    
    for project in all_projects:
        # Get student info
        student = users_collection.find_one({"email": project["email"]})
        if not student:
            continue
        
        # Get student skills (if any)
        student_skills = student.get("skills", [])
        
        # Calculate match score based on skills overlap
        if student_skills and mentor_skills:
            matching_skills = set(mentor_skills) & set(student_skills)
            match_score = int((len(matching_skills) / len(student_skills)) * 100) if student_skills else 0
        else:
            # If no skills data, use domain matching as fallback
            match_score = 50 if project.get("domain", "").lower() in [s.lower() for s in mentor_skills] else 0
        
        # Only include projects with match_score > 0
        if match_score > 0:
            # Check if this mentor already reviewed this project
            existing_feedback = mentor_feedback_collection.find_one({
                "project_id": str(project["_id"]),
                "mentor_email": mentor_email
            })
            
            project_data = {
                "_id": str(project["_id"]),
                "title": str(project.get("title", "")),
                "description": str(project.get("description", "")),
                "domain": str(project.get("domain", "")),
                "level": str(project.get("level", "")),
                "score": int(project.get("score", 0)),
                "final_score": int(project.get("final_score", project.get("score", 0))),
                "match_score": match_score,
                "student_name": str(student.get("name", "Unknown")),
                "student_email": str(project["email"]),
                "solution": str(project.get("solution", "")),
                "status": project.get("status", "completed"),
                "mentor_feedback_given": project.get("mentor_feedback_given", False),
                "created_at": str(project.get("created_at", "")),
                "reviewed": existing_feedback is not None  # Important: true if already reviewed
            }
            
            matched_projects.append(project_data)
    
    # Separate into pending and completed
    pending_projects = [p for p in matched_projects if not p["reviewed"]]
    completed_projects = [p for p in matched_projects if p["reviewed"]]
    
    return Response({
        "projects": matched_projects,
        "pending_projects": pending_projects,
        "completed_projects": completed_projects,
        "total_matched_students": len(matched_projects),
        "total_pending": len(pending_projects),
        "total_reviewed": len(completed_projects),
        "mentor_skills": mentor_skills
    })


# Submit mentor feedback for a project
@api_view(['POST'])
def submit_mentor_feedback(request):
    project_id = request.data.get("project_id")
    mentor_email = request.data.get("mentor_email")
    feedback_text = request.data.get("feedback_text")
    rating = request.data.get("rating", 3)
    manual_score = request.data.get("manual_score")
    
    if not all([project_id, mentor_email, feedback_text]):
        return Response({"error": "Project ID, mentor email, and feedback text required"}, status=400)
    
    try:
        # Get project
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            return Response({"error": "Project not found"}, status=404)
        
        # Check if feedback already exists (prevent duplicate reviews)
        existing = mentor_feedback_collection.find_one({
            "project_id": str(project_id),
            "mentor_email": mentor_email
        })
        
        if existing:
            return Response({
                "error": "You have already reviewed this project",
                "existing_feedback": {
                    "feedback_text": existing.get("feedback_text"),
                    "rating": existing.get("rating"),
                    "created_at": existing.get("created_at")
                }
            }, status=400)
        
        feedback_data = {
            "project_id": str(project_id),
            "project_title": project.get("title", ""),
            "student_email": project["email"],
            "mentor_email": mentor_email,
            "feedback_text": feedback_text,
            "rating": rating,
            "created_at": str(datetime.now())
        }
        
        # Add manual score if provided
        if manual_score and str(manual_score).strip():
            try:
                manual_score_int = int(float(manual_score))
                if 0 <= manual_score_int <= 100:
                    feedback_data["manual_score"] = manual_score_int
            except (ValueError, TypeError):
                pass
        
        # Insert new feedback
        result = mentor_feedback_collection.insert_one(feedback_data)
        
        # Update project with mentor feedback info
        update_data = {
            "mentor_feedback_given": True,
            "mentor_rating": rating,
            "mentor_feedback_text": feedback_text,
            "mentor_reviewed_at": str(datetime.now()),
            "mentor_email": mentor_email  # Track which mentor reviewed it
        }
        
        # Handle final score
        if manual_score and str(manual_score).strip():
            try:
                manual_score_int = int(float(manual_score))
                if 0 <= manual_score_int <= 100:
                    update_data["mentor_override_score"] = manual_score_int
                    update_data["final_score"] = manual_score_int
            except (ValueError, TypeError):
                update_data["final_score"] = project.get("score", 0)
        else:
            update_data["final_score"] = project.get("score", 0)
        
        projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": update_data}
        )
        
        return Response({
            "success": True,
            "message": "Feedback submitted successfully",
            "feedback_id": str(result.inserted_id),
            "final_score": update_data.get("final_score", 0)
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)

        

# Get mentor's progress stats (average student scores)
@api_view(['GET'])
def mentor_progress_stats(request):
    mentor_email = request.GET.get("email")
    
    if not mentor_email:
        return Response({"error": "Email required"}, status=400)
    
    # Get all feedbacks given by this mentor
    feedbacks = list(mentor_feedback_collection.find({"mentor_email": mentor_email}))
    
    if not feedbacks:
        return Response({"average_student_assessment_score": 0})
    
    total_score = 0
    count = 0
    
    for fb in feedbacks:
        project = projects_collection.find_one({"_id": ObjectId(fb["project_id"])})
        if project:
            total_score += project.get("score", 0)
            count += 1
    
    avg_score = round(total_score / count) if count > 0 else 0
    
    return Response({"average_student_assessment_score": avg_score})


# Get student's mentor feedbacks
@api_view(['GET'])
def student_mentor_feedbacks(request):
    student_email = request.GET.get("email")
    
    if not student_email:
        return Response({"error": "Email required"}, status=400)
    
    feedbacks = list(mentor_feedback_collection.find({"student_email": student_email}))
    
    formatted_feedbacks = []
    for fb in feedbacks:
        # Get mentor name
        mentor = users_collection.find_one({"email": fb["mentor_email"]})
        formatted_feedbacks.append({
            "project_title": fb.get("project_title", ""),
            "feedback_text": fb.get("feedback_text", ""),
            "rating": fb.get("rating", 0),
            "mentor_name": mentor.get("name", "Unknown") if mentor else "Unknown",
            "created_at": fb.get("created_at", str(datetime.now()))
        })
    
    return Response({"feedbacks": formatted_feedbacks})

# ======================================================
# MENTOR WORKSPACE - GET PROJECT DETAILS (UPDATED)
# ======================================================
@api_view(['GET'])
def mentor_get_project(request):
    """Get project details for mentor review workspace - Works for both pending and completed"""
    project_id = request.GET.get("project_id")
    mentor_email = request.GET.get("email")
    
    if not project_id or not mentor_email:
        return Response({"error": "Project ID and email required"}, status=400)
    
    try:
        if not ObjectId.is_valid(project_id):
            return Response({"error": f"Invalid project ID format: {project_id}"}, status=400)
        
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            return Response({"error": "Project not found"}, status=404)
        
        student = users_collection.find_one({"email": project["email"]})
        
        # ✅ Check if already reviewed - but DON'T block, just include the feedback
        existing_feedback = mentor_feedback_collection.find_one({
            "project_id": str(project_id),
            "mentor_email": mentor_email
        })
        
        # Extract tasks
        tasks = project.get("tasks", [])
        if not tasks:
            details = project.get("details", {})
            if isinstance(details, dict):
                requirements_text = details.get("requirements_text", "")
            else:
                requirements_text = str(details)
            tasks = extract_tasks_from_requirements_text(requirements_text)
            
            if tasks:
                projects_collection.update_one(
                    {"_id": ObjectId(project_id)},
                    {"$set": {"tasks": tasks}}
                )
        
        # ✅ Always return project data, with feedback if exists
        feedback_data = None
        if existing_feedback:
            feedback_data = {
                "feedback_text": existing_feedback.get("feedback_text", ""),
                "rating": existing_feedback.get("rating", 0),
                "manual_score": existing_feedback.get("manual_score"),
                "created_at": existing_feedback.get("created_at", "")
            }
        
        project_data = {
            "_id": str(project["_id"]),
            "title": str(project.get("title", "")),
            "description": str(project.get("description", "")),
            "domain": str(project.get("domain", "")),
            "level": str(project.get("level", "")),
            "solution": str(project.get("solution", "")),
            "ai_score": project.get("score", 0),
            "final_score": project.get("final_score", project.get("score", 0)),
            "student_name": str(student.get("name", "Unknown")) if student else "Unknown",
            "student_email": str(project["email"]),
            "requirements": project.get("details", {}),
            "tasks": tasks,
            "task_solutions": project.get("task_solutions", []),
            "task_evaluations": project.get("task_evaluations", []),
            # ✅ Include mentor feedback if exists
            "mentor_feedback": feedback_data,
            "already_reviewed": existing_feedback is not None,
            "mentor_feedback_given": project.get("mentor_feedback_given", False)
        }
        
        return Response(project_data)
        
    except Exception as e:
        print(f"Error in mentor_get_project: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


def extract_tasks_from_requirements_text(requirements_text):
    """Helper function to extract tasks from requirements text"""
    if not requirements_text or not isinstance(requirements_text, str):
        return []
    
    tasks = []
    lines = requirements_text.split('\n')
    in_tasks = False
    
    for line in lines:
        trimmed = line.strip()
        if "## TASKS" in trimmed.upper():
            in_tasks = True
            continue
        if in_tasks and trimmed.startswith('##'):
            break
        if in_tasks and (trimmed.startswith('-') or (trimmed and trimmed[0].isdigit() and '.' in trimmed[:3])):
            task = trimmed.lstrip('-•0123456789. ').strip()
            if task:
                tasks.append(task)
    
    return tasks

# ======================================================
# MENTOR SUBMIT REVIEW WITH MANUAL GRADING
# ======================================================
@api_view(['POST'])
def mentor_submit_review(request):
    """Submit mentor review with manual grading override"""
    try:
        project_id = request.data.get("project_id")
        mentor_email = request.data.get("mentor_email")
        feedback_text = request.data.get("feedback_text")
        rating = request.data.get("rating", 3)
        manual_score = request.data.get("manual_score")
        
        print(f"=== SUBMIT REVIEW DEBUG ===")
        print(f"Project ID: {project_id}")
        print(f"Mentor Email: {mentor_email}")
        print(f"Feedback Text Length: {len(feedback_text) if feedback_text else 0}")
        print(f"Rating: {rating}")
        print(f"Manual Score: {manual_score}")
        
        # Validate required fields
        if not project_id:
            return Response({"error": "Project ID is required"}, status=400)
        if not mentor_email:
            return Response({"error": "Mentor email is required"}, status=400)
        if not feedback_text or not feedback_text.strip():
            return Response({"error": "Feedback text is required"}, status=400)
        
        # Validate rating
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                rating = 3
        except (ValueError, TypeError):
            rating = 3
        
        # Validate ObjectId
        if not ObjectId.is_valid(project_id):
            return Response({"error": f"Invalid project ID format: {project_id}"}, status=400)
        
        # Get project
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            return Response({"error": "Project not found"}, status=404)
        
        print(f"Project found: {project.get('title')}")
        
        # Prepare feedback data
        feedback_data = {
            "project_id": str(project_id),
            "project_title": str(project.get("title", "")),
            "student_email": str(project["email"]),
            "mentor_email": str(mentor_email),
            "feedback_text": str(feedback_text),
            "rating": rating,
            "created_at": str(datetime.now())
        }
        
        # Add manual score if provided
        if manual_score and str(manual_score).strip():
            try:
                manual_score_int = int(float(manual_score))
                if 0 <= manual_score_int <= 100:
                    feedback_data["manual_score"] = manual_score_int
                    print(f"Manual score added: {manual_score_int}")
            except (ValueError, TypeError):
                print(f"Invalid manual score: {manual_score}")
        
        # Check if feedback already exists
        existing = mentor_feedback_collection.find_one({
            "project_id": str(project_id),
            "mentor_email": str(mentor_email)
        })
        
        if existing:
            print("Updating existing feedback")
            mentor_feedback_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": feedback_data}
            )
        else:
            print("Creating new feedback")
            mentor_feedback_collection.insert_one(feedback_data)
        
        # Update project with mentor feedback info
        update_data = {
            "mentor_feedback_given": True,
            "mentor_rating": rating,
            "mentor_feedback_text": str(feedback_text),
            "mentor_reviewed_at": str(datetime.now())
        }
        
        # Handle final score
        final_score = project.get("score", 0)
        
        # Override score if manual score provided
        if manual_score and str(manual_score).strip():
            try:
                manual_score_int = int(float(manual_score))
                if 0 <= manual_score_int <= 100:
                    update_data["mentor_override_score"] = manual_score_int
                    update_data["final_score"] = manual_score_int
                    final_score = manual_score_int
                    print(f"Score overridden to: {final_score}")
            except (ValueError, TypeError):
                update_data["final_score"] = final_score
        else:
            update_data["final_score"] = final_score
        
        # Use $set with upsert option to ensure the update works even if fields don't exist
        result = projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": update_data}
        )
        
        print(f"Project update result: matched={result.matched_count}, modified={result.modified_count}")
        print(f"Final score set to: {update_data['final_score']}")
        
        return Response({
            "success": True,
            "message": "Review submitted successfully",
            "final_score": update_data['final_score'],
            "feedback": feedback_data
        })
        
    except Exception as e:
        print(f"ERROR in mentor_submit_review: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            "error": f"Failed to submit review: {str(e)}"
        }, status=500)
    
# ======================================================
# ADD THESE NEW ADMIN FUNCTIONS BELOW EXISTING ONES
# ======================================================

@api_view(['POST'])
def generate_reports(request):
    """Generate reports from completed projects"""
    try:
        from datetime import datetime
        import json
        
        # ✅ Check if reports_col exists
        if reports_col is None:
            return Response({"error": "Reports collection not initialized"}, status=500)
        
        # Get all completed projects
        completed_projects = list(projects_collection.find({"status": "completed"}))
        
        print(f"Found {len(completed_projects)} completed projects")  # Debug log
        
        reports_created = 0
        for project in completed_projects:
            try:
                # ✅ Safely convert ObjectId to string
                project_id = str(project.get("_id", ""))
                if not project_id:
                    continue
                
                # Check if report already exists
                existing = reports_col.find_one({"project_id": project_id})
                if existing:
                    continue
                
                # Get student info
                student = users_collection.find_one({"email": project["email"]})
                
                # ✅ Safely get AI feedback
                feedback_data = project.get("feedback", {})
                ai_feedback = "AI feedback generated"
                
                if isinstance(feedback_data, dict):
                    ai_feedback = feedback_data.get("final_feedback", "AI feedback generated")
                elif isinstance(feedback_data, str):
                    try:
                        feedback_dict = json.loads(feedback_data)
                        ai_feedback = feedback_dict.get("final_feedback", "AI feedback generated")
                    except:
                        ai_feedback = str(feedback_data)
                
                # Create report
                report = {
                    "student_name": student.get("name", "Unknown") if student else "Unknown",
                    "student_email": project.get("email", ""),
                    "project_title": project.get("title", "Unknown Project"),
                    "ai_score": project.get("score", 0),
                    "ai_feedback": ai_feedback,
                    "created_at": project.get("evaluated_at", str(datetime.now())),
                    "project_id": project_id,
                    "domain": project.get("domain", "General"),
                    "level": project.get("level", "Beginner"),
                    "generated_at": str(datetime.now())
                }
                
                reports_col.insert_one(report)
                reports_created += 1
                print(f"Report created for project: {project.get('title')}")  # Debug log
                
            except Exception as e:
                print(f"Error processing project {project.get('_id')}: {str(e)}")  # Debug log
                continue  # Continue with next project even if one fails
        
        total_reports = reports_col.count_documents({})
        
        return Response({
            "success": True,
            "message": f"Generated {reports_created} new reports",
            "total_reports": total_reports,
            "details": {
                "processed": len(completed_projects),
                "created": reports_created,
                "skipped": len(completed_projects) - reports_created
            }
        })
        
    except Exception as e:
        print(f"Error in generate_reports: {str(e)}")  # Debug log
        import traceback
        traceback.print_exc()  # Print full traceback
        return Response({"error": str(e)}, status=500)

# 6. Delete a Report
@api_view(['DELETE'])
def delete_report(request, report_id):
    """Delete a report from the system"""
    try:
        result = reports_col.delete_one({"_id": ObjectId(report_id)})
        if result.deleted_count == 0:
            return Response({"error": "Report not found"}, status=404)
        return Response({"message": "Report deleted successfully"})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# 7. Get Single Report Details
@api_view(['GET'])
def get_report_detail(request, report_id):
    """Get detailed report by ID"""
    try:
        report = reports_col.find_one({"_id": ObjectId(report_id)})
        if not report:
            return Response({"error": "Report not found"}, status=404)
        report["_id"] = str(report["_id"])
        return Response(report)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# 8. Get All Projects (Admin)
@api_view(['GET'])
def admin_get_all_projects(request):
    """Admin view all projects"""
    try:
        projects = list(projects_collection.find({}))
        for p in projects:
            p["_id"] = str(p["_id"])
        return Response(projects)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# 9. Update Project (Admin)
@api_view(['PUT'])
def admin_update_project(request, project_id):
    """Admin can update project details"""
    try:
        data = request.data
        update_fields = {}
        
        allowed_fields = ['title', 'description', 'domain', 'level', 'status', 'score']
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
        
        if update_fields:
            projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {"$set": update_fields}
            )
        
        return Response({"message": "Project updated successfully"})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# 10. Delete Project (Admin)
@api_view(['DELETE'])
def admin_delete_project(request, project_id):
    """Admin can delete any project"""
    try:
        result = projects_collection.delete_one({"_id": ObjectId(project_id)})
        if result.deleted_count == 0:
            return Response({"error": "Project not found"}, status=404)
        return Response({"message": "Project deleted successfully"})
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
# ======================================================
# ADMIN MENTOR STATS & FEEDBACK REPORTS
# ======================================================

# Get Mentor Performance Stats
@api_view(['GET'])
def admin_mentor_stats(request):
    """Get all mentors with their feedback stats"""
    try:
        # Get all mentors
        mentors = list(users_collection.find({"role": "mentor"}, {"_id": 1, "name": 1, "email": 1, "skills": 1}))
        
        mentor_stats = []
        for mentor in mentors:
            # Get all feedbacks given by this mentor
            feedbacks = list(mentor_feedback_collection.find({"mentor_email": mentor["email"]}))
            
            total_feedbacks = len(feedbacks)
            avg_rating = 0
            if total_feedbacks > 0:
                total_rating = sum(f.get("rating", 0) for f in feedbacks)
                avg_rating = round(total_rating / total_feedbacks, 1)
            
            # Get unique students mentored
            unique_students = set(f.get("student_email") for f in feedbacks)
            
            mentor_stats.append({
                "id": str(mentor["_id"]),
                "name": mentor.get("name", "Unknown"),
                "email": mentor["email"],
                "skills": mentor.get("skills", []),
                "total_feedbacks": total_feedbacks,
                "avg_rating": avg_rating,
                "students_mentored": len(unique_students),
                "joined_at": mentor.get("created_at", "N/A")
            })
        
        return Response(mentor_stats)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# Get All Mentor Feedbacks (Admin View)
@api_view(['GET'])
def admin_all_mentor_feedbacks(request):
    """Get all mentor feedbacks for admin review"""
    try:
        feedbacks = list(mentor_feedback_collection.find({}).sort("created_at", -1))
        
        result = []
        for fb in feedbacks:
            # Get mentor name
            mentor = users_collection.find_one({"email": fb["mentor_email"]})
            # Get student name
            student = users_collection.find_one({"email": fb["student_email"]})
            
            result.append({
                "id": str(fb["_id"]),
                "mentor_name": mentor.get("name", "Unknown") if mentor else "Unknown",
                "mentor_email": fb["mentor_email"],
                "student_name": student.get("name", "Unknown") if student else "Unknown",
                "student_email": fb["student_email"],
                "project_title": fb.get("project_title", ""),
                "feedback_text": fb.get("feedback_text", ""),
                "rating": fb.get("rating", 0),
                "manual_score": fb.get("manual_score"),
                "created_at": fb.get("created_at", "")
            })
        
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# Get Mentor Feedback Details by ID
@api_view(['GET'])
def admin_mentor_feedback_detail(request, feedback_id):
    """Get single mentor feedback details"""
    try:
        fb = mentor_feedback_collection.find_one({"_id": ObjectId(feedback_id)})
        if not fb:
            return Response({"error": "Feedback not found"}, status=404)
        
        # Get mentor and student details
        mentor = users_collection.find_one({"email": fb["mentor_email"]})
        student = users_collection.find_one({"email": fb["student_email"]})
        
        # Get project details
        project = projects_collection.find_one({"_id": ObjectId(fb["project_id"])}) if fb.get("project_id") else None
        
        result = {
            "id": str(fb["_id"]),
            "mentor_name": mentor.get("name", "Unknown") if mentor else "Unknown",
            "mentor_email": fb["mentor_email"],
            "student_name": student.get("name", "Unknown") if student else "Unknown",
            "student_email": fb["student_email"],
            "project_title": fb.get("project_title", ""),
            "project_id": fb.get("project_id", ""),
            "feedback_text": fb.get("feedback_text", ""),
            "rating": fb.get("rating", 0),
            "manual_score": fb.get("manual_score"),
            "ai_score": project.get("score", 0) if project else 0,
            "created_at": fb.get("created_at", "")
        }
        
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# Delete Mentor Feedback (Admin)
@api_view(['DELETE'])
def admin_delete_mentor_feedback(request, feedback_id):
    """Admin can delete any mentor feedback"""
    try:
        result = mentor_feedback_collection.delete_one({"_id": ObjectId(feedback_id)})
        if result.deleted_count == 0:
            return Response({"error": "Feedback not found"}, status=404)
        return Response({"message": "Feedback deleted successfully"})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# Get Overall Platform Stats
@api_view(['GET'])
def admin_platform_stats(request):
    """Get complete platform statistics"""
    try:
        total_students = users_collection.count_documents({"role": "student"})
        total_mentors = users_collection.count_documents({"role": "mentor"})
        total_projects = projects_collection.count_documents({})
        completed_projects = projects_collection.count_documents({"status": "completed"})
        total_feedbacks = mentor_feedback_collection.count_documents({})
        
        # Average mentor rating
        all_feedbacks = list(mentor_feedback_collection.find({}))
        avg_mentor_rating = 0
        if all_feedbacks:
            total_rating = sum(f.get("rating", 0) for f in all_feedbacks)
            avg_mentor_rating = round(total_rating / len(all_feedbacks), 1)
        
        # Top mentors by feedback count
        mentor_feedback_count = {}
        for fb in all_feedbacks:
            email = fb.get("mentor_email")
            if email:
                mentor_feedback_count[email] = mentor_feedback_count.get(email, 0) + 1
        
        top_mentors = []
        for email, count in sorted(mentor_feedback_count.items(), key=lambda x: x[1], reverse=True)[:5]:
            mentor = users_collection.find_one({"email": email})
            if mentor:
                top_mentors.append({
                    "name": mentor.get("name", "Unknown"),
                    "email": email,
                    "feedbacks_given": count
                })
        
        return Response({
            "total_students": total_students,
            "total_mentors": total_mentors,
            "total_projects": total_projects,
            "completed_projects": completed_projects,
            "total_mentor_feedbacks": total_feedbacks,
            "avg_mentor_rating": avg_mentor_rating,
            "top_mentors": top_mentors
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
# ======================================================
# ADMIN - ADD NEW USER
# ======================================================
@api_view(['POST'])
def admin_add_user(request):
    """Admin can add a new user (student/mentor/admin)"""
    try:
        data = request.data
        
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'student')
        
        # Validate required fields
        if not name or not email or not password:
            return Response({"error": "Name, email, and password are required"}, status=400)
        
        # Check if user already exists
        if users_collection.find_one({"email": email}):
            return Response({"error": "User with this email already exists"}, status=400)
        
        # Validate role
        if role not in ['student', 'mentor', 'admin']:
            return Response({"error": "Invalid role. Must be student, mentor, or admin"}, status=400)
        
        # Hash password
        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create new user
        user = {
            "name": name,
            "email": email,
            "password": hashed_pw,
            "role": role,
            "skills": data.get('skills', []),
            "bio": data.get('bio', f"{role.capitalize()} user"),
            "created_at": str(datetime.now()),
            "created_by_admin": True
        }
        
        result = users_collection.insert_one(user)
        
        return Response({
            "success": True,
            "message": f"User {name} added successfully as {role}",
            "user": {
                "id": str(result.inserted_id),
                "name": name,
                "email": email,
                "role": role
            }
        }, status=201)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# ======================================================
# PORTFOLIO ENHANCEMENT APIs 
# ======================================================

@api_view(['GET'])
def get_portfolio_with_profile(request):
    """Get complete portfolio data including profile info"""
    email = request.GET.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    try:
        # Get student info with all fields
        student = users_collection.find_one({"email": email})
        if not student:
            return Response({"error": "Student not found"}, status=404)
        
        # Get completed projects
        completed_projects = list(projects_collection.find({
            "email": email,
            "status": "completed"
        }).sort("created_at", -1))
        
        # Format projects - convert ObjectId to string
        formatted_projects = []
        for project in completed_projects:
            # Get mentor feedback
            mentor_feedback = mentor_feedback_collection.find_one({
                "project_id": str(project["_id"])
            })
            mentor_name = None
            if mentor_feedback:
                mentor = users_collection.find_one({"email": mentor_feedback.get("mentor_email", "")})
                mentor_name = mentor.get("name", "Unknown") if mentor else "Unknown"
            
            formatted_projects.append({
                "id": str(project["_id"]),
                "title": str(project.get("title", "")),
                "description": str(project.get("description", "")),
                "domain": str(project.get("domain", "")),
                "level": str(project.get("level", "")),
                "ai_score": int(project.get("score", 0)),
                "final_score": int(project.get("final_score", project.get("score", 0))),
                "mentor_feedback": str(project.get("mentor_feedback_text")) if project.get("mentor_feedback_text") else None,
                "mentor_rating": int(project.get("mentor_rating")) if project.get("mentor_rating") else None,
                "mentor_name": str(mentor_name) if mentor_name else None,
                "completed_at": str(project.get("evaluated_at", project.get("created_at", "")))
            })
        
        # Get assessments 
        assessments = list(assessments_collection.find({"email": email}))
        formatted_assessments = []
        for assessment in assessments:
            formatted_assessments.append({
                "id": str(assessment["_id"]) if "_id" in assessment else None,
                "domain": str(assessment.get("domain", "")),
                "score": int(assessment.get("score", 0)),
                "level": str(assessment.get("final_level", assessment.get("level", ""))),
                "completed_at": str(assessment.get("completed_at", ""))
            })
        
        # Calculate statistics
        total_projects = len(formatted_projects)
        avg_score = 0
        if total_projects > 0:
            avg_score = round(sum(p.get("ai_score", 0) for p in formatted_projects) / total_projects)
        
        # Handle social_links safely
        social_links = student.get("social_links", {})
        if not isinstance(social_links, dict):
            social_links = {}
        
        # Handle created_at safely
        created_at = student.get("created_at", "")
        if isinstance(created_at, datetime):
            created_at = str(created_at)
        
        portfolio_data = {
            "student": {
                "name": str(student.get("name", "")),
                "email": str(student.get("email", "")),
                "bio": str(student.get("bio", "")),
                "skills": student.get("skills", []),
                "education": student.get("education", []),
                "experience": student.get("experience", []),
                "social_links": {
                    "linkedin": str(social_links.get("linkedin", "")),
                    "github": str(social_links.get("github", "")),
                    "twitter": str(social_links.get("twitter", "")),
                    "personal_website": str(social_links.get("personal_website", ""))
                },
                "joined_at": created_at,
                "avatar": student.get("avatar", None)
            },
            "statistics": {
                "total_projects": total_projects,
                "average_score": avg_score,
                "skill_count": len(student.get("skills", []))
            },
            "projects": formatted_projects,
            "assessments": formatted_assessments
        }
        
        return Response(portfolio_data)
        
    except Exception as e:
        print(f"Error in get_portfolio_with_profile: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
def update_portfolio_profile(request):
    """Update student profile information for portfolio"""
    email = request.data.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    try:
        update_data = {}
        
        # Bio update
        if "bio" in request.data:
            update_data["bio"] = request.data["bio"]
        
        # Skills update
        if "skills" in request.data:
            update_data["skills"] = request.data["skills"]
        
        # Education update
        if "education" in request.data:
            update_data["education"] = request.data["education"]
        
        # Experience update
        if "experience" in request.data:
            update_data["experience"] = request.data["experience"]
        
        # Social links update
        if "social_links" in request.data:
            update_data["social_links"] = request.data["social_links"]
        
        from datetime import datetime
        update_data["portfolio_updated_at"] = str(datetime.now())
        
        result = users_collection.update_one(
            {"email": email},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            return Response({"error": "User not found"}, status=404)
        
        return Response({
            "success": True,
            "message": "Profile updated successfully"
        })
        
    except Exception as e:
        print(f"Error in update_portfolio_profile: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
def generate_portfolio_pdf(request):
    """Generate PDF version of portfolio"""
    email = request.data.get("email")
    include_project_ids = request.data.get("include_projects", [])  
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    try:
        # Get portfolio data directly (instead of calling another view)
        # Get student info
        student = users_collection.find_one({"email": email})
        if not student:
            return Response({"error": "Student not found"}, status=404)
        
        # Get completed projects
        completed_projects = list(projects_collection.find({
            "email": email,
            "status": "completed"
        }).sort("created_at", -1))
        
        # Format projects - convert ObjectId to string
        formatted_projects = []
        for project in completed_projects:
            # Get mentor feedback
            mentor_feedback = mentor_feedback_collection.find_one({
                "project_id": str(project["_id"])
            })
            mentor_name = None
            if mentor_feedback:
                mentor = users_collection.find_one({"email": mentor_feedback.get("mentor_email", "")})
                mentor_name = mentor.get("name", "Unknown") if mentor else "Unknown"
            
            formatted_projects.append({
                "id": str(project["_id"]),
                "title": str(project.get("title", "")),
                "description": str(project.get("description", "")),
                "domain": str(project.get("domain", "")),
                "level": str(project.get("level", "")),
                "ai_score": int(project.get("score", 0)),
                "final_score": int(project.get("final_score", project.get("score", 0))),
                "mentor_feedback": str(project.get("mentor_feedback_text")) if project.get("mentor_feedback_text") else None,
                "mentor_rating": int(project.get("mentor_rating")) if project.get("mentor_rating") else None,
                "mentor_name": str(mentor_name) if mentor_name else None,
                "completed_at": str(project.get("evaluated_at", project.get("created_at", "")))
            })
        
        # Filter projects if include_project_ids is provided
        if include_project_ids and len(include_project_ids) > 0:
            formatted_projects = [
                p for p in formatted_projects 
                if p.get("id") in include_project_ids
            ]
        
        # Calculate statistics
        total_projects = len(formatted_projects)
        avg_score = 0
        if total_projects > 0:
            avg_score = round(sum(p.get("ai_score", 0) for p in formatted_projects) / total_projects)
        
        # Handle social_links safely
        social_links = student.get("social_links", {})
        if not isinstance(social_links, dict):
            social_links = {}
        
        # Handle created_at safely
        created_at = student.get("created_at", "")
        if isinstance(created_at, datetime):
            created_at = str(created_at)
        
        portfolio_data = {
            "student": {
                "name": str(student.get("name", "")),
                "email": str(student.get("email", "")),
                "bio": str(student.get("bio", "")),
                "skills": student.get("skills", []),
                "education": student.get("education", []),
                "experience": student.get("experience", []),
                "social_links": {
                    "linkedin": str(social_links.get("linkedin", "")),
                    "github": str(social_links.get("github", "")),
                    "twitter": str(social_links.get("twitter", "")),
                    "personal_website": str(social_links.get("personal_website", ""))
                },
                "joined_at": created_at,
                "avatar": student.get("avatar", None)
            },
            "statistics": {
                "total_projects": total_projects,
                "average_score": avg_score,
                "skill_count": len(student.get("skills", []))
            },
            "projects": formatted_projects,
            "assessments": []  # Not needed for PDF
        }
        
        # Generate HTML content for PDF
        html_content = generate_pdf_html(portfolio_data)
        
        return Response({
            "success": True,
            "html_content": html_content,
            "portfolio_data": portfolio_data
        })
        
    except Exception as e:
        print(f"Error in generate_portfolio_pdf: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

def generate_pdf_html(portfolio_data):
    """Generate HTML for PDF conversion with beautiful styling (print-optimized)"""
    from datetime import datetime
    
    student = portfolio_data.get("student", {})
    projects = portfolio_data.get("projects", [])
    
    # Build skills HTML
    skills_html = ""
    for skill in student.get("skills", []):
        skills_html += f'<span class="skill-tag">{skill}</span>'
    
    # Build education HTML
    education_html = ""
    for edu in student.get("education", []):
        education_html += f"""
        <div class="edu-item">
            <h4>{edu.get('degree', '')}</h4>
            <p class="meta">{edu.get('institution', '')} | {edu.get('year', '')}</p>
            {f'<p class="desc">{edu.get("description", "")}</p>' if edu.get('description') else ''}
        </div>
        """
    
    # Build experience HTML
    experience_html = ""
    for exp in student.get("experience", []):
        experience_html += f"""
        <div class="exp-item">
            <h4>{exp.get('title', '')} at {exp.get('company', '')}</h4>
            <p class="meta">{exp.get('duration', '')}</p>
            {f'<p class="desc">{exp.get("description", "")}</p>' if exp.get('description') else ''}
        </div>
        """
    
    # Build social links HTML
    social_links = student.get("social_links", {})
    social_html = ""
    if social_links.get('linkedin'):
        social_html += f'<a href="{social_links["linkedin"]}" class="social-link">🔗 LinkedIn</a>'
    if social_links.get('github'):
        social_html += f'<a href="{social_links["github"]}" class="social-link">💻 GitHub</a>'
    if social_links.get('twitter'):
        social_html += f'<a href="{social_links["twitter"]}" class="social-link">🐦 Twitter</a>'
    if social_links.get('personal_website'):
        social_html += f'<a href="{social_links["personal_website"]}" class="social-link">🌐 Website</a>'
    
    # Build projects HTML - NO SCORES
    projects_html = ""
    for project in projects:
        # Determine which feedback to show
        mentor_feedback = project.get('mentor_feedback')
        mentor_rating = project.get('mentor_rating')
        mentor_name = project.get('mentor_name')
        ai_feedback = project.get('ai_feedback', {})
        
        # Build feedback section
        feedback_html = ""
        if mentor_feedback:
            feedback_html = f"""
            <div class="mentor-feedback">
                <strong>👨‍🏫 Mentor Feedback{ f' from {mentor_name}' if mentor_name else '' }:</strong>
                <p>"{mentor_feedback}"</p>
                {f'<p class="rating">⭐ Rating: {mentor_rating}/5</p>' if mentor_rating else ''}
            </div>
            """
        elif ai_feedback and ai_feedback.get('final_feedback'):
            feedback_html = f"""
            <div class="ai-feedback">
                <strong>🤖 AI Review:</strong>
                <p>{ai_feedback.get('final_feedback', '')}</p>
            </div>
            """
        
        projects_html += f"""
        <div class="project-card">
            <div class="project-header">
                <h3>{project.get('title', '')}</h3>
                <div class="project-meta">
                    <span class="domain">{project.get('domain', '')}</span>
                    <span class="level">{project.get('level', '')}</span>
                </div>
            </div>
            <p class="project-desc">{project.get('description', '')}</p>
            {feedback_html}
        </div>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{student.get('name', 'Student')} - Portfolio</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
                background: #eef2f7;
                padding: 30px;
                line-height: 1.5;
            }}
            
            .portfolio-container {{
                max-width: 1000px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            
            /* Header Section */
            .header {{
                background: #4f46e5;
                color: white;
                padding: 35px;
                text-align: center;
            }}
            
            .header h1 {{
                font-size: 32px;
                margin-bottom: 8px;
                letter-spacing: 0.5px;
            }}
            
            .header .email {{
                font-size: 13px;
                opacity: 0.85;
                margin-bottom: 12px;
            }}
            
            .header .bio {{
                font-size: 14px;
                max-width: 600px;
                margin: 0 auto;
                opacity: 0.9;
                line-height: 1.5;
            }}
            
            /* Social Links */
            .social-links {{
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-top: 18px;
                flex-wrap: wrap;
            }}
            
            .social-link {{
                color: white;
                text-decoration: none;
                font-size: 12px;
                padding: 5px 12px;
                background: rgba(255,255,255,0.15);
                border-radius: 20px;
            }}
            
            /* Section Styles */
            .section {{
                padding: 25px 35px;
                border-bottom: 1px solid #e5e7eb;
            }}
            
            .section:last-child {{
                border-bottom: none;
            }}
            
            .section-title {{
                font-size: 20px;
                color: #1f2937;
                margin-bottom: 18px;
                display: flex;
                align-items: center;
                gap: 8px;
                border-left: 4px solid #4f46e5;
                padding-left: 14px;
            }}
            
            /* Skills */
            .skills-list {{
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }}
            
            .skill-tag {{
                background: #e0e7ff;
                color: #4f46e5;
                padding: 5px 12px;
                border-radius: 25px;
                font-size: 12px;
                font-weight: 500;
            }}
            
            /* Education & Experience */
            .edu-item, .exp-item {{
                margin-bottom: 18px;
                padding-left: 18px;
                border-left: 3px solid #4f46e5;
            }}
            
            .edu-item h4, .exp-item h4 {{
                color: #1f2937;
                margin-bottom: 4px;
                font-size: 15px;
            }}
            
            .meta {{
                color: #6b7280;
                font-size: 11px;
                margin-bottom: 4px;
            }}
            
            .desc {{
                color: #4b5563;
                font-size: 12px;
                margin-top: 5px;
                line-height: 1.5;
            }}
            
            /* Projects */
            .project-card {{
                background: #f9fafb;
                border-radius: 12px;
                padding: 18px;
                margin-bottom: 18px;
                border: 1px solid #e5e7eb;
            }}
            
            .project-header {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 10px;
            }}
            
            .project-header h3 {{
                color: #1f2937;
                font-size: 17px;
                margin: 0;
            }}
            
            .project-meta {{
                display: flex;
                gap: 8px;
            }}
            
            .project-meta span {{
                font-size: 11px;
                padding: 2px 10px;
                border-radius: 20px;
                background: #e5e7eb;
                color: #4b5563;
            }}
            
            .project-desc {{
                color: #4b5563;
                font-size: 12px;
                margin: 8px 0;
                line-height: 1.5;
            }}
            
            .mentor-feedback {{
                background: #fef3c7;
                padding: 10px;
                border-radius: 8px;
                margin-top: 10px;
                font-size: 12px;
                border-left: 3px solid #f59e0b;
            }}
            
            .mentor-feedback p {{
                margin-top: 4px;
                font-style: italic;
                color: #78350f;
            }}
            
            .mentor-feedback .rating {{
                font-style: normal;
                margin-top: 4px;
                color: #92400e;
            }}
            
            .ai-feedback {{
                background: #ecfdf5;
                padding: 10px;
                border-radius: 8px;
                margin-top: 10px;
                font-size: 12px;
                border-left: 3px solid #10b981;
            }}
            
            .ai-feedback p {{
                margin-top: 4px;
                color: #065f46;
            }}
            
            /* Footer */
            .footer {{
                background: #1f2937;
                color: #9ca3af;
                text-align: center;
                padding: 18px;
                font-size: 10px;
            }}
            
            /* Print Styles */
            @media print {{
                body {{
                    background: white;
                    padding: 0;
                    margin: 0;
                }}
                .portfolio-container {{
                    box-shadow: none;
                    border-radius: 0;
                    max-width: 100%;
                }}
                .project-card {{
                    break-inside: avoid;
                    page-break-inside: avoid;
                }}
                .header {{
                    background: #4f46e5 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }}
                .skill-tag {{
                    background: #e0e7ff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }}
                .mentor-feedback {{
                    background: #fef3c7 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }}
                .ai-feedback {{
                    background: #ecfdf5 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }}
                .footer {{
                    background: #1f2937 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="portfolio-container">
            <!-- Header -->
            <div class="header">
                <h1>{student.get('name', 'Student')}</h1>
                <div class="email">{student.get('email', '')}</div>
                <div class="bio">{student.get('bio', '')}</div>
                
                {f'<div class="social-links">{social_html}</div>' if social_html else ''}
            </div>
            
            <!-- Skills Section -->
            {f'''
            <div class="section">
                <div class="section-title">
                    <span>🎯</span> Skills & Expertise
                </div>
                <div class="skills-list">{skills_html}</div>
            </div>
            ''' if skills_html else ''}
            
            <!-- Education Section -->
            {f'''
            <div class="section">
                <div class="section-title">
                    <span>🎓</span> Education
                </div>
                {education_html}
            </div>
            ''' if education_html else ''}
            
            <!-- Experience Section -->
            {f'''
            <div class="section">
                <div class="section-title">
                    <span>💼</span> Work Experience
                </div>
                {experience_html}
            </div>
            ''' if experience_html else ''}
            
            <!-- Projects Section - NO SCORES -->
            <div class="section">
                <div class="section-title">
                    <span>📂</span> Completed Projects ({len(projects)})
                </div>
                {projects_html if projects_html else '<p style="color: #666;">No projects completed yet.</p>'}
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>Generated on {datetime.now().strftime('%B %d, %Y')}</p>
                <p>Virtual Internship Portal Portfolio</p>
            </div>
        </div>
    </body>
    </html>
    """
# ======================================================
# TASK-BASED PROJECT SUBMISSION
# ======================================================

@api_view(['POST'])
def save_task_solution(request):
    """Save solution for a specific task within a project"""
    project_id = request.data.get("project_id")
    task_index = request.data.get("task_index")
    task_solution = request.data.get("task_solution")
    
    if not project_id or task_index is None:
        return Response({"error": "Project ID and task index required"}, status=400)
    
    try:
        # Get current project
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            return Response({"error": "Project not found"}, status=404)
        
        # Get or create task_solutions array
        task_solutions = project.get("task_solutions", [])
        
        # Ensure array is long enough
        while len(task_solutions) <= task_index:
            task_solutions.append("")
        
        # Update the specific task
        task_solutions[task_index] = task_solution
        
        # Save back to database
        projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"task_solutions": task_solutions}}
        )
        
        return Response({
            "success": True,
            "message": f"Task {task_index + 1} solution saved"
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_task_solutions(request):
    """Get all task solutions for a project"""
    project_id = request.GET.get("project_id")
    
    if not project_id:
        return Response({"error": "Project ID required"}, status=400)
    
    try:
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            return Response({"error": "Project not found"}, status=404)
        
        return Response({
            "task_solutions": project.get("task_solutions", []),
            "task_count": len(extract_tasks_from_requirements(project.get("details", {})))
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


def extract_tasks_from_requirements(details):
    """Extract tasks from project requirements"""
    if not details:
        return []
    
    requirements_text = details.get("requirements_text", "") if isinstance(details, dict) else str(details)
    
    tasks = []
    in_tasks = False
    for line in requirements_text.split('\n'):
        line = line.strip()
        if "## TASKS" in line.upper():
            in_tasks = True
            continue
        if in_tasks and line.startswith('##'):
            break
        if in_tasks and (line.startswith('-') or (line and line[0].isdigit() and '.' in line[:3])):
            task = line.lstrip('-•0123456789. ').strip()
            if task:
                tasks.append(task)
    
    return tasks

# ======================================================
# FR9: REPORTING AND ANALYTICS APIs
# ======================================================

@api_view(['GET'])
def get_student_progress_trend(request):
    """Get student score trends over time for analytics"""
    email = request.GET.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    try:
        # Get all assessments with dates
        assessments = list(assessments_collection.find(
            {"email": email},
            {"score": 1, "completed_at": 1, "domain": 1}
        ).sort("completed_at", 1))
        
        # Get all completed projects with scores
        projects = list(projects_collection.find(
            {"email": email, "status": "completed"},
            {"score": 1, "final_score": 1, "evaluated_at": 1, "title": 1}
        ).sort("evaluated_at", 1))
        
        # Prepare trend data
        trend_data = []
        
        for assessment in assessments:
            trend_data.append({
                "type": "assessment",
                "score": assessment.get("score", 0),
                "date": assessment.get("completed_at", ""),
                "name": assessment.get("domain", "Assessment")
            })
        
        for project in projects:
            score = project.get("final_score", project.get("score", 0))
            trend_data.append({
                "type": "project",
                "score": score,
                "date": project.get("evaluated_at", ""),
                "name": project.get("title", "Project")
            })
        
        # Sort by date
        trend_data.sort(key=lambda x: x.get("date", ""))
        
        # Calculate improvement trend
        if len(trend_data) >= 2:
            first_score = trend_data[0].get("score", 0)
            last_score = trend_data[-1].get("score", 0)
            improvement = last_score - first_score
            trend = "improving" if improvement > 10 else "declining" if improvement < -10 else "stable"
        else:
            improvement = 0
            trend = "insufficient_data"
        
        return Response({
            "trend_data": trend_data,
            "total_assessments": len(assessments),
            "total_projects": len(projects),
            "improvement": improvement,
            "trend": trend,
            "latest_score": trend_data[-1].get("score", 0) if trend_data else 0
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_skill_improvement_insights(request):
    """Get skill-wise improvement insights"""
    email = request.GET.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    try:
        # Get student skills from profile
        student = users_collection.find_one({"email": email})
        skills = student.get("skills", [])
        
        # Get all projects grouped by domain
        projects = list(projects_collection.find(
            {"email": email, "status": "completed"},
            {"domain": 1, "score": 1, "final_score": 1, "title": 1}
        ))
        
        # Group scores by domain
        domain_scores = {}
        for project in projects:
            domain = project.get("domain", "General")
            score = project.get("final_score", project.get("score", 0))
            
            if domain not in domain_scores:
                domain_scores[domain] = []
            domain_scores[domain].append(score)
        
        # Calculate average per domain
        skill_insights = []
        for domain, scores in domain_scores.items():
            avg_score = sum(scores) / len(scores) if scores else 0
            skill_insights.append({
                "skill": domain,
                "average_score": round(avg_score),
                "projects_count": len(scores),
                "status": "strong" if avg_score >= 80 else "improving" if avg_score >= 60 else "needs_work"
            })
        
        # Overall stats
        all_scores = [s for scores in domain_scores.values() for s in scores]
        overall_avg = sum(all_scores) / len(all_scores) if all_scores else 0
        
        # Strongest and weakest skills
        strongest = max(skill_insights, key=lambda x: x["average_score"]) if skill_insights else None
        weakest = min(skill_insights, key=lambda x: x["average_score"]) if skill_insights else None
        
        return Response({
            "skills": skills,
            "skill_insights": skill_insights,
            "overall_average": round(overall_avg),
            "total_projects_analyzed": len(all_scores),
            "strongest_skill": strongest,
            "weakest_skill": weakest,
            "recommendation": get_recommendation(weakest, strongest) if weakest else "Complete more projects to get insights"
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


def get_recommendation(weakest, strongest):
    """Generate recommendation based on skill analysis"""
    if not weakest:
        return "Complete more projects to get personalized recommendations"
    
    if weakest["average_score"] < 60:
        return f"Focus on improving your {weakest['skill']} skills. Consider reviewing fundamentals and practicing more."
    elif strongest and strongest["average_score"] > 80:
        return f"Your strength is in {strongest['skill']}. Consider taking advanced projects in this area."
    else:
        return "Continue practicing across all domains to build a well-rounded skillset."


@api_view(['GET'])
def get_admin_analytics(request):
    """Get complete platform analytics for admin dashboard"""
    try:
        from datetime import datetime, timedelta
        
        # Total counts
        total_students = users_collection.count_documents({"role": "student"})
        total_mentors = users_collection.count_documents({"role": "mentor"})
        total_projects = projects_collection.count_documents({})
        completed_projects = projects_collection.count_documents({"status": "completed"})
        
        # Average scores
        all_completed = list(projects_collection.find({"status": "completed"}, {"score": 1, "final_score": 1}))
        scores = [p.get("final_score", p.get("score", 0)) for p in all_completed if p.get("score", 0) > 0]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # Mentor performance
        mentors = list(users_collection.find({"role": "mentor"}, {"name": 1, "email": 1}))
        mentor_stats = []
        for mentor in mentors:
            feedbacks = mentor_feedback_collection.count_documents({"mentor_email": mentor["email"]})
            mentor_stats.append({
                "name": mentor.get("name", "Unknown"),
                "feedbacks_given": feedbacks
            })
        
        # Last 30 days activity
        thirty_days_ago = str(datetime.now() - timedelta(days=30))
        recent_projects = projects_collection.count_documents({"created_at": {"$gte": thirty_days_ago}})
        recent_feedbacks = mentor_feedback_collection.count_documents({"created_at": {"$gte": thirty_days_ago}})
        
        # Domain distribution
        domains = list(projects_collection.aggregate([
            {"$match": {"domain": {"$ne": None}}},
            {"$group": {"_id": "$domain", "count": {"$sum": 1}}}
        ]))
        
        return Response({
            "total_students": total_students,
            "total_mentors": total_mentors,
            "total_projects": total_projects,
            "completed_projects": completed_projects,
            "completion_rate": round((completed_projects / total_projects * 100), 1) if total_projects > 0 else 0,
            "average_score": round(avg_score, 1),
            "mentor_stats": mentor_stats,
            "recent_activity": {
                "projects_last_30_days": recent_projects,
                "feedbacks_last_30_days": recent_feedbacks
            },
            "domain_distribution": domains,
            "timestamp": str(datetime.now())
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_student_comparison_analytics(request):
    """Compare student performance with peers"""
    email = request.GET.get("email")
    
    if not email:
        return Response({"error": "Email required"}, status=400)
    
    try:
        # Get student's average score
        student_projects = list(projects_collection.find(
            {"email": email, "status": "completed"},
            {"score": 1, "final_score": 1}
        ))
        student_scores = [p.get("final_score", p.get("score", 0)) for p in student_projects]
        student_avg = sum(student_scores) / len(student_scores) if student_scores else 0
        
        # Get platform average
        all_projects = list(projects_collection.find({"status": "completed"}, {"score": 1, "final_score": 1}))
        all_scores = [p.get("final_score", p.get("score", 0)) for p in all_projects]
        platform_avg = sum(all_scores) / len(all_scores) if all_scores else 0
        
        # Get top performer average (top 10%)
        if len(all_scores) >= 10:
            sorted_scores = sorted(all_scores, reverse=True)
            top_10_count = max(1, len(sorted_scores) // 10)
            top_avg = sum(sorted_scores[:top_10_count]) / top_10_count
        else:
            top_avg = platform_avg
        
        # Percentile rank
        below_count = sum(1 for s in all_scores if s < student_avg)
        percentile = round((below_count / len(all_scores)) * 100) if all_scores else 50
        
        return Response({
            "student_average": round(student_avg),
            "platform_average": round(platform_avg),
            "top_performer_average": round(top_avg),
            "percentile_rank": percentile,
            "total_students_compared": projects_collection.distinct("email", {"status": "completed"}),
            "comparison_message": get_comparison_message(student_avg, platform_avg, percentile)
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


def get_comparison_message(student_avg, platform_avg, percentile):
    """Generate comparison message"""
    if student_avg > platform_avg:
        return f"Excellent! You're performing above the platform average ({platform_avg}%). You're in the top {100 - percentile}% of students."
    elif student_avg == platform_avg:
        return f"Good job! You're at par with the platform average ({platform_avg}%)."
    else:
        return f"Keep practicing! The platform average is {platform_avg}%. You're in the {percentile}th percentile."
    

# ======================================================
# EVALUATE TASK SOLUTION (AI checks individual tasks)
# ======================================================
@api_view(['POST'])
def evaluate_task_solution(request):
    """AI evaluates a specific task solution"""
    project_id = request.data.get("project_id")
    task_index = request.data.get("task_index")
    task_solution = request.data.get("task_solution")
    task_description = request.data.get("task_description", "")
    
    if not project_id or task_index is None or not task_solution:
        return Response({"error": "Project ID, task index, and solution required"}, status=400)
    
    try:
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            return Response({"error": "Project not found"}, status=404)
        
        # AI Evaluation prompt
        prompt = f"""
        You are an AI mentor evaluating a student's solution for a specific task.
        
        Task Description: {task_description}
        
        Student's Solution: {task_solution}
        
        Evaluate this solution based on:
        1. Correctness - Does it solve the problem?
        2. Completeness - Is the solution complete?
        3. Quality - Code quality, explanation, approach
        4. Innovation - Any creative or efficient approaches used?
        
        Provide:
        - A score from 0-100
        - Brief feedback (2-3 sentences)
        - Specific suggestions for improvement
        
        Format your response as JSON with keys: score, feedback, suggestions
        """
        
        ai_response = call_ai(prompt)
        
        try:
            import json
            import re
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(ai_response)
        except:
            result = {
                "score": 70,
                "feedback": "AI evaluation completed. Consider improving code clarity.",
                "suggestions": "Add comments, handle edge cases, improve naming."
            }
        
        task_evaluations = project.get("task_evaluations", [])
        
        while len(task_evaluations) <= task_index:
            task_evaluations.append(None)
        
        task_evaluations[task_index] = {
            "evaluated_at": str(datetime.now()),
            "score": result.get("score", 0),
            "feedback": result.get("feedback", ""),
            "suggestions": result.get("suggestions", ""),
            "solution": task_solution
        }
        
        # Save to database
        projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"task_evaluations": task_evaluations}}
        )
        
        # ===== FIX: Check if all tasks are evaluated and calculate average =====
        all_tasks_evaluated = all(e is not None for e in task_evaluations)
        
        if all_tasks_evaluated:
            # Calculate average score from ALL tasks
            total_score = sum(e.get("score", 0) for e in task_evaluations if e is not None)
            avg_score = round(total_score / len(task_evaluations))
            
            projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$set": {
                        "status": "completed",
                        "score": avg_score,
                        "final_score": avg_score,
                        "evaluated_at": str(datetime.now())
                    }
                }
            )
        # ===================================================================
        
        return Response({
            "success": True,
            "evaluation": {
                "score": result.get("score", 0),
                "feedback": result.get("feedback", ""),
                "suggestions": result.get("suggestions", "")
            },
            "task_index": task_index,
            "all_tasks_evaluated": all_tasks_evaluated
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    

@api_view(['GET'])
def mentor_matched_projects_v2(request):
    """
    Enhanced version with better skill matching and duplicate prevention
    """
    mentor_email = request.GET.get("email")
    
    if not mentor_email:
        return Response({"error": "Email required"}, status=400)
    
    try:
        # Get mentor with skills
        mentor = users_collection.find_one({"email": mentor_email})
        if not mentor:
            return Response({"error": "Mentor not found"}, status=404)
        
        mentor_skills = mentor.get("skills", [])
        
        if not mentor_skills:
            return Response({
                "projects": [],
                "pending_projects": [],
                "completed_projects": [],
                "total_matched": 0,
                "message": "Please add skills to your profile to see matched projects"
            })
        
        # Get all completed projects with student info in one go
        pipeline = [
            {"$match": {"status": "completed"}},
            {"$lookup": {
                "from": "users_collection",
                "localField": "email",
                "foreignField": "email",
                "as": "student"
            }},
            {"$unwind": "$student"}
        ]
        
        all_projects = list(projects_collection.aggregate(pipeline))
        
        # Get all feedbacks by this mentor (for duplicate check)
        mentor_feedbacks = list(mentor_feedback_collection.find(
            {"mentor_email": mentor_email},
            {"project_id": 1}
        ))
        reviewed_project_ids = {fb["project_id"] for fb in mentor_feedbacks}
        
        matched_projects = []
        
        for project in all_projects:
            student_skills = project.get("student", {}).get("skills", [])
            
            # Calculate match score
            if student_skills:
                matching_skills = set(mentor_skills) & set(student_skills)
                match_score = int((len(matching_skills) / len(student_skills)) * 100)
            else:
                # Domain-based matching fallback
                domain = project.get("domain", "").lower()
                match_score = 50 if any(domain in skill.lower() or skill.lower() in domain for skill in mentor_skills) else 0
            
            # Only include if match_score > 30 (at least 30% match)
            if match_score >= 30:
                project_id = str(project["_id"])
                is_reviewed = project_id in reviewed_project_ids
                
                project_data = {
                    "_id": project_id,
                    "title": project.get("title", ""),
                    "domain": project.get("domain", ""),
                    "level": project.get("level", ""),
                    "score": project.get("score", 0),
                    "final_score": project.get("final_score", project.get("score", 0)),
                    "match_score": match_score,
                    "student_name": project.get("student", {}).get("name", "Unknown"),
                    "student_email": project.get("email", ""),
                    "reviewed": is_reviewed,
                    "mentor_feedback_given": project.get("mentor_feedback_given", False),
                    "created_at": str(project.get("created_at", ""))
                }
                
                matched_projects.append(project_data)
        
        # Sort by match_score (highest first)
        matched_projects.sort(key=lambda x: x["match_score"], reverse=True)
        
        # Separate into pending and completed
        pending_projects = [p for p in matched_projects if not p["reviewed"]]
        completed_projects = [p for p in matched_projects if p["reviewed"]]
        
        return Response({
            "projects": matched_projects,
            "pending_projects": pending_projects,
            "completed_projects": completed_projects,
            "total_matched": len(matched_projects),
            "total_pending": len(pending_projects),
            "total_reviewed": len(completed_projects),
            "mentor_skills": mentor_skills
        })
        
    except Exception as e:
        print(f"Error in mentor_matched_projects_v2: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)