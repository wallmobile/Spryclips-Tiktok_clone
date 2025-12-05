import api from '../config/axios';

// User reports a CDN/quality issue
export const reportCDNIssue = async (issueData) => {
  const response = await api.post('/api/cdn-issues', issueData);
  return response.data;
};

// User gets their reported issues
export const getMyCDNIssues = async (params = {}) => {
  const response = await api.get('/api/cdn-issues/my-issues', { params });
  return response.data;
};

