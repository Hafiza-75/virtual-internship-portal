from rest_framework.decorators import api_view
from rest_framework.response import Response
from .db import users_collection


# =========================
# GET PROFILE
# =========================
@api_view(['GET'])
def get_profile(request, email):
    user = users_collection.find_one(
        {"email": email},
        {"password": 0}
    )

    if not user:
        return Response({"error": "User not found"}, status=404)

    user["_id"] = str(user["_id"])
    return Response(user)


# =========================
# UPDATE PROFILE
# =========================
@api_view(['PUT'])
def update_profile(request, email):
    data = request.data

    update_data = {}

    # only update if provided
    if "skills" in data:
        update_data["skills"] = data["skills"]

    if "interests" in data:
        update_data["interests"] = data["interests"]

    if "skill_level" in data:
        update_data["skill_level"] = data["skill_level"]

    if not update_data:
        return Response({"error": "No data to update"}, status=400)

    users_collection.update_one(
        {"email": email},
        {"$set": update_data}
    )

    return Response({"message": "Profile updated successfully"})