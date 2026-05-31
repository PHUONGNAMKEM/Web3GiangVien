import axios from 'axios';
import authService from './authService';
import io from 'socket.io-client';

const DEFAULT_API_BASE = (() => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000/api';
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname || 'localhost';
  const fallbackPort = protocol === 'https:' ? 443 : 5000;
  const configuredPort = process.env.REACT_APP_API_PORT || fallbackPort;
  const portIsDefault =
    (protocol === 'https:' && Number(configuredPort) === 443) ||
    (protocol === 'http:' && Number(configuredPort) === 80);
  const portSegment = portIsDefault ? '' : `:${configuredPort}`;

  return `${protocol}//${hostname}${portSegment}/api`;
})();

const API_BASE_URL = process.env.REACT_APP_API_URL || DEFAULT_API_BASE;

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // Don't set Content-Type for FormData - let axios set it automatically with boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle token expiration
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          authService.logout();
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );

    // Initialize Socket.IO connection
    this.socket = null;
    this.notificationCallbacks = [];
  }

  // Generic HTTP methods for custom endpoints
  async get(endpoint, params = {}) {
    const response = await this.client.get(endpoint, { params });
    return response;
  }

  async post(endpoint, data = {}) {
    const response = await this.client.post(endpoint, data);
    return response;
  }

  async put(endpoint, data = {}) {
    const response = await this.client.put(endpoint, data);
    return response;
  }

  async delete(endpoint) {
    const response = await this.client.delete(endpoint);
    return response;
  }

  // Initialize Socket.IO connection
  initSocket(userDid) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(API_BASE_URL.replace(/\/api\/?$/, ''), {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to notification server');
      this.socket.emit('join', userDid);
    });

    this.socket.on('notification', (notification) => {
      console.log('Received notification:', notification);
      this.notificationCallbacks.forEach(callback => callback(notification));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from notification server:', reason);
      // Don't automatically reconnect to avoid loops
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  // Add notification callback
  onNotification(callback) {
    this.notificationCallbacks.push(callback);
  }

  // Remove notification callback
  offNotification(callback) {
    this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
  }

  // Disconnect socket
  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // QR Authentication with Blockchain support
  async getQrCode() {
    const response = await this.client.get('/qr/me');
    return response.data;
  }

  async generateNewQrCode() {
    const response = await this.client.post('/qr/generate');
    return response.data;
  }

  async validateQrForLogin(qrData) {
    const response = await this.client.post('/qr/validate-login', qrData);
    return response.data;
  }

  async getQrSession() {
    const response = await this.client.get('/auth/qr-session');
    return response.data;
  }

  async submitQrSignature(data) {
    const response = await this.client.post('/auth/qr-submit', data);
    return response.data;
  }
}

export default new ApiService();
