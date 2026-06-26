import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// ================= COMPONENTS =================
import Header from "./components/Header";
import Footer from "./components/Footer";
import Chatbot from "./components/Chatbot";
import ProtectedRoute from "./components/ProtectedRoute";

// ================= PUBLIC PAGES =================
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";

// ================= STUDENT PAGES =================
import StudentDashboard from "./pages/StudentDashboard";
import StudentAssessment from "./pages/StudentAssessment";
import StudentProject from "./pages/StudentProject";
import ProjectDetail from "./pages/ProjectDetail";
import Portfolio from "./pages/Portfolio";

// ================= COMMON PAGES =================
import Assessment from "./pages/Assessment";

// ================= MENTOR PAGES =================
import MentorDashboard from "./pages/MentorDashboard";
import MentorProfile from "./pages/MentorProfile";
import MentorWorkspace from "./pages/MentorWorkspace";

// ================= ADMIN PAGES =================
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import AdminMentorReports from "./pages/AdminMentorReports";

// ================= TASK-BASED PAGES (NEW) =================
import TaskBasedProjectView from "./pages/TaskBasedProjectView";

function App() {
  return (
    <Router>
      <div style={styles.appContainer}>
        <Header />

        <main style={styles.mainContent}>
          <Routes>

            {/* ================= PUBLIC ROUTES ================= */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />

            {/* ================= STUDENT ROUTES ================= */}

            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-assessments"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentAssessment />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-projects"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentProject />
                </ProtectedRoute>
              }
            />

            {/* Student Project Detail - Legacy */}
            <Route
              path="/project/:id"
              element={
                <ProtectedRoute allowedRole="student">
                  <ProjectDetail />
                </ProtectedRoute>
              }
            />

            {/* Student Task-Based Project View - NEW */}
            <Route
              path="/project-task/:projectId"
              element={
                <ProtectedRoute allowedRole="student">
                  <TaskBasedProjectView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/portfolio"
              element={
                <ProtectedRoute allowedRole="student">
                  <Portfolio />
                </ProtectedRoute>
              }
            />

            <Route
              path="/assessment"
              element={
                <ProtectedRoute allowedRole="student">
                  <Assessment />
                </ProtectedRoute>
              }
            />

            {/* ================= MENTOR ROUTES ================= */}

            <Route
              path="/mentor"
              element={
                <ProtectedRoute allowedRole="mentor">
                  <MentorDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/mentor-dashboard"
              element={
                <ProtectedRoute allowedRole="mentor">
                  <MentorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Mentor Workspace - Legacy (Overall Review) */}
            <Route 
              path="/mentor-workspace/:projectId" 
              element={
                <ProtectedRoute allowedRole="mentor">
                  <MentorWorkspace />
                </ProtectedRoute>
              } 
            />


            <Route
              path="/mentor-profile"
              element={
                <ProtectedRoute allowedRole="mentor">
                  <MentorProfile />
                </ProtectedRoute>
              }
            />

            {/* ================= ADMIN ROUTES ================= */}

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/user-management"
              element={
                <ProtectedRoute allowedRole="admin">
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            <Route 
              path="/admin-mentor-reports"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminMentorReports />
                </ProtectedRoute>
              }
            />

          </Routes>
        </main>

        <Chatbot />
        <Footer />
      </div>
    </Router>
  );
}

const styles = {
  appContainer: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#f4f7f6",
  },

  mainContent: {
    flex: 1,
  },
};

export default App;