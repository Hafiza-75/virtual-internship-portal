import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  CheckCircle, 
  Cpu, 
  Rocket, 
  Users, 
  Quote,
  XCircle 
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);

  // Auth Checks
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const handleStartAssessment = () => {
    // Check if user is logged in AND is a student
    if (token && role === "student") {
      navigate("/assessment");
    } else {
      // Admin, Mentor, or Logged Out users will see this
      setShowPopup(true);
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div style={styles.pageWrapper}>
      {/* --- AUTH POPUP / MODAL --- */}
      <AnimatePresence>
        {showPopup && (
          <div style={styles.modalOverlay}>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={styles.modalContent}
            >
              <XCircle 
                size={50} 
                color="#911825" 
                style={{ marginBottom: "15px", cursor: "pointer" }} 
                onClick={() => setShowPopup(false)}
              />
              <h2 style={{ color: "#0f111d" }}>Access Restricted</h2>
              <p style={{ color: "#555", margin: "10px 0 20px" }}>
                The AI Assessment is exclusively for **Students**. 
                {role ? ` (Current role: ${role})` : " Please login first."}
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button 
                  onClick={() => navigate("/login")} 
                  style={{ ...styles.mainBtn, padding: "10px 20px" }}
                >
                  Go to Login
                </button>
                <button 
                  onClick={() => setShowPopup(false)} 
                  style={{ ...styles.mainBtn, backgroundColor: "#ccc", color: "#333", padding: "10px 20px" }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- HERO SECTION --- */}
      <section style={styles.heroSection}>
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          style={styles.heroContent}
        >
          <h1 style={styles.mainTitle}>
            AI-Supported <span style={{ color: "#f7d569" }}>Virtual Internship</span> Hub
          </h1>
          <p style={styles.heroSubText}>
            Bridge the gap between academia and freelancing. Experience real-world projects, 
            get AI-driven feedback, and build a winning portfolio.
          </p>
          
          <motion.button 
            whileHover={{ scale: 1.05, backgroundColor: "#f7c25a" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartAssessment} 
            style={styles.mainBtn}
          >
            Start Assessment <ArrowRight size={18} style={{ marginLeft: "8px" }} />
          </motion.button>
        </motion.div>
      </section>

      {/* Baqi sections same rahen ge... */}
      <section style={styles.purposeSection}>
        <div style={styles.container}>
          <h2 style={styles.sectionHeading}>What You'll Get</h2>
          <div style={styles.grid}>
            <FeatureCard 
              icon={<Cpu color="#911825" size={28} />}
              title="AI Assessment"
              desc="Identify your strengths with our intelligent skill evaluator."
            />
            <FeatureCard 
              icon={<Rocket color="#911825" size={28} />}
              title="Smart Projects"
              desc="Work on tasks recommended specifically for your skill level."
            />
            <FeatureCard 
              icon={<Users color="#911825" size={28} />}
              title="Career Ready"
              desc="Build a portfolio ready for Upwork and Fiverr effortlessly."
            />
          </div>
        </div>
      </section>

      <section style={styles.detailSection}>
        <div style={styles.container}>
          <div style={styles.flexRow}>
            <motion.div 
              initial={{ x: -30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={styles.halfWidth}
            >
              <h2 style={{ color: "#911825", fontSize: "2.2rem" }}>Up-skill Your Skills</h2>
              <p style={styles.paragraph}>
                In today's competitive market, a degree is just the start. Our platform 
                simulates a **Real Internship** environment where AI evaluates your code, 
                design, and logic.
              </p>
              <ul style={styles.list}>
                <li><CheckCircle size={18} color="#f7c25a" /> Personalized Career Tips</li>
                <li><CheckCircle size={18} color="#f7c25a" /> Automated Design & Code Review</li>
                <li><CheckCircle size={18} color="#f7c25a" /> Industry-Standard Portfolio</li>
              </ul>
            </motion.div>
            
            <motion.div 
              initial={{ x: 30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={styles.halfWidth}
            >
              <img 
                src="https://cdn-icons-png.flaticon.com/512/2103/2103633.png" 
                alt="Growth Illustration" 
                style={styles.sideImage}
              />
            </motion.div>
          </div>
        </div>
      </section>

      <section style={styles.quoteSection}>
        <div style={styles.container}>
          <Quote size={20} color="#f7d569" style={{ marginBottom: "8px" }} />
          <p style={styles.quoteText}>
            "The only way to do great work is to love what you do."
          </p>
          <span style={styles.quoteRef}>— Steve Jobs</span>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div whileHover={{ y: -5 }} style={styles.card}>
    <div style={styles.iconBox}>{icon}</div>
    <h3 style={styles.cardTitle}>{title}</h3>
    <p style={styles.cardDesc}>{desc}</p>
  </motion.div>
);

const styles = {
  pageWrapper: { backgroundColor: "#f4f4f2", color: "#0f111d", overflowX: "hidden" },
  container: { maxWidth: "1100px", margin: "0 auto", padding: "0 20px" },
  heroSection: { minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#911825", color: "#ffffff", textAlign: "center", padding: "60px 20px" },
  mainTitle: { fontSize: "2.8rem", fontWeight: "800", marginBottom: "15px" },
  heroSubText: { fontSize: "1.1rem", maxWidth: "700px", margin: "0 auto 30px", opacity: 0.9 },
  mainBtn: { backgroundColor: "#f7d569", color: "#0f111d", border: "none", padding: "12px 30px", fontSize: "1rem", fontWeight: "bold", borderRadius: "50px", cursor: "pointer", display: "inline-flex", alignItems: "center" },
  purposeSection: { padding: "60px 0", textAlign: "center" },
  sectionHeading: { fontSize: "2rem", marginBottom: "40px", color: "#911825" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" },
  card: { backgroundColor: "#ffffff", padding: "25px", borderRadius: "15px", boxShadow: "0 8px 20px rgba(0,0,0,0.05)" },
  iconBox: { marginBottom: "12px", display: "flex", justifyContent: "center" },
  cardTitle: { fontSize: "1.2rem", marginBottom: "8px", color: "#911825" },
  cardDesc: { color: "#555", fontSize: "0.9rem" },
  detailSection: { padding: "60px 0", backgroundColor: "#ffffff" },
  flexRow: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "40px" },
  halfWidth: { flex: "1 1 400px" },
  sideImage: { width: "100%", maxWidth: "350px", display: "block", margin: "0 auto" },
  paragraph: { fontSize: "1rem", lineHeight: "1.7", margin: "15px 0", color: "#444" },
  list: { listStyle: "none", padding: 0, lineHeight: "2", fontWeight: "600" },
  quoteSection: { padding: "30px 0", textAlign: "center", backgroundColor: "#0f111d", color: "#ffffff" },
  quoteText: { fontSize: "1.2rem", fontStyle: "italic", marginBottom: "5px" },
  quoteRef: { color: "#f7d569", fontSize: "0.85rem", fontWeight: "600" },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px"
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    maxWidth: "450px",
    width: "100%",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
  }
};

export default Landing;