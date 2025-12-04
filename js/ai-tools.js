/**
 * AI Tools Module
 * Handles backend API calls for AI-generated study materials
 */

const BACKEND_URL = 'http://localhost:5000';

/**
 * Show modal with content
 * @param {string} title - Modal title
 * @param {string} htmlContent - HTML content to display
 */
function showModal(title, htmlContent) {
  const modal = document.getElementById('ai-content-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  
  if (!modal || !modalTitle || !modalBody) {
    console.error('Modal elements not found');
    return;
  }
  
  modalTitle.textContent = title;
  modalBody.innerHTML = htmlContent;
  modal.classList.remove('hidden');
}

/**
 * Hide modal
 */
function hideModal() {
  const modal = document.getElementById('ai-content-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Download modal content as PDF
 */
function downloadPDF() {
  const modalTitle = document.getElementById('modal-title').textContent;
  const modalBody = document.getElementById('modal-body');
  
  if (!modalBody) {
    console.error('Modal body not found');
    return;
  }
  
  // Use browser's print functionality
  // The print CSS in style.css will handle formatting
  window.print();
}

/**
 * Convert Markdown to HTML
 * @param {string} markdown - Markdown text
 * @returns {string} HTML string
 */
function markdownToHTML(markdown) {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Unordered lists (bullets with *, -, or -->)
  html = html.replace(/^[\*\-]\s+(.+)$/gim, '<li>$1</li>');
  html = html.replace(/^-->\s+(.+)$/gim, '<li>$1</li>');
  
  // Wrap consecutive <li> items in <ul>
  html = html.replace(/(<li>.*<\/li>\s*)+/gs, '<ul>$&</ul>');
  
  // Numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\s*)+/gs, function(match) {
    // Only wrap in <ol> if not already wrapped in <ul>
    if (!match.includes('<ul>')) {
      return '<ol>' + match + '</ol>';
    }
    return match;
  });
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
}

/**
 * Generate content (notes, flashcards, or quiz)
 * @param {string} type - Content type: 'notes', 'flashcards', or 'quiz'
 */
async function generateContent(type) {
  const topicInput = document.getElementById('session-topic');
  const modal = document.getElementById('ai-content-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  
  if (!topicInput) {
    console.error('Missing topic input element: session-topic');
    alert('Error: Topic input not found. Please refresh the page.');
    return;
  }
  
  if (!modal || !modalTitle || !modalBody) {
    console.error('Missing modal elements:', { modal: !!modal, modalTitle: !!modalTitle, modalBody: !!modalBody });
    alert('Error: Modal elements not found. Please refresh the page.');
    return;
  }

  const topic = topicInput.value.trim();
  if (!topic) {
    alert('Please enter a topic');
    return;
  }

  // Capitalize type for display
  const displayType = type.charAt(0).toUpperCase() + type.slice(1);
  
  // Show modal with loading animation
  modalTitle.textContent = `Generating ${displayType}...`;
  modalBody.innerHTML = `
    <div class="ai-loading" style="text-align: center; padding: 60px 40px;">
      <div class="spinner"></div>
      <p style="color: var(--primary); font-weight: 600; margin: 24px 0 8px; font-size: 16px;">Generating ${type}...</p>
      <p style="color: var(--muted); font-size: 14px; max-width: 400px; margin: 0 auto;">This may take up to 2 minutes. Please wait while we create personalized content for you...</p>
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');

  try {
    console.log(`Fetching ${type} for topic: ${topic}`);
    
    const response = await fetch(`${BACKEND_URL}/generate-${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Received ${type} response:`, data);
    
    // Convert Markdown to HTML and show in modal
    const htmlContent = markdownToHTML(data.content);
    modalTitle.textContent = `${displayType} - ${topic}`;
    modalBody.innerHTML = htmlContent;
  } catch (error) {
    console.error(`Error generating ${type}:`, error);
    modalTitle.textContent = 'Error';
    modalBody.innerHTML = `<p class="error">Failed to generate ${type}. Make sure the backend server is running at http://localhost:5000</p>`;
  }
}

/**
 * Set up event listeners for AI tools
 */
function setupAIEventListeners() {
  console.log('=== Setting up AI event listeners ===');
  console.log('Current DOM state:', document.readyState);
  
  const types = ['notes', 'flashcards', 'quiz'];
  types.forEach(type => {
    const btn = document.getElementById(`gen-${type}-btn`);
    console.log(`Looking for button: gen-${type}-btn`, btn ? 'FOUND ✓' : 'NOT FOUND ✗');
    if (btn) {
      btn.addEventListener('click', () => {
        console.log(`Button clicked: gen-${type}-btn`);
        generateContent(type);
      });
    }
  });
  
  // Set up modal controls
  const closeModalBtn = document.getElementById('close-modal-btn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideModal);
    console.log('Close modal button: FOUND ✓');
  }
  
  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', downloadPDF);
    console.log('Download PDF button: FOUND ✓');
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
    }
  });
  
  console.log('=== AI event listeners setup complete ===');
}

/**
 * Initialize AI tools
 */
function initGeminiAI() {
  console.log('✅ AI Tools ready (using backend API at ' + BACKEND_URL + ')');
  return true;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing AI tools...');
    initGeminiAI();
    setupAIEventListeners();
  });
} else {
  console.log('DOM already loaded, initializing AI tools...');
  initGeminiAI();
  setupAIEventListeners();
}

// Export functions to global scope
window.AITools = {
  generateContent,
  showModal,
  hideModal,
  downloadPDF
};

window.setupAIEventListeners = setupAIEventListeners;
