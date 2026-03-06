import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export const parseResume = async (formData) => {
  const response = await api.post('/resume/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const parseResumeFromBuilder = async (data) => {
  const response = await api.post('/resume/from-builder', data);
  return response.data;
};

export const generateRoadmap = async (data) => {
  const response = await api.post('/roadmap/generate', data);
  return response.data;
};

export const startInterview = async (data) => {
  const response = await api.post('/interview/start', data);
  return response.data;
};

export const interviewTurn = async (data) => {
  const response = await api.post('/interview/turn', data);
  return response.data;
};

export const getInterviewSummary = async (data) => {
  const response = await api.post('/interview/summary', data);
  return response.data;
};

export default api;
