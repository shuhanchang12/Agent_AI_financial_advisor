# Deployment Guide - Vercel + Render (Free Tier)

## Architecture
```
GitHub Repository
    ↓
├─ Frontend → Vercel (https://yourapp.vercel.app)
└─ Backend → Render (https://yourapp-api.onrender.com)
```

---

## STEP 1: Prepare Repository ✅

### 1.1 Update .gitignore
```bash
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
```

### 1.2 Push Docker files to GitHub
```bash
cd /Users/mory_jr/Agent_AI_financial_advisor
git add Dockerfile.backend Dockerfile.frontend docker-compose.yml render.yaml .dockerignore
git commit -m "Add Docker configuration for production deployment"
git push origin main
```

---

## STEP 2: Deploy Backend on Render 🚀

### 2.1 Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize GitHub access

### 2.2 Deploy Backend
1. Click "New +" → "Web Service"
2. Select your GitHub repository: `Agent_AI_financial_advisor`
3. Fill deployment settings:
   - **Name**: `financial-advisor-api`
   - **Runtime**: Docker
   - **Region**: Oregon (or closest to you)
   - **Plan**: Free
   - **Branch**: main

4. Click "Advanced" and add environment variables:
   ```
   LANGFUSE_SECRET_KEY=your_key_here
   LANGFUSE_PUBLIC_KEY=your_key_here
   TAVILY_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here
   ```

5. Click "Create Web Service"
6. Wait for deployment (~5 minutes)
7. Copy API URL: `https://financial-advisor-api.onrender.com`

**Note**: Free tier sleeps after 15 mins of inactivity. First request takes ~30s to wake up.

---

## STEP 3: Deploy Frontend on Vercel 🎨

### 3.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize GitHub access

### 3.2 Deploy Frontend
1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Add environment variables:
   ```
   VITE_API_URL=https://financial-advisor-api.onrender.com
   ```

5. Click "Deploy"
6. Wait for deployment (~2 minutes)
7. Your app is live at: `https://yourapp-something.vercel.app`

---

## STEP 4: Connect Frontend to Backend 🔗

### 4.1 Update Frontend API URL
The frontend needs to know the backend URL. It's already configured via `VITE_API_URL` environment variable in `geminiService.ts`.

**If you need to change it manually**, edit `src/services/geminiService.ts`:
```typescript
const API_BASE_URL = 'https://financial-advisor-api.onrender.com'; // Change this
```

### 4.2 Test the Connection
1. Go to your Vercel URL
2. Enter a ticker symbol (e.g., "AAPL")
3. Wait for multi-agent analysis
4. Check browser console (F12) for any API errors

---

## STEP 5: Auto-Deployment Setup (Optional) 🤖

### Vercel Auto-Deploy
- ✅ Automatic - every push to main triggers deploy
- No extra setup needed

### Render Auto-Deploy  
- ✅ Automatic - configured in render.yaml
- No extra setup needed

---

## MONITORING & LOGS

### Render Logs
1. Go to https://render.com/dashboard
2. Select your service
3. Click "Logs" tab
4. See real-time logs

### Vercel Logs
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Deployments"
4. Click deployment → "Logs"

---

## TROUBLESHOOTING

### Backend not responding
```
1. Check Render service is running (might be sleeping)
2. Check environment variables are set
3. View Render logs for errors
```

### Frontend can't reach backend
```
1. Check VITE_API_URL is correct
2. Check backend URL is accessible
3. Check CORS is enabled on backend
```

### "Address already in use" error
```
Kill process on port:
lsof -ti:8000,3000 | xargs kill -9
```

### Build fails on Vercel
```
1. Check package.json scripts
2. Verify npm install works locally: npm install && npm run build
3. Check build logs on Vercel dashboard
```

### Build fails on Render
```
1. Check requirements.txt is valid
2. Verify Docker builds locally: docker build -f Dockerfile.backend .
3. Check Render logs for specific errors
```

---

## PRODUCTION CHECKLIST ✅

- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel
- [ ] Environment variables set on both platforms
- [ ] Backend API URL updated in frontend
- [ ] Test full workflow (search ticker, get analysis)
- [ ] Check browser console for errors
- [ ] Verify both services in monitoring dashboards
- [ ] Share live URLs with team

---

## USEFUL COMMANDS

```bash
# Test locally with Docker
docker-compose up

# Build backend image only
docker build -f Dockerfile.backend -t financial-backend .

# Build frontend image only
docker build -f Dockerfile.frontend -t financial-frontend .

# Check Docker logs
docker logs financial-advisor-backend
docker logs financial-advisor-frontend
```

---

## NEXT STEPS

1. ✅ Create Render account
2. ✅ Deploy backend
3. ✅ Create Vercel account
4. ✅ Deploy frontend
5. ✅ Test live application
6. ✅ Share URLs with stakeholders

**Your app will be live in ~15 minutes with $0 cost!** 🎉

---

## SUPPORT

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Docker Docs: https://docs.docker.com

