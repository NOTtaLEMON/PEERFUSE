/**
 * AI Tools Module
 * Handles backend API calls for AI-generated study materials
 */

// Render deployment URL
const BACKEND_URL = 'https://peerfuse-1.onrender.com';
let backendAvailable = false;

/**
 * Check if backend is running
 */
async function checkBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    backendAvailable = response.ok;
    return response.ok;
  } catch (error) {
    backendAvailable = false;
    return false;
  }
}

/**
 * Show backend startup instructions
 */
function showBackendInstructions() {
  const message = `
    <div style="padding: 40px; text-align: center;">
      <h2 style="color: #dc3545; margin-bottom: 20px;">⚠️ Backend Server Not Running</h2>
      
      <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
        <h3 style="margin-top: 0; color: #856404;">To use AI features:</h3>
        <ol style="line-height: 1.8; color: #856404;">
          <li><strong>Double-click</strong> <code style="background: #fff; padding: 2px 8px; border-radius: 4px;">START_PEERFUSE.bat</code> in your project folder</li>
          <li>Keep the terminal windows open</li>
          <li>Come back and click the button again</li>
        </ol>
      </div>
      
      <div style="background: #d1ecf1; border: 2px solid #0c5460; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #0c5460;"><strong>💡 Tip:</strong> Use START_PEERFUSE.bat to launch everything automatically!</p>
      </div>
      
      <button onclick="location.reload()" style="background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin-top: 10px;">
        Check Again
      </button>
    </div>
  `;
  
  const modal = document.getElementById('ai-content-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  
  if (modal && modalTitle && modalBody) {
    modalTitle.textContent = 'Backend Server Required';
    modalBody.innerHTML = message;
    modal.style.display = 'flex';
    modal.style.transform = 'translateX(0)';
  } else {
    alert('Backend server not running! Double-click START_PEERFUSE.bat to start it.');
  }
}

/**
 * Render math formulas in an element using KaTeX
 * @param {HTMLElement} element - Element to render math in
 */
function renderMathInElement(element) {
  if (typeof renderMathInElement === 'undefined' || !window.katex) {
    // KaTeX not loaded yet, try again after a delay
    setTimeout(() => {
      if (window.renderMathInElement) {
        window.renderMathInElement(element, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\[', right: '\\]', display: true},
            {left: '\\(', right: '\\)', display: false}
          ],
          throwOnError: false,
          trust: true
        });
      }
    }, 500);
    return;
  }
  
  try {
    window.renderMathInElement(element, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\[', right: '\\]', display: true},
        {left: '\\(', right: '\\)', display: false}
      ],
      throwOnError: false,
      trust: true
    });
  } catch (error) {
    console.error('Error rendering math:', error);
  }
}

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
  
  // Render math formulas
  renderMathInElement(modalBody);
  
  modal.style.display = 'flex';
  modal.style.transform = 'translateX(0)';
}

/**
 * Hide modal
 */
function hideModal() {
  const modal = document.getElementById('ai-content-modal');
  if (modal) {
    modal.style.transform = 'translateX(100%)';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
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
  
  // Create a new window for printing with proper styling
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  const styles = `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>
      @page {
        size: A4;
        margin: 2cm;
      }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.7;
        color: #1A2410;
        max-width: 100%;
        margin: 0;
        padding: 20px;
      }
      .katex { font-size: 1.1em; }
      .katex-display { margin: 1em 0; }
      h1, h2, h3, h4 {
        color: #456631;
        margin-top: 1.5em;
        margin-bottom: 0.75em;
        font-weight: 700;
        page-break-after: avoid;
      }
      h1 { font-size: 24pt; }
      h2 { font-size: 20pt; }
      h3 { font-size: 16pt; }
      h4 { font-size: 14pt; }
      p {
        margin-bottom: 1em;
        orphans: 3;
        widows: 3;
      }
      ul, ol {
        margin: 1em 0;
        padding-left: 2em;
      }
      li {
        margin-bottom: 0.5em;
        page-break-inside: avoid;
      }
      code {
        background: #f0f4e8;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 10pt;
      }
      pre {
        background: #f0f4e8;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        page-break-inside: avoid;
        margin: 1em 0;
      }
      pre code {
        background: none;
        padding: 0;
      }
      strong {
        font-weight: 700;
        color: #2D3826;
      }
      .title-page {
        text-align: center;
        margin-bottom: 2em;
        page-break-after: always;
      }
      .title-page h1 {
        font-size: 28pt;
        margin-bottom: 0.5em;
      }
      .generated-date {
        color: #6B7A60;
        font-size: 11pt;
      }
    </style>
  `;
  
  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${modalTitle}</title>
        ${styles}
      </head>
      <body>
        <div class="title-page">
          <h1>${modalTitle}</h1>
          <p class="generated-date">Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
        ${modalBody.innerHTML}
      </body>
    </html>
  `;
  
  printWindow.document.write(content);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
      // Don't close immediately - let user choose to save
    }, 250);
  };
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
  console.log('🚀 generateContent called with type:', type);
  
  // Check if backend is running first
  const isBackendRunning = await checkBackend();
  if (!isBackendRunning) {
    console.error('❌ Backend server is not running');
    showBackendInstructions();
    return;
  }
  
  const topicInput = document.getElementById('session-topic');
  const modal = document.getElementById('ai-content-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  
  console.log('🔍 Elements found:', {
    topicInput: !!topicInput,
    modal: !!modal,
    modalTitle: !!modalTitle,
    modalBody: !!modalBody
  });
  
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
  modal.style.display = 'flex';
  modal.style.transform = 'translateX(0)';

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
    
    // Render math formulas
    renderMathInElement(modalBody);
  } catch (error) {
    console.error(`Error generating ${type}:`, error);
    
    // Check if it's a connection error
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      modalTitle.textContent = 'Connection Error';
      modalBody.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <p class="error" style="font-size: 18px; margin-bottom: 20px;">⚠️ Cannot connect to backend server</p>
          <p>Make sure the backend is running by double-clicking <strong>START_PEERFUSE.bat</strong></p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    } else {
      modalTitle.textContent = 'Error';
      modalBody.innerHTML = `<p class="error">Failed to generate ${type}: ${error.message}</p>`;
    }
  }
}

/**
 * Set up event listeners for AI tools
 */
let listenersInitialized = false;
function setupAIEventListeners() {
  // Prevent duplicate event listeners
  if (listenersInitialized) {
    console.log('Event listeners already initialized, skipping...');
    return;
  }
  
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
  
  // Initialize modal resize functionality
  initModalResize();
  
  listenersInitialized = true;
  console.log('=== AI event listeners setup complete ===');
}

/**
 * Initialize modal resizing functionality
 */
function initModalResize() {
  const modal = document.getElementById('ai-content-modal');
  const resizeHandle = document.querySelector('.modal-resize-handle');
  
  if (!modal || !resizeHandle) return;
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = modal.offsetWidth;
    
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = startX - e.clientX; // Reversed because handle is on left
    const newWidth = startWidth + deltaX;
    
    // Min width: 400px, Max width: 90% of window
    const minWidth = 400;
    const maxWidth = window.innerWidth * 0.9;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      modal.style.width = newWidth + 'px';
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

/**
 * Initialize AI tools and check backend status
 */
async function initGeminiAI() {
  console.log('✅ AI Tools ready (using backend API at ' + BACKEND_URL + ')');
  
  // Check backend status and show indicator
  const isRunning = await checkBackend();
  const userBar = document.getElementById('user-bar');
  
  if (userBar) {
    const statusIndicator = document.createElement('span');
    statusIndicator.id = 'backend-status';
    statusIndicator.style.cssText = `
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 10px;
    `;
    
    if (isRunning) {
      statusIndicator.textContent = '🟢 Backend Online';
      statusIndicator.style.background = '#d4edda';
      statusIndicator.style.color = '#155724';
    } else {
      statusIndicator.textContent = '🔴 Backend Offline';
      statusIndicator.style.background = '#f8d7da';
      statusIndicator.style.color = '#721c24';
      statusIndicator.style.cursor = 'pointer';
      statusIndicator.title = 'Click for instructions';
      statusIndicator.onclick = showBackendInstructions;
    }
    
    userBar.insertBefore(statusIndicator, userBar.firstChild);
  }
  
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
