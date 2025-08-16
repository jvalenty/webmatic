import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
if (!BACKEND_URL) {
  // eslint-disable-next-line no-console
  console.warn("REACT_APP_BACKEND_URL is not set.");
}

export const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

// Initialize from localStorage if present
try {
  const token = localStorage.getItem("wm_token");
  if (token) setAuthToken(token);
} catch (e) {
  // ignore
}