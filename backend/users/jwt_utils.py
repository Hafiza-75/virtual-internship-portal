import jwt
import datetime
import os

SECRET_KEY = os.getenv("JWT_SECRET")

def generate_token(user):
    payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")