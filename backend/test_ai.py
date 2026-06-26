import requests

url = "http://127.0.0.1:8000/api/generate-quiz/"
data = {
    "domain": "Python",
    "level": "beginner",
    "num_questions": 3
}

print("Testing AI Quiz Generation...")
try:
    response = requests.post(url, json=data)
    print("Status Code:", response.status_code)
    print("AI Response:", response.json())
except Exception as e:
    print("Error:", e)