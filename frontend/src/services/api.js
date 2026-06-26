import axios from "axios";

// Use environment variable, fallback to localhost for development
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api/";

const API = axios.create({
  baseURL: API_URL,
});

export default API;