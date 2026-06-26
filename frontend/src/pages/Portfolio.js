import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API from "../services/api";


// Animated Dotted Loading Spinner
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
    <p style={spinnerStyles.text}>Loading portfolio...</p>
  </div>
);

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState(null);
  const [editing, setEditing] = useState(false);
  const [hiddenProjects, setHiddenProjects] = useState([]);
  const [showAllProjects, setShowAllProjects] = useState(true);
  const [formData, setFormData] = useState({
    bio: "",
    skills: [],
    newSkill: "",
    education: [],
    experience: [],
    social_links: {
      linkedin: "",
      github: "",
      twitter: "",
      personal_website: ""
    }
  });
  const [newEdu, setNewEdu] = useState({ degree: "", institution: "", year: "", description: "" });
  const [newExp, setNewExp] = useState({ title: "", company: "", duration: "", description: "" });
  const [showEduForm, setShowEduForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const email = localStorage.getItem("email");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(`/api/portfolio/full/?email=${email}`);
      setPortfolio(res.data);
      
      setFormData({
        bio: res.data.student.bio || "",
        skills: res.data.student.skills || [],
        newSkill: "",
        education: res.data.student.education || [],
        experience: res.data.student.experience || [],
        social_links: res.data.student.social_links || {
          linkedin: "", github: "", twitter: "", personal_website: ""
        }
      });
    } catch (err) {
      console.error("Error fetching portfolio:", err);
      alert("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (!token || role !== "student") {
      navigate("/login");
      return;
    }
    fetchPortfolio();
  }, [token, role, navigate, fetchPortfolio]);

  const addSkill = () => {
    if (formData.newSkill.trim() && !formData.skills.includes(formData.newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.newSkill.trim()],
        newSkill: ""
      });
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skillToRemove)
    });
  };

  const addEducation = () => {
    if (newEdu.degree && newEdu.institution) {
      setFormData({
        ...formData,
        education: [...formData.education, { ...newEdu, id: Date.now() }]
      });
      setNewEdu({ degree: "", institution: "", year: "", description: "" });
      setShowEduForm(false);
    }
  };

  const removeEducation = (index) => {
    const updated = [...formData.education];
    updated.splice(index, 1);
    setFormData({ ...formData, education: updated });
  };

  const addExperience = () => {
    if (newExp.title && newExp.company) {
      setFormData({
        ...formData,
        experience: [...formData.experience, { ...newExp, id: Date.now() }]
      });
      setNewExp({ title: "", company: "", duration: "", description: "" });
      setShowExpForm(false);
    }
  };

  const removeExperience = (index) => {
    const updated = [...formData.experience];
    updated.splice(index, 1);
    setFormData({ ...formData, experience: updated });
  };

  const updateSocialLink = (platform, value) => {
    setFormData({
      ...formData,
      social_links: { ...formData.social_links, [platform]: value }
    });
  };

  const saveProfile = async () => {
    try {
      await API.post("/api/portfolio/update/", {
        email: email,
        bio: formData.bio,
        skills: formData.skills,
        education: formData.education,
        experience: formData.experience,
        social_links: formData.social_links
      });
      alert("Profile updated successfully!");
      setEditing(false);
      fetchPortfolio();
    } catch (err) {
      alert("Failed to update profile");
    }
  };

  const toggleHideProject = (projectId) => {
    if (hiddenProjects.includes(projectId)) {
      setHiddenProjects(hiddenProjects.filter(id => id !== projectId));
    } else {
      setHiddenProjects([...hiddenProjects, projectId]);
    }
  };

  const downloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      const visibleProjects = portfolio.projects.filter(p => !hiddenProjects.includes(p.id));
      const visibleProjectIds = visibleProjects.map(p => p.id);
      
      const res = await await API.post("/api/portfolio/generate-pdf/", {
        email: email,
        include_projects: visibleProjectIds
      });
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(res.data.html_content);
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      console.error("PDF Error:", err);
      alert("Failed to generate PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar role="student" />
        <div style={styles.content}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div style={styles.container}>
        <Sidebar role="student" />
        <div style={styles.content}>
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📁</div>
            <h2>No Portfolio Data Yet</h2>
            <p>Complete projects to build your portfolio!</p>
            <button onClick={() => navigate("/my-projects")} style={styles.emptyBtn}>
              View My Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { student, projects } = portfolio;
  
  let displayedProjects = projects;
  if (!showAllProjects) {
    displayedProjects = projects.filter(p => !hiddenProjects.includes(p.id));
  }
  
  const hiddenCount = hiddenProjects.length;

  return (
    <div style={styles.container}>
      <Sidebar role="student" />
      
      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Portfolio</h1>
            <p style={styles.subtitle}>Showcase your skills, projects, and achievements</p>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={downloadPDF} disabled={generatingPdf} style={styles.pdfBtn}>
              📄 {generatingPdf ? "Generating..." : "Download PDF"}
            </button>
            <button onClick={() => setEditing(!editing)} style={styles.editBtn}>
              {editing ? "Cancel" : "✏️ Edit Profile"}
            </button>
          </div>
        </div>

        {editing ? (
          <div style={styles.editCard}>
            <h3>Edit Portfolio</h3>
            
            <div style={styles.formGroup}>
              <label>Bio / About Me</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows="3"
                style={styles.textarea}
                placeholder="Tell us about yourself..."
              />
            </div>

            <div style={styles.formGroup}>
              <label>Skills</label>
              <div style={styles.skillInputGroup}>
                <input
                  type="text"
                  value={formData.newSkill}
                  onChange={(e) => setFormData({...formData, newSkill: e.target.value})}
                  placeholder="Add a skill (e.g., Python, React)"
                  style={styles.input}
                  onKeyPress={(e) => e.key === "Enter" && addSkill()}
                />
                <button onClick={addSkill} style={styles.addBtn}>Add</button>
              </div>
              <div style={styles.skillsList}>
                {formData.skills.map((skill, idx) => (
                  <span key={idx} style={styles.skillTag}>
                    {skill}
                    <button onClick={() => removeSkill(skill)} style={styles.removeBtn}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label>Education</label>
              {formData.education.map((edu, idx) => (
                <div key={idx} style={styles.listItem}>
                  <div>
                    <strong>{edu.degree}</strong> - {edu.institution}
                    <div style={styles.listSub}>{edu.year}</div>
                  </div>
                  <button onClick={() => removeEducation(idx)} style={styles.removeListItemBtn}>×</button>
                </div>
              ))}
              {showEduForm ? (
                <div style={styles.subForm}>
                  <input type="text" placeholder="Degree" value={newEdu.degree} onChange={(e) => setNewEdu({...newEdu, degree: e.target.value})} style={styles.input} />
                  <input type="text" placeholder="Institution" value={newEdu.institution} onChange={(e) => setNewEdu({...newEdu, institution: e.target.value})} style={styles.input} />
                  <input type="text" placeholder="Year" value={newEdu.year} onChange={(e) => setNewEdu({...newEdu, year: e.target.value})} style={styles.input} />
                  <textarea placeholder="Description" value={newEdu.description} onChange={(e) => setNewEdu({...newEdu, description: e.target.value})} rows="2" style={styles.textarea} />
                  <div style={styles.subFormButtons}>
                    <button onClick={addEducation} style={styles.saveSubBtn}>Save</button>
                    <button onClick={() => setShowEduForm(false)} style={styles.cancelSubBtn}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowEduForm(true)} style={styles.addFieldBtn}>+ Add Education</button>
              )}
            </div>

            <div style={styles.formGroup}>
              <label>Experience</label>
              {formData.experience.map((exp, idx) => (
                <div key={idx} style={styles.listItem}>
                  <div>
                    <strong>{exp.title}</strong> at {exp.company}
                    <div style={styles.listSub}>{exp.duration}</div>
                  </div>
                  <button onClick={() => removeExperience(idx)} style={styles.removeListItemBtn}>×</button>
                </div>
              ))}
              {showExpForm ? (
                <div style={styles.subForm}>
                  <input type="text" placeholder="Job Title" value={newExp.title} onChange={(e) => setNewExp({...newExp, title: e.target.value})} style={styles.input} />
                  <input type="text" placeholder="Company" value={newExp.company} onChange={(e) => setNewExp({...newExp, company: e.target.value})} style={styles.input} />
                  <input type="text" placeholder="Duration" value={newExp.duration} onChange={(e) => setNewExp({...newExp, duration: e.target.value})} style={styles.input} />
                  <textarea placeholder="Description" value={newExp.description} onChange={(e) => setNewExp({...newExp, description: e.target.value})} rows="2" style={styles.textarea} />
                  <div style={styles.subFormButtons}>
                    <button onClick={addExperience} style={styles.saveSubBtn}>Save</button>
                    <button onClick={() => setShowExpForm(false)} style={styles.cancelSubBtn}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowExpForm(true)} style={styles.addFieldBtn}>+ Add Experience</button>
              )}
            </div>

            <div style={styles.formGroup}>
              <label>Social Links</label>
              <input type="url" placeholder="LinkedIn URL" value={formData.social_links.linkedin} onChange={(e) => updateSocialLink("linkedin", e.target.value)} style={styles.input} />
              <input type="url" placeholder="GitHub URL" value={formData.social_links.github} onChange={(e) => updateSocialLink("github", e.target.value)} style={styles.input} />
              <input type="url" placeholder="Twitter URL" value={formData.social_links.twitter} onChange={(e) => updateSocialLink("twitter", e.target.value)} style={styles.input} />
              <input type="url" placeholder="Personal Website" value={formData.social_links.personal_website} onChange={(e) => updateSocialLink("personal_website", e.target.value)} style={styles.input} />
            </div>

            <div style={styles.editActions}>
              <button onClick={() => setEditing(false)} style={styles.cancelEditBtn}>Cancel</button>
              <button onClick={saveProfile} style={styles.saveEditBtn}>Save Changes</button>
            </div>
          </div>
        ) : (
          <>
            <div style={styles.profileCard}>
              <div style={styles.profileHeader}>
                <div style={styles.avatar}>
                  {student.name?.charAt(0).toUpperCase() || "S"}
                </div>
                <div style={styles.profileInfo}>
                  <h2 style={styles.profileName}>{student.name}</h2>
                  <p style={styles.profileEmail}>{student.email}</p>
                  <p style={styles.profileBio}>{student.bio}</p>
                  
                  {(student.social_links?.linkedin || student.social_links?.github || student.social_links?.twitter) && (
                    <div style={styles.socialLinks}>
                      {student.social_links?.linkedin && <a href={student.social_links.linkedin} target="_blank" rel="noopener noreferrer" style={styles.socialLink}>🔗 LinkedIn</a>}
                      {student.social_links?.github && <a href={student.social_links.github} target="_blank" rel="noopener noreferrer" style={styles.socialLink}>💻 GitHub</a>}
                      {student.social_links?.twitter && <a href={student.social_links.twitter} target="_blank" rel="noopener noreferrer" style={styles.socialLink}>🐦 Twitter</a>}
                    </div>
                  )}
                </div>
              </div>
              
              {student.skills && student.skills.length > 0 && (
                <div style={styles.skillsSection}>
                  <h4>🎯 Skills</h4>
                  <div style={styles.skillsList}>
                    {student.skills.map((skill, idx) => (
                      <span key={idx} style={styles.skillTag}>{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Education Section */}
            {student.education && student.education.length > 0 && (
              <div style={styles.sectionCard}>
                <h3>🎓 Education</h3>
                {student.education.map((edu, idx) => (
                  <div key={idx} style={styles.timelineItem}>
                    <div style={styles.timelineDot}></div>
                    <div>
                      <h4>{edu.degree}</h4>
                      <p>{edu.institution} | {edu.year}</p>
                      {edu.description && <p style={styles.timelineDesc}>{edu.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Experience Section */}
            {student.experience && student.experience.length > 0 && (
              <div style={styles.sectionCard}>
                <h3>💼 Experience</h3>
                {student.experience.map((exp, idx) => (
                  <div key={idx} style={styles.timelineItem}>
                    <div style={styles.timelineDot}></div>
                    <div>
                      <h4>{exp.title}</h4>
                      <p>{exp.company} | {exp.duration}</p>
                      {exp.description && <p style={styles.timelineDesc}>{exp.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Projects Section - WITHOUT SCORES */}
            <div style={styles.sectionCard}>
              <div style={styles.projectsHeader}>
                <h3 style={{ margin: 0 }}>📂 Completed Projects</h3>
                <div style={styles.projectsControls}>
                  <span style={styles.projectCount}>
                    Showing {displayedProjects.length} of {projects.length} projects
                    {hiddenCount > 0 && ` (${hiddenCount} hidden from PDF)`}
                  </span>
                  <button onClick={() => setShowAllProjects(!showAllProjects)} style={styles.toggleViewBtn}>
                    {showAllProjects ? "Hide Hidden Projects" : "Show All Projects"}
                  </button>
                </div>
              </div>
              
              {displayedProjects.length === 0 ? (
                <div style={styles.noProjectsMessage}>
                  <p>No projects to display.</p>
                  {hiddenCount > 0 && (
                    <button onClick={() => setShowAllProjects(true)} style={styles.resetBtn}>
                      Show All Projects
                    </button>
                  )}
                </div>
              ) : (
                displayedProjects.map((project, idx) => {
                  const isHidden = hiddenProjects.includes(project.id);
                  const originalIndex = projects.findIndex(p => p.id === project.id);
                  
                  return (
                    <div key={project.id} style={{...styles.projectCard, opacity: isHidden && !showAllProjects ? 0.6 : 1}}>
                      <div style={styles.projectHeader}>
                        <h4 style={styles.projectTitle}>{project.title}</h4>
                        {/* SCORES COMPLETELY REMOVED - Sirf project title */}
                      </div>
                      <p style={styles.projectDesc}>{project.description}</p>
                      
                      {/* Mentor Feedback */}
                      {project.mentor_feedback && (
                        <div style={styles.mentorFeedback}>
                          <strong>👨‍🏫 Mentor:</strong> {project.mentor_name}
                          <p>"{project.mentor_feedback}"</p>
                        </div>
                      )}
                      
                      <div style={styles.projectActions}>
                        <button onClick={() => setExpandedProject(expandedProject === originalIndex ? null : originalIndex)} style={styles.detailsBtn}>
                          {expandedProject === originalIndex ? "Hide Details" : "View Details"}
                        </button>
                        <button onClick={() => toggleHideProject(project.id)} style={{...styles.hideBtn, backgroundColor: isHidden ? "#27ae60" : "#e74c3c", color: "white"}}>
                          {isHidden ? "✓ Show in PDF" : "✗ Hide from PDF"}
                        </button>
                      </div>
                      
                      {expandedProject === originalIndex && (
                        <div style={styles.detailsBox}>
                          <h5>📋 Project Details</h5>
                          <p><strong>Domain:</strong> {project.domain || "N/A"}</p>
                          <p><strong>Level:</strong> {project.level || "N/A"}</p>
                          <p><strong>Completed:</strong> {project.completed_at ? new Date(project.completed_at).toLocaleDateString() : "N/A"}</p>
                          
                          {/* Mentor Feedback Details */}
                          {project.mentor_feedback && (
                            <>
                              <p><strong>👨‍🏫 Mentor Feedback:</strong></p>
                              <p style={{ backgroundColor: "#fef3c7", padding: "10px", borderRadius: "6px" }}>
                                "{project.mentor_feedback}"
                              </p>
                              {project.mentor_rating && (
                                <p><strong>Rating:</strong> {"⭐".repeat(project.mentor_rating)} ({project.mentor_rating}/5)</p>
                              )}
                            </>
                          )}
                          
                          {/* AI Feedback - Hidden by default, show if no mentor feedback */}
                          {!project.mentor_feedback && project.ai_feedback && (
                            <>
                              <p><strong>🤖 AI Review:</strong> {project.ai_feedback.final_feedback || "No detailed feedback"}</p>
                              {project.ai_feedback.strengths && project.ai_feedback.strengths.length > 0 && (
                                <>
                                  <p><strong>✅ Strengths:</strong></p>
                                  <ul>{project.ai_feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                </>
                              )}
                              {project.ai_feedback.improvements && project.ai_feedback.improvements.length > 0 && (
                                <>
                                  <p><strong>📈 Areas for Improvement:</strong></p>
                                  <ul>{project.ai_feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", backgroundColor: "#f4f7f6", minHeight: "100vh" },
  content: { flex: 1, padding: "30px", maxWidth: "1200px", margin: "0 auto", width: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "15px" },
  headerButtons: { display: "flex", gap: "10px" },
  title: { margin: "0 0 5px 0", fontSize: "28px", color: "#2c3e50" },
  subtitle: { margin: 0, color: "#666" },
  editBtn: { padding: "10px 20px", backgroundColor: "#3498db", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  pdfBtn: { padding: "10px 20px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  
  editCard: { backgroundColor: "white", borderRadius: "16px", padding: "25px", marginBottom: "25px" },
  formGroup: { marginBottom: "20px" },
  input: { width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", resize: "vertical" },
  skillInputGroup: { display: "flex", gap: "10px", marginBottom: "10px" },
  addBtn: { padding: "10px 20px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  removeBtn: { background: "none", border: "none", color: "#e74c3c", fontSize: "16px", marginLeft: "8px", cursor: "pointer" },
  addFieldBtn: { padding: "8px 16px", backgroundColor: "#3498db", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  subForm: { marginTop: "10px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" },
  subFormButtons: { display: "flex", gap: "10px", marginTop: "10px" },
  saveSubBtn: { padding: "8px 16px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" },
  cancelSubBtn: { padding: "8px 16px", backgroundColor: "#95a5a6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "8px", marginBottom: "8px" },
  listSub: { fontSize: "12px", color: "#666" },
  removeListItemBtn: { background: "none", border: "none", color: "#e74c3c", fontSize: "20px", cursor: "pointer" },
  editActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #eee" },
  cancelEditBtn: { padding: "10px 20px", backgroundColor: "#95a5a6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  saveEditBtn: { padding: "10px 20px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  
  profileCard: { backgroundColor: "white", borderRadius: "16px", padding: "25px", marginBottom: "25px" },
  profileHeader: { display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" },
  avatar: { width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold", color: "white" },
  profileInfo: { flex: 1 },
  profileName: { margin: "0 0 5px 0", fontSize: "22px" },
  profileEmail: { margin: "0 0 5px 0", color: "#666" },
  profileBio: { margin: "0 0 10px 0", color: "#888", fontSize: "14px" },
  socialLinks: { display: "flex", gap: "15px", marginTop: "10px", flexWrap: "wrap" },
  socialLink: { color: "#3498db", textDecoration: "none", fontSize: "13px" },
  skillsSection: { marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #eee" },
  skillsList: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" },
  skillTag: { padding: "5px 12px", backgroundColor: "#e8f4fd", borderRadius: "20px", fontSize: "13px", color: "#3498db" },
  
  sectionCard: { backgroundColor: "white", borderRadius: "16px", padding: "25px", marginBottom: "25px" },
  timelineItem: { display: "flex", gap: "15px", marginBottom: "20px", position: "relative" },
  timelineDot: { width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#3498db", marginTop: "5px" },
  timelineDesc: { fontSize: "13px", color: "#666", marginTop: "5px" },
  
  projectsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" },
  projectsControls: { display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" },
  projectCount: { fontSize: "12px", color: "#666" },
  toggleViewBtn: { padding: "6px 12px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  resetBtn: { marginTop: "10px", padding: "8px 16px", backgroundColor: "#3498db", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  noProjectsMessage: { textAlign: "center", padding: "40px", backgroundColor: "#f8f9fa", borderRadius: "12px" },
  
  projectCard: { border: "1px solid #eee", borderRadius: "12px", padding: "20px", marginBottom: "15px", transition: "all 0.2s" },
  projectHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" },
  projectTitle: { margin: 0, fontSize: "18px" },
  projectDesc: { color: "#666", fontSize: "13px", margin: "10px 0" },
  mentorFeedback: { backgroundColor: "#fef3c7", padding: "12px", borderRadius: "8px", marginTop: "10px", fontSize: "13px" },
  projectActions: { display: "flex", gap: "10px", marginTop: "10px" },
  detailsBtn: { background: "none", border: "1px solid #3498db", color: "#3498db", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  hideBtn: { border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "white" },
  detailsBox: { marginTop: "15px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px", fontSize: "13px" },
  
  emptyState: { textAlign: "center", padding: "60px" },
  emptyIcon: { fontSize: "64px", marginBottom: "20px" },
  emptyBtn: { marginTop: "20px", padding: "10px 20px", backgroundColor: "#3498db", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }
};

const spinnerStyles = {
  container: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px" },
  spinner: { display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" },
  dot: { width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#667eea", animation: "dotPulse 1.4s ease-in-out infinite" },
  text: { marginTop: "20px", color: "#666", fontSize: "14px" }
};

// Add CSS to hide stats cards when printing PDF
const printStyles = document.createElement("style");
printStyles.textContent = `
  @media print {
    .no-print {
      display: none !important;
    }
  }
`;
if (!document.querySelector('#print-styles')) {
  printStyles.id = 'print-styles';
  document.head.appendChild(printStyles);
}

const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes dotPulse { 0%,80%,100% { transform: scale(0.6); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }`;
if (!document.querySelector('#portfolio-styles')) { styleSheet.id = 'portfolio-styles'; document.head.appendChild(styleSheet); }