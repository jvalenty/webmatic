import { api } from "../../lib/api";

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
  async scaffold(id, provider, model) {
    const body = { provider };
    if (model && model.trim()) body.model = model.trim();
    const { data } = await api.post(`/projects/${id}/scaffold`, body);
    return data;
  },
  async runs(id) {
    const { data } = await api.get(`/projects/${id}/runs`);
    return data;
  },
  async compareProviders(id) {
    const { data } = await api.post(`/projects/${id}/compare-providers`);
    return data;
  },
};