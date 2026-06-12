# Release and Chrome Web Store Publishing

Official guide: https://developer.chrome.com/docs/webstore/using-api?hl=zh-cn

## GitHub Secrets and Variables

Preferred repository secret:

- `CHROME_WEBSTORE_SERVICE_ACCOUNT_JSON`

Required repository variables for automatic Web Store publishing on tag pushes:

- `CHROME_WEBSTORE_PUBLISHER_ID`
- `PUBLISH_CHROME_WEBSTORE=true`

The release workflow also supports manual publishing from `workflow_dispatch` with `publish_chrome=true`.

## Service Account Setup

Official guide: https://developer.chrome.com/docs/webstore/service-accounts

1. Enable the Chrome Web Store API in a Google Cloud project.
2. Create a service account.
3. In the Chrome Web Store Developer Dashboard, open the publisher Account section and add the service account email.
4. Create a JSON key for the service account.
5. Save the full JSON key as the GitHub Actions secret `CHROME_WEBSTORE_SERVICE_ACCOUNT_JSON`.

The workflow uses that service account to create a short-lived access token with this scope:

```text
https://www.googleapis.com/auth/chromewebstore
```

## Legacy OAuth Fallback

The workflow still supports the older OAuth refresh-token path if `CHROME_WEBSTORE_SERVICE_ACCOUNT_JSON` is not configured.

Fallback repository secrets:

- `CHROME_WEBSTORE_CLIENT_ID`
- `CHROME_WEBSTORE_CLIENT_SECRET`
- `CHROME_WEBSTORE_REFRESH_TOKEN`

The current English Chrome Web Store API guide uses OAuth Playground with a Web application OAuth client whose authorized redirect URI includes:

```text
https://developers.google.com/oauthplayground
```

If you already have an authorization code from an older out-of-band flow, the helper can exchange it:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Get-ChromeWebStoreRefreshToken.ps1 `
  -ClientId "<OAuth client ID>" `
  -ClientSecret "<OAuth client secret>" `
  -Code "<authorization code>" `
  -SetGitHubSecret
```

The out-of-band redirect URI is deprecated for newer OAuth clients and may fail with HTTP 400. Prefer the service account flow for CI.

## API Endpoints

The workflow follows the v2 Chrome Web Store API:

```text
POST https://chromewebstore.googleapis.com/upload/v2/publishers/$PUBLISHER_ID/items/$EXTENSION_ID:upload
POST https://chromewebstore.googleapis.com/v2/publishers/$PUBLISHER_ID/items/$EXTENSION_ID:publish
```

It checks upload progress with:

```text
GET https://chromewebstore.googleapis.com/v2/publishers/$PUBLISHER_ID/items/$EXTENSION_ID:fetchStatus
```

## Release Flow

1. Update `manifest.json` with the new version.
2. Push a matching tag, for example `v2.0`.
3. GitHub Actions creates `BookmarkClickTracker-<tag>.zip` and attaches it to a GitHub Release.
4. If `PUBLISH_CHROME_WEBSTORE=true` and Chrome Web Store credentials exist, the workflow uploads and publishes the zip.

The Web Store package includes only:

- `manifest.json`
- `background.js`
- `popup.html`
- `popup.js`
- `chart.umd.min.js`
- extension icons
- `_locales/`
- `assets/`
