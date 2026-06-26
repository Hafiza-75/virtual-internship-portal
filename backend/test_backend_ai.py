import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_api():
    print("\n🔥 BACKEND + AI SYSTEM TEST STARTED 🔥\n")

    try:
        # 1. TEST MY RESULTS API
        print("📌 Testing /my-results ...")
        res = requests.get(f"{BASE_URL}/my-results/")
        data = res.json()

        if isinstance(data, list):
            print(f"✔ OK - {len(data)} records found\n")
        else:
            print("❌ Unexpected response:", data)

        # 2. CHECK AI PROJECT FIELD
        print("📌 Checking AI project generation ...")

        if len(data) > 0:
            sample = data[0]

            print("Sample Record:")
            print(json.dumps(sample, indent=2))

            if "project" in sample:
                print("\n✔ AI PROJECT GENERATION WORKING")
            else:
                print("\n❌ AI PROJECT FIELD MISSING")
        else:
            print("⚠ No data found in DB")

        # 3. FINAL STATUS
        print("\n========================")
        print("✅ BACKEND TEST COMPLETE")
        print("========================\n")

    except Exception as e:
        print("❌ ERROR:", str(e))


if __name__ == "__main__":
    test_api()