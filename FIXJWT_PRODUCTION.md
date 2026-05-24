# Fix JWT Token Verification Issue in Production

## Problem Summary
When clicking the Admin Panel button in production, you get redirected to login instead of entering the admin panel. This happens especially after closing and reopening your browser with "Remember Me" enabled.

**Root Cause:** The backend pod in k3s might not have the correct JWT_SECRET loaded from the Kubernetes Secret.

---

## Quick Diagnosis

### 1. Check Backend Logs
Check if the backend pod loaded the JWT_SECRET correctly:

```bash
# List k3s backend pods
kubectl get pods -n lse-gestionale | grep backend

# Get logs (replace pod-name with actual pod name)
kubectl logs -n lse-gestionale <pod-name> | head -20
```

**Expected output:**
```
✓ JWT_SECRET loaded from environment (length: XX chars)
```

**Problem output:**
```
⚠️  WARNING: JWT_SECRET is using default value "change_me_in_prod" - this is UNSAFE in production!
```

---

## Solution: Recreate Backend Pod

If the logs show JWT_SECRET is using the default, the pod needs to be recreated to load the Secret from k3s.

### Option A: Rolling Restart (Recommended)
```bash
kubectl rollout restart deployment/lse-backend -n lse-gestionale
```

Wait 30-60 seconds for the pod to restart, then verify the logs again.

### Option B: Manual Delete & Restart
```bash
# Delete the pod (deployment will auto-recreate it)
kubectl delete pod -n lse-gestionale -l app=lse-backend

# Verify new pod is running
kubectl get pods -n lse-gestionale | grep backend
```

---

## Verify Fix Works

### 1. Check Backend Loaded Correct Secret
```bash
kubectl logs -n lse-gestionale <new-pod-name> | head -20
```
Should show: `✓ JWT_SECRET loaded from environment (length: 43 chars)`

### 2. Test in Browser
1. **Log in fresh**: Clear localStorage, login again
2. **Close browser** completely
3. **Reopen browser** and navigate to app
4. **Click Admin Panel** button → should enter directly WITHOUT redirect to login

### 3. Check Browser Console
Open DevTools (F12) → Console tab:
- Should NOT see error messages about token verification
- If there are errors, they'll help with debugging

---

## Security Notes

⚠️ **Current JWT_SECRET in production:** `dev-jwt-secret-key-for-development`

This is development-grade. For production, consider:

1. **Generate a new random secret:**
   ```bash
   openssl rand -base64 32
   # Output: example: Kj8vX9pQmN2bL7aR4cD6eF3gH5jI0wT1zY8bC4dE5fG6=
   ```

2. **Update the secret in k3s:**
   ```bash
   # Edit the secret
   kubectl edit secret lse-secrets -n lse-gestionale
   
   # Find JWT_SECRET line and update the base64 value:
   # JWT_SECRET: <new-base64-encoded-value>
   
   # Encode your random secret:
   echo -n "Kj8vX9pQmN2bL7aR4cD6eF3gH5jI0wT1zY8bC4dE5fG6=" | base64
   ```

3. **Recreate the pod** to load the new secret (see solution above)

⚠️ **Important:** After updating JWT_SECRET, all existing tokens become invalid. Users will need to log in again.

---

## Still Having Issues?

### Check JWT_SECRET Matches Between Pods
If you have multiple backend instances, they must all use the same JWT_SECRET:

```bash
kubectl get pods -n lse-gestionale -l app=lse-backend -o wide

# Check each pod's logs
for pod in $(kubectl get pods -n lse-gestionale -l app=lse-backend -o name); do
  echo "=== $pod ==="
  kubectl logs -n lse-gestionale $pod | grep "JWT_SECRET"
done
```

### Frontend Logs
Open browser DevTools (F12) → Console → Look for messages:
- "Token verification failed on app startup" → token is invalid
- "Token verification request failed" → network/backend issue

### Backend Verification Endpoint Test
```bash
# Get a valid token from login, then test:
curl -H "Authorization: Bearer <your-token>" \
  https://api.your-domain.com/api/v1/auth/verify
```

Expected response:
```json
{
  "success": true,
  "user": {
    "userId": "...",
    "username": "...",
    "email": "...",
    "rsiVerified": true
  }
}
```

---

## Additional Debugging

### If token works for some users but not others:
- Check if they have `rsiVerified: true` and `organizationRank >= 4`
- Verify in admin panel that the user status is correct

### If token works initially but fails after browser restart:
- This is exactly the JWT_SECRET mismatch issue
- Ensure the pod restart completed successfully
- Clear browser cache/storage and try fresh login

---

## Recovery Steps (If tokens are broken)
1. Regenerate JWT_SECRET with new value (see Security Notes above)
2. Update k3s Secret
3. Restart pods
4. **Notify all users to log in again** (existing tokens are invalid)
5. Test with multiple users before closing ticket
