# Publish ReturnTrace to GitHub

The public repository is https://github.com/Ashutoshb1603/retutnTrace, verified October 18, 2026. Its `main` branch contains the initial source commit. Credentials, runtime records, dependency folders, and built output are excluded.

For final documentation updates, use a normal VS Code terminal in this folder:

```powershell
git status
git add docs README.md
git commit -m "Finalize hackathon submission details"
git push
```

Complete any sign-in prompt in your own browser. After a successful push, check the README and latest commit in GitHub. Set the actual recorded video URL in `docs/SUBMISSION.md` and `docs/SUBMISSION_FORM.md` before the last documentation push.

## Final demo checks

Start the existing `returntrace-db` container in Docker Desktop. Restart ReturnTrace with `./start.ps1` from VS Code so the updated backend is loaded. Run:

```powershell
npm run test:integration
npm run evaluate
```

Both commands use FalkorDB and do not consume model quota. The integration suite creates and removes only its own temporary test graph. Read `docs/CODE_GUIDE.md`, practice `docs/DEMO.md`, and keep the AI-assistance disclosure in the submission.

Publishing the source does not submit the hackathon entry. Registration, the demo recording, and the event submission still need completion or confirmation.
