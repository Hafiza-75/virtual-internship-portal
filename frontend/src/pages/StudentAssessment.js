import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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
    <p style={spinnerStyles.text}>Loading assessments...</p>
  </div>
);

export default function StudentAssessment() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const email = localStorage.getItem("email");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  useEffect(() => {
    // Protection
    if (!token || role !== "student") {
      navigate("/login");
      return;
    }

    // Fetch assessment history
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/api/my-results/?email=${email}`);
        setHistory(res.data || []);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };

    if (email) {
      fetchHistory();
    }
  }, [email, token, role, navigate]);

  const toggleExpand = (index) => {
    setExpandedId(expandedId === index ? null : index);
  };

  const handleNewAssessment = () => {
    navigate("/assessment");
  };

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

      <div style={{ flex: 1, marginLeft: "0 auto", padding: "40px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "15px" }}>
          <div>
            <h2 style={{ margin: 0 }}>My Assessments</h2>
            <p style={{ color: "#666", marginTop: "5px" }}>View all your assessment results and recommendations</p>
          </div>

          <button
            onClick={handleNewAssessment}
            style={{
              padding: "12px 24px",
              background: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#2980b9";
              e.target.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#3498db";
              e.target.style.transform = "scale(1)";
            }}
          >
            + Attempt New Assessment
          </button>
        </div>

        <div>
          {history.length > 0 ? (
            history.map((item, index) => (
              <div key={index} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
                  <div>
                    <h4 style={{ margin: 0, color: "#2c3e50" }}>
                      {item.domain} Assessment
                    </h4>
                    <div style={{ marginTop: "8px" }}>
                      <span style={scoreBadge(item.score)}>Score: {item.score}%</span>
                      <span style={levelBadge(item.level)}>Level: {item.level}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => toggleExpand(index)} 
                    style={viewBtn}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#e8f4fd";
                      e.target.style.transform = "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "none";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    {expandedId === index ? "Hide Details" : "View Details"}
                  </button>
                </div>

                {expandedId === index && (
                  <div style={resultBox}>
                    <h4 style={{ marginTop: 0, color: "#2c3e50" }}>Assessment Result</h4>
                    
                    <div style={{ marginBottom: "15px" }}>
                      <p><strong>Domain:</strong> {item.domain}</p>
                      <p><strong>Score:</strong> <span style={{ fontWeight: "bold", color: item.score >= 70 ? "#27ae60" : "#e74c3c" }}>{item.score}%</span></p>
                      <p><strong>Level:</strong> {item.level}</p>
                      <p><strong>Completed:</strong> {new Date(item.completed_at).toLocaleDateString()}</p>
                    </div>

                    <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#f0f8ff", borderRadius: "8px", borderLeft: "4px solid #3498db" }}>
                      <strong style={{ color: "#2980b9" }}>🤖 AI Recommendation:</strong>
                      <p style={{ marginTop: "8px", lineHeight: "1.6" }}>{item.recommendation}</p>
                    </div>

                    {item.project && (
                      <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#f0fff4", borderRadius: "8px", borderLeft: "4px solid #27ae60" }}>
                        <strong style={{ color: "#27ae60" }}>📚 Suggested Project:</strong>
                        <p style={{ marginTop: "8px" }}><strong>{item.project.title}</strong></p>
                        <p style={{ color: "#666", fontSize: "14px" }}>{item.project.description}</p>
                        <button
                          onClick={() => navigate("/my-projects")}
                          style={{
                            marginTop: "10px",
                            padding: "8px 16px",
                            background: "#27ae60",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "13px",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "#219a52";
                            e.target.style.transform = "scale(1.02)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "#27ae60";
                            e.target.style.transform = "scale(1)";
                          }}
                        >
                          View in Projects
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "60px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>📝</div>
              <h3>No Assessments Yet</h3>
              <p style={{ color: "#666", marginBottom: "20px" }}>You haven't completed any assessments. Start your learning journey!</p>
              <button
                onClick={handleNewAssessment}
                style={{
                  padding: "10px 20px",
                  background: "#3498db",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#2980b9";
                  e.target.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#3498db";
                  e.target.style.transform = "scale(1)";
                }}
              >
                Take First Assessment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "15px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  transition: "transform 0.2s, box-shadow 0.2s",
  border: "1px solid #e9ecef",
};

const viewBtn = {
  background: "none",
  border: "1px solid #3498db",
  color: "#3498db",
  padding: "8px 16px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  transition: "all 0.2s",
};

const resultBox = {
  marginTop: "20px",
  paddingTop: "20px",
  borderTop: "1px solid #e0e0e0",
};

const scoreBadge = (score) => ({
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "500",
  marginRight: "10px",
  backgroundColor: score >= 70 ? "#d4edda" : "#f8d7da",
  color: score >= 70 ? "#155724" : "#721c24",
});

const levelBadge = (level) => ({
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "500",
  backgroundColor: "#e3f2fd",
  color: "#0c5460",
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
if (!document.querySelector('#assessment-spinner-styles')) {
  styleSheet.id = 'assessment-spinner-styles';
  document.head.appendChild(styleSheet);
}