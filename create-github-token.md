# Create GitHub Personal Access Token

## Step 1: Create the Token

1. **Click this link to open GitHub token creation:**
   👉 https://github.com/settings/tokens/new

2. **Fill in the form:**
   - **Note**: `Cursor AI Agent` (or any name you prefer)
   - **Expiration**: Choose your preference:
     - 90 days (recommended for security)
     - 1 year (convenience)
     - No expiration (use with caution)
   - **Scopes**: Check the box for **`repo`**
     - This gives full control of private repositories
     - Includes: repo:status, repo_deployment, public_repo, repo:invite, security_events

3. **Scroll down and click**: **"Generate token"**

4. **IMPORTANT**: Copy the token immediately!
   - It will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You won't be able to see it again after you leave the page

## Step 2: Test the Token

Once you have the token, I'll test the authentication by trying to access your GitHub repository.

The token will be stored securely by Windows Credential Manager.

---

## Alternative: SSH Keys (If You Prefer)

If you'd rather use SSH keys instead:

1. Generate key:
   ```powershell
   ssh-keygen -t ed25519 -C "140753622+AugieDoggie2021@users.noreply.github.com"
   ```

2. Copy public key:
   ```powershell
   cat ~/.ssh/id_ed25519.pub
   ```

3. Add to GitHub: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste the public key
   - Save

4. Update remote URL:
   ```powershell
   git remote set-url origin git@github.com:AugieDoggie2021/status-update.git
   ```

---

**Ready?** Once you have your token, tell me and I'll test the authentication!

