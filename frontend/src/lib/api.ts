import axios from "axios";

// All API calls go through this client
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Customers ────────────────────────────────────────────────
export const customersApi = {
  list: (page = 1, limit = 50, search = "") =>
    api.get("/api/customers", { params: { page, limit, search } }),
  stats: () => api.get("/api/customers/stats"),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/customers/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ── Orders ───────────────────────────────────────────────────
export const ordersApi = {
  list: (page = 1, limit = 50) =>
    api.get("/api/orders", { params: { page, limit } }),
  stats: () => api.get("/api/orders/stats"),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/orders/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ── Churn ────────────────────────────────────────────────────
export const churnApi = {
  summary: () => api.get("/api/churn/summary"),
  customers: (page = 1, risk?: string) => {
    const params = new URLSearchParams({ page: page.toString() });
    if (risk) params.append("risk", risk);
    return api.get(`/api/churn/customers?${params.toString()}`);
  },
};

export const demoApi = {
  load: (force?: boolean) => api.post("/api/demo/load", { force }),
  clear: () => api.post("/api/demo/clear"),
};

// ── Segmentation ─────────────────────────────────────────────
export const segmentApi = {
  chat: (prompt: string) => api.post("/api/segment/chat", { prompt }),
};

// ── Campaigns ────────────────────────────────────────────────
export const campaignsApi = {
  list: () => api.get("/api/campaigns"),
  get: (id: string) => api.get(`/api/campaigns/${id}`),
  communications: (id: string, page = 1) =>
    api.get(`/api/campaigns/${id}/communications`, { params: { page } }),
  simulate: (audienceIds: string[], segmentDescription: string) =>
    api.post("/api/campaigns/simulate", { audienceIds, segmentDescription }),
  generateMessages: (audienceIds: string[], campaignGoal: string) =>
    api.post("/api/campaigns/generate-messages", { audienceIds, campaignGoal }),
  send: (data: any) => api.post("/api/campaigns/send", data),
};

// ── Analytics ────────────────────────────────────────────────
export const analyticsApi = {
  overview: () => api.get("/api/analytics"),
  revenue: () => api.get("/api/analytics/revenue"),
  insights: () => api.get("/api/analytics/insights"),
  recommendations: (goal?: string) =>
    api.get("/api/analytics/recommendations", { params: { goal } }),
  saveLearning: (campaignId: string) =>
    api.post("/api/analytics/save-learning", { campaignId }),
};

export default api;
