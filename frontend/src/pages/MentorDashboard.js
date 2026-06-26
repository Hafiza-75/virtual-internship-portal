import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
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

export default function MentorDashboard() {
  const [pendingProjects, setPendingProjects] = useState([]);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [matchedProjects, setMatchedProjects] = useState([]);
  const [stats, setStats] = useState({
    pending_reviews: 0,
    completed_reviews: 0,
    total_matched: 0
  });
  const [loading, setLoading] = useState(true);

  const email = localStorage.getItem("email");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(`/api/mentor/matched-projects/?email=${email}`);
      
      // All projects with match_score > 0 (any skill match)
      const allProjects = res.data.projects || [];
      
      // Filter: Only show projects with any match (match_score > 0)
      const matched = allProjects.filter(p => p.match_score > 0);
      const pending = matched.filter(p => !p.reviewed);
      const completed = matched.filter(p => p.reviewed);
      
      setMatchedProjects(matched);
      setPendingProjects(pending);
      setCompletedProjects(completed);
      
      setStats({
        pending_reviews: pending.length,
        completed_reviews: completed.length,
        total_matched: matched.length
      });
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (!token || role !== "mentor") {
      navigate("/login");
      return;
    }
    
    fetchDashboardData();
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [token, role, navigate, fetchDashboardData]);

  // ✅ SINGLE FUNCTION - Works for both pending and completed
  const openWorkspace = (project) => {
    if (!project._id || project._id.length !== 24) {
      console.error("Invalid project ID:", project._id);
      alert("Invalid project ID. Please refresh and try again.");
      return;
    }
    console.log("Opening workspace for project:", project._id);
    navigate(`/mentor-workspace/${project._id}`);
  };

  // Stats Cards 
  const statsCards = [
    { label: "Matched Students", count: stats.total_matched, color: "#3498db" },
    { label: "Pending Reviews", count: stats.pending_reviews, color: "#e74c3c"},
    { label: "Completed Reviews", count: stats.completed_reviews, color: "#2ecc71" }
  ];

  // Render matched projects section
  const renderMatchedProjects = () => (
    <div style={tableStyles.container}>
      <h3 style={tableStyles.title}>
        🎯 Matched Projects (Skills Match)
        <span style={tableStyles.count}>
          ({matchedProjects.length} projects)
        </span>
      </h3>

      {matchedProjects.length === 0 ? (
        <div style={tableStyles.emptyState}>
          <div style={tableStyles.emptyIcon}>🔍</div>
          <p style={tableStyles.emptyText}>
            No matched projects yet. Update your skills in profile to match with student projects!
          </p>
        </div>
      ) : (
        <div style={tableStyles.tableWrapper}>
          <table style={tableStyles.table}>
            <thead>
              <tr style={tableStyles.tableHeader}>
                <th style={tableStyles.th}>Student</th>
                <th style={tableStyles.th}>Project</th>
                <th style={tableStyles.th}>Domain</th>
                <th style={tableStyles.th}>Match Score</th>
                <th style={tableStyles.th}>Status</th>
                <th style={tableStyles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {matchedProjects.map((project, index) => (
                <tr 
                  key={project._id || index} 
                  style={tableStyles.tableRow}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fafafa"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                >
                  <td style={tableStyles.td}>
                    <div>
                      {project.student_name}
                      <div style={tableStyles.subText}>
                        {project.student_email}
                      </div>
                    </div>
                  </td>
                  <td style={tableStyles.td}>
                    <div>
                      <strong>{project.title}</strong>
                      <div style={tableStyles.subText}>
                        {project.level}
                      </div>
                    </div>
                  </td>
                  <td style={tableStyles.td}>
                    <span style={tableStyles.domainBadge}>
                      {project.domain}
                    </span>
                  </td>
                  <td style={tableStyles.td}>
                    <span style={{
                      ...tableStyles.scoreBadge,
                      background: project.match_score >= 50 ? "#d4edda" : "#fff3cd",
                      color: project.match_score >= 50 ? "#155724" : "#856404"
                    }}>
                      {project.match_score || 0}% Match
                    </span>
                  </td>
                  <td style={tableStyles.td}>
                    <span style={{
                      ...tableStyles.statusBadge,
                      background: project.reviewed ? "#d4edda" : "#fff3cd",
                      color: project.reviewed ? "#155724" : "#856404"
                    }}>
                      {project.reviewed ? "✅ Reviewed" : "⏳ Pending"}
                    </span>
                  </td>
                  <td style={tableStyles.td}>
                    {/* ✅ SINGLE BUTTON - Always opens workspace */}
                    <button
                      onClick={() => openWorkspace(project)}
                      style={{
                        ...tableStyles.openButton,
                        background: project.reviewed 
                          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      {project.reviewed ? "👁️ View Feedback" : "🚀 Review Project"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render project table (pending and completed)
  const renderProjectTable = (projects, type) => (
    <div style={tableStyles.container}>
      <h3 style={tableStyles.title}>
        {type === "pending" ? "⏳ Pending Reviews" : "✅ Completed Reviews"}
        <span style={tableStyles.count}>
          ({projects.length} projects)
        </span>
      </h3>

      {projects.length === 0 ? (
        <div style={tableStyles.emptyState}>
          <div style={tableStyles.emptyIcon}>
            {type === "pending" ? "📭" : "🎉"}
          </div>
          <p style={tableStyles.emptyText}>
            {type === "pending" 
              ? "No pending reviews. New projects will appear when students with matching skills complete them."
              : "No completed reviews yet. Start reviewing student projects!"}
          </p>
        </div>
      ) : (
        <div style={tableStyles.tableWrapper}>
          <table style={tableStyles.table}>
            <thead>
              <tr style={tableStyles.tableHeader}>
                <th style={tableStyles.th}>Student</th>
                <th style={tableStyles.th}>Project</th>
                <th style={tableStyles.th}>Domain</th>
                <th style={tableStyles.th}>Score</th>
                <th style={tableStyles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, index) => (
                <tr 
                  key={project._id || index} 
                  style={tableStyles.tableRow}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fafafa"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                >
                  <td style={tableStyles.td}>
                    <div>
                      {project.student_name}
                      <div style={tableStyles.subText}>
                        {project.student_email}
                      </div>
                    </div>
                  </td>
                  <td style={tableStyles.td}>
                    <div>
                      <strong>{project.title}</strong>
                      <div style={tableStyles.subText}>
                        {project.level}
                      </div>
                    </div>
                  </td>
                  <td style={tableStyles.td}>
                    <span style={tableStyles.domainBadge}>
                      {project.domain}
                    </span>
                  </td>
                  <td style={tableStyles.td}>
                    <span style={{
                      ...tableStyles.scoreBadge,
                      background: project.final_score >= 70 ? "#d4edda" : project.final_score >= 40 ? "#fff3cd" : "#f8d7da",
                      color: project.final_score >= 70 ? "#155724" : project.final_score >= 40 ? "#856404" : "#721c24"
                    }}>
                      {project.final_score || project.score || 0}/100
                    </span>
                    {project.mentor_override_score && (
                      <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
                        Mentor: {project.mentor_override_score}/100
                      </div>
                    )}
                  </td>
                  <td style={tableStyles.td}>
                    {/* ✅ SINGLE BUTTON - Always opens workspace for both pending and completed */}
                    <button
                      onClick={() => openWorkspace(project)}
                      style={{
                        ...tableStyles.openButton,
                        background: type === "completed" 
                          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      {type === "completed" ? "👁️ View Feedback" : "🚀 Open Workspace"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: "flex", background: "#f4f7f6", minHeight: "100vh" }}>
        <Sidebar role="mentor" />
        <div style={{ flex: 1, marginLeft: "0 auto", padding: "40px", textAlign: "center" }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
      <Sidebar role="mentor" />

      <div style={{ flex: 1, padding: "30px", marginLeft: "0 auto" }}>
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ marginBottom: "8px" }}>Mentor Insights Dashboard</h2>
          <p style={{ color: "#666" }}>Review student projects and provide valuable feedback</p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px"
        }}>
          {statsCards.map((s, i) => (
            <div key={i} style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              borderTop: `4px solid ${s.color}`,
              transition: "transform 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ color: "#777", margin: 0, fontSize: "14px", fontWeight: "500" }}>
                    {s.label}
                  </p>
                  <h1 style={{ margin: "12px 0 0", color: "#222", fontSize: "36px" }}>
                    {s.count}
                  </h1>
                </div>
                <div style={{ fontSize: "40px", opacity: 0.3 }}>
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Matched Projects Section */}
        {renderMatchedProjects()}

        {/* Pending Reviews Table */}
        {renderProjectTable(pendingProjects, "pending")}

        {/* Completed Reviews Table */}
        {renderProjectTable(completedProjects, "completed")}
      </div>
    </div>
  );
}

// ================= STYLES =================

// Animated Dotted Loading Spinner Styles
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

// Table Styles
const tableStyles = {
  container: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginTop: "30px",
  },
  title: {
    marginBottom: "20px",
  },
  count: {
    marginLeft: "10px",
    fontSize: "14px",
    color: "#666",
    fontWeight: "normal",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "10px",
  },
  emptyText: {
    color: "#666",
    fontSize: "16px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    backgroundColor: "#f9fafb",
    borderBottom: "2px solid #e5e7eb",
  },
  th: {
    padding: "15px",
    textAlign: "left",
  },
  tableRow: {
    borderBottom: "1px solid #e5e7eb",
    transition: "background-color 0.2s",
  },
  td: {
    padding: "15px",
  },
  subText: {
    fontSize: "12px",
    color: "#666",
    marginTop: "4px",
  },
  domainBadge: {
    backgroundColor: "#e8f4fd",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
  },
  scoreBadge: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "bold",
    display: "inline-block",
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    display: "inline-block",
  },
  openButton: {
    color: "white",
    border: "none",
    padding: "8px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "transform 0.2s",
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
document.head.appendChild(styleSheet);