import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from "../services/api";
import './Auth.css';

const Auth = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSignIn, setIsSignIn] = useState(true);

    // Form states
    const [loginForm, setLoginForm] = useState({ email: "", password: "" });
    const [regForm, setRegForm] = useState({ name: "", email: "", password: "", role: "student" });
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        setIsSignIn(location.pathname === "/login");
    }, [location.pathname]);

    const toggle = () => {
        const newPath = isSignIn ? "/register" : "/login";
        navigate(newPath);
    };

    const handleForgotPassword = () => {
        alert("Password reset link will be sent to your email");
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        
        // Validate email and password are not empty
        if (!loginForm.email || !loginForm.password) {
            alert("Please enter both email and password");
            return;
        }

        try {
            const res = await API.post("login/", {
                email: loginForm.email,
                password: loginForm.password
            });

            const user = res.data.user;
            
            // Clear old session
            localStorage.clear();
            
            // Save auth data
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("email", user.email);
            localStorage.setItem("role", user.role);
            localStorage.setItem("name", user.name);
            localStorage.setItem("user", JSON.stringify(user));

            console.log("Logged in user:", user);
            alert("Login successful");

            // Role based redirect
            if (user.role === "student") {
                navigate("/student-dashboard");
            } else if (user.role === "mentor") {
                navigate("/mentor-dashboard");
            } else if (user.role === "admin") {
                navigate("/admin-dashboard");
            } else {
                navigate("/student-dashboard");
            }

        } catch (err) {
            console.error("Login error:", err);
            alert(err.response?.data?.error || "Login failed. Please check your credentials.");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        // Validate passwords match
        if (regForm.password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        // Validate all fields are filled
        if (!regForm.name || !regForm.email || !regForm.password) {
            alert("Please fill in all fields");
            return;
        }

        try {
            const res = await API.post("register/", regForm);
            alert(res.data.message || "Registration Successful!");
            
            // Store token if returned
            if (res.data.token) {
                localStorage.setItem("token", res.data.token);
            }
            
            // Redirect to login page
            navigate("/login");
        } catch (err) {
            console.error("Registration error:", err);
            alert(err.response?.data?.error || "Error occurred during registration");
        }
    };

    return (
        <div id="container" className={`container ${isSignIn ? 'sign-in' : 'sign-up'}`}>
            <div className="row">
                {/* SIGN UP FORM */}
                <div className="col align-items-center flex-col sign-up">
                    <div className="form-wrapper align-items-center">
                        <form className="form sign-up" onSubmit={handleRegister}>
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    placeholder="Full Name" 
                                    value={regForm.name}
                                    onChange={(e) => setRegForm({...regForm, name: e.target.value})} 
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <input 
                                    type="email" 
                                    placeholder="Email" 
                                    value={regForm.email}
                                    onChange={(e) => setRegForm({...regForm, email: e.target.value})} 
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <input 
                                    type="password" 
                                    placeholder="Password" 
                                    value={regForm.password}
                                    onChange={(e) => setRegForm({...regForm, password: e.target.value})} 
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <input 
                                    type="password" 
                                    placeholder="Confirm password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <select 
                                    value={regForm.role}
                                    onChange={(e) => setRegForm({...regForm, role: e.target.value})}
                                    required
                                >
                                    <option value="student">Student</option>
                                    <option value="mentor">Mentor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <button type="submit">Sign up</button>
                            <div className="auth-link">
                                <span>Already have an account? </span>
                                <b onClick={toggle} className="pointer">Sign in here</b>
                            </div>
                        </form>
                    </div>
                </div>

                {/* SIGN IN FORM */}
                <div className="col align-items-center flex-col sign-in">
                    <div className="form-wrapper align-items-center">
                        <form className="form sign-in" onSubmit={handleLogin}>
                            <div className="input-group">
                                <input 
                                    type="email" 
                                    placeholder="Email" 
                                    value={loginForm.email}
                                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} 
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <input 
                                    type="password" 
                                    placeholder="Password" 
                                    value={loginForm.password}
                                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} 
                                    required
                                />
                            </div>
                            <button type="submit">Sign in</button>
                            <div className="forgot-password">
                                <b onClick={handleForgotPassword} className="pointer">Forgot password?</b>
                            </div>
                            <div className="auth-link">
                                <span>Don't have an account? </span>
                                <b onClick={toggle} className="pointer">Sign up here</b>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* CONTENT SECTION */}
            <div className="row content-row">
                <div className="col align-items-center flex-col">
                    <div className="text sign-in">
                        <h2>Welcome Back!</h2>
                        <p>Sign in to continue your journey</p>
                    </div>
                </div>
                <div className="col align-items-center flex-col">
                    <div className="text sign-up">
                        <h2>Join With Us</h2>
                        <p>Create an account to get started</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;