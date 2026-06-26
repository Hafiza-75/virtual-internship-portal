from pymongo import MongoClient
import os
from dotenv import load_dotenv

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

# Admin collections
users_col = db["users"]
projects_col = db["projects"]
reports_col = db["reports"]

# NEW: Mentor Feedback System Collections
mentor_feedback_collection = db["mentor_feedback"]
mentor_student_mapping_collection = db["mentor_student_mapping"]