from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# ======================================================
# DATABASE CONNECTION
# ======================================================
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]

# ======================================================
# COLLECTIONS
# ======================================================
users_collection = db["users"]
assessments_collection = db["assessments"]
projects_collection = db["projects"]

# Mentor Feedback System Collections
mentor_feedback_collection = db["mentor_feedback"]
mentor_student_mapping_collection = db["mentor_student_mapping"]

# Admin collections (for db_connection compatibility)
users_col = db["users"]
projects_col = db["projects"]
reports_col = db["reports"]


# ======================================================
# INITIALIZE COLLECTIONS WITH INDEXES
# ======================================================
def initialize_collections():
    """Ensure all required collections exist with proper indexes"""
    
    try:
        # Create indexes for mentor_feedback collection
        mentor_feedback_collection.create_index([("project_id", 1), ("mentor_email", 1)])
        mentor_feedback_collection.create_index("student_email")
        mentor_feedback_collection.create_index("mentor_email")
        
        # Create indexes for users collection
        users_collection.create_index("email", unique=True)
        users_collection.create_index("skills")
        
        # Create indexes for projects collection
        projects_collection.create_index("email")
        projects_collection.create_index("status")
        projects_collection.create_index("mentor_feedback_given")
        
        print("Database collections initialized successfully")
    except Exception as e:
        print(f"Note: Index creation skipped - {e}")


# ======================================================
# ADD PORTFOLIO FIELDS TO EXISTING USERS
# ======================================================
def add_portfolio_fields_to_users():
    """Add new portfolio fields to existing users if they don't exist"""
    try:
        # Define default portfolio fields
        default_fields = {
            "bio": "Passionate learner building real-world projects. Always eager to learn new technologies and apply them to solve real problems.",
            "education": [],
            "experience": [],
            "social_links": {
                "linkedin": "",
                "github": "",
                "twitter": "",
                "personal_website": ""
            },
            "portfolio_updated_at": str(datetime.now())
        }
        
        # Update all users that don't have these fields
        for field, default_value in default_fields.items():
            result = users_collection.update_many(
                {field: {"$exists": False}},
                {"$set": {field: default_value}}
            )
            if result.modified_count > 0:
                print(f"Added '{field}' field to {result.modified_count} users")
        
        # For social_links nested fields, update if any are missing
        users_collection.update_many(
            {"social_links.linkedin": {"$exists": False}},
            {"$set": {"social_links.linkedin": ""}}
        )
        users_collection.update_many(
            {"social_links.github": {"$exists": False}},
            {"$set": {"social_links.github": ""}}
        )
        users_collection.update_many(
            {"social_links.twitter": {"$exists": False}},
            {"$set": {"social_links.twitter": ""}}
        )
        users_collection.update_many(
            {"social_links.personal_website": {"$exists": False}},
            {"$set": {"social_links.personal_website": ""}}
        )
        
        print("Portfolio fields added to all users")
    except Exception as e:
        print(f"Note: Portfolio fields update skipped - {e}")


# ======================================================
# ENSURE ALL STUDENTS HAVE SKILLS ARRAY
# ======================================================
def ensure_skills_array():
    """Ensure all students have skills array"""
    try:
        result = users_collection.update_many(
            {"role": "student", "skills": {"$exists": False}},
            {"$set": {"skills": []}}
        )
        if result.modified_count > 0:
            print(f"Added skills array to {result.modified_count} students")
    except Exception as e:
        print(f"Note: Skills array update skipped - {e}")


# ======================================================
# ENSURE PROJECTS HAVE ALL REQUIRED FIELDS (UPDATED)
# ======================================================
def ensure_project_fields():
    """Ensure all projects have all required fields including task-based fields"""
    try:
        # Add solution_images array to all projects
        result = projects_collection.update_many(
            {"solution_images": {"$exists": False}},
            {"$set": {"solution_images": []}}
        )
        if result.modified_count > 0:
            print(f"Added solution_images field to {result.modified_count} projects")
        
        # Add solution_text field (for backward compatibility)
        result2 = projects_collection.update_many(
            {"solution_text": {"$exists": False}},
            {"$set": {"solution_text": ""}}
        )
        if result2.modified_count > 0:
            print(f"Added solution_text field to {result2.modified_count} projects")
        
        # ============ NEW: Add task-related fields ============
        # Add task_solutions array
        result3 = projects_collection.update_many(
            {"task_solutions": {"$exists": False}},
            {"$set": {"task_solutions": []}}
        )
        if result3.modified_count > 0:
            print(f"Added task_solutions field to {result3.modified_count} projects")
        
        # Add task_evaluations array (for AI evaluations of each task)
        result4 = projects_collection.update_many(
            {"task_evaluations": {"$exists": False}},
            {"$set": {"task_evaluations": []}}
        )
        if result4.modified_count > 0:
            print(f"Added task_evaluations field to {result4.modified_count} projects")
        
        # Add tasks array (extracted from requirements)
        result5 = projects_collection.update_many(
            {"tasks": {"$exists": False}},
            {"$set": {"tasks": []}}
        )
        if result5.modified_count > 0:
            print(f"Added tasks field to {result5.modified_count} projects")
        
        # Add mentor_task_feedback array (for mentor feedback on individual tasks)
        result6 = projects_collection.update_many(
            {"mentor_task_feedback": {"$exists": False}},
            {"$set": {"mentor_task_feedback": []}}
        )
        if result6.modified_count > 0:
            print(f"Added mentor_task_feedback field to {result6.modified_count} projects")
        
        # Add final_score field
        result7 = projects_collection.update_many(
            {"final_score": {"$exists": False}},
            {"$set": {"final_score": 0}}
        )
        if result7.modified_count > 0:
            print(f"Added final_score field to {result7.modified_count} projects")
        
        # Add ai_score field (for clarity, same as score)
        result8 = projects_collection.update_many(
            {"ai_score": {"$exists": False}},
            {"$set": {"ai_score": 0}}
        )
        if result8.modified_count > 0:
            print(f"Added ai_score field to {result8.modified_count} projects")
        
        # ============ END NEW FIELDS ============
        
        print("All project fields added successfully")
    except Exception as e:
        print(f"Note: Project fields update skipped - {e}")


# ======================================================
# MIGRATE EXISTING PROJECTS TO EXTRACT TASKS
# ======================================================
def migrate_tasks_to_projects():
    """Extract tasks from requirements and add to projects that don't have them"""
    try:
        projects = projects_collection.find({"tasks": {"$size": 0}})
        updated_count = 0
        
        for project in projects:
            # Extract tasks from requirements
            details = project.get("details", {})
            if isinstance(details, dict):
                requirements_text = details.get("requirements_text", "")
            else:
                requirements_text = str(details) if details else ""
            
            tasks = extract_tasks_from_text(requirements_text)
            
            if tasks:
                # Update project with tasks
                projects_collection.update_one(
                    {"_id": project["_id"]},
                    {"$set": {"tasks": tasks}}
                )
                
                # Also ensure task_solutions and task_evaluations match task count
                task_count = len(tasks)
                project = projects_collection.find_one({"_id": project["_id"]})
                
                # Ensure task_solutions
                task_solutions = project.get("task_solutions", [])
                while len(task_solutions) < task_count:
                    task_solutions.append("")
                if len(task_solutions) > task_count:
                    task_solutions = task_solutions[:task_count]
                
                # Ensure task_evaluations
                task_evaluations = project.get("task_evaluations", [])
                while len(task_evaluations) < task_count:
                    task_evaluations.append(None)
                if len(task_evaluations) > task_count:
                    task_evaluations = task_evaluations[:task_count]
                
                # Save back
                projects_collection.update_one(
                    {"_id": project["_id"]},
                    {
                        "$set": {
                            "task_solutions": task_solutions,
                            "task_evaluations": task_evaluations
                        }
                    }
                )
                updated_count += 1
        
        if updated_count > 0:
            print(f"Migrated {updated_count} projects with tasks extracted from requirements")
    except Exception as e:
        print(f"Note: Task migration skipped - {e}")


def extract_tasks_from_text(text):
    """Helper function to extract tasks from requirements text"""
    if not text or not isinstance(text, str):
        return []
    
    tasks = []
    lines = text.split('\n')
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


# Call all initialization functions
try:
    initialize_collections()
    add_portfolio_fields_to_users()
    ensure_skills_array()
    ensure_project_fields()  
    migrate_tasks_to_projects()  
    print("Database setup completed successfully!")
except Exception as e:
    print(f"Note: Some initialization steps failed - {e}")