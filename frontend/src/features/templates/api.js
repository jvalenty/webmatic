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
  async createFromTemplate({ template_id, name, overrides, provider, model }) {
    const body = { template_id, name, provider };
    if (overrides && Object.keys(overrides).length > 0) body.overrides = overrides;
    if (model && model.trim()) body.model = model.trim();
    const { data } = await api.post(`/projects/from-template`, body);
    return data;
  },
};