import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
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
    <p style={spinnerStyles.text}>Loading admin dashboard...</p>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_mentors: 0,
    total_projects: 0,
    system_status: "Loading..."
  });

  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsRes, reportsRes, analyticsRes] = await Promise.all([
        API.get("/api/admin/stats/"),
        API.get("/api/admin/reports/"),
        API.get("/api/analytics/admin-stats/")
      ]);

      setStats(statsRes.data);
      setReports(reportsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setError("Failed to load dashboard data. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate Reports Function
  const generateReports = async () => {
    setGenerating(true);
    try {
      const res = await API.post("/api/admin/generate-reports/");
      alert(res.data.message);
      fetchData();
    } catch (err) {
      console.error("Error generating reports:", err);
      alert("Failed to generate reports");
    } finally {
      setGenerating(false);
    }
  };

  // Delete Report
  const deleteReport = async (reportId) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        await API.delete(`/api/admin/reports/delete/${reportId}/`);
        setReports(reports.filter(r => r.id !== reportId));
        alert("Report deleted successfully");
      } catch (err) {
        console.error("Error deleting report:", err);
        alert("Failed to delete report");
      }
    }
  };

  const statCards = [
    { label: "Total Students", count: stats.total_students, color: "#3498db"},
    { label: "Total Mentors", count: stats.total_mentors, color: "#9b59b6"},
    { label: "Projects Active", count: stats.total_projects, color: "#e67e22"},
    { label: "System Uptime", count: stats.system_status, color: "#2ecc71"}
  ];

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar role="admin" />
        <div style={styles.content}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <Sidebar role="admin" />
        <div style={styles.content}>
          <div style={styles.errorState}>
            <div style={styles.errorIcon}>⚠️</div>
            <h3>Error Loading Dashboard</h3>
            <p style={styles.errorText}>{error}</p>
            <button onClick={() => fetchData()} style={styles.retryBtn}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar role="admin" />
      
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2>Admin Global Analytics</h2>
            <p>Real-time reports and platform activity from MongoDB Atlas.</p>
          </div>
          <button
            onClick={generateReports}
            disabled={generating}
            style={styles.generateBtn}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#219a52"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#27ae60"}
          >
            {generating ? "⏳ Generating..." : "📊 Generate Reports"}
          </button>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <div key={i} style={{...styles.statCard, borderTop: `4px solid ${s.color}`}}>
              <div style={styles.statCardContent}>
                <div>
                  <p style={styles.statLabel}>{s.label}</p>
                  <h1 style={styles.statValue}>{s.count}</h1>
                </div>
                <div style={styles.statIcon}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Tabs */}
        <div style={styles.tabs}>
          <button 
            onClick={() => setActiveTab("overview")}
            style={{...styles.tab, ...(activeTab === "overview" ? styles.tabActive : {})}}
          >
            📊 Overview
          </button>
          <button 
            onClick={() => setActiveTab("reports")}
            style={{...styles.tab, ...(activeTab === "reports" ? styles.tabActive : {})}}
          >
            📋 Reports
          </button>
          <button 
            onClick={() => setActiveTab("analytics")}
            style={{...styles.tab, ...(activeTab === "analytics" ? styles.tabActive : {})}}
          >
            📈 Analytics
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && analytics && (
          <div style={styles.analyticsGrid}>
            <div style={styles.analyticsCard}>
              <h4>📊 Platform Summary</h4>
              <div style={styles.summaryStats}>
                <div style={styles.summaryItem}>
                  <span>Completion Rate</span>
                  <strong>{analytics.completion_rate || 0}%</strong>
                </div>
                <div style={styles.summaryItem}>
                  <span>Average Score</span>
                  <strong>{analytics.average_score || 0}%</strong>
                </div>
                <div style={styles.summaryItem}>
                  <span>Completed Projects</span>
                  <strong>{analytics.completed_projects || 0}</strong>
                </div>
              </div>
            </div>

            <div style={styles.analyticsCard}>
              <h4>📈 Recent Activity (30 days)</h4>
              <div style={styles.activityStats}>
                <div style={styles.activityItem}>
                  <span>📁 New Projects</span>
                  <strong>{analytics.recent_activity?.projects_last_30_days || 0}</strong>
                </div>
                <div style={styles.activityItem}>
                  <span>💬 Feedbacks Given</span>
                  <strong>{analytics.recent_activity?.feedbacks_last_30_days || 0}</strong>
                </div>
              </div>
            </div>

            <div style={styles.analyticsCard}>
              <h4>🏆 Top Mentors</h4>
              <div style={styles.topMentorsList}>
                {analytics.mentor_stats?.slice(0, 5).map((mentor, idx) => (
                  <div key={idx} style={styles.topMentorItem}>
                    <span>{idx + 1}. {mentor.name}</span>
                    <strong>{mentor.feedbacks_given} feedbacks</strong>
                  </div>
                ))}
                {(!analytics.mentor_stats || analytics.mentor_stats.length === 0) && (
                  <p style={styles.noDataText}>No mentor data available</p>
                )}
              </div>
            </div>

            <div style={styles.analyticsCard}>
              <h4>🎯 Domain Distribution</h4>
              <div style={styles.domainList}>
                {analytics.domain_distribution?.map((domain, idx) => (
                  <div key={idx} style={styles.domainItem}>
                    <span>{domain._id}</span>
                    <strong>{domain.count} projects</strong>
                  </div>
                ))}
                {(!analytics.domain_distribution || analytics.domain_distribution.length === 0) && (
                  <p style={styles.noDataText}>No domain data available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div style={styles.tableContainer}>
            <div style={styles.tableHeader}>
              <h3>AI Assessment Reports</h3>
              <div style={styles.reportCount}>Total Reports: {reports.length}</div>
            </div>
            
            {reports.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📊</div>
                <h4>No Reports Found</h4>
                <p>Click "Generate Reports" to create reports from completed projects.</p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Student</th>
                      <th style={styles.th}>Project</th>
                      <th style={styles.th}>Domain</th>
                      <th style={styles.th}>Score</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report, idx) => (
                      <tr key={report.id || idx} style={styles.tableRow}>
                        <td style={styles.td}>
                          <strong>{report.student_name || "N/A"}</strong>
                          <div style={styles.subText}>{report.student_email}</div>
                        </td>
                        <td style={styles.td}>{report.project_title}</td>
                        <td style={styles.td}>{report.domain || "N/A"}</td>
                        <td style={styles.td}>
                          <span style={getScoreStyle(report.ai_score)}>
                            {report.ai_score || 0}%
                          </span>
                        </td>
                        <td style={styles.td}>{new Date(report.created_at).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <button onClick={() => deleteReport(report.id)} style={styles.deleteBtn}>
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab - Detailed */}
        {activeTab === "analytics" && analytics && (
          <div style={styles.analyticsGrid}>
            <div style={styles.analyticsCard}>
              <h4>📈 Performance Metrics</h4>
              <div style={styles.metricsList}>
                <div style={styles.metricItem}>
                  <span>Total Students</span>
                  <strong>{analytics.total_students || 0}</strong>
                </div>
                <div style={styles.metricItem}>
                  <span>Total Mentors</span>
                  <strong>{analytics.total_mentors || 0}</strong>
                </div>
                <div style={styles.metricItem}>
                  <span>Total Projects</span>
                  <strong>{analytics.total_projects || 0}</strong>
                </div>
                <div style={styles.metricItem}>
                  <span>Completed Projects</span>
                  <strong>{analytics.completed_projects || 0}</strong>
                </div>
                <div style={styles.metricItem}>
                  <span>Completion Rate</span>
                  <strong>{analytics.completion_rate || 0}%</strong>
                </div>
                <div style={styles.metricItem}>
                  <span>Average Score</span>
                  <strong>{analytics.average_score || 0}%</strong>
                </div>
              </div>
            </div>

            <div style={styles.analyticsCard}>
              <h4>👨‍🏫 Mentor Performance</h4>
              <div style={styles.mentorList}>
                {analytics.mentor_stats?.map((mentor, idx) => (
                  <div key={idx} style={styles.mentorItem}>
                    <span>{mentor.name}</span>
                    <span style={styles.feedbackCount}>{mentor.feedbacks_given} feedbacks</span>
                  </div>
                ))}
                {(!analytics.mentor_stats || analytics.mentor_stats.length === 0) && (
                  <p style={styles.noDataText}>No mentor data available</p>
                )}
              </div>
            </div>

            <div style={styles.analyticsCard}>
              <h4>🎯 Domain Insights</h4>
              <div style={styles.domainInsights}>
                {analytics.domain_distribution?.map((domain, idx) => (
                  <div key={idx} style={styles.domainInsightItem}>
                    <span>{domain._id}</span>
                    <div style={styles.progressBar}>
                      <div style={{...styles.progressFill, width: `${Math.min(100, (domain.count / (analytics.total_projects || 1)) * 100)}%`}}></div>
                    </div>
                    <span style={styles.domainCount}>{domain.count} projects</span>
                  </div>
                ))}
                {(!analytics.domain_distribution || analytics.domain_distribution.length === 0) && (
                  <p style={styles.noDataText}>No domain data available</p>
                )}
              </div>
            </div>

            <div style={styles.analyticsCard}>
              <h4>📅 System Info</h4>
              <div style={styles.systemInfo}>
                <div style={styles.systemItem}>
                  <span>Last Updated</span>
                  <strong>{new Date(analytics.timestamp).toLocaleString()}</strong>
                </div>
                <div style={styles.systemItem}>
                  <span>System Status</span>
                  <strong style={{color: "#27ae60"}}>● Operational</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Functions
const getScoreStyle = (score) => ({
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "bold",
  display: "inline-block",
  backgroundColor: score >= 70 ? "#d4edda" : score >= 50 ? "#fff3cd" : "#f8d7da",
  color: score >= 70 ? "#155724" : score >= 50 ? "#856404" : "#721c24"
});

// Styles
const styles = {
  container: {
    display: "flex",
    backgroundColor: "#f4f7f6",
    minHeight: "100vh",
  },
  content: {
    flex: 1,
    padding: "30px",
    maxWidth: "1200px",
    margin: "0 auto",
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    flexWrap: "wrap",
    gap: "15px",
  },
  generateBtn: {
    padding: "10px 20px",
    backgroundColor: "#27ae60",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  statCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    transition: "transform 0.2s",
  },
  statCardContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    color: "#777",
    margin: "0 0 8px 0",
    fontSize: "14px",
    fontWeight: "500",
  },
  statValue: {
    margin: 0,
    fontSize: "36px",
    color: "#2c3e50",
  },
  statIcon: {
    fontSize: "40px",
    opacity: 0.3,
  },
  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    borderBottom: "2px solid #e9ecef",
  },
  tab: {
    padding: "10px 20px",
    background: "none",
    border: "none",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    color: "#6c757d",
  },
  tabActive: {
    color: "#667eea",
    borderBottom: "3px solid #667eea",
  },
  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "20px",
  },
  analyticsCard: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  summaryStats: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    marginTop: "10px",
  },
  summaryItem: {
    textAlign: "center",
    flex: 1,
    span: { fontSize: "12px", color: "#666", display: "block", marginBottom: "5px" },
    strong: { fontSize: "20px", color: "#2c3e50" },
  },
  activityStats: {
    display: "flex",
    gap: "20px",
    marginTop: "10px",
  },
  activityItem: {
    flex: 1,
    textAlign: "center",
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    span: { fontSize: "12px", color: "#666", display: "block", marginBottom: "5px" },
    strong: { fontSize: "18px", color: "#2c3e50" },
  },
  topMentorsList: {
    marginTop: "10px",
  },
  topMentorItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
    span: { fontSize: "13px" },
    strong: { fontSize: "13px", color: "#f59e0b" },
  },
  domainList: {
    marginTop: "10px",
  },
  domainItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
    span: { fontSize: "13px" },
    strong: { fontSize: "13px", color: "#3498db" },
  },
  metricsList: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "10px",
    marginTop: "10px",
  },
  metricItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px",
    backgroundColor: "#f8f9fa",
    borderRadius: "6px",
    span: { fontSize: "12px", color: "#666" },
    strong: { fontSize: "14px", color: "#2c3e50" },
  },
  mentorList: {
    marginTop: "10px",
    maxHeight: "250px",
    overflowY: "auto",
  },
  mentorItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
    span: { fontSize: "13px" },
  },
  feedbackCount: {
    fontSize: "12px",
    color: "#27ae60",
    fontWeight: "bold",
  },
  domainInsights: {
    marginTop: "10px",
  },
  domainInsightItem: {
    marginBottom: "12px",
    span: { fontSize: "12px", display: "block", marginBottom: "4px", color: "#666" },
  },
  progressBar: {
    height: "6px",
    backgroundColor: "#e9ecef",
    borderRadius: "3px",
    overflow: "hidden",
    margin: "5px 0",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#667eea",
    borderRadius: "3px",
  },
  domainCount: {
    fontSize: "11px",
    color: "#999",
  },
  systemInfo: {
    marginTop: "10px",
  },
  systemItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
    span: { fontSize: "12px", color: "#666" },
    strong: { fontSize: "13px" },
  },
  tableContainer: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    marginTop: "10px",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    flexWrap: "wrap",
    gap: "10px",
  },
  reportCount: {
    fontSize: "13px",
    color: "#666",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeaderRow: {
    backgroundColor: "#f8f9fa",
    borderBottom: "2px solid #e5e7eb",
  },
  th: {
    padding: "12px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "600",
  },
  tableRow: {
    borderBottom: "1px solid #eee",
  },
  td: {
    padding: "12px",
    fontSize: "13px",
  },
  subText: {
    fontSize: "11px",
    color: "#999",
    marginTop: "2px",
  },
  deleteBtn: {
    color: "#e74c3c",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "14px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "15px",
    opacity: 0.5,
  },
  errorState: {
    textAlign: "center",
    padding: "60px 20px",
  },
  errorIcon: {
    fontSize: "48px",
    marginBottom: "15px",
  },
  errorText: {
    color: "#e74c3c",
    marginBottom: "20px",
  },
  retryBtn: {
    padding: "10px 20px",
    backgroundColor: "#3498db",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  noDataText: {
    color: "#999",
    fontSize: "13px",
    textAlign: "center",
    padding: "20px",
  },
};

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

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes dotPulse {
    0%,80%,100% { transform: scale(0.6); opacity: 0.3; }
    40% { transform: scale(1); opacity: 1; }
  }
`;
if (!document.querySelector('#admin-dashboard-styles')) {
  styleSheet.id = 'admin-dashboard-styles';
  document.head.appendChild(styleSheet);
}