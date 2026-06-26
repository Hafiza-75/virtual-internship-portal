import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

export default function Assessment() {
  const navigate = useNavigate();

  // ================= AUTH =================
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email");

  // ================= STATES =================
  const [form, setForm] = useState({
    domain: "",
    level: "",
    num_questions: 10,
  });

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false); // Prevents multiple submissions
  const [result, setResult] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ================= PROTECT PAGE =================
  useEffect(() => {
    if (!token || role !== "student") {
      setShowAuthModal(true);
    }
  }, [token, role]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ================= GENERATE QUIZ =================
  const generateQuiz = async () => {
    if (!form.domain || !form.level) {
      alert("Please select domain and level");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/api/generate-quiz/", form);
      if (res.data.quiz) {
        setQuestions(res.data.quiz);
        setStarted(true);
        setResult(null);
      }
    } catch (error) {
      alert("Error: Quiz is not generating.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qText, selectedOption) => {
    setAnswers({ ...answers, [qText]: selectedOption });
  };

  // ================= SUBMIT QUIZ =================
  const submitQuiz = async () => {
    if (submitLoading) return; // Stop if already submitting

    setSubmitLoading(true);
    try {
      const res = await API.post("/api/submit-quiz/", {
        domain: form.domain,
        level: form.level,
        questions,
        answers,
        email,
      });
      setResult(res.data);
      setStarted(false);
      setQuestions([]);
      setAnswers({});
    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed!");
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetAssessment = () => {
    setForm({ domain: "", level: "", num_questions: 10 });
    setQuestions([]);
    setAnswers({});
    setStarted(false);
    setResult(null);
  };

  return (
    <div style={styles.container}>
      {/* ================= AUTH MODAL ================= */}
      {showAuthModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Access Denied</h3>
            <p>Please login as a student to access the AI Assessment.</p>
            <button onClick={() => navigate("/login")} style={styles.primaryBtn}>Go to Login</button>
          </div>
        </div>
      )}

      {/* ================= FORM ================= */}
      {!started && !result && (
        <div style={styles.card}>
          <h2 style={styles.heading}>Start Your AI Assessment</h2>
          <p style={styles.subText}>Skill check before you dive into internships.</p>
          
          <input name="domain" placeholder="e.g. Python, React, AI" value={form.domain} onChange={handleChange} style={styles.input} />
          
          <select name="level" onChange={handleChange} value={form.level} style={styles.input}>
            <option value="">Select Difficulty</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <select name="num_questions" onChange={handleChange} value={form.num_questions} style={styles.input}>
            <option value="10">10 Questions</option>
            <option value="20">20 Questions</option>
          </select>

          <button onClick={generateQuiz} disabled={loading} style={styles.primaryBtn}>
            {loading ? "AI is preparing questions..." : "Generate Quiz"}
          </button>
        </div>
      )}

      {/* ================= QUIZ ================= */}
      {started && (
        <div style={{ animation: "fadeIn 0.5s" }}>
          <h2 style={styles.heading}>Topic: {form.domain}</h2>
          {questions.map((q, i) => (
            <div key={i} style={styles.questionCard}>
              <p style={styles.qText}><b>{i + 1}.</b> {q.question}</p>
              <div style={styles.optionsGrid}>
                {q.options.map((opt, j) => (
                  <button
                    key={j}
                    onClick={() => handleAnswer(q.question, opt)}
                    style={{
                      ...styles.optionBtn,
                      backgroundColor: answers[q.question] === opt ? "#800000" : "#fff",
                      color: answers[q.question] === opt ? "#fff" : "#333",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={submitQuiz} disabled={submitLoading} style={styles.submitBtn}>
            {submitLoading ? "Calculating Results..." : "Submit Assessment"}
          </button>
        </div>
      )}

      {/* ================= RESULT (TERMINAL STYLE) ================= */}
      {result && (
        <div style={styles.terminalFrame}>
          <div style={styles.terminalHeader}>
            <div style={styles.dotRed}></div>
            <div style={styles.dotYellow}></div>
            <div style={styles.dotGreen}></div>
            <span style={styles.terminalTitle}>Assessment_Report.sh</span>
          </div>
          <div style={styles.terminalBody}>
            <h2 style={{ color: "#f1c40f" }}>&gt; Final Analysis Complete</h2>
            <p><b>[Domain]:</b> {form.domain}</p>
            <p><b>[Score]:</b> <span style={{ color: result.score > 50 ? "#2ecc71" : "#e74c3c" }}>{result.score} </span></p>
            <p><b>[Status]:</b> {result.level}</p>
            
            <div style={styles.recommendationBox}>
              <h4>AI Recommendation:</h4>
              <p>{result.recommendation}</p>
            </div>

            <div style={styles.projectBox}>
              <span style={{ color: "#f1c40f" }}>Suggested Project:</span>
              <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{result.project?.title || "Project Title"}</p>
              
              <Link to="/my-projects" style={styles.workspaceBtn}>
                Open Workspace →
              </Link>
            </div>

            <button onClick={resetAssessment} style={styles.resetBtn}>
              Attempt Another Assessment?
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: "40px 20px", maxWidth: "900px", margin: "auto", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  card: { background: "white", padding: "40px", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", textAlign: "center" },
  heading: { color: "#800000", marginBottom: "10px" },
  subText: { color: "#666", marginBottom: "30px" },
  input: { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" },
  primaryBtn: { width: "100%", padding: "15px", border: "none", borderRadius: "8px", background: "#800000", color: "#f1c40f", fontWeight: "bold", cursor: "pointer", transition: "0.3s" },
  
  // MCQ Styling
  questionCard: { background: "white", padding: "25px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  qText: { fontSize: "1.1rem", marginBottom: "15px" },
  optionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  optionBtn: { padding: "12px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", textAlign: "left", transition: "0.2s" },
  submitBtn: { background: "#ffbd2e", color: "black", padding: "15px 30px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "1.1rem", width: "100%" },

  // Terminal Styles
  terminalFrame: { background: "#0f111d", borderRadius: "10px", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", marginTop: "30px" },
  terminalHeader: { background: "#333", padding: "10px 15px", display: "flex", alignItems: "center", gap: "8px" },
  dotRed: { width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f56" },
  dotYellow: { width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e" },
  dotGreen: { width: "12px", height: "12px", borderRadius: "50%", background: "#27c93f" },
  terminalTitle: { color: "#bbb", fontSize: "0.9rem", marginLeft: "10px", fontFamily: "monospace" },
  terminalBody: { padding: "30px", color: "#ddd", lineHeight: "1.6", fontFamily: "'Courier New', Courier, monospace" },
  recommendationBox: { borderLeft: "4px solid #800000", paddingLeft: "15px", margin: "20px 0", background: "#2a2a2a", padding: "15px" },
  projectBox: { background: "#252525", padding: "20px", borderRadius: "8px", border: "1px dashed #444", marginBottom: "20px" },
  workspaceBtn: { display: "inline-block", marginTop: "15px", background: "#f1c40f", color: "#800000", padding: "10px 20px", borderRadius: "5px", textDecoration: "none", fontWeight: "bold" },
  resetBtn: { background: "transparent", border: "1px solid #666", color: "#aaa", padding: "8px 15px", cursor: "pointer", borderRadius: "5px" },

  // Modal Style
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "30px", borderRadius: "10px", textAlign: "center", maxWidth: "400px" }
};