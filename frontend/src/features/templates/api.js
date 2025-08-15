import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

export const TemplatesAPI = {
  async list() {
    const { data } = await api.get(`/templates`);
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/templates/${id}`);
    return data;
  },
  async createFromTemplate({ template_id, name, overrides, provider }) {
    const { data } = await api.post(`/projects/from-template`, {
      template_id,
      name,
      overrides,
      provider,
    });
    return data;
  },
};