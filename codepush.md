# Code Deployment Guidelines (VPS via GitHub Actions)

Whenever you push new code to this repository with the intention of deploying it to the live VPS, **you MUST strictly follow this checklist**. 

The VPS uses a GitHub Action (`deploy.yml`) that relies on a Docker health check. If the code contains any hidden TypeScript errors or build failures, the health check will fail, and the VPS will silently **roll back** to the previous version, causing new features to not show up on the live site.

### Step 1: Pre-Deployment Build Check
Before committing and pushing ANY code, you must verify that the Next.js dashboard compiles successfully.
1. Navigate to the dashboard directory: `cd resume-saas-v4`
2. Run the build command: `npm run build`
3. Wait for the build to finish. If there are **any** TypeScript errors or build failures, you must fix them before proceeding.

### Step 2: Commit Changes
Once the build is 100% successful, commit the changes to the `main` branch.
```bash
git add .
git commit -m "Your descriptive commit message here"
```

### Step 3: Merge to Deploy Branch
The VPS only listens for changes pushed to the `Deploy` branch. You must merge your changes into `Deploy`.
```bash
git checkout Deploy
git merge main
```

### Step 4: Push Deploy Branch
Push the `Deploy` branch to trigger the GitHub Action and deploy to the VPS.
```bash
git push origin Deploy
```

### Step 5: Push Main Branch (Cleanup)
Switch back to `main` and push the changes to keep the repository synced.
```bash
git checkout main
git push origin main
```

### Quick Deployment Command
If you have already verified the build manually, you can use this chained command to deploy rapidly:
```bash
git add . ; git commit -m "Update message" ; git checkout Deploy ; git merge main ; git push origin Deploy ; git checkout main ; git push origin main
```
