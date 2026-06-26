import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import API from "../services/api";

export default function MentorWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(3);
  const [manualScore, setManualScore] = useState("");
  const [useManualScore, setUseManualScore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [error, setError] = useState(null);
  
  // Task state
  const [tasks, setTasks] = useState([]);
  const [taskSolutions, setTaskSolutions] = useState([]);
  const [taskEvaluations, setTaskEvaluations] = useState([]);
  const [activeTask, setActiveTask] = useState(0);
  const [showTasks, setShowTasks] = useState(false);

  const email = localStorage.getItem("email");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // ===== Helper function to get consistent score =====
  const getTaskScore = (evaluation) => {
    if (!evaluation) return null;
    return evaluation.score || evaluation.manual_score || null;
  };

  const getScoreColor = (score) => {
    if (score >= 70) return "#10b981";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  };

  const calculateAverageScore = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return 0;
    const validScores = evaluations
      .filter(e => e !== null && e !== undefined)
      .map(e => getTaskScore(e))
      .filter(s => s !== null && s !== undefined);
    if (validScores.length === 0) return 0;
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  };
  // ===== End helper functions =====

  // Extract tasks from requirements text
  const extractTasksFromRequirements = (requirementsText) => {
    let text = requirementsText;
    if (typeof requirementsText === 'object' && requirementsText !== null) {
      text = requirementsText.requirements_text || requirementsText.text || JSON.stringify(requirementsText);
    }
    
    if (typeof text !== 'string') {
      return [];
    }
    
    const extractedTasks = [];
    const lines = text.split('\n');
    let inTasks = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes("## TASKS") || trimmed.toUpperCase().includes("TASKS")) {
        inTasks = true;
        continue;
      }
      if (inTasks && trimmed.startsWith('##')) {
        break;
      }
      if (inTasks && (trimmed.startsWith('-') || (trimmed && /^\d+\./.test(trimmed)))) {
        const task = trimmed.replace(/^[-•\d. ]+/, '').trim();
        if (task) {
          extractedTasks.push(task);
        }
      }
    }
    
    return extractedTasks;
  };

  // Fetch project data
  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching project with ID:", projectId);
      
      const res = await API.get(`/api/mentor/project/?project_id=${projectId}&email=${email}`);
      setProject(res.data);
      
      // Existing feedback
      if (res.data.mentor_feedback) {
        setExistingFeedback(res.data.mentor_feedback);
        setFeedbackText(res.data.mentor_feedback.feedback_text || "");
        setRating(res.data.mentor_feedback.rating || 3);
        if (res.data.mentor_feedback.manual_score) {
          setManualScore(res.data.mentor_feedback.manual_score.toString());
          setUseManualScore(true);
        }
      }
      
      // Extract tasks
      let extractedTasks = [];
      if (res.data.tasks && Array.isArray(res.data.tasks) && res.data.tasks.length > 0) {
        extractedTasks = res.data.tasks;
      } else {
        const requirements = res.data.requirements || res.data.details || {};
        extractedTasks = extractTasksFromRequirements(requirements);
      }
      setTasks(extractedTasks);
      setShowTasks(extractedTasks.length > 0);
      
      // Task solutions
      const solutions = (res.data.task_solutions && Array.isArray(res.data.task_solutions)) 
        ? res.data.task_solutions 
        : Array(extractedTasks.length).fill("");
      setTaskSolutions(solutions);
      
      // Task evaluations (AI)
      const evaluations = (res.data.task_evaluations && Array.isArray(res.data.task_evaluations)) 
        ? res.data.task_evaluations 
        : [];
      setTaskEvaluations(evaluations);
      
    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to load project. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId, email]);

  useEffect(() => {
    if (!token || role !== "mentor") {
      navigate("/login");
      return;
    }
    fetchProject();
  }, [token, role, navigate, fetchProject]);

  // Submit review
  const submitReview = async () => {
    if (!feedbackText.trim()) {
      alert("Please enter feedback text");
      return;
    }

    setSubmitting(true);
    try {
      const requestData = {
        project_id: projectId,
        mentor_email: email,
        feedback_text: feedbackText,
        rating: rating,
      };
      
      if (useManualScore && manualScore && manualScore.trim() !== "") {
        const scoreValue = parseInt(manualScore, 10);
        if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 100) {
          requestData.manual_score = scoreValue;
        } else {
          alert("Please enter a valid score between 0 and 100");
          setSubmitting(false);
          return;
        }
      }
      
      const response = await API.post("/api/mentor/submit-review/",
        requestData
      );

      if (response.data.success) {
        alert(`✅ Review submitted successfully! Final Score: ${response.data.final_score || rating * 20}/100`);
        navigate("/mentor-dashboard");
      } else {
        alert(response.data.message || "Review submitted successfully!");
        navigate("/mentor-dashboard");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar role="mentor" />
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner}>⏳</div>
          <h3>Loading project...</h3>
          <p style={styles.loadingText}>Fetching student tasks and solutions</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={styles.container}>
        <Sidebar role="mentor" />
        <div style={styles.loadingContent}>
          <div style={styles.errorIcon}>🔍</div>
          <h3>Project not found</h3>
          <p style={styles.errorText}>{error || "The project you're looking for doesn't exist."}</p>
          <button onClick={() => navigate("/mentor-dashboard")} style={styles.backButton}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentTask = tasks[activeTask];
  const currentTaskSolution = taskSolutions[activeTask] || "";
  const currentTaskEvaluation = taskEvaluations[activeTask];
  
  // ===== FIX: Calculate scores consistently =====
  // AI Score from project (already average from backend)
  const aiScore = project.ai_score || 0;
  
  // Final score (with mentor override if available)
  const finalScore = project.final_score || aiScore;
  
  // Calculate average of all task evaluations
  const avgTaskScore = calculateAverageScore(taskEvaluations);
  
  // Use the calculated average if available, otherwise use project's ai_score
  const displayAIScore = avgTaskScore > 0 ? avgTaskScore : aiScore;
  
  // Check if mentor has overridden the score
  const hasMentorOverride = project.mentor_feedback_given && project.final_score !== undefined;
  // ===== END FIX =====

  // Calculate overall task progress
  const evaluatedCount = taskEvaluations.filter(e => e !== null && e !== undefined).length;
  const totalTasks = tasks.length;

  return (
    <div style={styles.container}>
      <Sidebar role="mentor" />
      
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => navigate("/mentor-dashboard")} style={styles.backButton}>
            ← Back to Dashboard
          </button>
          <h1 style={styles.pageTitle}>Mentor Review Workspace</h1>
          <p style={styles.pageSubtitle}>Review student's task solutions and provide feedback</p>
        </div>

        {/* Project Info Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.projectTitle}>{project.title}</h2>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {/* ===== FIX: AI Score Display ===== */}
              <div style={styles.scoreBadge}>
                <span style={styles.scoreLabel}>🤖 AI Score</span>
                <span style={{
                  ...styles.scoreValue,
                  color: getScoreColor(displayAIScore)
                }}>
                  {displayAIScore}/100
                </span>
              </div>
              {/* ===== END FIX ===== */}
              
              {/* ===== FIX: Mentor Score Display ===== */}
              {project.mentor_feedback_given && (
                <div style={{...styles.scoreBadge, background: "#fef3c7"}}>
                  <span style={styles.scoreLabel}>👨‍🏫 Mentor Score</span>
                  <span style={{
                    ...styles.scoreValue,
                    color: hasMentorOverride ? "#f59e0b" : "#10b981"
                  }}>
                    {finalScore}/100
                  </span>
                </div>
              )}
              {/* ===== END FIX ===== */}
            </div>
          </div>
          
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>👨‍🎓 Student</span>
              <span style={styles.infoValue}>{project.student_name}</span>
              <span style={styles.infoSub}>{project.student_email}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>📂 Domain</span>
              <span style={styles.infoValue}>{project.domain}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>📊 Level</span>
              <span style={styles.infoValue}>{project.level}</span>
            </div>
            {tasks.length > 0 && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>📋 Task Progress</span>
                <span style={styles.infoValue}>
                  {evaluatedCount} of {totalTasks} tasks AI evaluated
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Task Breakdown - Main Content */}
        {showTasks && tasks.length > 0 ? (
          <div style={styles.card}>
            <div style={styles.tabHeader}>
              <h3 style={styles.sectionTitle}>📋 Task Breakdown</h3>
              <span style={styles.progressBadge}>
                {evaluatedCount}/{totalTasks} Evaluated
              </span>
            </div>
            
            {/* Task Navigation */}
            <div style={styles.taskNav}>
              {tasks.map((task, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTask(index)}
                  style={{
                    ...styles.taskNavButton,
                    ...(activeTask === index ? styles.taskNavButtonActive : {}),
                    ...(taskEvaluations[index] ? styles.taskNavButtonEvaluated : {})
                  }}
                >
                  {taskEvaluations[index] ? "✅" : "📝"} Task {index + 1}
                </button>
              ))}
            </div>

            {/* Current Task Details */}
            <div style={styles.taskContent}>
              <div style={styles.taskDescription}>
                <h4 style={styles.taskTitle}>Task {activeTask + 1}</h4>
                <p style={styles.taskDescText}>{currentTask}</p>
              </div>

              {/* Student's Solution for this task */}
              <div style={styles.taskSolutionSection}>
                <h5 style={styles.subHeading}>📄 Student's Solution</h5>
                <pre style={styles.codeBlock}>
                  {currentTaskSolution || "No solution submitted for this task"}
                </pre>
              </div>

              {/* ===== FIX: AI Evaluation for this task ===== */}
              {currentTaskEvaluation ? (
                <div style={styles.taskEvaluationBox}>
                  <h5 style={styles.subHeading}>🤖 AI Evaluation</h5>
                  <div style={styles.taskScore}>
                    Score: <strong style={{ 
                      color: getScoreColor(getTaskScore(currentTaskEvaluation) || 0)
                    }}>
                      {getTaskScore(currentTaskEvaluation) || 0}/100
                    </strong>
                  </div>
                  <p style={styles.evalFeedback}><strong>Feedback:</strong> {currentTaskEvaluation.feedback}</p>
                  {currentTaskEvaluation.suggestions && (
                    <p style={styles.evalSuggestions}><strong>💡 Suggestions:</strong> {currentTaskEvaluation.suggestions}</p>
                  )}
                </div>
              ) : (
                <div style={styles.noEvaluationBox}>
                  <p>⏳ AI evaluation not available for this task yet.</p>
                  <p style={styles.waitingSubtext}>Student needs to submit all tasks for AI evaluation.</p>
                </div>
              )}
              {/* ===== END FIX ===== */}
            </div>

            {/* Task Progress */}
            <div style={styles.taskProgress}>
              <div style={styles.progressInfo}>
                <span>Task {activeTask + 1} of {tasks.length}</span>
                <span style={{ color: taskEvaluations[activeTask] ? "#10b981" : "#999" }}>
                  {taskEvaluations[activeTask] ? "✅ AI Evaluated" : "⏳ Pending"}
                </span>
              </div>
              <div style={styles.progressBar}>
                {tasks.map((_, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.progressSegment,
                      background: taskEvaluations[index] ? "#10b981" : "#e5e7eb"
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            <div style={styles.taskNavArrows}>
              <button
                onClick={() => setActiveTask(Math.max(0, activeTask - 1))}
                disabled={activeTask === 0}
                style={{...styles.arrowBtn, opacity: activeTask === 0 ? 0.5 : 1}}
              >
                ← Previous Task
              </button>
              <button
                onClick={() => setActiveTask(Math.min(tasks.length - 1, activeTask + 1))}
                disabled={activeTask === tasks.length - 1}
                style={{...styles.arrowBtn, opacity: activeTask === tasks.length - 1 ? 0.5 : 1}}
              >
                Next Task →
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <p style={{ textAlign: "center", color: "#666", padding: "20px 0" }}>
              No tasks found for this project.
            </p>
          </div>
        )}

        {/* Review Section - Always at bottom */}
        <div style={styles.reviewCard}>
          <h3 style={styles.sectionTitle}>⭐ Submit Overall Review</h3>
          
          {/* Task Summary */}
          {tasks.length > 0 && (
            <div style={styles.taskSummaryBox}>
              <div style={styles.summaryRow}>
                <span>📊 Task Completion</span>
                <span style={styles.summaryValue}>
                  {evaluatedCount} of {totalTasks} tasks AI evaluated
                  {evaluatedCount === totalTasks && totalTasks > 0 && (
                    <span style={{ color: "#10b981", marginLeft: "10px" }}>✅ All tasks evaluated!</span>
                  )}
                </span>
              </div>
              {/* ===== FIX: Average Score Display ===== */}
              {evaluatedCount === totalTasks && totalTasks > 0 && (
                <div style={styles.avgScoreBox}>
                  Average AI Score: <strong style={{ color: getScoreColor(avgTaskScore) }}>
                    {avgTaskScore}/100
                  </strong>
                  {hasMentorOverride && (
                    <span style={{ marginLeft: "10px", color: "#f59e0b" }}>
                      (Mentor Override: {finalScore}/100)
                    </span>
                  )}
                </div>
              )}
              {/* ===== END FIX ===== */}
            </div>
          )}
          
          {/* Rating Section */}
          <div style={styles.formSection}>
            <label style={styles.formLabel}>Rating (1-5 stars)</label>
            <div style={styles.ratingButtons}>
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  style={{
                    ...styles.ratingButton,
                    ...(rating === r ? styles.ratingButtonActive : {})
                  }}
                >
                  {r} ⭐
                </button>
              ))}
            </div>
          </div>

          {/* Manual Score Override */}
          <div style={styles.formSection}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={useManualScore}
                onChange={(e) => setUseManualScore(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>Override AI Score with Manual Grade</span>
            </label>
            
            {useManualScore && (
              <div style={styles.manualScoreContainer}>
                <input
                  type="number"
                  value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                  placeholder="Enter score (0-100)"
                  min="0"
                  max="100"
                  step="1"
                  style={styles.manualScoreInput}
                />
                <span style={styles.manualScoreHint}>Enter a score between 0 and 100</span>
              </div>
            )}
          </div>

          {/* Feedback Text */}
          <div style={styles.formSection}>
            <label style={styles.formLabel}>Detailed Overall Feedback</label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Provide comprehensive overall feedback on the student's work. Be specific about what they did well and what could be improved..."
              rows={6}
              style={styles.feedbackTextarea}
            />
          </div>

          {/* Submit Button */}
          <div style={styles.submitSection}>
            <button
              onClick={submitReview}
              disabled={submitting}
              style={{
                ...styles.submitButton,
                ...(submitting ? styles.submitButtonDisabled : {})
              }}
            >
              {submitting ? "⏳ Submitting..." : "✅ Submit Overall Review"}
            </button>
          </div>

          {/* Existing Feedback Info */}
          {existingFeedback && (
            <div style={styles.existingFeedbackBox}>
              <p style={styles.existingFeedbackText}>
                <strong>📅 Previously submitted:</strong> {new Date(existingFeedback.created_at).toLocaleString()}
              </p>
              <p style={styles.existingFeedbackNote}>
                Submitting again will overwrite your previous feedback.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================= STYLES =================
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f0f2f5",
  },
  loadingContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    textAlign: "center",
  },
  loadingSpinner: {
    fontSize: "48px",
    marginBottom: "20px",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    color: "#666",
    marginTop: "10px",
  },
  errorIcon: {
    fontSize: "48px",
    marginBottom: "20px",
  },
  errorText: {
    color: "#e74c3c",
    marginTop: "10px",
  },
  mainContent: {
    flex: 1,
    padding: "30px 40px",
    overflowY: "auto",
    maxWidth: "1000px",
    margin: "0 auto",
    width: "100%",
  },
  header: {
    marginBottom: "30px",
  },
  backButton: {
    background: "#7f8c8d",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "15px",
    transition: "background 0.2s",
  },
  pageTitle: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "0 0 8px 0",
    color: "#2c3e50",
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "#7f8c8d",
    margin: 0,
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e9ecef",
  },
  reviewCard: {
    background: "white",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e9ecef",
    borderTop: "4px solid #667eea",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px",
  },
  projectTitle: {
    fontSize: "22px",
    fontWeight: "bold",
    margin: 0,
    color: "#2c3e50",
  },
  scoreBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f8f9fa",
    padding: "8px 16px",
    borderRadius: "30px",
  },
  scoreLabel: {
    fontSize: "13px",
    color: "#6c757d",
  },
  scoreValue: {
    fontSize: "20px",
    fontWeight: "bold",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginTop: "15px",
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  infoLabel: {
    fontSize: "12px",
    color: "#6c757d",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#2c3e50",
  },
  infoSub: {
    fontSize: "12px",
    color: "#6c757d",
  },
  tabHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "10px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    margin: 0,
    color: "#2c3e50",
  },
  progressBadge: {
    fontSize: "13px",
    background: "#e8f4fd",
    color: "#3498db",
    padding: "4px 12px",
    borderRadius: "20px",
    fontWeight: "500",
  },
  // Task styles
  taskNav: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexWrap: "wrap",
    padding: "10px",
    background: "#f8f9fa",
    borderRadius: "10px",
  },
  taskNavButton: {
    padding: "8px 16px",
    background: "white",
    border: "2px solid #e5e7eb",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  taskNavButtonActive: {
    borderColor: "#667eea",
    background: "#f0f0ff",
  },
  taskNavButtonEvaluated: {
    borderColor: "#10b981",
    background: "#d1fae5",
  },
  taskContent: {
    marginTop: "15px",
  },
  taskDescription: {
    padding: "15px",
    background: "#f8f9fa",
    borderRadius: "8px",
    borderLeft: "4px solid #667eea",
    marginBottom: "15px",
  },
  taskTitle: {
    margin: "0 0 8px 0",
    fontSize: "15px",
    color: "#2c3e50",
  },
  taskDescText: {
    margin: 0,
    fontSize: "14px",
    color: "#555",
    lineHeight: "1.5",
  },
  taskSolutionSection: {
    marginBottom: "15px",
  },
  subHeading: {
    margin: "0 0 10px 0",
    fontSize: "14px",
    color: "#2c3e50",
  },
  codeBlock: {
    background: "#1e1e1e",
    color: "#d4d4d4",
    padding: "20px",
    borderRadius: "12px",
    overflowX: "auto",
    fontFamily: "Consolas, Monaco, 'Courier New', monospace",
    fontSize: "13px",
    lineHeight: "1.6",
    margin: 0,
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    maxHeight: "300px",
    overflowY: "auto",
  },
  taskEvaluationBox: {
    padding: "15px",
    background: "#f0fdf4",
    borderRadius: "8px",
    borderLeft: "4px solid #10b981",
  },
  taskScore: {
    fontSize: "16px",
    margin: "5px 0",
  },
  evalFeedback: {
    margin: "5px 0",
    fontSize: "14px",
    color: "#333",
  },
  evalSuggestions: {
    margin: "5px 0",
    fontSize: "14px",
    color: "#333",
  },
  noEvaluationBox: {
    padding: "15px",
    background: "#fef3c7",
    borderRadius: "8px",
    borderLeft: "4px solid #f59e0b",
  },
  waitingSubtext: {
    fontSize: "13px",
    color: "#6c757d",
    marginTop: "5px",
  },
  taskProgress: {
    marginTop: "20px",
    padding: "12px",
    background: "#f8f9fa",
    borderRadius: "8px",
  },
  progressInfo: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#666",
    marginBottom: "6px",
  },
  progressBar: {
    display: "flex",
    gap: "4px",
  },
  progressSegment: {
    flex: 1,
    height: "6px",
    borderRadius: "3px",
    transition: "background 0.3s",
  },
  taskNavArrows: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
    gap: "10px",
  },
  arrowBtn: {
    padding: "8px 20px",
    background: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background 0.2s",
  },
  // Review section styles
  taskSummaryBox: {
    padding: "15px",
    background: "#f8f9fa",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "1px solid #e9ecef",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#333",
    padding: "4px 0",
  },
  summaryValue: {
    fontWeight: "500",
  },
  avgScoreBox: {
    marginTop: "8px",
    padding: "8px 12px",
    background: "#d4edda",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#155724",
    fontWeight: "500",
  },
  formSection: {
    marginBottom: "25px",
  },
  formLabel: {
    display: "block",
    fontWeight: "600",
    marginBottom: "10px",
    color: "#2c3e50",
    fontSize: "14px",
  },
  ratingButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  ratingButton: {
    padding: "10px 18px",
    background: "#f8f9fa",
    border: "1px solid #dee2e6",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  ratingButtonActive: {
    background: "#f1c40f",
    borderColor: "#f39c12",
    color: "#2c3e50",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    marginBottom: "10px",
  },
  checkbox: {
    marginRight: "10px",
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  checkboxText: {
    fontWeight: "500",
    color: "#2c3e50",
  },
  manualScoreContainer: {
    marginTop: "10px",
    marginLeft: "28px",
  },
  manualScoreInput: {
    width: "200px",
    padding: "10px",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    fontSize: "14px",
  },
  manualScoreHint: {
    display: "block",
    fontSize: "12px",
    color: "#6c757d",
    marginTop: "5px",
  },
  feedbackTextarea: {
    width: "100%",
    padding: "12px",
    border: "1px solid #dee2e6",
    borderRadius: "10px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s",
    minHeight: "120px",
  },
  submitSection: {
    marginTop: "25px",
  },
  submitButton: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "transform 0.2s, opacity 0.2s",
  },
  submitButtonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  existingFeedbackBox: {
    marginTop: "20px",
    padding: "15px",
    background: "#fff3cd",
    borderRadius: "10px",
    borderLeft: "4px solid #ffc107",
  },
  existingFeedbackText: {
    margin: "0 0 5px 0",
    fontSize: "13px",
    color: "#856404",
  },
  existingFeedbackNote: {
    margin: 0,
    fontSize: "12px",
    color: "#856404",
  },
};

// Add animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('#mentor-workspace-styles')) {
  styleSheet.id = 'mentor-workspace-styles';
  document.head.appendChild(styleSheet);
}