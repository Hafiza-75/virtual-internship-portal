import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, LayoutDashboard, ChevronDown, Sparkles } from "lucide-react";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const checkUser = () => {
    const storedUser = localStorage.getItem("user");
    setUser(storedUser ? JSON.parse(storedUser) : null);
  };

  useEffect(() => {
    checkUser();
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setShowDropdown(false);
    navigate("/login");
  };

  const getDashboardRoute = () => {
    if (!user) return "/login";
    return `/${user.role}-dashboard`;
  };

  const getInitials = (name) => {
    return name ? name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) : "AI";
  };

  return (
    <nav style={styles.header}>
      <div style={styles.left} onClick={() => navigate("/")}>
        <div style={styles.logoWrapper}>
          <Sparkles size={18} color="#f7d569" fill="#f7d569" />
        </div>
        <div style={styles.logoText}>
          <span style={{ color: "#333", fontWeight: "800" }}>AI</span>
          <span style={{ color: "#911825", fontWeight: "700", marginLeft: "2px" }}>Hub</span>
        </div>
      </div>

      <div style={styles.right}>
        {user ? (
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              style={styles.userContainer}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div style={styles.avatarInitials}>
                {getInitials(user.name)}
              </div>
              <ChevronDown size={14} color="#666" />
            </motion.div>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  style={styles.dropdown}
                >
                  <div style={styles.dropdownHeader}>
                    <p style={styles.dropName}>{user.name}</p>
                    <span style={styles.dropRole}>{user.role}</span>
                  </div>

                  <div style={styles.item} onClick={() => { navigate(getDashboardRoute()); setShowDropdown(false); }}>
                    <LayoutDashboard size={14} /> Dashboard
                  </div>

                  <div style={{ ...styles.item, color: "#911825" }} onClick={handleLogout}>
                    <LogOut size={14} /> Logout
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <span style={styles.link} onClick={() => navigate("/login")}>Login</span>
            <button style={styles.signupBtn} onClick={() => navigate("/register")}>
              Join Free
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const styles = {
  header: {
    height: "60px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 5%",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #eaeaea",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },
  left: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" },
  logoWrapper: { backgroundColor: "#911825", padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center" },
  logoText: { fontSize: "20px", letterSpacing: "-0.5px" },
  right: { display: "flex", alignItems: "center" },
  userContainer: { display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "4px" },
  avatarInitials: { width: "30px", height: "30px", borderRadius: "50%", backgroundColor: "#911825", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold" },
  link: { cursor: "pointer", color: "#666", fontWeight: "500", fontSize: "14px" },
  signupBtn: { backgroundColor: "#911825", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  dropdown: { position: "absolute", top: "45px", right: 0, background: "white", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", padding: "8px", borderRadius: "12px", minWidth: "180px", border: "1px solid #eee" },
  dropdownHeader: { padding: "8px 12px", borderBottom: "1px solid #f0f0f0", marginBottom: "4px" },
  dropName: { margin: 0, fontSize: "13px", fontWeight: "700", color: "#333" },
  dropRole: { fontSize: "10px", color: "#911825", textTransform: "uppercase", fontWeight: "600" },
  item: { padding: "10px 12px", cursor: "pointer", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px", borderRadius: "8px", color: "#555" },
};

export default Header;