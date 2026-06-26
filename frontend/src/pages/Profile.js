import { useState, useEffect } from "react";
import API from "../services/api";

function Profile() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [profile, setProfile] = useState({
    skills: [],
    interests: [],
    skill_level: "beginner",
  });

  useEffect(() => {
    if (!user?.email) return;

    API.get(`profile/${user.email}/`)
      .then((res) => setProfile(res.data))
      .catch((err) => console.log(err));

  }, [user?.email]); 

  const updateProfile = () => {
    API.put(`profile/update/${user.email}/`, profile)
      .then((res) => alert(res.data.message))
      .catch((err) => alert("Update failed"));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Profile</h2>

      {/* Skills */}
      <input
        placeholder="Skills (comma separated)"
        onChange={(e) =>
          setProfile({
            ...profile,
            skills: e.target.value.split(","),
          })
        }
      />

      <br />

      {/* Interests */}
      <input
        placeholder="Interests"
        onChange={(e) =>
          setProfile({
            ...profile,
            interests: e.target.value.split(","),
          })
        }
      />

      <br />

      {/* Skill Level */}
      <select
        onChange={(e) =>
          setProfile({
            ...profile,
            skill_level: e.target.value,
          })
        }
      >
        <option value="beginner">beginner</option>
        <option value="intermediate">intermediate</option>
        <option value="advanced">advanced</option>
      </select>

      <br />

      <button onClick={updateProfile}>
        Update Profile
      </button>
    </div>
  );
}

export default Profile;