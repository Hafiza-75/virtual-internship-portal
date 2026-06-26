import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function MentorProfile() {
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [mentorInfo, setMentorInfo] = useState({
    name: "",
    email: "",
    bio: ""
  });

  const email = localStorage.getItem("email");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  // 1. Memoize fetchMentorInfo using useCallback
  const fetchMentorInfo = useCallback(async () => {
    try {
      const res = await API.get(`/api/user/?email=${email}`);
      setMentorInfo({
        name: res.data.name || "",
        email: res.data.email || "",
        bio: res.data.bio || "Expert mentor helping students grow their skills."
      });
    } catch (err) {
      console.error("Error fetching mentor info:", err);
    }
  }, [email]);

  // 2. Memoize fetchSkills using useCallback
  const fetchSkills = useCallback(async () => {
    try {
      const res = await API.get(`/api/get-skills/?email=${email}`);
      setSkills(res.data.skills || []);
    } catch (err) {
      console.error("Error fetching skills:", err);
    }
  }, [email]);

  // 3. useEffect now safely includes the memoized functions in the dependency array
  useEffect(() => {
    if (!token || role !== "mentor") {
      navigate("/login");
      return;
    }
    fetchMentorInfo();
    fetchSkills();
  }, [token, role, navigate, fetchMentorInfo, fetchSkills]);

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    
    const updatedSkills = [...skills, newSkill.trim()];
    setLoading(true);
    
    try {
      await API.post("/api/update-skills/", {
        email: email,
        skills: updatedSkills
      });
      setSkills(updatedSkills);
      setNewSkill("");
      alert("Skill added successfully! Students with matching skills will now see your profile.");
    } catch (err) {
      alert("Failed to add skill");
    } finally {
      setLoading(false);
    }
  };

  const removeSkill = async (skillToRemove) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    
    try {
      await API.post("/api/update-skills/", {
        email: email,
        skills: updatedSkills
      });
      setSkills(updatedSkills);
    } catch (err) {
      alert("Failed to remove skill");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f7f6" }}>
      <Sidebar role="mentor" />
      
      <div style={{ flex: 1, marginLeft: "0 auto", padding: "30px" }}>
        <h2>Mentor Profile</h2>
        
        {/* Profile Info */}
        <div style={{ background: "white", padding: "25px", borderRadius: "12px", marginBottom: "30px" }}>
          <h3>👤 Personal Information</h3>
          <p><strong>Name:</strong> {mentorInfo.name}</p>
          <p><strong>Email:</strong> {mentorInfo.email}</p>
        </div>
        
        {/* Skills Section */}
        <div style={{ background: "white", padding: "25px", borderRadius: "12px" }}>
          <h3>🎯 My Expertise (Skills)</h3>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            Add skills you can mentor. Students with matching skills will appear in your dashboard.
          </p>
          
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g., Python, React, Data Science"
              style={{
                flex: 1,
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "6px"
              }}
              onKeyPress={(e) => e.key === "Enter" && addSkill()}
            />
            <button
              onClick={addSkill}
              disabled={loading}
              style={{
                background: "#3498db",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                cursor: "pointer",
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Adding..." : "Add Skill"}
            </button>
          </div>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  background: "#e8f4fd",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#e74c3c",
                    cursor: "pointer",
                    fontSize: "16px"
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          
          {skills.length === 0 && (
            <p style={{ color: "#999", marginTop: "15px" }}>
              No skills added yet. Add skills to start receiving student projects for review!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}