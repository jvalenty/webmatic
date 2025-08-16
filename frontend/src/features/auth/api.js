import { api, setAuthToken } from "../../lib/api";

export const AuthAPI = {
  async register(email, password) {
    const { data } = await api.post(`/auth/register`, { email, password });
    if (data?.access_token) {
      localStorage.setItem("wm_token", data.access_token);
      setAuthToken(data.access_token);
    }
    return data;
  },
  async login(email, password) {
    const { data } = await api.post(`/auth/login`, { email, password });
    if (data?.access_token) {
      localStorage.setItem("wm_token", data.access_token);
      setAuthToken(data.access_token);
    }
    return data;
  },
  async me() {
    const { data } = await api.get(`/auth/me`);
    return data;
  },
  logout() {
    localStorage.removeItem("wm_token");
    setAuthToken(null);
  }
};