/**
 * PeerFuse Theme Manager
 * Handles dark/light mode switching with localStorage persistence
 */

const ThemeManager = {
  // Initialize theme on page load
  init() {
    const savedTheme = localStorage.getItem('peerfuse-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Determine initial theme
    let initialTheme = 'auto'; // auto follows system preference
    
    if (savedTheme) {
      initialTheme = savedTheme;
    } else if (prefersDark) {
      initialTheme = 'dark';
    } else {
      initialTheme = 'light';
    }
    
    this.setTheme(initialTheme);
    this.setupToggleButton();
    this.setupSystemThemeListener();
  },
  
  // Set theme and update UI
  setTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      // Follow system preference
      root.removeAttribute('data-theme');
      localStorage.removeItem('peerfuse-theme');
      this.updateToggleIcon();
    } else if (theme === 'dark') {
      // Force dark mode
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('peerfuse-theme', 'dark');
      this.updateToggleIcon('dark');
    } else {
      // Force light mode
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('peerfuse-theme', 'light');
      this.updateToggleIcon('light');
    }
  },
  
  // Get current theme
  getTheme() {
    const root = document.documentElement;
    const dataTheme = root.getAttribute('data-theme');
    
    if (dataTheme) {
      return dataTheme;
    } else {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  },
  
  // Toggle between light and dark mode
  toggle() {
    const currentTheme = this.getTheme();
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
    
    // Animate the icon
    this.animateToggleIcon();
  },
  
  // Update toggle button icon
  updateToggleIcon(theme = null, buttonId = 'theme-toggle') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const icon = button.querySelector('.theme-icon');
    if (!icon) return;
    
    const currentTheme = theme || this.getTheme();
    
    if (currentTheme === 'dark') {
      icon.textContent = '☀️';
      button.setAttribute('aria-label', 'Switch to light mode');
      button.setAttribute('title', 'Switch to light mode');
    } else {
      icon.textContent = '🌙';
      button.setAttribute('aria-label', 'Switch to dark mode');
      button.setAttribute('title', 'Switch to dark mode');
    }
  },
  
  // Animate the toggle icon
  animateToggleIcon(buttonId = 'theme-toggle') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const icon = button.querySelector('.theme-icon');
    if (!icon) return;
    
    icon.style.animation = 'none';
    setTimeout(() => {
      icon.style.animation = 'themeRotate 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    }, 10);
  },
  
  // Setup toggle button click listener
  setupToggleButton(buttonId = 'theme-toggle') {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
        this.animateToggleIcon(buttonId);
      });
      
      // Update icon on initial load
      this.updateToggleIcon(null, buttonId);
    }
  },
  
  // Initialize theme toggle for a specific button (used for multiple pages)
  initThemeToggle(buttonId) {
    this.setupToggleButton(buttonId);
    this.updateToggleIcon(null, buttonId);
  },
  
  // Listen for system theme changes
  setupSystemThemeListener() {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    darkModeQuery.addEventListener('change', (e) => {
      // Only respond to system changes if user hasn't manually set theme
      if (!localStorage.getItem('peerfuse-theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
};

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
  ThemeManager.init();
}

// Export for use in other scripts
window.ThemeManager = ThemeManager;
