import api from '../config/axios';

// Get all partnerships for current user
export const getPartnerships = async () => {
  const response = await api.get('/api/partnerships');
  return response.data;
};

// Get partnership statistics
export const getPartnershipStats = async () => {
  const response = await api.get('/api/partnerships/stats');
  return response.data;
};

// Get single partnership
export const getPartnership = async (id) => {
  const response = await api.get(`/api/partnerships/${id}`);
  return response.data;
};

// Create new partnership request
export const createPartnership = async (data) => {
  const response = await api.post('/api/partnerships', {
    brandName: data.brandName,
    brandEmail: data.contactEmail,
    campaignName: data.campaignName,
    campaignType: data.campaignType,
    budget: parseFloat(data.budget),
    totalDeliverables: parseInt(data.deliverables) || 1,
    deadline: data.deadline,
    description: data.description,
    requirements: data.requirements
  });
  return response.data;
};

// Update partnership
export const updatePartnership = async (id, data) => {
  const response = await api.put(`/api/partnerships/${id}`, data);
  return response.data;
};

// Cancel partnership request
export const cancelPartnership = async (id) => {
  const response = await api.post(`/api/partnerships/${id}/cancel`);
  return response.data;
};

// Complete a deliverable
export const completeDeliverable = async (partnershipId, deliverableIndex = 0) => {
  const response = await api.post(`/api/partnerships/${partnershipId}/deliverable/${deliverableIndex}/complete`);
  return response.data;
};

// Mark partnership as complete (after all deliverables)
export const markPartnershipComplete = async (id) => {
  const response = await api.post(`/api/partnerships/${id}/complete`);
  return response.data;
};

// Approve partnership (brand/admin only)
export const approvePartnership = async (id) => {
  const response = await api.post(`/api/partnerships/${id}/approve`);
  return response.data;
};

// Reject partnership (brand/admin only)
export const rejectPartnership = async (id, reason) => {
  const response = await api.post(`/api/partnerships/${id}/reject`, { reason });
  return response.data;
};
