import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

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
    <p style={spinnerStyles.text}>Loading users...</p>
  </div>
);

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "student"
  });

  // Load Users from Backend on Page Load
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://127.0.0.1:8000/api/admin/users/");
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      alert("Could not load users from database.");
    } finally {
      setLoading(false);
    }
  };

  // Delete User Function
  const deleteUser = async (id) => {
    if (window.confirm("Are you sure you want to permanently remove this user from MongoDB?")) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/admin/users/delete/${id}/`);
        setUsers(users.filter((user) => user.id !== id));
        alert("User deleted successfully!");
      } catch (err) {
        console.error("Error deleting user:", err);
        alert("Failed to delete user.");
      }
    }
  };

  // Add New User Function
  const addNewUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      alert("Please fill all required fields (Name, Email, Password)");
      return;
    }

    setAddingUser(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/admin/users/add/", newUser);
      alert(res.data.message);
      setShowAddModal(false);
      setNewUser({ name: "", email: "", password: "", role: "student" });
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error("Error adding user:", err);
      alert(err.response?.data?.error || "Failed to add user");
    } finally {
      setAddingUser(false);
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
        <div style={styles.header}>
          <div>
            <h2>User Management</h2>
            <p>Manage permissions and account status of all users stored in Atlas.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            style={styles.addButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#219a52"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#27ae60"}
          >
            + Add New User
          </button>
        </div>

        {/* Users Table */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>ID (Mongo)</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} style={styles.tableRow}>
                    <td style={{ ...styles.td, fontSize: "10px", color: "#888" }}>{u.id}</td>
                    <td style={styles.td}>{u.name}</td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      <span style={badgeStyle(u.role)}>{u.role}</span>
                    </td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => deleteUser(u.id)} 
                        style={styles.deleteBtn}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
                    No users found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>➕ Add New User</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Enter full name"
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="Enter email address"
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Enter password"
                  style={styles.input}
                />
                <small style={styles.hint}>Minimum 6 characters recommended</small>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  style={styles.select}
                >
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowAddModal(false)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={addNewUser}
                disabled={addingUser}
                style={{
                  ...styles.submitBtn,
                  opacity: addingUser ? 0.7 : 1,
                  cursor: addingUser ? "not-allowed" : "pointer"
                }}
              >
                {addingUser ? "Adding..." : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Functions
const badgeStyle = (role) => ({
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "bold",
  backgroundColor: role === "student" ? "#e1f5fe" : role === "mentor" ? "#f3e5f5" : "#fff3e0",
  color: role === "student" ? "#01579b" : role === "mentor" ? "#4a148c" : "#e65100",
  textTransform: "capitalize"
});

// Styles
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
  header: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
  },
  addButton: {
    backgroundColor: "#27ae60",
    color: "white",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  tableWrapper: {
    backgroundColor: "white",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    backgroundColor: "#2c3e50",
    color: "white",
  },
  th: {
    padding: "15px",
    textAlign: "left",
  },
  tableRow: {
    borderBottom: "1px solid #eee",
  },
  td: {
    padding: "15px",
  },
  deleteBtn: {
    color: "#e74c3c",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "14px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "16px",
    width: "450px",
    maxWidth: "90%",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px",
    borderBottom: "1px solid #eee",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "28px",
    cursor: "pointer",
    color: "#999",
  },
  modalBody: {
    padding: "20px",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "20px",
    borderTop: "1px solid #eee",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "500",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    backgroundColor: "white",
  },
  hint: {
    fontSize: "11px",
    color: "#999",
    marginTop: "4px",
    display: "block",
  },
  cancelBtn: {
    padding: "10px 20px",
    backgroundColor: "#95a5a6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  submitBtn: {
    padding: "10px 20px",
    backgroundColor: "#27ae60",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
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

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
    40% { transform: scale(1); opacity: 1; }
  }
`;
if (!document.querySelector('#user-management-spinner-styles')) {
  styleSheet.id = 'user-management-spinner-styles';
  document.head.appendChild(styleSheet);
}