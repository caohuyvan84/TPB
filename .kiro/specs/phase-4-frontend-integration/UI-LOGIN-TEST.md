# UI Login Test Guide

**Date:** 2026-03-09T18:12:00+07:00
**Status:** ✅ Ready for Testing

## 🚀 Services Running

### Backend
- ✅ PostgreSQL (port 5432)
- ✅ Redis (port 6379)
- ✅ Kong API Gateway (port 8000)
- ✅ Identity Service (port 3001)

### Frontend
- ✅ Agent Desktop (port 3000)
- PID: Check `/tmp/frontend.pid`
- Logs: `tail -f /tmp/frontend.log`

## 🔐 Test Credentials

### Admin User
```
Username: admin
Password: Admin@123
```

### Agent User (if needed)
```
Username: agent001
Password: Agent@123
```

## 📋 Test Checklist

### 1. Access Login Page
- [ ] Open browser: http://localhost:3000
- [ ] Should redirect to `/login` (not authenticated)
- [ ] Login form visible with username/password fields

### 2. Test Login Flow
- [ ] Enter username: `admin`
- [ ] Enter password: `Admin@123`
- [ ] Click "Sign in" button
- [ ] Loading state shows
- [ ] Success toast appears
- [ ] Redirects to `/agent` (Agent Desktop)

### 3. Verify Authentication
- [ ] Check localStorage for tokens:
  - `accessToken` exists
  - `refreshToken` exists
- [ ] User data loaded in AuthContext
- [ ] Agent Desktop UI loads (not login page)

### 4. Test Protected Routes
- [ ] Try accessing `/agent` directly (should work)
- [ ] Logout (if logout button exists)
- [ ] Try accessing `/agent` again (should redirect to `/login`)

### 5. Test Error Handling
- [ ] Enter wrong password
- [ ] Error toast appears
- [ ] Form still usable
- [ ] Try correct password again (should work)

## 🔍 Debugging

### Check Browser Console
```javascript
// Check if tokens exist
localStorage.getItem('accessToken')
localStorage.getItem('refreshToken')

// Check API calls
// Open Network tab and filter by "login"
```

### Check Backend Logs
```bash
tail -f /tmp/identity.log
```

### Check Frontend Logs
```bash
tail -f /tmp/frontend.log
```

### Common Issues

#### 1. CORS Error
**Symptom:** Network error in console
**Solution:** Check Kong CORS configuration

#### 2. 404 on /api/auth/login
**Symptom:** Cannot POST /api/auth/login
**Solution:** Check Identity Service is running on port 3001

#### 3. Redirect Loop
**Symptom:** Keeps redirecting between /login and /agent
**Solution:** Check AuthContext isLoading state

#### 4. Token Not Saved
**Symptom:** Login succeeds but redirects back to login
**Solution:** Check localStorage in browser DevTools

## 🎯 Expected Behavior

### Successful Login Flow
```
1. User enters credentials
2. POST /api/auth/login → 200 OK
3. Tokens saved to localStorage
4. User state updated in AuthContext
5. WebSocket connects with token
6. Redirect to /agent
7. Agent Desktop loads with real user data
```

### API Calls Sequence
```
1. POST http://localhost:3001/api/auth/login
   → Returns: accessToken, refreshToken, user

2. GET http://localhost:3001/api/users/me
   → Returns: user profile (with JWT header)

3. WebSocket connection to http://localhost:3001
   → Auth: { token: accessToken }
```

## 📸 Screenshots to Capture

1. Login page (before login)
2. Login form with credentials entered
3. Loading state during login
4. Success toast notification
5. Agent Desktop after successful login
6. Browser DevTools → Application → Local Storage (tokens)
7. Browser DevTools → Network → login request/response

## ✅ Success Criteria

- [ ] Login page loads without errors
- [ ] Can enter credentials
- [ ] Login button works
- [ ] API call succeeds (200 OK)
- [ ] Tokens saved to localStorage
- [ ] Redirects to Agent Desktop
- [ ] No console errors
- [ ] User data displays correctly

## 🔄 Quick Commands

### Start All Services
```bash
# Infrastructure
cd infra && docker compose up -d postgres redis kong

# Identity Service
./restart-identity.sh

# Frontend
./start-frontend.sh
```

### Stop Services
```bash
# Frontend
kill $(cat /tmp/frontend.pid)

# Identity Service
kill $(cat /tmp/identity.pid)

# Infrastructure
cd infra && docker compose down
```

### Check Status
```bash
# Frontend
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend down"

# Identity Service
curl -s http://localhost:3001/api/auth/login > /dev/null && echo "✅ Identity OK" || echo "❌ Identity down"

# Database
docker exec tpb-postgres pg_isready -U postgres && echo "✅ PostgreSQL OK" || echo "❌ PostgreSQL down"
```

---

**Ready to test! Open http://localhost:3000 in your browser.**
