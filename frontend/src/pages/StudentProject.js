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
    <p style={spinnerStyles.text}>Loading projects...</p>
  </div>
);

export default function StudentProject() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const email = localStorage.getItem("email");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // ===== Helper function to calculate average task score =====
  const calculateAverageTaskScore = (taskEvaluations) => {
    if (!taskEvaluations || taskEvaluations.length === 0) return 0;
    const validScores = taskEvaluations
      .filter(e => e !== null && e !== undefined)
      .map(e => e.score || 0)
      .filter(s => s > 0);
    if (validScores.length === 0) return 0;
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  };
  // ===== End helper =====

  // ================= FETCH PROJECTS =================
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(`/api/projects/?email=${email}`);

      const data = res.data || [];

      // REMOVE DUPLICATES + NORMALIZE
      const uniqueProjects = [];
      const ids = new Set();

      data.forEach((p) => {
        if (!ids.has(p._id)) {
          ids.add(p._id);

          // ===== FIX: Calculate AI score from task evaluations =====
          const taskEvaluations = p.task_evaluations || [];
          const avgTaskScore = calculateAverageTaskScore(taskEvaluations);
          
          // Use average of task evaluations if available, otherwise use project score
          const aiScore = avgTaskScore > 0 ? avgTaskScore : (p.score || 0);
          // ===== END FIX =====

          uniqueProjects.push({
            ...p,
            status: p.status || "suggested",
            mentor_feedback_given: p.mentor_feedback_given || false,
            mentor_rating: p.mentor_rating || null,
            mentor_feedback_text: p.mentor_feedback_text || null,
            // FIX: Use calculated AI score
            ai_score: aiScore,
            // FIX: Ensure final_score uses mentor override if available
            final_score: p.final_score !== undefined && p.final_score !== null 
              ? p.final_score 
              : aiScore,
            tasks: p.tasks || [],
            task_solutions: p.task_solutions || [],
            task_evaluations: taskEvaluations,
            mentor_task_feedback: p.mentor_task_feedback || []
          });
        }
      });

      setProjects(uniqueProjects);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  }, [email]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!token || role !== "student") {
      navigate("/login");
      return;
    }

    fetchProjects();
    
    const interval = setInterval(() => {
      fetchProjects();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchProjects, token, role, navigate]);

  // ================= FILTERS =================
  const suggested = projects.filter((p) => p.status === "suggested");
  const completed = projects.filter((p) => p.status === "completed");

  if (loading) {
    return (
      <div style={{ display: "flex", background: "#f4f7f6", minHeight: "100vh" }}>
        <Sidebar role="student" />
        <div style={{ flex: 1, marginLeft: "0 auto", padding: "40px", textAlign: "center" }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        background: "#f4f7f6",
        minHeight: "100vh",
      }}
    >
      <Sidebar role="student" />

      <div style={{ flex: 1, marginLeft: "0 auto", padding: "40px" }}>
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ marginBottom: "8px" }}>My Projects</h2>
          <p style={{ color: "#666" }}>Track your project progress and mentor feedback</p>
        </div>

        {/* Stats Summary */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginBottom: "30px"
        }}>
          <div style={{
            background: "white",
            padding: "15px",
            borderRadius: "10px",
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#f39c12" }}>
              {suggested.length}
            </div>
            <div style={{ color: "#666", fontSize: "13px" }}>Suggested Projects</div>
          </div>
          <div style={{
            background: "white",
            padding: "15px",
            borderRadius: "10px",
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2ecc71" }}>
              {completed.length}
            </div>
            <div style={{ color: "#666", fontSize: "13px" }}>Completed Projects</div>
          </div>
          <div style={{
            background: "white",
            padding: "15px",
            borderRadius: "10px",
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#3498db" }}>
              {projects.filter(p => p.mentor_feedback_given).length}
            </div>
            <div style={{ color: "#666", fontSize: "13px" }}>Mentor Feedback Received</div>
          </div>
        </div>

        {/* ================= SUGGESTED ================= */}
        <Section title="Suggested Projects" color="#f39c12" icon="💡">
          {suggested.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", background: "#f9fafb", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>📭</div>
              <p>No suggested projects yet.</p>
              <p style={{ fontSize: "13px", color: "#666" }}>Complete an assessment to get project recommendations!</p>
            </div>
          )}

          {suggested.map((proj) => (
            <ProjectCard
              key={proj._id}
              proj={proj}
              onView={() => navigate(`/project-task/${proj._id}`)}
            />
          ))}
        </Section>

        {/* ================= COMPLETED ================= */}
        <Section title="Completed Projects" color="#2ecc71" icon="✅">
          {completed.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", background: "#f9fafb", borderRadius: "10px" }}>
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎯</div>
              <p>No completed projects yet.</p>
              <p style={{ fontSize: "13px", color: "#666" }}>Submit your solutions and get AI feedback to complete projects!</p>
            </div>
          )}

          {completed.map((proj) => (
            <ProjectCard
              key={proj._id}
              proj={proj}
              onView={() => navigate(`/project-task/${proj._id}`)}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

/* ================= SECTION COMPONENT ================= */
function Section({ title, color, icon, children }) {
  return (
    <div style={{ marginTop: "30px" }}>
      <h3 style={{ 
        borderLeft: `5px solid ${color}`, 
        paddingLeft: "15px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <span>{icon}</span> {title}
        <span style={{ 
          marginLeft: "10px", 
          fontSize: "14px", 
          color: "#666",
          fontWeight: "normal"
        }}>
        </span>
      </h3>

      <div
        style={{
          display: "grid",
          gap: "20px",
          marginTop: "15px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ================= PROJECT CARD COMPONENT (FIXED) ================= */
function ProjectCard({ proj, onView }) {
  const hasMentorFeedback = proj.mentor_feedback_given;
  const hasAIFeedback = proj.feedback !== null && proj.feedback !== undefined;
  
  // ===== FIX: Use consistent scores =====
  // AI Score: Use pre-calculated ai_score or calculate from task evaluations
  const aiScore = proj.ai_score || proj.score || 0;
  
  // Final Score: Use mentor override if available
  const finalScore = proj.final_score !== undefined && proj.final_score !== null 
    ? proj.final_score 
    : aiScore;
  
  // Check if mentor has overridden the score
  const hasMentorOverride = hasMentorFeedback && proj.final_score !== undefined && proj.final_score !== proj.ai_score;
  // ===== END FIX =====
  
  // Task progress calculations
  const hasTasks = proj.tasks && proj.tasks.length > 0;
  const taskEvaluations = proj.task_evaluations || [];
  const evaluatedTasks = taskEvaluations.filter(e => e !== null && e !== undefined).length;
  const totalTasks = proj.tasks ? proj.tasks.length : 0;
  const taskProgress = totalTasks > 0 ? (evaluatedTasks / totalTasks) * 100 : 0;
  
  // Mentor task feedback
  const mentorTaskFeedback = proj.mentor_task_feedback || [];
  const mentorCheckedTasks = mentorTaskFeedback.filter(f => f !== null && f !== undefined).length;
  
  // ===== Get color based on score =====
  const getScoreColor = (score) => {
    if (score >= 70) return "#10b981";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  };
  // ===== End helper =====
  
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        transition: "transform 0.2s, boxShadow 0.2s",
        cursor: "pointer",
        borderLeft: hasMentorFeedback ? "4px solid #f59e0b" : hasAIFeedback ? "4px solid #10b981" : "4px solid #3498db"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      }}
      onClick={onView}
    >
      {/* Header with Title and Scores */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", color: "#333" }}>{proj.title}</h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* ===== FIX: AI Score with correct color ===== */}
          <span
            style={{
              background: "#e8f4fd",
              color: getScoreColor(aiScore),
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "bold",
              display: "inline-block"
            }}
          >
            🤖 AI: {aiScore}%
          </span>
          {/* ===== END FIX ===== */}
          
          {/* ===== FIX: Mentor Score with override indicator ===== */}
          {hasMentorFeedback && (
            <span
              style={{
                background: "#fef3c7",
                color: hasMentorOverride ? "#f59e0b" : "#10b981",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "bold",
                display: "inline-block"
              }}
            >
              👨‍🏫 Mentor: {finalScore}%
              {hasMentorOverride && " (Override)"}
            </span>
          )}
          {/* ===== END FIX ===== */}
        </div>
      </div>

      {/* Status Badge */}
      <p style={{ margin: "5px 0" }}>
        Status:{" "}
        <b
          style={{
            color: proj.status === "completed" ? "#2ecc71" : "#f39c12",
            background: proj.status === "completed" ? "#d4edda" : "#fef3c7",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px"
          }}
        >
          {proj.status === "completed" ? "✓ Completed" : "⏳ Suggested"}
        </b>
      </p>

      {/* Task Progress Bar */}
      {hasTasks && (
        <div style={{ margin: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#666" }}>
            <span>📋 Task Progress</span>
            <span>
              {evaluatedTasks} of {totalTasks} tasks evaluated
              {mentorCheckedTasks > 0 && ` (${mentorCheckedTasks} mentor checked)`}
            </span>
          </div>
          <div style={{ 
            width: "100%", 
            height: "6px", 
            background: "#e9ecef", 
            borderRadius: "3px",
            marginTop: "4px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${taskProgress}%`,
              height: "100%",
              background: taskProgress === 100 ? "linear-gradient(90deg, #10b981, #059669)" : "linear-gradient(90deg, #667eea, #764ba2)",
              transition: "width 0.3s ease"
            }}></div>
          </div>
        </div>
      )}

      {/* Project Metadata */}
      <div style={{ display: "flex", gap: "15px", margin: "10px 0", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", color: "#666" }}>
          <strong>Domain:</strong> {proj.domain || "N/A"}
        </span>
        <span style={{ fontSize: "13px", color: "#666" }}>
          <strong>Level:</strong> {proj.level || "N/A"}
        </span>
        {proj.mentor_rating && (
          <span style={{ fontSize: "13px", color: "#f59e0b" }}>
            <strong>Mentor Rating:</strong> {"⭐".repeat(proj.mentor_rating)} ({proj.mentor_rating}/5)
          </span>
        )}
      </div>

      {/* AI FEEDBACK BADGE */}
      {hasAIFeedback && !hasMentorFeedback && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            background: "#ecfdf5",
            borderRadius: "8px",
            borderLeft: "3px solid #10b981",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🤖</span>
            <span style={{ fontSize: "13px", fontWeight: "500", color: "#065f46" }}>
              AI Feedback Available ({evaluatedTasks} tasks evaluated)
            </span>
          </div>
        </div>
      )}

      {/* MENTOR FEEDBACK AVAILABLE BADGE */}
      {hasMentorFeedback && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            background: "#fef3c7",
            borderRadius: "8px",
            borderLeft: "3px solid #f59e0b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span>👨‍🏫</span>
            <span style={{ fontSize: "13px", fontWeight: "500", color: "#92400e" }}>
              Mentor Feedback Available!
            </span>
            {proj.mentor_rating && (
              <span style={{ fontSize: "12px", color: "#b45309" }}>
                Rating: {"⭐".repeat(proj.mentor_rating)}
              </span>
            )}
          </div>
          {proj.mentor_feedback_text && (
            <p style={{ 
              fontSize: "12px", 
              color: "#666", 
              marginTop: "6px",
              marginBottom: 0,
              fontStyle: "italic"
            }}>
              "{proj.mentor_feedback_text.substring(0, 100)}..."
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            padding: "8px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          {hasTasks ? "📝 View Tasks" : "🚀 Open Workspace"}
        </button>
        
        {hasMentorFeedback && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
              setTimeout(() => {
                const feedbackSection = document.getElementById('mentor-feedback-section');
                if (feedbackSection) feedbackSection.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            style={{
              background: "white",
              color: "#f59e0b",
              border: "1px solid #f59e0b",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fef3c7";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            👁️ View Feedback
          </button>
        )}
      </div>
    </div>
  );
}

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
if (!document.querySelector('#student-project-spinner-styles')) {
  styleSheet.id = 'student-project-spinner-styles';
  document.head.appendChild(styleSheet);
}