import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Customers ───
export const getCustomers = (params) => api.get('/customers', { params });
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const getCities = () => api.get('/customers/cities');
export const getTags = () => api.get('/customers/tags');
export const uploadCustomers = (formData) => api.post('/customers/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// ─── Segments ───
export const getSegments = () => api.get('/segments');
export const getSegment = (id) => api.get(`/segments/${id}`);
export const createSegment = (data) => api.post('/segments', data);
export const updateSegment = (id, data) => api.put(`/segments/${id}`, data);
export const deleteSegment = (id) => api.delete(`/segments/${id}`);
export const previewSegment = (data) => api.post('/segments/preview', data);
export const getSegmentCustomers = (id, params) => api.get(`/segments/${id}/customers`, { params });

// ─── Campaigns ───
export const getCampaigns = () => api.get('/campaigns');
export const getCampaign = (id) => api.get(`/campaigns/${id}`);
export const createCampaign = (data) => api.post('/campaigns', data);
export const sendCampaign = (id) => api.post(`/campaigns/${id}/send`);
export const getCampaignStats = (id) => api.get(`/campaigns/${id}/stats`);
export const deleteCampaign = (id) => api.delete(`/campaigns/${id}`);

// ─── Dashboard ───
export const getDashboardStats = () => api.get('/stats/dashboard');

// ─── AI ───
export const aiChat = (message, context) => api.post('/ai/chat', { message, context });
export const aiGenerateMessage = (data) => api.post('/ai/generate-message', data);
export const aiSegmentFromText = (query) => api.post('/ai/segment-from-text', { query });
export const aiCampaignInsights = (campaign_id) => api.post('/ai/campaign-insights', { campaign_id });

export default api;
