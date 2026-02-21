# Hosting: Firebase + Google Cloud

This app is set up to be publicly accessible using **Firebase Hosting** (front door) and **Cloud Run** (Next.js server). Use this checklist to ensure Firebase and Google Cloud are configured correctly.

---

## 1. Firebase Console (Project: `collab-board-rj`)

### Billing
- [ ] **Blaze (pay-as-you-go)** is required for Cloud Run.  
  [Console → Usage and billing](https://console.firebase.google.com/project/collab-board-rj/usage/details) → Upgrade if still on Spark.

### Authentication – Authorized domains
- [ ] Add your hosting domains so sign-in works in production:
  - [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/collab-board-rj/authentication/settings)
  - Ensure these are listed:
    - `localhost` (already there for dev)
    - `collab-board-rj.web.app`
    - `collab-board-rj.firebaseapp.com`
  - If you add a **custom domain** for Hosting, add that domain here too.

### Firestore & Realtime Database
- [ ] Rules are in the repo and have an expiry date. Deploy them and extend before they expire:
  - `firestore.rules` (Firestore)
  - `database.rules.json` (Realtime Database)
- [ ] Deploy rules and indexes:
  ```bash
  firebase deploy --only firestore,database
  ```

---

## 2. Google Cloud (same project)

### APIs
- [ ] **Cloud Run API** – [Enable](https://console.cloud.google.com/apis/library/run.googleapis.com?project=collab-board-rj)
- [ ] **Artifact Registry** (or Container Registry) – used when building the container image.  
  Cloud Build uses it by default when you run `gcloud builds submit`.

### First-time gcloud setup
```bash
gcloud config set project collab-board-rj
gcloud auth application-default login
```

### If rollouts fail with `invoker_iam_disabled` (Firebase App Hosting)

When a rollout fails with:

**"Changes to invoker_iam_disabled require run.services.setIamPolicy permissions"**

the identity that deploys to Cloud Run doesn’t have permission to set “Allow public access” on the service. Fix it in Google Cloud:

1. **Grant Cloud Run Admin to the right principal**
   - Open [Google Cloud Console → IAM & Admin → IAM](https://console.cloud.google.com/iam-admin/iam?project=collab-board-rj).
   - Find the principal that runs the rollout. This is often:
     - **Your user** (e.g. `your-email@gmail.com`) if you trigger rollouts from the Firebase Console, or
     - **Cloud Build service account**: `810747159790@cloudbuild.gserviceaccount.com` (use your project’s numeric ID if different).
   - Click **Edit** (pencil) for that principal (or **Grant Access** to add it).
   - Add role: **Cloud Run Admin** (`roles/run.admin`).
   - Save.

2. **Retry the rollout** in [Firebase Console → App Hosting](https://console.firebase.google.com/project/collab-board-rj/apphosting) (e.g. “Create rollout” or re-run the failed rollout).

**Alternative (one-time, same project):** If you have Owner/Editor, you can allow public access on the existing Cloud Run service so the app is public, but **future rollouts** will still try to set IAM and can fail unless the deploy identity has `run.services.setIamPolicy`. Granting **Cloud Run Admin** to that identity is the reliable fix.

### If Security tab keeps resetting to "Require authentication" on each push (App Hosting)

When you push to GitHub, Firebase App Hosting deploys a new Cloud Run revision and the **Security** tab often resets to **Require authentication**. To fix this automatically:

1. **Add a GitHub Actions secret**
   - Create a GCP service account (or use an existing one) with **Cloud Run Admin** (`roles/run.admin`) on the project.
   - Create a JSON key for that account: [IAM → Service Accounts → Keys → Add key](https://console.cloud.google.com/iam-admin/serviceaccounts?project=collab-board-rj).
   - In GitHub: **Settings → Secrets and variables → Actions** → **New repository secret**.
   - Name: `GCP_SA_KEY`, Value: paste the entire JSON key file.

2. **Use the workflow in this repo**
   - The workflow `.github/workflows/cloudrun-allow-unauthenticated.yml` runs on every push to `main` (after a short wait for the deploy to finish) and runs:
     ```bash
     gcloud run services add-iam-policy-binding collab-board \
       --region=us-east4 --member="allUsers" --role="roles/run.invoker"
     ```
   - So the Cloud Run service stays **Allow unauthenticated** after each deploy.

3. **Optional:** If your App Hosting backend uses a different Cloud Run service name or region, set repository **Variables**: `GCP_PROJECT_ID`, `CLOUD_RUN_SERVICE`, `CLOUD_RUN_REGION`.

You can also run the workflow manually: **Actions → Cloud Run allow unauthenticated → Run workflow**.

---

## 3. Environment variables in production

The app needs these in the **Cloud Run** service (not only in `.env.local`):

| Variable | Where to set |
|----------|-------------------------------|
| `NEXT_PUBLIC_FIREBASE_*` | Cloud Run → Edit & deploy new revision → Variables (or Secret Manager) |
| `OPENAI_API_KEY` | Prefer **Secret Manager**; add as secret in Cloud Run |

To add env vars when deploying (example):

```bash
gcloud run deploy collab-board \
  --image gcr.io/collab-board-rj/collab-board \
  --region us-east4 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_PROJECT_ID=collab-board-rj,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=collab-board-rj.firebaseapp.com,..."
```

For secrets (e.g. `OPENAI_API_KEY`):

1. Create secret:  
   `gcloud secrets create openai-api-key --data-file=-` (paste key, then Ctrl+Z Enter).
2. Grant Cloud Run access and set:  
   `--set-secrets=OPENAI_API_KEY=openai-api-key:latest`

---

## 4. Deploy the app

### Build and deploy to Cloud Run (service name must be `collab-board`, region `us-east4`)

From the project root:

```bash
# Build the container image (uses Dockerfile and .dockerignore)
gcloud builds submit --tag gcr.io/collab-board-rj/collab-board

# Deploy to Cloud Run (us-east4 matches firebase.json rewrites)
gcloud run deploy collab-board \
  --image gcr.io/collab-board-rj/collab-board \
  --region us-east4 \
  --platform managed \
  --allow-unauthenticated
```

When prompted, allow unauthenticated invocations so Firebase Hosting can reach the service.

Set **environment variables** (and secrets) in the same command or in a later revision (Console or `gcloud run services update`).

### Deploy Firebase Hosting (rewrites to Cloud Run)

After the Cloud Run service is deployed:

- If Firebase complains that the `out` directory is missing, create it once: `mkdir out` (or add an empty `.gitkeep` inside). With the current rewrites, all traffic goes to Cloud Run; `out` is only used if no rewrite matches.

```bash
firebase deploy --only hosting
```

Your app will be available at:

- **https://collab-board-rj.web.app**
- **https://collab-board-rj.firebaseapp.com**

(And any custom domain you attach in Hosting.)

---

## 5. One-time checklist summary

| Step | Action |
|------|--------|
| 1 | Upgrade to Blaze if needed |
| 2 | Add `collab-board-rj.web.app` and `collab-board-rj.firebaseapp.com` to Auth authorized domains |
| 3 | Enable Cloud Run API (and ensure Artifact Registry/Cloud Build is available) |
| 4 | Run `gcloud builds submit` and `gcloud run deploy` with env vars/secrets |
| 5 | Run `firebase deploy --only hosting` |
| 6 | Run `firebase deploy --only firestore,database` for rules/indexes |

---

## 6. Optional: Firebase App Hosting

This project’s `firebase.json` includes `"apphosting": { "appAdmin": true }`. If you prefer **Firebase App Hosting** (Git-based deploys and managed builds) instead of building the Docker image yourself:

1. Connect the repo in [Firebase Console → App Hosting](https://console.firebase.google.com/project/collab-board-rj/apphosting).
2. Configure build and env vars (including secrets) in the App Hosting UI.
3. App Hosting will create/update a Cloud Run service; you may need to align the **service name** and **region** with the existing `hosting.rewrites` in `firebase.json` (`collab-board`, `us-east4`) or update `firebase.json` to match the App Hosting service.

Either path (manual Cloud Run + Hosting or App Hosting) can make the app publicly accessible; the steps above focus on the manual Cloud Run + Hosting flow already implied by your current `firebase.json`.
