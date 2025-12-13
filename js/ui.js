/**
 * UI Helper Functions
 * Handles DOM manipulation, form handling, and user interface updates
 */

/**
 * Show an element
 * @param {string} id - Element ID
 */
function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

/**
 * Hide an element
 * @param {string} id - Element ID
 */
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

/**
 * Toggle element visibility
 * @param {string} id - Element ID
 */
function toggle(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

/**
 * Show status message
 * @param {string} elementId - Status element ID
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'success', 'error', 'warning', or 'info'
 */
function showStatus(elementId, message, type = 'info') {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = message;
  el.className = 'status';
  
  if (type === 'success') {
    el.classList.add('success');
  } else if (type === 'error') {
    el.classList.add('error');
  } else if (type === 'warning') {
    el.classList.add('warning');
  }

  el.classList.remove('hidden');
}

/**
 * Clear status message
 * @param {string} elementId - Status element ID
 */
function clearStatus(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = '';
    el.className = 'status hidden';
  }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Display duration in ms
 */
function showToast(message, type = 'info', duration = 3000) {
  // Create toast element if it doesn't exist
  let toast = document.getElementById('toast-container');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-container';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;
    document.body.appendChild(toast);
  }

  // Create individual toast message
  const toastMsg = document.createElement('div');
  toastMsg.style.cssText = `
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease;
  `;

  // Set background color based on type
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#2B6CB0'
  };
  toastMsg.style.backgroundColor = colors[type] || colors.info;
  toastMsg.textContent = message;

  toast.appendChild(toastMsg);

  // Remove after duration
  setTimeout(() => {
    toastMsg.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      toast.removeChild(toastMsg);
    }, 300);
  }, duration);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Get form data as object
 * @param {string} formId - Form element ID
 * @returns {Object} Form data object
 */
function getFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};

  const data = {};
  const formData = new FormData(form);

  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }

  return data;
}

/**
 * Clear form inputs
 * @param {string} formId - Form element ID
 */
function clearForm(formId) {
  const form = document.getElementById(formId);
  if (form) form.reset();
}

/**
 * Set form values from object
 * @param {string} formId - Form element ID
 * @param {Object} data - Data object with values
 */
function setFormData(formId, data) {
  const form = document.getElementById(formId);
  if (!form) return;

  Object.keys(data).forEach(key => {
    const input = form.elements[key];
    if (input) {
      if (input.type === 'checkbox') {
        input.checked = !!data[key];
      } else {
        input.value = data[key] || '';
      }
    }
  });
}

/**
 * Update user welcome message in header
 * @param {string} username - Username to display
 */
function updateUserWelcome(username) {
  const welcomeEl = document.getElementById('user-welcome');
  if (welcomeEl) {
    welcomeEl.textContent = username ? `Welcome, ${username}` : 'Not signed in';
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    if (username) {
      logoutBtn.classList.remove('hidden');
    } else {
      logoutBtn.classList.add('hidden');
    }
  }
}

/**
 * Render match result card
 * @param {Object} match - Match object with user and score
 * @param {string} containerId - Container element ID
 */
function renderMatchResult(match, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { user, score, breakdown } = match;

  const html = `
    <div class="match-result">
      <h3>🎯 Best Match Found!</h3>
      <div style="background: white; padding: 16px; border-radius: 8px; margin: 12px 0;">
        <p><strong>Name:</strong> ${escapeHtml(user.name || user.username || 'Unknown')}</p>
        <p><strong>Match Score:</strong> ${score} points</p>
        <p><strong>Strengths:</strong> ${Array.isArray(user.strengths) ? user.strengths.join(', ') : user.strengths || 'N/A'}</p>
        <p><strong>Weaknesses:</strong> ${Array.isArray(user.weaknesses) ? user.weaknesses.join(', ') : user.weaknesses || 'N/A'}</p>
        <p><strong>Availability:</strong> ${escapeHtml(user.availability || 'N/A')}</p>
        <p><strong>Preferred Mode:</strong> ${escapeHtml(user.preferredMode || 'N/A')}</p>
      </div>
      <div style="background: rgba(43, 108, 176, 0.06); padding: 12px; border-radius: 8px; margin: 12px 0;">
        <p><strong>Why this match works:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          ${breakdown.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}
        </ul>
      </div>
      <div style="margin-top: 16px; display: flex; gap: 10px;">
        <button onclick="startSession('${escapeHtml(user.name || user.username)}')">Start Session</button>
        <button onclick="showNextMatch()" class="btn-secondary">Next Best Buddy</button>
        <button onclick="quitCurrentMatch()" class="btn-danger">Quit Match</button>
      </div>
    // Quit current match handler
    function quitCurrentMatch() {
      // Optionally, you can clear the match result or show a message
      const container = document.getElementById('match-result-container');
      if (container) {
        container.innerHTML = '<p class="text-muted">You have quit the current match. Please try matching again or choose another buddy.</p>';
      }
    }
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Render multiple matches as a list
 * @param {Array} matches - Array of match objects
 * @param {string} containerId - Container element ID
 */
function renderMatchList(matches, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.innerHTML = '<p class="text-muted">No matches found. Try adjusting your preferences.</p>';
    return;
  }

  const html = matches.map((match, index) => `
    <div class="card" style="margin: 16px 0;">
      <h3>Match #${index + 1} - ${escapeHtml(match.user.name || match.user.username || 'Unknown')} (Score: ${match.score})</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0;">
        <div>
          <p><strong>Strengths:</strong> ${Array.isArray(match.user.strengths) ? match.user.strengths.join(', ') : match.user.strengths || 'N/A'}</p>
          <p><strong>Weaknesses:</strong> ${Array.isArray(match.user.weaknesses) ? match.user.weaknesses.join(', ') : match.user.weaknesses || 'N/A'}</p>
        </div>
        <div>
          <p><strong>Availability:</strong> ${escapeHtml(match.user.availability || 'N/A')}</p>
          <p><strong>Mode:</strong> ${escapeHtml(match.user.preferredMode || 'N/A')}</p>
        </div>
      </div>
      <details>
        <summary style="cursor: pointer; color: var(--primary); font-weight: 600;">Show match details</summary>
        <ul style="margin: 8px 0; padding-left: 20px;">
          ${match.breakdown.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}
        </ul>
      </details>
      <button onclick="startSession('${escapeHtml(match.user.name || match.user.username)}')" style="margin-top: 12px;">Connect with ${escapeHtml(match.user.name || match.user.username)}</button>
    </div>
  `).join('');

  container.innerHTML = html;
}

/**
 * Show loading spinner
 * @param {string} elementId - Element to show spinner in
 */
function showLoading(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading">Loading...</div></div>';
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and message
 */
function validatePassword(password) {
  if (password.length < 6) {
    return {
      isValid: false,
      message: 'Password must be at least 6 characters long'
    };
  }

  return {
    isValid: true,
    message: 'Password is valid'
  };
}

/**
 * Add CSS animation styles
 */
function injectAnimationStyles() {
  if (document.getElementById('ui-animations')) return;

  const style = document.createElement('style');
  style.id = 'ui-animations';
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }
  `;
  document.head.appendChild(style);
}

// Inject animation styles on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectAnimationStyles);
} else {
  injectAnimationStyles();
}

// Export functions to global scope
window.UI = {
  show,
  hide,
  toggle,
  showStatus,
  clearStatus,
  showToast,
  escapeHtml,
  getFormData,
  clearForm,
  setFormData,
  updateUserWelcome,
  renderMatchResult,
  renderMatchList,
  showLoading,
  isValidEmail,
  validatePassword
};
