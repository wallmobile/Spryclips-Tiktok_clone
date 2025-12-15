# Moderator Account Creation Guide

## Current Situation
Currently, moderator accounts are created by:
1. User signs up normally (gets 'user' role by default)
2. Admin changes their role to 'moderator' using the dropdown in Admin Panel → Users tab

## Solution Implemented

### Backend Changes (✅ Completed)
**File: `backend/routes/admin.js`**

Added new endpoint: `POST /api/admin/users`

```javascript
// Create new user (admin only)
router.post('/users', async (req, res) => {
  // Creates user with specified role (user, moderator, admin, creator)
  // Validates username/email uniqueness
  // Pre-verifies email for admin-created accounts
});
```

### Frontend Changes (✅ Completed)
**File: `frontend/src/api/admin.js`**

Added function:
```javascript
export const createUser = async (userData) => {
  const response = await api.post('/api/admin/users', userData);
  return response.data;
};
```

**File: `frontend/src/components/admin/AdminPanel.js`**

1. **Import createUser:**
```javascript
import { ..., createUser, ... } from '../../api/admin';
```

2. **Add state:**
```javascript
const [showCreateUserModal, setShowCreateUserModal] = useState(false);
const [createUserData, setCreateUserData] = useState({
  username: '',
  email: '',
  password: '',
  role: 'user',
  displayName: ''
});
const [creatingUser, setCreatingUser] = useState(false);
```

3. **Add handler:**
```javascript
const handleCreateUser = async (e) => {
  e.preventDefault();
  setCreatingUser(true);
  try {
    const response = await createUser(createUserData);
    if (response.success) {
      setToast({ type: 'success', message: response.message || 'User created successfully' });
      setShowCreateUserModal(false);
      setCreateUserData({ username: '', email: '', password: '', role: 'user', displayName: '' });
      fetchUsers();
    }
  } catch (error) {
    setToast({ type: 'error', message: error.response?.data?.message || 'Failed to create user' });
  } finally {
    setCreatingUser(false);
  }
};
```

4. **Add "Create User" button** in Users tab header (around line 2750):
```javascript
<div className="admin-section-header">
  <h2>All Users</h2>
  <div style={{ display: 'flex', gap: '10px' }}>
    <button
      onClick={() => setShowCreateUserModal(true)}
      className="admin-btn admin-btn-primary"
    >
      + Create User
    </button>
    {/* existing search button */}
  </div>
</div>
```

5. **Add Create User Modal** before closing `</div>` tag (around line 11507):
```javascript
{/* Create User Modal */}
{showCreateUserModal && (
  <div className="admin-modal-overlay" onClick={() => setShowCreateUserModal(false)}>
    <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header">
        <h3>Create New User</h3>
        <button onClick={() => setShowCreateUserModal(false)}>×</button>
      </div>
      <form onSubmit={handleCreateUser} className="admin-form">
        <div className="admin-form-group">
          <label>Username *</label>
          <input
            type="text"
            value={createUserData.username}
            onChange={(e) => setCreateUserData({ ...createUserData, username: e.target.value })}
            required
          />
        </div>
        <div className="admin-form-group">
          <label>Email *</label>
          <input
            type="email"
            value={createUserData.email}
            onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
            required
          />
        </div>
        <div className="admin-form-group">
          <label>Password *</label>
          <input
            type="password"
            value={createUserData.password}
            onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <div className="admin-form-group">
          <label>Display Name</label>
          <input
            type="text"
            value={createUserData.displayName}
            onChange={(e) => setCreateUserData({ ...createUserData, displayName: e.target.value })}
          />
        </div>
        <div className="admin-form-group">
          <label>Role *</label>
          <select
            value={createUserData.role}
            onChange={(e) => setCreateUserData({ ...createUserData, role: e.target.value })}
            required
          >
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
            <option value="creator">Creator</option>
          </select>
        </div>
        <div className="admin-modal-actions">
          <button type="button" onClick={() => setShowCreateUserModal(false)}>Cancel</button>
          <button type="submit" disabled={creatingUser}>
            {creatingUser ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

## How to Use

### Method 1: Direct Creation (New Feature)
1. Go to Admin Panel → Users tab
2. Click "Create User" button
3. Fill in the form:
   - Username (required)
   - Email (required)
   - Password (required, min 6 characters)
   - Display Name (optional)
   - Role: Select "Moderator"
4. Click "Create User"
5. Moderator account is created immediately

### Method 2: Convert Existing User (Current Method)
1. Go to Admin Panel → Users tab
2. Find the user you want to make a moderator
3. In the "Role" column, change dropdown from "User" to "Moderator"
4. Role is updated immediately

## Moderator Permissions
Moderators have access to:
- Content moderation (videos, stories, comments)
- Report management
- User management (limited)
- Cannot access:
  - Full admin settings
  - Monetization management
  - System configuration

## Security Notes
- Only admins can create users with specific roles
- Admin-created accounts are automatically email-verified
- Passwords are hashed before storage
- Username and email must be unique

