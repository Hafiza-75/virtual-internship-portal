import React, { useState } from "react"; 
import { Link, useLocation } from "react-router-dom";
import { Menu, LayoutDashboard, FileText, FolderOpen, User, GraduationCap, Users, Star } from "lucide-react";

export default function Sidebar({ role }) {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const themes = {
    admin: {
      bg: "#0f111d", 
      text: "#ffffff",
      active: "#3b82f6", 
      hover: "#1c1f2e",
      title: "Admin Panel",
    },
    mentor: {
      bg: "#0f111d", 
      text: "#ffffff",
      active: "#f97316", 
      hover: "#1c1f2e",
      title: "Mentor Dashboard",
    },
    student: {
      bg: "#0f111d", 
      text: "#ffffff",
      active: "#eab308", 
      hover: "#1c1f2e",
      title: "Student Portal",
    }
  };

  const currentTheme = themes[role] || themes.student;

  const links = {
    student: [
      { name: "Dashboard", path: "/student-dashboard", icon: <LayoutDashboard size={20} /> },
      { name: "Assessments", path: "/my-assessments", icon: <FileText size={20} /> },
      { name: "Projects", path: "/my-projects", icon: <FolderOpen size={20} /> },
      { name: "Portfolio", path: "/portfolio", icon: <GraduationCap size={20} /> },
    ],
    mentor: [
      { name: "Dashboard", path: "/mentor-dashboard", icon: <LayoutDashboard size={20} /> },
      { name: "Profile", path: "/mentor-profile", icon: <User size={20} /> },
    ],
    admin: [
      { name: "Dashboard", path: "/admin-dashboard", icon: <LayoutDashboard size={20} /> },
      { name: "Mentor Reports", path: "/admin-mentor-reports", icon: <Star size={20} /> }, 
      { name: "Users", path: "/user-management", icon: <Users size={20} /> },

    ],
  };

  const sidebarStyle = {
    width: isOpen ? "240px" : "70px",
    transition: "width 0.3s ease",
    background: currentTheme.bg,
    height: "100vh",
    color: "#ffffff",
    position: "sticky",
    top: "0",
    left: 0,
    display: "flex",
    flexDirection: "column",
    zIndex: 99,
    boxShadow: "2px 0 10px rgba(0,0,0,0.1)",
    overflow: "hidden"
  };

  return (
    <div style={sidebarStyle}>
      {/* HEADER SECTION */}
      <div style={{ 
        padding: "0 20px",
        display: "flex", 
        alignItems: "center", 
        gap: "12px",
        height: "60px",
        borderBottom: "1px solid rgba(255,255,255,0.05)"
      }}>
        <div 
          onClick={() => setIsOpen(!isOpen)} 
          style={{ cursor: "pointer", color: "#ffffff", display: "flex" }}
        >
          <Menu size={22} />
        </div>
        
        {isOpen && (
          <span style={{ 
            fontWeight: "700", 
            fontSize: "12px",
            textTransform: "uppercase", 
            letterSpacing: "0.5px",
            whiteSpace: "nowrap",
            color: "#ffffff"
          }}>
            {currentTheme.title}
          </span>
        )}
      </div>

      {/* LINKS SECTION */}
      <nav style={{ 
        marginTop: "10px", 
        display: "flex", 
        flexDirection: "column", 
        padding: "0 10px",
        gap: "4px" 
      }}>
        {links[role]?.map((link, index) => {
          const isActive = location.pathname === link.path;
          return (
            <Link 
              key={index} 
              to={link.path} 
              style={{ 
                color: "#ffffff", 
                textDecoration: "none", 
                padding: "10px 12px", 
                display: "flex",
                alignItems: "center",
                borderRadius: "8px",
                transition: "all 0.2s ease",
                background: isActive ? currentTheme.active : "transparent",
                justifyContent: isOpen ? "flex-start" : "center",
              }}
              onMouseOver={(e) => {
                if(!isActive) e.currentTarget.style.background = currentTheme.hover;
              }}
              onMouseOut={(e) => {
                if(!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ display: "flex", opacity: isActive ? 1 : 0.8 }}>{link.icon}</span>
              {isOpen && (
                <span style={{ marginLeft: "12px", fontSize: "14px", fontWeight: "500" }}>
                  {link.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}