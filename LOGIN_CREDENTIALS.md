## 🔐 NETVIZ PRO - LOGIN CREDENTIALS

### ✅ **CORRECT CREDENTIALS**

**Username:** `netviz_admin`  
**Password:** `V3ry$trongAdm1n!2025`

---

### ❌ **INCORRECT CREDENTIALS (Don't Use These)**

~~Username: `admin`~~  
~~Password: `admin123`~~

**Why these don't work:**
- The database has username `netviz_admin`, not `admin`
- The password is set in `.env.local` as `V3ry$trongAdm1n!2025`

---

### 🚀 **HOW TO LOGIN**

1. **Open browser** and go to: `http://localhost:9040`

2. **Clear browser cache** (IMPORTANT!):
   - Press **Cmd + Shift + R** (Mac) or **Ctrl + Shift + R** (Windows)
   - Or use Incognito/Private window

3. **Enter credentials**:
   ```
   Username: netviz_admin
   Password: V3ry$trongAdm1n!2025
   ```

4. **Click "Sign In"**

5. **App should load immediately** - you'll see:
   - NetViz Pro header
   - Data Source panel on left
   - Network visualization area

---

### 🐛 **IF YOU STILL SEE "Initializing..." SCREEN**

This means your browser is using **cached JavaScript**. Fix it:

1. **Hard refresh**: Cmd+Shift+R (or Ctrl+Shift+R)
2. **Clear all cache**: 
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Firefox: Preferences → Privacy → Clear Data → Cached Web Content
3. **Use Incognito/Private window** (bypasses all cache)
4. **Close ALL browser tabs** for localhost:9040, then reopen

---

### ✅ **VALIDATION RESULTS**

Puppeteer E2E test confirms:
```
✅ Gateway login page loaded
✅ Login submitted
✅ SUCCESS: App loaded correctly!
   No stuck screen detected.
   User can access the application.
🎉 ALL TESTS PASSED!
```

---

### 📊 **SERVER STATUS**

All services running:
```
✅ Gateway Server (port 9040): RUNNING
✅ Auth Server (port 9041): RUNNING
✅ Vite Dev Server (port 9042): RUNNING
```

---

### 🔧 **TROUBLESHOOTING**

**Problem:** Login fails with "Invalid credentials"
**Solution:** Make sure you're using `netviz_admin` (not `admin`)

**Problem:** Stuck on "Initializing..." screen
**Solution:** Clear browser cache with Cmd+Shift+R

**Problem:** Can't access http://localhost:9040
**Solution:** Run `./run.sh` in `/netviz-pro` directory

---

**Last Updated:** 2025-11-30T21:04:20+02:00  
**Status:** ✅ Fully Operational
