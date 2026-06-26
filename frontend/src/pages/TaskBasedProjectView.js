import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import API from "../services/api";


export default function TaskBasedProjectView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [taskSolutions, setTaskSolutions] = useState([]);
  const [taskEvaluations, setTaskEvaluations] = useState([]);
  const [mentorTaskFeedback, setMentorTaskFeedback] = useState([]);
  const [activeTask, setActiveTask] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [allTasksSubmitted, setAllTasksSubmitted] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const email = localStorage.getItem("email");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Fetch project data
  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await API.get(`/api/projects/?email=${email}`);
      
      const projectData = res.data.find(p => p._id === projectId);
      if (!projectData) {
        setError("Project not found");
        setLoading(false);
        return;
      }
      
      setProject(projectData);
      
      // Extract tasks from project data
      let extractedTasks = [];
      if (projectData.tasks && projectData.tasks.length > 0) {
        extractedTasks = projectData.tasks;
      } else {
        // Extract tasks from requirements
        const details = projectData.details || {};
        const reqText = details.requirements_text || "";
        extractedTasks = extractTasksFromRequirements(reqText);
      }
      setTasks(extractedTasks);
      
      // Set task solutions
      const solutions = projectData.task_solutions || Array(extractedTasks.length).fill("");
      setTaskSolutions(solutions);
      
      // Set task evaluations
      const evaluations = projectData.task_evaluations || [];
      setTaskEvaluations(evaluations);
      
      // Set mentor task feedback
      const mentorFeedback = projectData.mentor_task_feedback || [];
      setMentorTaskFeedback(mentorFeedback);
      
      // Check if all tasks are already evaluated
      const allEvaluated = evaluations.length > 0 && evaluations.every(e => e !== null && e !== undefined);
      setAllTasksSubmitted(allEvaluated);
      
    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId, email]);

  useEffect(() => {
    if (!token || role !== "student") {
      navigate("/login");
      return;
    }
    fetchProject();
  }, [token, role, navigate, fetchProject]);

  // Extract tasks from requirements text
  const extractTasksFromRequirements = (requirementsText) => {
    const extractedTasks = [];
    const lines = requirementsText.split('\n');
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
    
    return extractedTasks.length > 0 ? extractedTasks : [
      "Implement the core functionality",
      "Add proper error handling",
      "Test and optimize your solution",
      "Document your code"
    ];
  };

  // Save task solution with auto-save
  const saveTaskSolution = async (taskIndex, solution) => {
    try {
      setAutoSaveStatus("Saving...");
      const updatedSolutions = [...taskSolutions];
      updatedSolutions[taskIndex] = solution;
      setTaskSolutions(updatedSolutions);
      
      await API.post("/api/project/save-task/", {
        project_id: projectId,
        task_index: taskIndex,
        task_solution: solution
      });
      
      setAutoSaveStatus("Saved ✓");
      setTimeout(() => setAutoSaveStatus(""), 2000);
      
    } catch (err) {
      console.error("Error saving solution:", err);
      setAutoSaveStatus("Error saving!");
    }
  };

  // Save All Tasks Manually
  const saveAllTasksManually = async () => {
    setIsSavingAll(true);
    setAutoSaveStatus("💾 Saving all tasks...");
    
    try {
      const savePromises = tasks.map((task, index) => {
        return API.post("/api/project/save-task/", {
          project_id: projectId,
          task_index: index,
          task_solution: taskSolutions[index] || ""
        });
      });
      
      await Promise.all(savePromises);
      setAutoSaveStatus("✅ All tasks saved!");
      setTimeout(() => setAutoSaveStatus(""), 3000);
      
    } catch (err) {
      console.error("Error saving all tasks:", err);
      setAutoSaveStatus("❌ Error saving!");
      setTimeout(() => setAutoSaveStatus(""), 3000);
    } finally {
      setIsSavingAll(false);
    }
  };

  // SUBMIT ALL TASKS TOGETHER FOR AI EVALUATION
  const submitAllTasksForEvaluation = async () => {
    // First save all tasks
    setIsSavingAll(true);
    try {
      const savePromises = tasks.map((task, index) => {
        return API.post("/api/project/save-task/", {
          project_id: projectId,
          task_index: index,
          task_solution: taskSolutions[index] || ""
        });
      });
      await Promise.all(savePromises);
    } catch (err) {
      alert("Failed to save tasks. Please try again.");
      setIsSavingAll(false);
      return;
    }
    setIsSavingAll(false);
    
    // Check if all tasks have solutions
    const emptyTasks = taskSolutions.some(s => !s || !s.trim());
    if (emptyTasks) {
      alert("⚠️ Please complete all tasks before submitting for evaluation!");
      return;
    }

    setEvaluating(true);
    try {
      // Submit each task for evaluation
      const evaluationPromises = tasks.map((task, index) => {
        return API.post("/api/project/evaluate-task/", {
          project_id: projectId,
          task_index: index,
          task_solution: taskSolutions[index],
          task_description: task
        });
      });

      // Wait for all evaluations to complete
      const results = await Promise.all(evaluationPromises);
      
      // Check if all evaluations were successful
      const allSuccess = results.every(res => res.data.success);
      
      if (allSuccess) {
        // Update local state with all evaluations
        const updatedEvaluations = results.map((res, index) => ({
          score: res.data.evaluation.score,
          feedback: res.data.evaluation.feedback,
          suggestions: res.data.evaluation.suggestions,
          evaluated_at: new Date().toISOString()
        }));
        
        setTaskEvaluations(updatedEvaluations);
        setAllTasksSubmitted(true);
        
        // Calculate average score
        const totalScore = updatedEvaluations.reduce((sum, e) => sum + e.score, 0);
        const avgScore = Math.round(totalScore / updatedEvaluations.length);
        
        alert(`✅ All tasks evaluated successfully!\n📊 Average Score: ${avgScore}/100`);
      } else {
        alert("Some tasks failed to evaluate. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting tasks:", err);
      alert("Failed to evaluate tasks. Please try again.");
    } finally {
      setEvaluating(false);
    }
  };

  // Get task status
  const getTaskStatus = (index) => {
    const hasMentorFeedback = mentorTaskFeedback[index] !== null && mentorTaskFeedback[index] !== undefined;
    const hasAIEvaluation = taskEvaluations[index] !== null && taskEvaluations[index] !== undefined;
    const hasSolution = taskSolutions[index] && taskSolutions[index].trim();
    
    if (hasMentorFeedback) return "mentor-reviewed";
    if (hasAIEvaluation) return "ai-reviewed";
    if (hasSolution) return "in-progress";
    return "pending";
  };

  // Get task status icon
  const getTaskIcon = (index) => {
    const status = getTaskStatus(index);
    switch(status) {
      case "mentor-reviewed": return "✅";
      case "ai-reviewed": return "🤖";
      case "in-progress": return "✏️";
      default: return "📝";
    }
  };

  // Get task status label
  const getTaskLabel = (index) => {
    const status = getTaskStatus(index);
    switch(status) {
      case "mentor-reviewed": return "Mentor Reviewed";
      case "ai-reviewed": return "AI Evaluated";
      case "in-progress": return "In Progress";
      default: return "Not Started";
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Sidebar role="student" />
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner}>⏳</div>
          <h3>Loading project...</h3>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={styles.loadingContainer}>
        <Sidebar role="student" />
        <div style={styles.loadingContent}>
          <div style={styles.errorIcon}>🔍</div>
          <h3>Project not found</h3>
          <p>{error}</p>
          <button onClick={() => navigate("/student-dashboard")} style={styles.backButton}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentTask = tasks[activeTask];
  const currentSolution = taskSolutions[activeTask] || "";
  const currentEvaluation = taskEvaluations[activeTask];
  const currentMentorFeedback = mentorTaskFeedback[activeTask];
  const isMentorReviewed = currentMentorFeedback !== null && currentMentorFeedback !== undefined;

  // Calculate overall progress
  const completedTasks = taskSolutions.filter(s => s && s.trim()).length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div style={styles.container}>
      <Sidebar role="student" />
      
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => navigate("/student-dashboard")} style={styles.backButton}>
            ← Back to Dashboard
          </button>
          <h1 style={styles.pageTitle}>{project.title}</h1>
          <p style={styles.pageSubtitle}>{project.description}</p>
          
          {/* Project Status */}
          <div style={styles.projectStatus}>
            <span style={styles.statusBadge}>
              {allTasksSubmitted ? "✅ All Tasks Evaluated" : 
               completedTasks === totalTasks ? "📝 Ready for Evaluation" : 
               "⏳ In Progress"}
            </span>
            <span style={styles.taskCount}>
              {completedTasks} of {totalTasks} tasks completed
              {taskEvaluations.filter(e => e).length > 0 && 
                ` • ${taskEvaluations.filter(e => e).length} tasks evaluated`
              }
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBarContainer}>
          <div style={styles.progressBarWrapper}>
            <div style={{
              ...styles.progressBarFill,
              width: `${progressPercentage}%`,
              background: progressPercentage === 100 ? "#10b981" : "linear-gradient(90deg, #667eea, #764ba2)"
            }}></div>
          </div>
          <span style={styles.progressText}>{Math.round(progressPercentage)}% Complete</span>
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
                ...(getTaskStatus(index) === "mentor-reviewed" ? styles.taskNavButtonMentorReviewed : {}),
                ...(getTaskStatus(index) === "ai-reviewed" ? styles.taskNavButtonAIReviewed : {}),
                ...(getTaskStatus(index) === "in-progress" ? styles.taskNavButtonInProgress : {})
              }}
            >
              {getTaskIcon(index)} Task {index + 1}
              <span style={styles.taskNavStatus}>{getTaskLabel(index)}</span>
            </button>
          ))}
        </div>

        {/* Task Content */}
        <div style={styles.taskContent}>
          {/* Task Description */}
          <div style={styles.taskDescription}>
            <h3>Task {activeTask + 1}: {currentTask}</h3>
          </div>

          {/* Solution Input */}
          <div style={styles.solutionSection}>
            <div style={styles.solutionHeader}>
              <label style={styles.formLabel}>Your Solution</label>
              <span style={styles.autoSaveStatus}>{autoSaveStatus}</span>
            </div>
            <textarea
              value={currentSolution}
              onChange={(e) => {
                const newSolution = e.target.value;
                saveTaskSolution(activeTask, newSolution);
              }}
              placeholder="Write your solution here..."
              rows={8}
              style={styles.solutionTextarea}
              disabled={isMentorReviewed || allTasksSubmitted}
            />
          </div>

          {/* Show AI Evaluation for this task if already evaluated */}
          {currentEvaluation && (
            <div style={styles.evaluationResults}>
              <h4>🤖 AI Evaluation</h4>
              <div style={styles.evaluationScore}>
                Score: <span style={{ fontWeight: "bold", fontSize: "24px", color: currentEvaluation.score >= 70 ? "#10b981" : currentEvaluation.score >= 40 ? "#f59e0b" : "#ef4444" }}>
                  {currentEvaluation.score}/100
                </span>
              </div>
              <div style={styles.evaluationFeedback}>
                <strong>Feedback:</strong>
                <p>{currentEvaluation.feedback}</p>
              </div>
              {currentEvaluation.suggestions && (
                <div style={styles.evaluationSuggestions}>
                  <strong>💡 Suggestions for Improvement:</strong>
                  <p>{currentEvaluation.suggestions}</p>
                </div>
              )}
            </div>
          )}

          {/* Show Mentor Feedback if available */}
          {currentMentorFeedback && (
            <div id="mentor-feedback-section" style={styles.mentorFeedbackResults}>
              <h4>👨‍🏫 Mentor Review</h4>
              {currentMentorFeedback.rating && (
                <div style={styles.mentorRating}>
                  Rating: {"⭐".repeat(currentMentorFeedback.rating)} ({currentMentorFeedback.rating}/5)
                </div>
              )}
              {currentMentorFeedback.manual_score && (
                <div style={styles.mentorScore}>
                  Manual Score: <strong>{currentMentorFeedback.manual_score}/100</strong>
                </div>
              )}
              <div style={styles.mentorFeedbackText}>
                <strong>Feedback:</strong>
                <p>{currentMentorFeedback.feedback_text}</p>
              </div>
            </div>
          )}
        </div>

        {/* Submit All Tasks Section with Save All Button */}
        {!allTasksSubmitted && !isMentorReviewed && (
          <div style={styles.submitAllSection}>
            {/* Save All Tasks Button */}
            <div style={styles.saveAllSection}>
              <button
                onClick={saveAllTasksManually}
                disabled={isSavingAll || isMentorReviewed}
                style={{
                  ...styles.saveAllButton,
                  ...((isSavingAll || isMentorReviewed) ? styles.disabledButton : {})
                }}
              >
                {isSavingAll ? "⏳ Saving..." : "💾 Save All Tasks"}
              </button>
              <span style={styles.saveStatusText}>{autoSaveStatus}</span>
            </div>

            {completedTasks === totalTasks ? (
              <button
                onClick={submitAllTasksForEvaluation}
                disabled={evaluating || isSavingAll}
                style={{
                  ...styles.submitAllButton,
                  ...((evaluating || isSavingAll) ? styles.disabledButton : {})
                }}
              >
                {evaluating ? "⏳ Evaluating All Tasks..." : "🤖 Submit All Tasks for AI Evaluation"}
              </button>
            ) : (
              <div style={styles.incompleteMessage}>
                <p style={styles.warningText}>
                  ⚠️ Please complete all {totalTasks} tasks before submitting for AI evaluation.
                  <br />
                  <span style={styles.progressDetail}>
                    {completedTasks} of {totalTasks} tasks completed ({Math.round(progressPercentage)}%)
                  </span>
                </p>
                <div style={styles.incompleteProgress}>
                  {tasks.map((_, index) => (
                    <div
                      key={index}
                      style={{
                        ...styles.incompleteSegment,
                        background: taskSolutions[index] && taskSolutions[index].trim() ? "#10b981" : "#e5e7eb"
                      }}
                      title={`Task ${index + 1}: ${taskSolutions[index] && taskSolutions[index].trim() ? "Completed" : "Pending"}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Overall Results Summary */}
        {allTasksSubmitted && (
          <div style={styles.resultsSummary}>
            <h4>📊 Overall Results</h4>
            <div style={styles.resultsGrid}>
              {taskEvaluations.map((evaluation, index) => (
                <div key={index} style={styles.resultCard}>
                  <div style={styles.resultHeader}>
                    <span>Task {index + 1}</span>
                    <span style={{
                      ...styles.resultScore,
                      color: evaluation?.score >= 70 ? "#10b981" : evaluation?.score >= 40 ? "#f59e0b" : "#ef4444"
                    }}>
                      {evaluation?.score || 0}/100
                    </span>
                  </div>
                  <p style={styles.resultFeedback}>{evaluation?.feedback || ""}</p>
                </div>
              ))}
            </div>
            
            {/* Average Score */}
            {taskEvaluations.length > 0 && (
              <div style={styles.averageScore}>
                <strong>Average Score:</strong> 
                <span style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: Math.round(taskEvaluations.reduce((sum, e) => sum + (e?.score || 0), 0) / taskEvaluations.length) >= 70 ? "#10b981" : 
                         Math.round(taskEvaluations.reduce((sum, e) => sum + (e?.score || 0), 0) / taskEvaluations.length) >= 40 ? "#f59e0b" : "#ef4444"
                }}>
                  {Math.round(taskEvaluations.reduce((sum, e) => sum + (e?.score || 0), 0) / taskEvaluations.length)}/100
                </span>
              </div>
            )}
            
            {taskEvaluations.every(e => e !== null && e !== undefined) && (
              <div style={styles.completionMessage}>
                🎉 All tasks evaluated! Your project is complete.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f0f2f5",
  },
  loadingContainer: {
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
  },
  loadingSpinner: {
    fontSize: "48px",
    marginBottom: "20px",
  },
  errorIcon: {
    fontSize: "48px",
    marginBottom: "20px",
  },
  mainContent: {
    flex: 1,
    padding: "30px 40px",
    maxWidth: "1200px",
    margin: "0 auto",
    width: "100%",
  },
  header: {
    marginBottom: "25px",
  },
  backButton: {
    background: "#6c757d",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "15px",
  },
  pageTitle: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "0 0 8px 0",
    color: "#2c3e50",
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "#6c757d",
    margin: 0,
  },
  projectStatus: {
    marginTop: "10px",
    display: "flex",
    gap: "15px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  statusBadge: {
    padding: "6px 14px",
    background: "#e9ecef",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "500",
  },
  taskCount: {
    fontSize: "13px",
    color: "#6c757d",
  },
  progressBarContainer: {
    marginBottom: "20px",
    padding: "15px",
    background: "white",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  progressBarWrapper: {
    width: "100%",
    height: "8px",
    background: "#e9ecef",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    transition: "width 0.3s ease",
    borderRadius: "4px",
  },
  progressText: {
    display: "block",
    textAlign: "center",
    fontSize: "12px",
    color: "#6c757d",
    marginTop: "5px",
  },
  taskNav: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexWrap: "wrap",
    padding: "10px",
    background: "white",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  taskNavButton: {
    padding: "10px 16px",
    background: "white",
    border: "2px solid #e5e7eb",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    minWidth: "100px",
  },
  taskNavButtonActive: {
    borderColor: "#667eea",
    background: "#f0f0ff",
  },
  taskNavButtonMentorReviewed: {
    borderColor: "#f59e0b",
    background: "#fef3c7",
  },
  taskNavButtonAIReviewed: {
    borderColor: "#10b981",
    background: "#d1fae5",
  },
  taskNavButtonInProgress: {
    borderColor: "#3b82f6",
    background: "#dbeafe",
  },
  taskNavStatus: {
    fontSize: "10px",
    color: "#6c757d",
  },
  taskContent: {
    background: "white",
    borderRadius: "12px",
    padding: "25px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  taskDescription: {
    marginBottom: "20px",
    padding: "15px",
    background: "#f8f9fa",
    borderRadius: "8px",
    borderLeft: "4px solid #667eea",
  },
  solutionSection: {
    marginBottom: "20px",
  },
  solutionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  formLabel: {
    fontWeight: "600",
    color: "#2c3e50",
  },
  autoSaveStatus: {
    fontSize: "12px",
    color: "#6c757d",
  },
  solutionTextarea: {
    width: "100%",
    padding: "12px",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
    minHeight: "150px",
  },
  evaluationResults: {
    marginTop: "20px",
    padding: "20px",
    background: "#f0fdf4",
    borderRadius: "10px",
    border: "1px solid #bbf7d0",
  },
  evaluationScore: {
    fontSize: "18px",
    margin: "10px 0",
  },
  evaluationFeedback: {
    margin: "10px 0",
  },
  evaluationSuggestions: {
    margin: "10px 0",
    padding: "10px",
    background: "#fef3c7",
    borderRadius: "6px",
  },
  mentorFeedbackResults: {
    marginTop: "20px",
    padding: "20px",
    background: "#fef3c7",
    borderRadius: "10px",
    border: "1px solid #fcd34d",
  },
  mentorRating: {
    fontSize: "16px",
    margin: "5px 0",
  },
  mentorScore: {
    fontSize: "16px",
    margin: "5px 0",
  },
  mentorFeedbackText: {
    margin: "10px 0",
  },
  submitAllSection: {
    marginTop: "20px",
    padding: "20px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  saveAllSection: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    marginBottom: "15px",
    background: "#f8f9fa",
    borderRadius: "10px",
    border: "1px solid #e9ecef",
  },
  saveAllButton: {
    padding: "10px 24px",
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s",
    minWidth: "150px",
  },
  saveStatusText: {
    fontSize: "14px",
    color: "#6c757d",
    fontWeight: "500",
  },
  submitAllButton: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "all 0.2s",
  },
  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  incompleteMessage: {
    textAlign: "center",
    padding: "20px",
  },
  warningText: {
    color: "#f59e0b",
    fontSize: "16px",
    fontWeight: "500",
    marginBottom: "10px",
  },
  progressDetail: {
    fontSize: "14px",
    color: "#6c757d",
  },
  incompleteProgress: {
    display: "flex",
    gap: "4px",
    maxWidth: "400px",
    margin: "10px auto 0",
  },
  incompleteSegment: {
    flex: 1,
    height: "6px",
    borderRadius: "3px",
    transition: "background 0.3s",
  },
  resultsSummary: {
    marginTop: "20px",
    padding: "20px",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  resultsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "15px",
    marginTop: "15px",
  },
  resultCard: {
    padding: "15px",
    background: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  resultScore: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  resultFeedback: {
    fontSize: "13px",
    color: "#6c757d",
    margin: 0,
  },
  averageScore: {
    textAlign: "center",
    padding: "15px",
    marginTop: "15px",
    background: "#f8f9fa",
    borderRadius: "8px",
  },
  completionMessage: {
    textAlign: "center",
    padding: "15px",
    marginTop: "15px",
    background: "#d1fae5",
    borderRadius: "8px",
    color: "#065f46",
    fontSize: "16px",
    fontWeight: "500",
  },
};