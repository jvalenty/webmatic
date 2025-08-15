import axios from "axios";

// Always use REACT_APP_BACKEND_URL and prefix /api per ingress rules
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
if (!BACKEND_URL) {
  // eslint-disable-next-line no-console
  console.warn("REACT_APP_BACKEND_URL is not set. API calls will fail.");
}
const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

export const ProjectsAPI = {
  async health() {
    const { data } = await api.get(`/health`);
    return data;
  },
  async list() {
    const { data } = await api.get(`/projects`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post(`/projects`, payload);
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/projects/${id}`);
    return data;
  },
  async scaffold(id, provider) {
    const { data } = await api.post(`/projects/${id}/scaffold`, { provider });
    return data;
  },
  async runs(id) {
    const { data } = await api.get(`/projects/${id}/runs`);
    return data;
  }
};