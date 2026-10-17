# Publish ReturnTrace to GitHub

Account: **ashutoshb1603**. The source is ready locally; no GitHub repository has been created or pushed by this session.

1. In your signed-in Chrome browser, open https://github.com/new and create a **public** repository named `returntrace`. Leave the README, .gitignore, and license initialization unchecked because this folder already contains the source and its initial commit.
2. In a normal VS Code terminal opened in this project folder, run:

```powershell
git remote add origin https://github.com/ashutoshb1603/returntrace.git
git push -u origin main
```

If Git prompts for sign-in, complete it in your own browser. Do not put a token in the remote URL. If `origin` already exists, inspect `git remote -v` before changing it; do not overwrite an unrelated remote.

After the push succeeds, open the repository in Chrome and check the README and file list. `.env`, runtime records, dependency folders, and built output are excluded. Add the verified repository URL and the recorded demo video URL to `docs/SUBMISSION.md`, then commit and push that update.

## Final demo checks

Start the existing `returntrace-db` container in Docker Desktop. Restart ReturnTrace with `./start.ps1` from VS Code so the updated backend is loaded. Run:

```powershell
npm run test:integration
npm run evaluate
```

Both commands use FalkorDB and do not consume model quota. The integration suite creates and removes only its own temporary test graph. Read `docs/CODE_GUIDE.md`, practice `docs/DEMO.md`, and keep the AI-assistance disclosure in the submission.

Publishing the source does not submit the hackathon entry. Registration, the demo recording, and the event submission still need completion or confirmation.
