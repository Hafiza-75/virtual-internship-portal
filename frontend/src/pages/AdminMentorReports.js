import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import API from "../services/api";

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
    <p style={spinnerStyles.text}>Loading mentor reports...</p>
  </div>
);

export default function AdminMentorReports() {
  const [mentors, setMentors] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mentors");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mentorsRes, feedbacksRes, statsRes] = await Promise.all([
        API.get("/api/admin/mentor-stats/"),
        API.get("/api/admin/mentor-feedbacks/"),
        API.get("/api/admin/platform-stats/")
      ]);
      setMentors(mentorsRes.data);
      setFeedbacks(feedbacksRes.data);
      setPlatformStats(statsRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Failed to load mentor reports");
    } finally {
      setLoading(false);
    }
  };

  const deleteFeedback = async (feedbackId) => {
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      try {
        await API.delete(`/api/admin/mentor-feedback/delete/${feedbackId}/`);
        setFeedbacks(feedbacks.filter(f => f.id !== feedbackId));
        alert("Feedback deleted successfully");
      } catch (err) {
        alert("Failed to delete feedback");
      }
    }
  };

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

  return (
    <div style={styles.container}>
      <Sidebar role="admin" />
      
      <div style={styles.content}>
        <h2>Mentor Performance Reports</h2>
        <p>Track mentor activity, feedback quality, and student satisfaction.</p>

        {/* Platform Stats Cards */}
        {platformStats && (
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}></div>
              <div>
                <div style={styles.statValue}>{platformStats.total_mentors}</div>
                <div style={styles.statLabel}>Total Mentors</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}></div>
              <div>
                <div style={styles.statValue}>{platformStats.total_mentor_feedbacks}</div>
                <div style={styles.statLabel}>Total Feedbacks</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}></div>
              <div>
                <div style={styles.statValue}>{platformStats.avg_mentor_rating}/5</div>
                <div style={styles.statLabel}>Avg Mentor Rating</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}></div>
              <div>
                <div style={styles.statValue}>{platformStats.total_students}</div>
                <div style={styles.statLabel}>Students Served</div>
              </div>
            </div>
          </div>
        )}

        {/* Top Mentors Section */}
        {platformStats?.top_mentors?.length > 0 && (
          <div style={styles.topMentorsBox}>
            <h3>🏆 Top Performing Mentors</h3>
            <div style={styles.topMentorsList}>
              {platformStats.top_mentors.map((mentor, idx) => (
                <div key={idx} style={styles.topMentorCard}>
                  <div style={styles.topMentorRank}>#{idx + 1}</div>
                  <div style={styles.topMentorName}>{mentor.name}</div>
                  <div style={styles.topMentorStats}>{mentor.feedbacks_given} feedbacks</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          <button 
            onClick={() => setActiveTab("mentors")}
            style={{...styles.tab, ...(activeTab === "mentors" ? styles.tabActive : {})}}
          >
             Mentor Rankings
          </button>
          <button 
            onClick={() => setActiveTab("feedbacks")}
            style={{...styles.tab, ...(activeTab === "feedbacks" ? styles.tabActive : {})}}
          >
             All Mentor Feedbacks
          </button>
        </div>

        {/* Mentors Table */}
        {activeTab === "mentors" && (
          <div style={styles.tableContainer}>
            <h3>Mentor Performance Rankings</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Rank</th>
                    <th style={styles.th}>Mentor Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Skills</th>
                    <th style={styles.th}>Feedbacks Given</th>
                    <th style={styles.th}>Avg Rating</th>
                    <th style={styles.th}>Students Mentored</th>
                  </tr>
                </thead>
                <tbody>
                  {mentors.slice().sort((a, b) => b.total_feedbacks - a.total_feedbacks).map((mentor, idx) => (
                    <tr key={mentor.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <span style={rankBadge(idx + 1)}>#{idx + 1}</span>
                      </td>
                      <td style={styles.td}><strong>{mentor.name}</strong></td>
                      <td style={styles.td}>{mentor.email}</td>
                      <td style={styles.td}>
                        {mentor.skills?.slice(0, 3).map((skill, i) => (
                          <span key={i} style={styles.skillBadge}>{skill}</span>
                        ))}
                        {mentor.skills?.length > 3 && `+${mentor.skills.length - 3}`}
                      </td>
                      <td style={styles.td}>{mentor.total_feedbacks}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.ratingBadge,
                          backgroundColor: mentor.avg_rating >= 4 ? "#d4edda" : mentor.avg_rating >= 3 ? "#fff3cd" : "#f8d7da",
                          color: mentor.avg_rating >= 4 ? "#155724" : mentor.avg_rating >= 3 ? "#856404" : "#721c24"
                        }}>
                          {"⭐".repeat(Math.round(mentor.avg_rating))} {mentor.avg_rating}
                        </span>
                      </td>
                      <td style={styles.td}>{mentor.students_mentored}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feedbacks Table */}
        {activeTab === "feedbacks" && (
          <div style={styles.tableContainer}>
            <h3>All Mentor Feedbacks</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Mentor</th>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Project</th>
                    <th style={styles.th}>Rating</th>
                    <th style={styles.th}>Feedback</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((fb) => (
                    <tr key={fb.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        {new Date(fb.created_at).toLocaleDateString()}
                      </td>
                      <td style={styles.td}>
                        <strong>{fb.mentor_name}</strong>
                        <div style={styles.subText}>{fb.mentor_email}</div>
                      </td>
                      <td style={styles.td}>
                        {fb.student_name}
                        <div style={styles.subText}>{fb.student_email}</div>
                      </td>
                      <td style={styles.td}>{fb.project_title}</td>
                      <td style={styles.td}>
                        <span style={styles.ratingSmall}>
                          {"⭐".repeat(fb.rating)} ({fb.rating}/5)
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.feedbackPreview}>
                          {fb.feedback_text.substring(0, 60)}...
                        </div>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => deleteFeedback(fb.id)}
                          style={styles.deleteBtn}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for rank badge styling
const rankBadge = (rank) => {
  let color = "#e9ecef";
  let textColor = "#666";
  if (rank === 1) {
    color = "#ffd700";
    textColor = "#2c3e50";
  } else if (rank === 2) {
    color = "#c0c0c0";
    textColor = "#2c3e50";
  } else if (rank === 3) {
    color = "#cd7f32";
    textColor = "#2c3e50";
  }
  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: color,
    color: textColor,
  };
};

const styles = {
  container: {
    display: "flex",
    backgroundColor: "#f4f7f6",
    minHeight: "100vh",
  },
  content: {
    flex: 1,
    padding: "30px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginTop: "20px",
    marginBottom: "30px",
  },
  statCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  statIcon: {
    fontSize: "40px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#2c3e50",
  },
  statLabel: {
    fontSize: "12px",
    color: "#666",
  },
  topMentorsBox: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "30px",
  },
  topMentorsList: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
    marginTop: "15px",
  },
  topMentorCard: {
    flex: 1,
    minWidth: "150px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "15px",
    borderRadius: "10px",
    textAlign: "center",
    color: "white",
  },
  topMentorRank: {
    fontSize: "24px",
    fontWeight: "bold",
    opacity: 0.8,
  },
  topMentorName: {
    fontSize: "16px",
    fontWeight: "bold",
    margin: "10px 0",
  },
  topMentorStats: {
    fontSize: "12px",
    opacity: 0.9,
  },
  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    borderBottom: "2px solid #e9ecef",
  },
  tab: {
    padding: "12px 24px",
    background: "none",
    border: "none",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    color: "#6c757d",
    transition: "all 0.2s",
  },
  tabActive: {
    color: "#667eea",
    borderBottom: "3px solid #667eea",
  },
  tableContainer: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    marginTop: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    backgroundColor: "#f8f9fa",
    borderBottom: "2px solid #e5e7eb",
  },
  th: {
    padding: "15px",
    textAlign: "left",
  },
  tableRow: {
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "15px",
  },
  skillBadge: {
    display: "inline-block",
    padding: "2px 8px",
    backgroundColor: "#e8f4fd",
    borderRadius: "12px",
    fontSize: "11px",
    marginRight: "5px",
    marginBottom: "3px",
  },
  ratingBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  ratingSmall: {
    fontSize: "12px",
  },
  feedbackPreview: {
    fontSize: "12px",
    color: "#666",
    maxWidth: "200px",
  },
  subText: {
    fontSize: "11px",
    color: "#999",
  },
  deleteBtn: {
    color: "#e74c3c",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "14px",
  },
};

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
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
    40% { transform: scale(1); opacity: 1; }
  }
`;
if (!document.querySelector('#admin-mentor-spinner-styles')) {
  styleSheet.id = 'admin-mentor-spinner-styles';
  document.head.appendChild(styleSheet);
}