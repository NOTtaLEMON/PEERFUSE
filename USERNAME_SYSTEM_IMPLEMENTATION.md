# Username System Implementation for PeerFuse (Firebase/Vanilla JS)

## Overview

This guide provides a complete username management system for PeerFuse, adapted for Firebase Firestore and vanilla JavaScript.

---

## 1. Firestore Database Schema

### Collection Structure

```
users/
├── {userId}/
│   ├── userId (STRING) - Auto-generated Firebase UID
│   ├── email (STRING) - From Firebase Auth
│   ├── username (STRING) - User-chosen, UNIQUE
│   ├── displayName (STRING) - Optional full name
│   ├── bio (STRING) - Optional bio
│   ├── createdAt (TIMESTAMP) - Account creation date
│   ├── updatedAt (TIMESTAMP) - Last username change date
│   ├── profileComplete (BOOLEAN) - Whether profile is set up
│   └── lastActiveAt (TIMESTAMP) - Last activity time
```

### Usernames Sub-Collection (For Uniqueness Index)

```
users_index/ (Collection - used for reverse lookups)
├── {username}/
│   ├── userId (STRING) - Reference to user document
│   ├── createdAt (TIMESTAMP) - When username was taken
```

This allows O(1) lookups to check username availability.

---

## 2. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow reading user profiles (public profiles)
    match /users/{userId} {
      allow read: if true; // Public profiles
      allow write: if request.auth.uid == userId; // Users can only edit their own profile
      allow delete: if false; // Prevent deletion
    }
    
    // Username index - prevent overwrites, only create/read
    match /users_index/{username} {
      allow read: if true; // Anyone can check if username exists
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid &&
                       request.resource.data.userId != null;
      allow update: if false; // Prevent modifications
      allow delete: if request.auth.uid == resource.data.userId; // Only the owner can delete their old username
    }
  }
}
```

---

## 3. Frontend: Username Signup Flow

### HTML (Add to signup section in index.html)

```html
<!-- Signup Section -->
<section id="auth-section" class="auth-screen">
  <div class="auth-card">
    <h2>Create Your Account</h2>
    
    <!-- Email Signup Form -->
    <form id="signup-form">
      <div class="form-group">
        <label for="signup-email">Email:</label>
        <input 
          id="signup-email" 
          type="email" 
          placeholder="your@email.com"
          required 
        />
      </div>
      
      <div class="form-group">
        <label for="signup-password">Password:</label>
        <input 
          id="signup-password" 
          type="password" 
          placeholder="At least 6 characters"
          required 
        />
      </div>
      
      <!-- USERNAME FIELD (NEW) -->
      <div class="form-group">
        <label for="signup-username">
          Username:
          <span class="required">*</span>
        </label>
        <input 
          id="signup-username" 
          type="text" 
          placeholder="3-30 alphanumeric characters (no spaces)"
          maxlength="30"
          required 
        />
        <small id="username-hint" class="text-muted">
          3-30 characters, letters, numbers, and underscore only
        </small>
        <div id="username-status" class="status hidden"></div>
      </div>
      
      <button type="submit" class="btn-primary" id="signup-btn">Sign Up</button>
    </form>
    
    <p id="auth-status" class="status hidden"></p>
    <p class="auth-toggle">
      Already have an account? 
      <button onclick="toggleAuthMode()" style="background: none; border: none; color: var(--primary); cursor: pointer; text-decoration: underline;">
        Log In
      </button>
    </p>
  </div>
</section>
```

### JavaScript: Username Signup Logic

Create or update `js/auth.js` with this username functionality:

```javascript
/**
 * Username validation regex and utilities
 */
const UsernameValidator = {
  // Username rules: 3-30 chars, alphanumeric + underscore only
  regex: /^[a-zA-Z0-9_]{3,30}$/,
  
  validate(username) {
    if (!username) return { valid: false, message: "Username is required" };
    if (username.length < 3) return { valid: false, message: "Username must be at least 3 characters" };
    if (username.length > 30) return { valid: false, message: "Username must be 30 characters or less" };
    if (!this.regex.test(username)) {
      return { valid: false, message: "Username can only contain letters, numbers, and underscores" };
    }
    return { valid: true, message: "Username is valid" };
  },
};

/**
 * Check if username is available in Firestore
 */
async function checkUsernameAvailable(username) {
  try {
    const docRef = db.collection('users_index').doc(username.toLowerCase());
    const docSnap = await docRef.get();
    return !docSnap.exists; // Returns true if username is available
  } catch (error) {
    console.error('Error checking username:', error);
    throw new Error('Could not verify username availability');
  }
}

/**
 * Real-time username availability check (debounced)
 */
let usernameCheckTimeout;
function setupUsernameAvailabilityCheck() {
  const usernameInput = document.getElementById('signup-username');
  const statusDiv = document.getElementById('username-status');
  
  if (!usernameInput) return;
  
  usernameInput.addEventListener('input', () => {
    clearTimeout(usernameCheckTimeout);
    const username = usernameInput.value.trim();
    
    if (!username) {
      statusDiv.classList.add('hidden');
      return;
    }
    
    const validation = UsernameValidator.validate(username);
    if (!validation.valid) {
      statusDiv.className = 'status status-warning';
      statusDiv.textContent = validation.message;
      statusDiv.classList.remove('hidden');
      return;
    }
    
    statusDiv.textContent = 'Checking availability...';
    statusDiv.className = 'status status-info';
    statusDiv.classList.remove('hidden');
    
    usernameCheckTimeout = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(username);
        if (available) {
          statusDiv.className = 'status status-success';
          statusDiv.textContent = '✓ Username is available';
        } else {
          statusDiv.className = 'status status-error';
          statusDiv.textContent = '✗ Username is already taken';
        }
      } catch (error) {
        statusDiv.className = 'status status-error';
        statusDiv.textContent = 'Error checking availability';
      }
    }, 500); // Debounce 500ms
  });
}

/**
 * Register user with username
 */
async function registerWithUsername(email, password, username) {
  try {
    // Validate username format
    const validation = UsernameValidator.validate(username);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    
    // Check username availability
    const available = await checkUsernameAvailable(username);
    if (!available) {
      throw new Error('Username is already taken');
    }
    
    // Create Firebase Auth user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const userId = userCredential.user.uid;
    
    // Create user document in Firestore
    const userDoc = db.collection('users').doc(userId);
    await userDoc.set({
      userId: userId,
      email: email,
      username: username.toLowerCase(), // Store lowercase for case-insensitive uniqueness
      displayName: username, // Use username as initial display name
      bio: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      profileComplete: false,
      lastActiveAt: new Date(),
    });
    
    // Create username index document
    const indexDoc = db.collection('users_index').doc(username.toLowerCase());
    await indexDoc.set({
      userId: userId,
      createdAt: new Date(),
    });
    
    console.log('User registered successfully:', userId, username);
    return { userId, username };
    
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Handle signup form submission
 */
function setupSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const username = document.getElementById('signup-username').value.trim();
    const statusDiv = document.getElementById('auth-status');
    
    try {
      statusDiv.className = 'status status-info';
      statusDiv.textContent = 'Creating account...';
      statusDiv.classList.remove('hidden');
      
      const result = await registerWithUsername(email, password, username);
      
      statusDiv.className = 'status status-success';
      statusDiv.textContent = `✓ Welcome, ${result.username}! Redirecting...`;
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      statusDiv.className = 'status status-error';
      statusDiv.textContent = `✗ ${error.message}`;
      statusDiv.classList.remove('hidden');
    }
  });
  
  // Setup real-time username check
  setupUsernameAvailabilityCheck();
}

// Initialize signup form when DOM is ready
document.addEventListener('DOMContentLoaded', setupSignupForm);
```

---

## 4. Frontend: Username Update Feature

### HTML (Settings/Profile Section)

```html
<!-- Settings Section - Add to existing profile section -->
<section id="settings-section" class="hidden card">
  <h2>Account Settings</h2>
  
  <div class="form-group">
    <h3>Username</h3>
    <div style="display: flex; gap: 12px; align-items: flex-end;">
      <div style="flex: 1;">
        <label for="current-username">Current Username:</label>
        <input 
          id="current-username" 
          type="text" 
          readonly
          style="opacity: 0.6;"
        />
      </div>
      <button 
        id="edit-username-btn" 
        class="btn-primary"
        onclick="toggleUsernameEdit()"
      >
        Edit
      </button>
    </div>
  </div>
  
  <!-- Username Edit Form (Hidden by default) -->
  <div id="username-edit-form" class="hidden form-group" style="margin-top: 20px; padding: 16px; background: var(--hover-bg); border-radius: var(--radius-sm);">
    <label for="new-username">New Username:</label>
    <input 
      id="new-username" 
      type="text" 
      placeholder="3-30 characters"
      maxlength="30"
    />
    <small id="new-username-hint" class="text-muted">
      3-30 characters, letters, numbers, and underscore only
    </small>
    <div id="new-username-status" class="status hidden" style="margin: 12px 0;"></div>
    
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <button 
        id="save-username-btn" 
        class="btn-primary"
        onclick="updateUsername()"
      >
        Save
      </button>
      <button 
        type="button"
        class="btn-secondary"
        onclick="toggleUsernameEdit()"
      >
        Cancel
      </button>
    </div>
  </div>
</section>
```

### JavaScript: Username Update Logic

```javascript
/**
 * Toggle username edit form visibility
 */
function toggleUsernameEdit() {
  const editForm = document.getElementById('username-edit-form');
  const editBtn = document.getElementById('edit-username-btn');
  
  editForm.classList.toggle('hidden');
  editBtn.textContent = editForm.classList.contains('hidden') ? 'Edit' : 'Cancel';
  
  if (!editForm.classList.contains('hidden')) {
    document.getElementById('new-username').focus();
  }
}

/**
 * Setup real-time username availability check for update form
 */
function setupUpdateUsernameAvailabilityCheck() {
  const newUsernameInput = document.getElementById('new-username');
  const statusDiv = document.getElementById('new-username-status');
  const currentUsername = document.getElementById('current-username').value.toLowerCase();
  
  if (!newUsernameInput) return;
  
  newUsernameInput.addEventListener('input', () => {
    clearTimeout(usernameCheckTimeout);
    const newUsername = newUsernameInput.value.trim().toLowerCase();
    
    if (!newUsername) {
      statusDiv.classList.add('hidden');
      return;
    }
    
    // Don't check if it's the same username
    if (newUsername === currentUsername) {
      statusDiv.className = 'status status-info';
      statusDiv.textContent = 'This is your current username';
      statusDiv.classList.remove('hidden');
      return;
    }
    
    const validation = UsernameValidator.validate(newUsername);
    if (!validation.valid) {
      statusDiv.className = 'status status-warning';
      statusDiv.textContent = validation.message;
      statusDiv.classList.remove('hidden');
      return;
    }
    
    statusDiv.textContent = 'Checking availability...';
    statusDiv.className = 'status status-info';
    statusDiv.classList.remove('hidden');
    
    usernameCheckTimeout = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(newUsername);
        if (available) {
          statusDiv.className = 'status status-success';
          statusDiv.textContent = '✓ Username is available';
        } else {
          statusDiv.className = 'status status-error';
          statusDiv.textContent = '✗ Username is already taken';
        }
      } catch (error) {
        statusDiv.className = 'status status-error';
        statusDiv.textContent = 'Error checking availability';
      }
    }, 500);
  });
}

/**
 * Update user's username in Firestore
 */
async function updateUsername() {
  const newUsername = document.getElementById('new-username').value.trim();
  const currentUsername = document.getElementById('current-username').value.toLowerCase();
  const userId = auth.currentUser?.uid;
  const statusDiv = document.getElementById('new-username-status');
  
  if (!userId) {
    alert('You must be logged in to change your username');
    return;
  }
  
  if (newUsername.toLowerCase() === currentUsername) {
    statusDiv.className = 'status status-warning';
    statusDiv.textContent = 'New username is the same as current';
    statusDiv.classList.remove('hidden');
    return;
  }
  
  try {
    // Validate username
    const validation = UsernameValidator.validate(newUsername);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    
    // Check availability
    const available = await checkUsernameAvailable(newUsername);
    if (!available) {
      throw new Error('Username is already taken');
    }
    
    statusDiv.className = 'status status-info';
    statusDiv.textContent = 'Updating username...';
    statusDiv.classList.remove('hidden');
    
    // Start transaction
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const oldIndexRef = db.collection('users_index').doc(currentUsername);
      const newIndexRef = db.collection('users_index').doc(newUsername.toLowerCase());
      
      // Delete old username from index
      transaction.delete(oldIndexRef);
      
      // Add new username to index
      transaction.set(newIndexRef, {
        userId: userId,
        createdAt: new Date(),
      });
      
      // Update user document
      transaction.update(userRef, {
        username: newUsername.toLowerCase(),
        displayName: newUsername,
        updatedAt: new Date(),
      });
    });
    
    // Update UI
    document.getElementById('current-username').value = newUsername;
    document.getElementById('new-username').value = '';
    
    statusDiv.className = 'status status-success';
    statusDiv.textContent = `✓ Username updated to "${newUsername}"`;
    
    // Hide form after 2 seconds
    setTimeout(() => {
      toggleUsernameEdit();
    }, 2000);
    
  } catch (error) {
    console.error('Username update error:', error);
    statusDiv.className = 'status status-error';
    statusDiv.textContent = `✗ ${error.message}`;
    statusDiv.classList.remove('hidden');
  }
}

// Initialize when user is logged in
function initializeUsernameManagement() {
  if (auth.currentUser) {
    db.collection('users').doc(auth.currentUser.uid).onSnapshot((doc) => {
      if (doc.exists) {
        document.getElementById('current-username').value = doc.data().username || '';
        setupUpdateUsernameAvailabilityCheck();
      }
    });
  }
}

// Call when user logs in
document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged((user) => {
    if (user) {
      initializeUsernameManagement();
    }
  });
});
```

---

## 5. Key Security Considerations

### Race Condition Prevention
The **Firestore UNIQUE constraint** on the username field prevents race conditions:
- Even if two users submit the same username simultaneously, only one write will succeed
- Use transactions when updating to ensure atomicity

### Reserved Usernames
Add a Cloud Function to enforce reserved usernames:

```javascript
// Cloud Function (Deploy to Firebase)
exports.validateUsernameReserved = functions.firestore
  .document('users_index/{username}')
  .onCreate(async (snap, context) => {
    const reservedNames = [
      'admin', 'support', 'api', 'login', 'signup', 
      'dashboard', 'settings', 'help', 'about', 'contact'
    ];
    
    const username = context.params.username.toLowerCase();
    
    if (reservedNames.includes(username)) {
      throw new Error('This username is reserved');
    }
  });
```

### URL Safety
If you use usernames in URLs (e.g., `peerfuse.com/user/batman`):
- Always reference users by **immutable userId** internally
- Implement URL redirects if username changes
- Consider using slug-based routing

---

## 6. Integration Checklist

- [ ] Add username fields to Firestore security rules
- [ ] Create `users_index` collection for uniqueness lookups
- [ ] Add username input to signup form (HTML)
- [ ] Implement `registerWithUsername()` function (JS)
- [ ] Setup real-time availability check on signup
- [ ] Add settings section with username update UI
- [ ] Implement `updateUsername()` function
- [ ] Display current username on profile page
- [ ] Add username validation on both client and server
- [ ] Test race condition scenario (simultaneous signup)
- [ ] Test username availability check
- [ ] Test username update workflow
- [ ] Add loading states during async operations
- [ ] Add error handling with user-friendly messages

---

## 7. Example Usage Flow

### Signup Flow:
1. User enters email, password, and desired username
2. Real-time check shows if username is available
3. On submit, validate and check availability again
4. Create Firebase Auth user
5. Create user document in Firestore
6. Create username index entry
7. Redirect to profile completion

### Update Flow:
1. User goes to settings
2. Clicks "Edit" next to current username
3. Enters new username
4. Real-time check shows availability
5. On "Save", verify again (prevents race conditions)
6. Update user document and index atomically
7. Show success message
8. Update display name throughout app

---

## 8. Database Query Examples

### Get user by username:
```javascript
const querySnapshot = await db.collection('users_index')
  .doc(username.toLowerCase())
  .get();

if (querySnapshot.exists) {
  const userId = querySnapshot.data().userId;
  const userRef = db.collection('users').doc(userId);
  const user = await userRef.get();
  console.log(user.data());
}
```

### Check username availability:
```javascript
const isAvailable = !(await db.collection('users_index')
  .doc(username.toLowerCase())
  .get()).exists;
```

### List all usernames (NOT recommended for production):
```javascript
const snapshots = await db.collection('users_index').get();
snapshots.forEach((doc) => {
  console.log(doc.id, doc.data().userId);
});
```

---

## Summary

This implementation provides:
- ✅ Unique username enforcement via Firestore UNIQUE constraint
- ✅ O(1) username availability checks using dedicated index collection
- ✅ Real-time validation with debounced network checks
- ✅ Transaction-based updates to prevent race conditions
- ✅ User-friendly error messages
- ✅ Security rules to prevent unauthorized access
- ✅ Seamless integration with existing Firebase setup

