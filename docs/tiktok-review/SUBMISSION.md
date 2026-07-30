# TikTok app review submission

## Basic information

- App icon: `intertexe-tiktok-app-icon.png` (1024 × 1024 PNG)
- App name: `Intertexe`
- Category: `Shopping` (use `Lifestyle` if Shopping is unavailable)
- Description: `Discover natural-fiber fashion and understand how TikTok content brings shoppers to Intertexe.`
- Website: `https://www.intertexe.com`
- Terms of Service: `https://www.intertexe.com/terms`
- Privacy Policy: `https://www.intertexe.com/privacy`
- Platform: `Web` only
- Redirect URI: `https://www.intertexe.com/api/dashboard/integrations/callback/tiktok`

## Products and scopes

Select only:

- Login Kit
- Display API

Request only:

- `user.info.basic`
- `user.info.profile`
- `user.info.stats`
- `video.list`

Do not select Share Kit or Content Posting API; Intertexe does not currently use them.

## App review explanation

Intertexe is a natural-fiber fashion discovery website. TikTok Login Kit lets an authorized Intertexe workspace owner connect their TikTok account from Settings → Integrations. `user.info.basic` identifies the connected account and displays its name/avatar. `user.info.profile` displays the TikTok username and profile information so the user can verify the correct account is connected. `user.info.stats` imports follower and account engagement totals for the private acquisition dashboard. The Display API with `video.list` imports the user's recent public videos and their view, like, comment, and share counts. Intertexe uses this read-only data to show TikTok discovery performance, top videos, and changes between syncs. Intertexe does not publish, edit, or delete TikTok content. Users can disconnect TikTok at any time from Settings → Integrations.

## Sandbox credentials (configured)

- Vercel Production + Preview: `TIKTOK_USE_SANDBOX=1`, sandbox client key/secret, scopes set
- Local: `.env.local` (gitignored)
- Rotate the sandbox client secret after review — it was shared in chat

## Required demo recording

Record on `https://www.intertexe.com` using the TikTok Developer Portal sandbox:

1. Show the browser address bar with `www.intertexe.com`.
2. Open Intertexe and sign in.
3. Open Dashboard → Settings → Integrations.
4. Show TikTok as disconnected and click **Connect**.
5. Show the TikTok sandbox authorization screen.
6. Show every requested permission and approve access.
7. Show the redirect back to the Intertexe integrations page.
8. Show TikTok as connected with the authorized username/profile.
9. Click **Sync now**.
10. Open Acquisition → Social discovery (TikTok).
11. Show profile/account statistics and recent videos with view, like, comment, and share metrics.
12. Return to Settings → Integrations and show the disconnect control.

The final MP4 or MOV must be under 50 MB. Do not use a simulated consent page or sample data.
