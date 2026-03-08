import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const api = {
  getMetrics: () => API.get('/metrics'),
  getShipments: (params) => API.get('/shipments', { params }),
  getShipment: (id) => API.get(`/shipments/${id}`),
  getDisruptions: (params) => API.get('/disruptions', { params }),
  getDecisions: () => API.get('/decisions'),
  getPendingDecisions: () => API.get('/decisions/pending'),
  approveDecision: (id, data) => API.post(`/decisions/${id}/approve`, data),
  chat: (data) => API.post('/chat', data),
  triggerCycle: () => API.post('/trigger-cycle'),
  injectDisruption: (shipmentId, type, severity) =>
    API.post(`/inject-disruption?shipment_id=${shipmentId}&disruption_type=${type}&severity=${severity}`),
  getAgentStatus: () => API.get('/agents/status'),
  getCarriers: () => API.get('/carriers'),
  getBlockchainStatus: () => API.get('/blockchain/status'),
};

export default api;