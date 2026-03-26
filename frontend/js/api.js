// API Configuration
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api'; // Same origin in production

// Token management
const Auth = {
  setToken: (token) => localStorage.setItem('ip_token', token),
  getToken: () => localStorage.getItem('ip_token'),
  removeToken: () => localStorage.removeItem('ip_token'),
  setUser: (user) => localStorage.setItem('ip_user', JSON.stringify(user)),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('ip_user')); } catch { return null; }
  },
  removeUser: () => localStorage.removeItem('ip_user'),
  isLoggedIn: () => !!localStorage.getItem('ip_token'),
  logout: () => {
    localStorage.removeItem('ip_token');
    localStorage.removeItem('ip_user');
    window.location.href = '/pages/index.html';
  }
};

// API request helper
async function apiRequest(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Cannot connect to server. Please make sure the backend is running.');
    }
    throw error;
  }
}

// Toast notifications
function showToast(message, type = 'info') {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#6366f1'
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    background: ${colors[type]}; color: white;
    padding: 12px 20px; border-radius: 8px;
    font-family: 'Space Grotesk', sans-serif; font-size: 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease; max-width: 320px;
    display: flex; align-items: center; gap: 8px;
  `;

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  toast.innerHTML = `<span style="font-weight:700;font-size:16px">${icons[type]}</span> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format duration
function formatDuration(seconds) {
  if (!seconds) return '0m 0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Format date
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

// Score color
function getScoreColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Work';
}

// Add toast CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100px); opacity: 0; } }
`;
document.head.appendChild(style);
