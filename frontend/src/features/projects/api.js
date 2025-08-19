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
  async update(id, payload) {
    const { data } = await api.patch(`/projects/${id}`, payload);
    return data;
  },
  async scaffold(id, provider, prompt) {
    const body = { provider };
    if (prompt && prompt.trim()) body.prompt = prompt.trim();
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

export const BuilderAPI = {
  async getChat(id) {
    const { data } = await api.get(`/projects/${id}/chat`);
    return data;
  },
  async appendChat(id, message) {
    const { data } = await api.post(`/projects/${id}/chat`, message);
    return data;
  },
  async generate(id, provider, prompt) {
    const { data } = await api.post(`/projects/${id}/generate`, { provider, prompt });
    return data;
  }
};