import axios from "axios";

// Use environment variable WITHOUT /api at the end
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const API = axios.create({
  baseURL: API_URL,
});

export default API;