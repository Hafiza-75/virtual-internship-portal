import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import API from "../services/api";



// Animated Dotted Loading Spinner Component
const LoadingSpinner = () => (
  <div style={spinnerStyles.container}>
    <div style={spinnerStyles.spinner}>
      <div style={spinnerStyles.dot}></div>
      <div style={spinnerStyles.dot}></div>
      <div style={spinnerStyles.dot}></div>
      <div style={spinnerStyles.dot}></div>
      <div style={spinnerStyles.dot}></div>
      <div style={spinnerStyles.dot}></div>
      <div style={spinnerStyles.dot}></div>
      <div style={spinnerStyles.dot}></div>
    </div>
    <p style={spinnerStyles.text}>Loading dashboard...</p>
  </div>
);

export default function StudentDashboard() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [stats, setStats] = useState({
    average_score: 0,
    total_assessments: 0,
    level: "Beginner",
    total_projects: 0,
    completed_projects: 0,
    suggested_projects: 0,
  });
  
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState(null);

  // Protection
  useEffect(() => {
    if (!token || role !== "student") {
      navigate("/login");
    }
  }, [token, role, navigate]);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get(`/api/dashboard-stats/?email=${email}`);

      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, [email]);

  // Fetch mentor feedbacks
  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await API.get(`/api/student/feedback/?email=${email}`);
      setFeedbacks(res.data.feedbacks || []);
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    }
  }, [email]);

  useEffect(() => {
    if (email) {
      Promise.all([fetchStats(), fetchFeedbacks()]).finally(() => {
        setLoading(false);
      });
    }
  }, [email, fetchStats, fetchFeedbacks]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (email) {
        fetchStats();
        fetchFeedbacks();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [email, fetchStats, fetchFeedbacks]);

  const hasMentorFeedback = feedbacks.length > 0;
  const latestFeedback = feedbacks[0];

  if (loading) {
    return (
      <div style={{ display: "flex", backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
        <Sidebar role="student" />
        <div style={{ flex: 1, marginLeft: "0 auto", padding: "40px", textAlign: "center" }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
      <Sidebar role="student" />
      
      <div style={{ flex: 1, padding: "30px", marginLeft: "0 auto", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        
        {/* Header */}
        <header style={{ marginBottom: "30px" }}>
          <h2 style={{ margin: "0 0 8px 0" }}>Student Dashboard</h2>
          <p style={{ color: "#666", margin: 0 }}>Your AI learning progress overview</p>
        </header>

        {/* Stats Cards Row */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
          gap: "20px", 
          marginBottom: "30px" 
        }}>
          
          {/* Card 1: Average Score */}
          <div style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ margin: "0 0 10px 0", color: "#000000" }}>Average Score</h4>
                <h2 style={{ margin: 0, fontSize: "36px", color: "#2ecc71" }}>{stats.average_score}%</h2>
                <p style={{ margin: "10px 0 0 0", color: "#999", fontSize: "13px" }}>{stats.total_assessments} Total Assessments</p>
              </div>
            </div>
          </div>

          {/* Card 2: Projects Progress */}
          <div style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h4 style={{ margin: 0, color: "#000000" }}>Projects Progress</h4>
              </div>
              <h2 style={{ margin: 0, fontSize: "36px", color: "#f39c12" }}>{stats.completed_projects}/{stats.total_projects}</h2>
              <p style={{ margin: "10px 0 0 0", color: "#999", fontSize: "13px" }}>Projects Completed</p>
              <div style={{ 
                width: "100%", 
                height: "8px", 
                backgroundColor: "#e0e0e0", 
                borderRadius: "4px",
                marginTop: "15px",
                overflow: "hidden"
              }}>
                <div style={{ 
                  width: `${stats.total_projects > 0 ? (stats.completed_projects / stats.total_projects) * 100 : 0}%`, 
                  height: "100%", 
                  backgroundColor: "#f39c12",
                  transition: "width 0.3s",
                  borderRadius: "4px"
                }} />
              </div>
            </div>
          </div>

          {/* Card 3: Project Status Distribution */}
          <div style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h4 style={{ margin: 0, color: "#000000" }}>Project Status</h4>
              </div>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#e67e22" }}>{stats.suggested_projects}</div>
                  <small style={{ color: "#999" }}>Remaining Projects</small>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2ecc71" }}>{stats.completed_projects}</div>
                  <small style={{ color: "#999" }}>Completed</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ margin: "0 0 15px 0" }}>Quick Actions</h3>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/assessment")}
              style={actionButtonStyle("#3498db")}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              📝 Start New Assessment
            </button>
            <button
              onClick={() => navigate("/my-projects")}
              style={actionButtonStyle("#2ecc71")}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              📁 View My Projects
            </button>
            <button
              onClick={() => navigate("/portfolio")}
              style={actionButtonStyle("#9b59b6")}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              👤 Update Profile
            </button>
          </div>
        </div>

        {/* Mentor Feedback Section */}
        <div style={{ 
          background: "white", 
          borderRadius: "16px", 
          padding: "25px", 
          marginBottom: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e9ecef"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                <span>👨‍🏫</span> Mentor Feedback
                {hasMentorFeedback && (
                  <span style={{ 
                    background: "#fef3c7", 
                    color: "#92400e", 
                    padding: "4px 12px", 
                    borderRadius: "20px", 
                    fontSize: "12px",
                    fontWeight: "normal"
                  }}>
                    {feedbacks.length} New {feedbacks.length === 1 ? "Update" : "Updates"}
                  </span>
                )}
              </h3>
              <p style={{ color: "#666", margin: "5px 0 0 0", fontSize: "13px" }}>
                Personalized feedback from mentors on your completed projects
              </p>
            </div>
            {hasMentorFeedback && (
              <button
                onClick={() => navigate("/my-projects")}
                style={{
                  background: "none",
                  border: "1px solid #3498db",
                  color: "#3498db",
                  padding: "6px 16px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "12px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#3498db";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "#3498db";
                }}
              >
                View All Projects →
              </button>
            )}
          </div>

          {!hasMentorFeedback ? (
            <div style={{ 
              textAlign: "center", 
              padding: "60px 20px",
              background: "#f8f9fa",
              borderRadius: "12px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px", opacity: 0.5 }}>📭</div>
              <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>No Mentor Feedback Yet</h4>
              <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
                Complete projects and add skills to your profile to receive mentor feedback!
              </p>
              <button
                onClick={() => navigate("/portfolio")}
                style={{
                  marginTop: "20px",
                  padding: "8px 20px",
                  background: "#3498db",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                Add Skills to Your Profile
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {/* Latest Feedback Highlight */}
              <div style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "12px",
                padding: "20px",
                color: "white"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "15px" }}>
                  <div>
                    <span style={{ fontSize: "12px", opacity: 0.8 }}>Latest Feedback</span>
                    <h4 style={{ margin: "5px 0 0 0" }}>{latestFeedback.project_title}</h4>
                  </div>
                  <div style={{ 
                    background: "rgba(255,255,255,0.2)", 
                    padding: "8px 16px", 
                    borderRadius: "30px",
                    fontSize: "14px"
                  }}>
                    Rating: {"⭐".repeat(latestFeedback.rating)} ({latestFeedback.rating}/5)
                  </div>
                </div>
                <p style={{ margin: "0 0 10px 0", lineHeight: "1.5", opacity: 0.95 }}>
                  "{latestFeedback.feedback_text.substring(0, 150)}..."
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", opacity: 0.8 }}>
                  <span>From: {latestFeedback.mentor_name}</span>
                  <span>{new Date(latestFeedback.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* All Feedbacks List */}
              <div>
                <h4 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "16px" }}>
                  All Feedback ({feedbacks.length})
                </h4>
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {feedbacks.map((fb, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #e9ecef",
                        borderRadius: "12px",
                        padding: "15px",
                        marginBottom: "12px",
                        transition: "all 0.2s",
                        cursor: "pointer",
                        background: expandedFeedback === idx ? "#f8f9fa" : "white"
                      }}
                      onClick={() => setExpandedFeedback(expandedFeedback === idx ? null : idx)}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3498db"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e9ecef"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                        <div>
                          <strong style={{ fontSize: "15px" }}>{fb.project_title}</strong>
                          <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                            From: {fb.mentor_name}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ 
                            background: fb.rating >= 4 ? "#d4edda" : fb.rating >= 3 ? "#fff3cd" : "#f8d7da",
                            color: fb.rating >= 4 ? "#155724" : fb.rating >= 3 ? "#856404" : "#721c24",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "bold"
                          }}>
                            {"⭐".repeat(fb.rating)} {fb.rating}/5
                          </span>
                          <span style={{ fontSize: "12px", color: "#999" }}>
                            {new Date(fb.created_at).toLocaleDateString()}
                          </span>
                          <span style={{ fontSize: "16px", color: "#999" }}>
                            {expandedFeedback === idx ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>
                      
                      <p style={{ 
                        color: "#555", 
                        margin: "10px 0 0 0", 
                        lineHeight: "1.5",
                        ...(expandedFeedback !== idx && {
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical"
                        })
                      }}>
                        {fb.feedback_text}
                      </p>
                      
                      {expandedFeedback === idx && (
                        <div style={{ 
                          marginTop: "15px", 
                          paddingTop: "15px", 
                          borderTop: "1px dashed #e9ecef",
                          display: "flex",
                          gap: "10px"
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/my-projects");
                            }}
                            style={{
                              padding: "6px 16px",
                              background: "#3498db",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            View Project
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  transition: "transform 0.2s, box-shadow 0.2s",
  cursor: "pointer",
  border: "1px solid #e9ecef"
};

const actionButtonStyle = (color) => ({
  padding: "12px 24px",
  backgroundColor: color,
  color: "white",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  transition: "transform 0.2s, opacity 0.2s",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
});

// Spinner Styles
const spinnerStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "300px",
  },
  spinner: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
  },
  dot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    backgroundColor: "#667eea",
    animation: "dotPulse 1.4s ease-in-out infinite",
  },
  text: {
    marginTop: "20px",
    color: "#666",
    fontSize: "14px",
  },
};

// Add CSS animations to document
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes dotPulse {
    0%, 80%, 100% {
      transform: scale(0.6);
      opacity: 0.3;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;
if (!document.querySelector('#student-dashboard-spinner-styles')) {
  styleSheet.id = 'student-dashboard-spinner-styles';
  document.head.appendChild(styleSheet);
}