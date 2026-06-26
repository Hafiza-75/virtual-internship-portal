import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
  allowedRole,
}) {

  // get saved login data
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // ================= NOT LOGGED IN =================
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ================= WRONG ROLE =================
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // ================= ACCESS ALLOWED =================
  return children;
}