import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import API from "../services/api";


// Loading Spinner Component
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
    <p style={spinnerStyles.text}>Loading project...</p>
  </div>
);

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [solution, setSolution] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reattemptLoading, setReattemptLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [originalSolution, setOriginalSolution] = useState("");
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(0);
  const [taskSolutions, setTaskSolutions] = useState([]);
  const [activeSection, setActiveSection] = useState("overview");

  const email = localStorage.getItem("email");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Auth Protection
  useEffect(() => {
    if (!token || role !== "student") {
      navigate("/login");
    }
  }, [token, role, navigate]);

  // Extract tasks from requirements text
  const extractTasksFromText = (text) => {
    if (!text) return [];
    const extractedTasks = [];
    const lines = text.split('\n');
    let inTasks = false;
    
    for (let line of lines) {
      if (line.includes('TASKS') || line.includes('Tasks')) {
        inTasks = true;
        continue;
      }
      if (inTasks && (line.startsWith('##') || line.startsWith('#'))) {
        break;
      }
      if (inTasks && (line.trim().startsWith('-') || line.trim().startsWith('•') || (line.trim().match(/^\d+\./)))) {
        let task = line.trim().replace(/^[-•\d+.]\s*/, '').trim();
        if (task && task.length > 0) {
          extractedTasks.push(task);
        }
      }
    }
    
    return extractedTasks;
  };

  // Fetch Single Project
  const fetchProject = useCallback(async () => {
    try {
      const res = await API.get(`/api/projects/?email=${email}`);
      const found = res.data.find((p) => p._id === id);
      setProject(found || null);
      if (found?.solution) {
        setSolution(found.solution);
        setOriginalSolution(found.solution);
      }
      if (found?.feedback) setFeedback(found.feedback);
      
      // Extract tasks from requirements
      const details = found?.details || {};
      const requirementsText = details.requirements_text || "";
      const extractedTasks = extractTasksFromText(requirementsText);
      setTasks(extractedTasks);
      
      // Load saved task solutions
      if (found?.task_solutions) {
        setTaskSolutions(found.task_solutions);
      } else {
        setTaskSolutions(new Array(extractedTasks.length).fill(""));
      }
    } catch (err) {
      console.error("Error fetching project:", err);
    }
  }, [id, email]);

  // Fetch attempt history
  const fetchAttemptHistory = useCallback(async () => {
    if (!project?.title) return;
    try {
      const res = await API.get(`/api/project-attempts/?email=${email}&title=${project.title}`);
      setAttemptHistory(res.data.attempts || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  }, [project?.title, email]);

  useEffect(() => {
    if (email && id) {
      fetchProject();
    }
  }, [fetchProject, email, id]);

  useEffect(() => {
    if (project?.title) {
      fetchAttemptHistory();
    }
  }, [project?.title, fetchAttemptHistory]);

  // Auto-save function
  const autoSaveSolution = async (solutionText) => {
    if (!solutionText || solutionText === originalSolution) return;
    try {
      await API.post("/api/save-solution/", {
        id,
        solution: solutionText,
      });
      setOriginalSolution(solutionText);
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  // Handle solution change with auto-save
  const handleChange = (value) => {
    setSolution(value);
    if (window.autoSaveTimer) clearTimeout(window.autoSaveTimer);
    window.autoSaveTimer = setTimeout(() => {
      autoSaveSolution(value);
    }, 2000);
  };

  // Handle task solution change
  const handleTaskChange = (taskIndex, value) => {
    const updated = [...taskSolutions];
    updated[taskIndex] = value;
    setTaskSolutions(updated);
    
    // Auto-save task solution
    if (window.taskSaveTimer) clearTimeout(window.taskSaveTimer);
    window.taskSaveTimer = setTimeout(async () => {
      try {
        await API.post("/api/save-task-solution/", {
          project_id: id,
          task_index: taskIndex,
          task_solution: value
        });
      } catch (err) {
        console.error("Task save failed:", err);
      }
    }, 1500);
  };

  // Manual save
  const saveSolution = async () => {
    setSaving(true);
    try {
      await API.post("/api/save-solution/", {
        id,
        solution,
      });
      setOriginalSolution(solution);
      alert("✓ Solution saved!");
    } catch (err) {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Evaluate project
  const evaluateProject = async () => {
    if (!solution.trim()) {
      alert("Please write your solution first.");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/api/evaluate-project/", {
        id: id,
        solution: solution,
      });
      if (res.data.success) {
        setFeedback(res.data.feedback);
        alert(`✓ Project evaluated! Score: ${res.data.feedback.score}/100`);
        await fetchProject();
        await fetchAttemptHistory();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  // Reattempt project
  const reattemptProject = async () => {
    if (!window.confirm("Do you want to reattempt this project?\n\nYour current solution will be saved in history, and you'll get a fresh copy to work on.")) {
      return;
    }
    
    setReattemptLoading(true);
    try {
      const res = await API.post("/api/reattempt-project/", {
        project_id: id,
        email: email
      });
      
      if (res.data.success) {
        alert("✓ New attempt created! Redirecting to fresh project...");
        navigate(`/project/${res.data.project._id}`);
      }
    } catch (err) {
      if (err.response?.data?.existing_project_id) {
        if (window.confirm("You already have an in-progress version. Go to that instead?")) {
          navigate(`/project/${err.response.data.existing_project_id}`);
        }
      } else {
        alert(err.response?.data?.error || "Failed to create reattempt");
      }
    } finally {
      setReattemptLoading(false);
    }
  };

  // Format requirements text for display
  const renderRequirements = (text) => {
    if (!text) return <p>No requirements available.</p>;
    
    const lines = text.split('\n');
    const elements = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('# PROJECT:')) {
        elements.push(<h2 key={i} style={localStyles.projectTitle}>{line.replace('# PROJECT:', '').trim()}</h2>);
      } else if (line.startsWith('## GOAL') || line.startsWith('## OBJECTIVE')) {
        elements.push(<h3 key={i} style={localStyles.sectionTitle}>🎯 Goal</h3>);
      } else if (line.startsWith('## REQUIREMENTS')) {
        elements.push(<h3 key={i} style={localStyles.sectionTitle}>📋 Requirements</h3>);
      } else if (line.startsWith('## TASKS')) {
        elements.push(<h3 key={i} style={localStyles.sectionTitle}>📝 Tasks</h3>);
      } else if (line.startsWith('## EVALUATION')) {
        elements.push(<h3 key={i} style={localStyles.sectionTitle}>✅ Evaluation Criteria</h3>);
      } else if (line.trim().startsWith('-') || line.trim().startsWith('•') || (line.trim().match(/^\d+\./))) {
        elements.push(
          <div key={i} style={localStyles.listItem}>
            <span style={{ marginRight: '8px' }}>•</span>
            <span>{line.trim().replace(/^[-•\d+.]\s*/, '')}</span>
          </div>
        );
        inList = true;
      } else if (line.trim() === '') {
        if (inList) {
          elements.push(<div key={i} style={{ height: '8px' }}></div>);
          inList = false;
        }
      } else if (line.trim() && !line.startsWith('#')) {
        elements.push(<p key={i} style={localStyles.textParagraph}>{line.trim()}</p>);
      }
    }
    
    return elements;
  };

  // Safe render for feedback
  const safeRender = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) {
      return value.map((item, idx) => (
        <div key={idx} style={{ marginBottom: '6px' }}>
          • {safeRender(item)}
        </div>
      ));
    }
    return String(value);
  };

  if (!project) {
    return (
      <div style={localStyles.container}>
        <Sidebar role="student" />
        <div style={localStyles.mainContent}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const details = project.details && typeof project.details === 'object' ? project.details : {};
  const requirementsText = details.requirements_text || "";
  const hasMentorFeedback = project.mentor_feedback_given;
  const aiScore = project.feedback?.score || project.score || 0;
  const finalScore = project.final_score !== undefined && project.final_score !== null 
    ? project.final_score 
    : project.score || 0;

  return (
    <div style={localStyles.container}>
      <Sidebar role="student" />
      
      <div style={localStyles.mainContent}>
        {/* Back Button */}
        <button onClick={() => navigate("/my-projects")} style={localStyles.backBtn}>
          ← Back to Projects
        </button>

        {/* Project Header Card */}
        <div style={localStyles.card}>
          <div style={localStyles.headerRow}>
            <h1 style={localStyles.projectTitle}>{project.title || "Untitled"}</h1>
            {project.reattempt_count > 0 && (
              <span style={localStyles.attemptBadge}>Attempt #{project.reattempt_count + 1}</span>
            )}
          </div>
          <p style={localStyles.description}>{project.description || "No description available."}</p>
          <div style={localStyles.metaGrid}>
            <div style={localStyles.metaItem}>
              <span style={localStyles.metaLabel}>Domain</span>
              <span style={localStyles.metaValue}>{project.domain || "N/A"}</span>
            </div>
            <div style={localStyles.metaItem}>
              <span style={localStyles.metaLabel}>Level</span>
              <span style={localStyles.metaValue}>{project.level || "N/A"}</span>
            </div>
            <div style={localStyles.metaItem}>
              <span style={localStyles.metaLabel}>Status</span>
              <span style={{...localStyles.metaValue, color: project.status === "completed" ? "#27ae60" : "#f39c12" }}>
                {project.status === "completed" ? "✓ Completed" : "⏳ Suggested"}
              </span>
            </div>
            {project.score > 0 && (
              <div style={localStyles.metaItem}>
                <span style={localStyles.metaLabel}>AI Score</span>
                <span style={localStyles.metaValue}>{aiScore}/100</span>
              </div>
            )}
            {hasMentorFeedback && (
              <div style={localStyles.metaItem}>
                <span style={localStyles.metaLabel}>Mentor Score</span>
                <span style={{...localStyles.metaValue, color: "#f59e0b" }}>{finalScore}/100</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={localStyles.tabs}>
          <button 
            onClick={() => setActiveSection("overview")}
            style={{...localStyles.tab, ...(activeSection === "overview" ? localStyles.tabActive : {})}}
          >
            📋 Overview
          </button>
          <button 
            onClick={() => setActiveSection("tasks")}
            style={{...localStyles.tab, ...(activeSection === "tasks" ? localStyles.tabActive : {})}}
          >
            📝 Tasks {tasks.length > 0 && `(${tasks.length})`}
          </button>
          <button 
            onClick={() => setActiveSection("solution")}
            style={{...localStyles.tab, ...(activeSection === "solution" ? localStyles.tabActive : {})}}
          >
            ✏️ Your Solution
          </button>
          {(feedback || hasMentorFeedback) && (
            <button 
              onClick={() => setActiveSection("feedback")}
              style={{...localStyles.tab, ...(activeSection === "feedback" ? localStyles.tabActive : {})}}
            >
              💬 Feedback
            </button>
          )}
        </div>

        {/* Overview Section */}
        {activeSection === "overview" && (
          <div style={localStyles.card}>
            <h3 style={localStyles.sectionTitle}>📋 Project Overview</h3>
            <div style={localStyles.requirementsBox}>
              {renderRequirements(requirementsText)}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {activeSection === "tasks" && tasks.length > 0 && (
          <div style={localStyles.card}>
            <h3 style={localStyles.sectionTitle}>📝 Complete Each Task</h3>
            <p style={localStyles.sectionDesc}>Work through each task one by one. Your progress will be saved automatically.</p>
            
            {/* Task Navigation */}
            <div style={localStyles.taskNav}>
              {tasks.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTask(idx)}
                  style={{
                    ...localStyles.taskNavBtn,
                    backgroundColor: currentTask === idx ? "#667eea" : "#e9ecef",
                    color: currentTask === idx ? "white" : "#666"
                  }}
                >
                  Task {idx + 1}
                  {taskSolutions[idx] && <span style={localStyles.taskCompleteIcon}>✓</span>}
                </button>
              ))}
            </div>
            
            {/* Current Task */}
            <div style={localStyles.taskCard}>
              <h4 style={localStyles.taskTitle}>Task {currentTask + 1}</h4>
              <p style={localStyles.taskDescription}>{tasks[currentTask]}</p>
              
              <textarea
                value={taskSolutions[currentTask] || ""}
                onChange={(e) => handleTaskChange(currentTask, e.target.value)}
                placeholder="Write your solution for this task..."
                rows={6}
                style={localStyles.taskTextarea}
              />
              
              <div style={localStyles.taskNavArrows}>
                <button
                  onClick={() => setCurrentTask(Math.max(0, currentTask - 1))}
                  disabled={currentTask === 0}
                  style={{...localStyles.taskArrowBtn, opacity: currentTask === 0 ? 0.5 : 1}}
                >
                  ← Previous Task
                </button>
                <span style={localStyles.taskProgress}>
                  Task {currentTask + 1} of {tasks.length}
                </span>
                <button
                  onClick={() => setCurrentTask(Math.min(tasks.length - 1, currentTask + 1))}
                  disabled={currentTask === tasks.length - 1}
                  style={{...localStyles.taskArrowBtn, opacity: currentTask === tasks.length - 1 ? 0.5 : 1}}
                >
                  Next Task →
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === "tasks" && tasks.length === 0 && (
          <div style={localStyles.card}>
            <p style={{ textAlign: "center", color: "#666" }}>No tasks found for this project.</p>
          </div>
        )}

        {/* Solution Section */}
        {activeSection === "solution" && (
          <div style={localStyles.card}>
            <h3 style={localStyles.sectionTitle}>✏️ Your Solution</h3>
            <p style={localStyles.sectionDesc}>Write your complete solution below. Auto-saves every 2 seconds.</p>
            <small style={localStyles.solutionInfo}>💾 Auto-saves every 2 seconds</small>
            <textarea
              value={solution}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Write your solution here..."
              rows={12}
              style={localStyles.textarea}
              disabled={project.status === "completed"}
            />
            {project.status !== "completed" && (
              <div style={localStyles.buttonGroup}>
                <button onClick={saveSolution} style={localStyles.saveBtn} disabled={saving}>
                  {saving ? "Saving..." : "💾 Save Solution"}
                </button>
                <button onClick={evaluateProject} style={localStyles.submitBtn} disabled={loading}>
                  {loading ? "Evaluating..." : "🚀 Submit for Review"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback Section - UPDATED with FIX for eval keyword */}
        {activeSection === "feedback" && (
          <div id="mentor-feedback-section">
            {/* AI Feedback */}
            {feedback && (
              <div style={localStyles.feedbackCard}>
                <h3 style={localStyles.feedbackTitle}>🤖 AI Evaluation</h3>
                <div style={localStyles.scoreSection}>
                  <div>
                    <span>AI Score:</span>
                    <span style={{ 
                      fontSize: 36, 
                      fontWeight: "bold", 
                      color: feedback.score >= 70 ? "#27ae60" : feedback.score >= 40 ? "#f39c12" : "#e74c3c" 
                    }}>
                      {feedback.score || project.score || 0}/100
                    </span>
                  </div>
                  {hasMentorFeedback && (
                    <div style={{ marginLeft: "30px" }}>
                      <span>👨‍🏫 Mentor Score:</span>
                      <span style={{ 
                        fontSize: 36, 
                        fontWeight: "bold", 
                        color: "#f59e0b" 
                      }}>
                        {finalScore}/100
                      </span>
                    </div>
                  )}
                </div>
                
                {feedback.strengths && feedback.strengths.length > 0 && (
                  <div style={localStyles.feedbackSection}>
                    <h4 style={{ color: "#27ae60" }}>✅ Strengths</h4>
                    <div>{safeRender(feedback.strengths)}</div>
                  </div>
                )}
                
                {feedback.weaknesses && feedback.weaknesses.length > 0 && (
                  <div style={localStyles.feedbackSection}>
                    <h4 style={{ color: "#e74c3c" }}>⚠️ Areas for Improvement</h4>
                    <div>{safeRender(feedback.weaknesses)}</div>
                  </div>
                )}
                
                {feedback.improvements && feedback.improvements.length > 0 && (
                  <div style={localStyles.feedbackSection}>
                    <h4 style={{ color: "#3498db" }}>📚 Suggestions</h4>
                    <div>{safeRender(feedback.improvements)}</div>
                  </div>
                )}
                
                {/* FIX: Changed 'eval' to 'taskEval' to avoid reserved keyword */}
                {project.task_evaluations && project.task_evaluations.length > 0 && (
                  <div style={localStyles.feedbackSection}>
                    <h4 style={{ color: "#8e44ad" }}>📋 Task-wise AI Evaluation</h4>
                    {project.task_evaluations.map((taskEval, idx) => (
                      taskEval && (
                        <div key={idx} style={{ 
                          padding: "8px", 
                          marginBottom: "5px", 
                          background: "rgba(255,255,255,0.08)", 
                          borderRadius: "6px" 
                        }}>
                          <strong>Task {idx + 1}:</strong> Score {taskEval.score}/100
                          <div style={{ fontSize: "12px", marginTop: "3px" }}>{taskEval.feedback}</div>
                        </div>
                      )
                    ))}
                  </div>
                )}
                
                {feedback.final_feedback && (
                  <div style={localStyles.finalFeedback}>
                    <h4>🎯 Final Verdict</h4>
                    <p>{safeRender(feedback.final_feedback)}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Mentor Feedback */}
            {hasMentorFeedback && (
              <div style={localStyles.mentorFeedbackCard}>
                <h3 style={localStyles.feedbackTitle}>👨‍🏫 Mentor Feedback</h3>
                <div style={localStyles.mentorRating}>
                  <span>Rating:</span>
                  <span style={{ fontSize: 20, fontWeight: "bold", color: "#f59e0b" }}>
                    {"⭐".repeat(project.mentor_rating || 0)} ({project.mentor_rating || 0}/5)
                  </span>
                </div>
                {project.mentor_feedback_text && (
                  <div style={localStyles.mentorFeedbackText}>
                    <p style={{ whiteSpace: "pre-wrap" }}>{project.mentor_feedback_text}</p>
                  </div>
                )}
                {project.final_score && project.final_score !== project.score && (
                  <div style={localStyles.manualScoreNote}>
                    <strong>📝 Note:</strong> Mentor adjusted your score from {project.score || 0}% to {project.final_score}%
                  </div>
                )}
                
                {project.mentor_task_feedback && project.mentor_task_feedback.length > 0 && (
                  <div style={localStyles.mentorTaskFeedback}>
                    <h4>📋 Task-wise Mentor Feedback</h4>
                    {project.mentor_task_feedback.map((fb, idx) => (
                      fb && (
                        <div key={idx} style={{ 
                          padding: "10px", 
                          marginBottom: "8px", 
                          background: "#f8f9fa", 
                          borderRadius: "8px",
                          borderLeft: "3px solid #f59e0b"
                        }}>
                          <strong>Task {idx + 1}</strong>
                          <p style={{ marginTop: "5px", fontSize: "13px" }}>{fb.feedback_text}</p>
                          {fb.rating && <span>⭐ {fb.rating}/5</span>}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reattempt Section */}
        {project.status === "completed" && (
          <div style={localStyles.reattemptCard}>
            <h3>🔄 Want to improve your score?</h3>
            <p>You can reattempt this project to get a better score.</p>
            <button onClick={reattemptProject} style={localStyles.reattemptBtn} disabled={reattemptLoading}>
              {reattemptLoading ? "Creating..." : "✨ Start New Attempt"}
            </button>
            
            {attemptHistory.length > 1 && (
              <div style={localStyles.historyNote}>
                <button onClick={() => setShowHistory(!showHistory)} style={localStyles.historyToggleBtn}>
                  📚 View All {attemptHistory.length} Attempts
                </button>
                {showHistory && (
                  <div style={localStyles.historyList}>
                    {attemptHistory.map((attempt, idx) => (
                      <div key={attempt._id} style={localStyles.historyItem}>
                        <strong>Attempt {attemptHistory.length - idx}</strong>
                        <span>Score: {attempt.score || 0}/100</span>
                        <span>Status: {attempt.status}</span>
                        <button onClick={() => navigate(`/project/${attempt._id}`)} style={localStyles.viewAttemptBtn}>
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ================= STYLES =================
const localStyles = {
  container: {
    display: "flex",
    backgroundColor: "#f4f7f6",
    minHeight: "100vh",
  },
  mainContent: {
    flex: 1,
    padding: "30px 40px",
    maxWidth: "1000px",
    margin: "0 auto",
    width: "100%",
  },
  backBtn: {
    background: "#7f8c8d",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "20px",
    fontSize: "13px",
    transition: "background 0.2s",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e9ecef",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "15px",
  },
  attemptBadge: {
    background: "#e74c3c",
    color: "white",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  description: {
    color: "#555",
    lineHeight: "1.6",
    marginTop: "5px",
    marginBottom: "20px",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "15px",
    paddingTop: "15px",
    borderTop: "1px solid #eee",
  },
  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metaLabel: {
    fontSize: "11px",
    color: "#999",
    textTransform: "uppercase",
    fontWeight: "500",
  },
  metaValue: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#2c3e50",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  tab: {
    padding: "10px 20px",
    background: "white",
    border: "1px solid #e9ecef",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#666",
    transition: "all 0.2s",
  },
  tabActive: {
    background: "#667eea",
    borderColor: "#667eea",
    color: "white",
  },
  sectionDesc: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "15px",
  },
  requirementsBox: {
    background: "#f8f9fa",
    padding: "20px",
    borderRadius: "12px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  projectTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "15px",
    color: "#2c3e50",
  },
  sectionTitle: {
    margin: "0 0 15px 0",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#34495e",
  },
  listItem: {
    display: "flex",
    alignItems: "flex-start",
    marginBottom: "8px",
    marginLeft: "10px",
  },
  textParagraph: {
    marginBottom: "10px",
    color: "#555",
    lineHeight: "1.5",
  },
  taskNav: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  taskNavBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    transition: "all 0.2s",
  },
  taskCompleteIcon: {
    marginLeft: "4px",
    fontSize: "11px",
  },
  taskCard: {
    background: "#f8f9fa",
    borderRadius: "12px",
    padding: "20px",
  },
  taskTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#2c3e50",
  },
  taskDescription: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "15px",
    lineHeight: "1.5",
  },
  taskTextarea: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    fontSize: "13px",
    fontFamily: "monospace",
    resize: "vertical",
    marginBottom: "15px",
  },
  taskNavArrows: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "10px",
  },
  taskArrowBtn: {
    padding: "8px 16px",
    background: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    transition: "background 0.2s",
  },
  taskProgress: {
    fontSize: "12px",
    color: "#666",
  },
  solutionInfo: {
    color: "#666",
    fontSize: "12px",
    display: "block",
    marginBottom: "10px",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    fontSize: "13px",
    fontFamily: "monospace",
    resize: "vertical",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  },
  saveBtn: {
    padding: "10px 20px",
    background: "#3498db",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
  },
  submitBtn: {
    padding: "10px 20px",
    background: "#2ecc71",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
  },
  feedbackCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "25px",
    borderRadius: "16px",
    marginBottom: "20px",
  },
  mentorFeedbackCard: {
    background: "white",
    padding: "25px",
    borderRadius: "16px",
    marginBottom: "20px",
    border: "1px solid #e9ecef",
  },
  feedbackTitle: {
    margin: "0 0 15px 0",
    fontSize: "18px",
  },
  scoreSection: {
    display: "flex",
    alignItems: "center",
    gap: "30px",
    marginBottom: "20px",
    padding: "15px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "10px",
    flexWrap: "wrap",
  },
  feedbackSection: {
    marginBottom: "20px",
    padding: "12px",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "10px",
  },
  finalFeedback: {
    marginTop: "20px",
    padding: "15px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "10px",
    borderLeft: "3px solid #f39c12",
  },
  mentorRating: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "15px",
    padding: "12px",
    background: "#fef3c7",
    borderRadius: "10px",
  },
  mentorFeedbackText: {
    padding: "12px",
    background: "#f8f9fa",
    borderRadius: "10px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  manualScoreNote: {
    marginTop: "15px",
    padding: "10px",
    background: "#e8f4fd",
    borderRadius: "8px",
    fontSize: "12px",
  },
  mentorTaskFeedback: {
    marginTop: "20px",
    padding: "15px",
    background: "#f8f9fa",
    borderRadius: "10px",
  },
  reattemptCard: {
    background: "#fff3cd",
    padding: "25px",
    borderRadius: "16px",
    textAlign: "center",
    border: "1px solid #ffc107",
  },
  reattemptBtn: {
    background: "#f39c12",
    color: "white",
    border: "none",
    padding: "10px 24px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    marginTop: "15px",
  },
  historyNote: {
    marginTop: "20px",
  },
  historyToggleBtn: {
    background: "transparent",
    color: "#856404",
    border: "1px solid #856404",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  historyList: {
    marginTop: "15px",
    textAlign: "left",
    borderTop: "1px solid #ffc107",
    paddingTop: "15px",
  },
  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    background: "rgba(255,255,255,0.7)",
    borderRadius: "8px",
    marginBottom: "8px",
    fontSize: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  viewAttemptBtn: {
    background: "#3498db",
    color: "white",
    border: "none",
    padding: "4px 10px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "11px",
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

// Add CSS animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
    40% { transform: scale(1); opacity: 1; }
  }
`;
if (!document.querySelector('#project-detail-styles')) {
  styleSheet.id = 'project-detail-styles';
  document.head.appendChild(styleSheet);
}