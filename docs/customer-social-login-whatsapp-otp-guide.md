# Customer Social Login & WhatsApp OTP — Integration Guide

Base URL: `{{API_BASE}}/api/v1/auth`

This guide covers two additions to customer authentication:
- **[Google/Facebook social login](#part-1--social-login-google--facebook)**
- **[WhatsApp as an OTP delivery channel](#part-2--whatsapp-otp-channel)**

Both are **CUSTOMER-only**. Other roles (Vendor/Admin/Fleet Manager/Delivery Partner) are unaffected.

**Who should read what:**
- **Frontend/mobile developers** → read [Part 1](#part-1--social-login-google--facebook) and [Part 2](#part-2--whatsapp-otp-channel). That's the whole API contract — request/response shapes and error codes. You don't need Part 3.
- **Whoever manages the server `.env`** (deployment/DevOps) → read [Part 3 — Environment Setup](#part-3--environment-setup-getting-the-credentials). It's a step-by-step "where do I get this value" guide for each new environment variable.
- **Anyone testing the API by hand** → [Part 4 — Testing with Postman](#part-4--testing-with-postman) walks through getting real test tokens and calling the endpoints, including the non-obvious gotchas we hit setting this up.

---

## Shared basics

**No prior auth needed** — like `/login-customer`, both `/social-login` and the OTP endpoints below are public; they establish the session themselves.

**Language** — send `Accept-Language: en` or `Accept-Language: pt` to localize response messages. Defaults to `en`.

**Response envelope** — every endpoint returns:
```jsonc
{
  "success": true,
  "message": "...",   // localized, safe to show directly in UI
  "data": { /* ... */ }
}
```

**Tokens** — on success, `/social-login` returns `accessToken` + `refreshToken` in `data`, and also sets `refreshToken` as an `httpOnly` cookie (same as `/login`, `/verify-otp`, `/refresh-token`). Send `accessToken` as `Authorization: Bearer <accessToken>` on subsequent requests.

**Device tracking** — social login participates in the same device-limit / multi-device system as the rest of the app: `deviceDetails` is required, and a `403 LIMIT_EXCEEDED` is returned if the customer is already logged in on the maximum number of devices for their role, unless `forceLogin: true` is sent (which evicts the oldest device session).

---

# Part 1 — Social Login (Google & Facebook)

## How it works

The backend does **not** do the OAuth redirect itself. Your app signs the user in with the provider's own SDK first (Google Sign-In / Facebook Login SDK on iOS, Android, or web), then sends the resulting token to the backend, which verifies it server-side and issues DeliGo's own session tokens.

| Provider | What you send as `token` | How the backend verifies it |
|---|---|---|
| `GOOGLE` | The **ID token** (a JWT) from Google Sign-In | Verified against Google directly, checked against our registered client IDs |
| `FACEBOOK` | The **access token** from Facebook Login | Verified against Facebook's Graph API, confirmed it belongs to our app |

Don't send a Facebook user ID or a raw authorization code — send the actual token your SDK gives you after the user completes sign-in.

## Endpoint

```
POST /social-login
```

```jsonc
{
  "provider": "GOOGLE",              // or "FACEBOOK"
  "token": "<id-token-or-access-token>",
  "referralCode": "FRIEND123",       // optional — same referral system as /login-customer
  "deviceDetails": {
    "deviceId": "abc-123",
    "deviceType": "android",         // or "ios" / "web"
    "deviceName": "Pixel 8",
    "fcmToken": "...",               // optional
    "userAgent": "..."               // optional
  },
  "forceLogin": false                // optional — evict oldest device if at the device limit
}
```

### What happens server-side

1. The token is verified with the provider to get their stable user id, plus `email`/`name`/`picture` if available.
2. **Existing link** — if this Google/Facebook account is already linked to a customer, that account logs in.
3. **Auto-link by email** — if not linked yet, but the email matches an existing customer (e.g. they'd previously signed up via email/phone OTP), the social account gets linked to that account and its email is marked verified.
4. **New account** — otherwise, a brand-new customer account is created using the provider's profile data, with the email pre-verified, and `referralCode` applied the same way it would be on `/login-customer`.
5. Normal login continues — device registration, `accessToken`/`refreshToken` issuance.

### Success response

```jsonc
{
  "success": true,
  "message": "Logged in successfully.",
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Error reference

| errorKey | Meaning | UX suggestion |
|---|---|---|
| `INVALID_SOCIAL_TOKEN` | Token is expired, malformed, or fails verification | "Sign-in failed, please try again" — retry the provider sign-in |
| `SOCIAL_EMAIL_REQUIRED` | Provider didn't return a (verified) email **and** this is a brand-new signup — nothing to link/create against | Ask the user to allow email access and retry. See the note below — this is often a Facebook-account-state issue, not a bug. |
| `SOCIAL_ACCOUNT_ALREADY_LINKED` | This provider account is already linked to another user | Retry, or contact support if it persists |
| `LIMIT_EXCEEDED` | Already logged in on the max number of devices for this role | Prompt to log out another device, or retry with `forceLogin: true` |
| `USER_BLOCKED` | The matched/linked account is blocked | Not user-actionable — show a "contact support" message |
| `GOOGLE_CONFIGURATION_MISSING` / `FACEBOOK_CONFIGURATION_MISSING` | Server-side credentials not configured for that provider | Not user-actionable — backend config issue, see Part 3 |

**Why `SOCIAL_EMAIL_REQUIRED` can happen even with permission granted (Facebook specifically):** Facebook only includes `email` in the response if the account has a **confirmed** email on file — granting the permission isn't enough by itself. This is a real, common state for personal Facebook accounts that started as phone-number-only. It's expected behavior, not a backend bug — see [Part 4](#facebook-quirk-confirmed-email-required) for how to work around it while testing.

### Notes

- A customer can have **both** a password/OTP login and one or more linked social accounts on the same account — social login never disables the OTP login path.
- Each provider account can only ever be linked to one DeliGo customer account.
- There's no separate "link social account to my already-logged-in account" endpoint — linking only happens implicitly via email match during `/social-login`.

---

# Part 2 — WhatsApp OTP Channel

The existing phone-number OTP flow (`/login-customer` and `/resend-otp` with `contactNumber`) gained an optional `otpChannel` field. This does **not** change `/verify-otp` — the customer enters the same numeric code regardless of which channel delivered it.

```jsonc
POST /login-customer
{
  "contactNumber": "+351912345678",
  "otpChannel": "WHATSAPP"     // optional — "SMS" (default) | "WHATSAPP"
}
```

```jsonc
POST /resend-otp
{
  "role": "CUSTOMER",
  "contactNumber": "+351912345678",
  "otpChannel": "WHATSAPP"     // optional — "SMS" (default) | "WHATSAPP"
}
```

- Omitting `otpChannel` (or sending `"SMS"`) behaves exactly as before — delivered via SMS.
- `otpChannel` only applies to `contactNumber` requests — ignored for `email` OTPs.
- The code still expires in 5 minutes and is verified the same way at `POST /verify-otp` regardless of channel.
- The test-number bypass (`TEST_CUSTOMER_CONTACT_NUMBER`/`TEST_CUSTOMER_CONTACT_OTP`) is unaffected — no message is actually sent for that number on either channel.

### Success response

Same as the existing endpoints today:
```jsonc
{ "success": true, "message": "A login code has been sent to your mobile number. Please verify to continue.", "data": null }
```

There's no separate errorKey for WhatsApp delivery failures — a provider-side send failure surfaces the same way an SMS send failure would.

---

## Quick reference

| Field | Meaning |
|---|---|
| `provider` | `GOOGLE` \| `FACEBOOK` — which social login flow to use |
| `token` | The provider's own token (Google ID token / Facebook access token), not a DeliGo token |
| `otpChannel` | `SMS` (default) \| `WHATSAPP` — delivery channel for phone-number OTPs only |
| `data.accessToken` / `data.refreshToken` | DeliGo session tokens, same shape as every other login endpoint |

---

# Part 3 — Environment Setup: Getting the Credentials

This section is for whoever configures the server's `.env` file. Four new variables are needed:

| Variable | Used for |
|---|---|
| `GOOGLE_OAUTH_CLIENT_IDS` | Verifying Google ID tokens |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Verifying Facebook access tokens |
| `BULKGATE_WHATSAPP_API_URL` | Already set correctly by default (see below) — rarely needs changing |
| `BULKGATE_WHATSAPP_SENDER_ID` | Sending OTPs over WhatsApp via BulkGate |

## Google — `GOOGLE_OAUTH_CLIENT_IDS`

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Select (or create) the project this app should belong to.
3. Click **Create Credentials → OAuth client ID**.
4. If prompted, configure the **OAuth consent screen** first (App name, support email, etc.). While it's in **Testing** mode, only accounts you explicitly add under **Audience → Test users** can sign in — add your own test accounts there, or click **Publish App** to open it to everyone (Google may require verification for sensitive scopes, but `email`/`profile` are non-sensitive and shouldn't need it).
5. For **Application type**, create one client per platform your app runs on:
   - **Web application** — for any web frontend, and it's also the easiest type to test with (see Part 4).
   - **Android** — needs your app's package name + SHA-1 signing certificate fingerprint.
   - **iOS** — needs your app's bundle ID.
6. Each client type gets its own **Client ID**. Put **all of them**, comma-separated, into `.env`:
   ```
   GOOGLE_OAUTH_CLIENT_IDS=123-web.apps.googleusercontent.com,456-android.apps.googleusercontent.com
   ```
   This is safe/expected — a Google ID token's audience (`aud`) is whichever client ID the SDK that issued it was configured with, and our backend accepts a token matching **any** of the IDs listed here.
7. No client secret is needed in `.env` — our backend only verifies the token's signature and audience, it doesn't do the authorization-code exchange.

## Facebook — `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`

1. Go to [Meta for Developers → My Apps](https://developers.facebook.com/apps/).
2. **Create App**. When asked for a use case, pick **"Authenticate and request data from users with Facebook Login"**.
   - ⚠️ **This choice matters a lot.** If the app instead gets created as a **Business**-type app, it installs a different product called **"Facebook Login for Business"**, which is meant for granting access to Business Manager assets (ad accounts, pages) — it does **not** support the `email`/`public_profile` scopes needed for regular customer sign-up, and you'll get cryptic errors ("Invalid Scopes: email") trying to use it this way. If you're stuck with an existing Business-type app, go to **Use cases** in the left sidebar and add the "Authenticate and request data from users with Facebook Login" use case to it.
3. Once created, go to **Use cases → Customize** on that use case, and make sure both `public_profile` and `email` are listed as its permissions (only `public_profile` is included by default — you need to explicitly add `email`).
4. Get the credentials from **App settings → Basic**:
   ```
   FACEBOOK_APP_ID=<App ID>
   FACEBOOK_APP_SECRET=<App secret — click "Show" to reveal>
   ```
5. **While the app is in Development mode** (the default for a new app), only accounts added under **App roles → Roles** (as Admin/Developer/Tester) can successfully log in through it. To let real customers use Facebook login, you'll eventually need to submit the app for **App Review** requesting `email` at Advanced Access, and switch the app to **Live** mode.
6. **Known gotcha, not a bug:** even with everything configured correctly, Facebook will only hand back a user's `email` if that specific Facebook account has a **confirmed** email address on file. An account that signed up with a phone number and never confirmed an email will trigger our `SOCIAL_EMAIL_REQUIRED` error correctly — that's the account's state, not a config problem. See [Part 4](#facebook-quirk-confirmed-email-required).

## BulkGate WhatsApp — `BULKGATE_WHATSAPP_SENDER_ID`

WhatsApp sending reuses the same BulkGate account as SMS (`BULKGATE_APP_ID`/`BULKGATE_API_KEY`, already configured), but the WhatsApp sender itself is **not self-service** — it has to go through BulkGate:

1. Contact BulkGate support (via the portal's support chat, or your account rep) and specifically ask about **WhatsApp Business sender registration**.
2. This is a real WhatsApp Business Platform (Meta) registration that BulkGate facilitates — expect **14–30 working days** for approval, not an instant dashboard toggle.
3. While arranging this, also confirm with them:
   - Whether the WhatsApp sender uses the **same** `application_id`/`application_token` as your existing SMS setup, or needs separate ones.
   - Whether OTP-style messages need a **pre-approved message template** rather than the freeform text this integration currently sends (WhatsApp Business generally requires templates for business-initiated conversations — BulkGate can confirm what applies to your account).
4. Once approved, BulkGate gives you a sender identifier — that's the value for:
   ```
   BULKGATE_WHATSAPP_SENDER_ID=<sender id from BulkGate>
   ```
5. `BULKGATE_WHATSAPP_API_URL` is already set to BulkGate's fixed Advanced Transactional v2 endpoint and normally doesn't need to change:
   ```
   BULKGATE_WHATSAPP_API_URL=https://portal.bulkgate.com/api/2.0/advanced/transactional
   ```

**Until `BULKGATE_WHATSAPP_SENDER_ID` is set**, any request with `otpChannel: "WHATSAPP"` fails safely with a clear `500 BULKGATE_CONFIGURATION_MISSING` — it doesn't silently break anything, and SMS/email OTP plus social login work independently of this.

---

# Part 4 — Testing with Postman

Postman can't fabricate a real Google ID token or Facebook access token — the backend verifies both cryptographically against the provider. You need a genuine token from each provider first.

## Getting a Google ID token

1. Go to [Google's OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Click the **gear icon** (top right) → check **"Use your own OAuth credentials"** → enter the **Web application** Client ID + Secret from Part 3.
   - Note: the Playground needs a client *secret* to work even though our backend never uses one — that's fine, it's only used by the Playground itself to complete the flow.
3. Close that panel. At the bottom of **Step 1**, use the **"Input your own scopes"** box (don't hunt through the giant API list above it) and type:
   ```
   openid email profile
   ```
4. Click **Authorize APIs**, sign in, accept the consent screen.
   - If you get `redirect_uri_mismatch`: go back to your OAuth Client in Google Cloud Console and add `https://developers.google.com/oauthplayground` under **Authorized redirect URIs**, then retry.
5. On **Step 2**, click **Exchange authorization code for tokens**.
6. Copy the **`id_token`** value (long JWT) — that's what goes in Postman.

## Getting a Facebook access token

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Select your app from the **Meta App** dropdown — double-check it's the right one, it's easy to accidentally have a different app selected.
3. Rather than fighting with the Explorer's own permission toggles (which often silently reuse a stale consent and skip re-prompting for new scopes), build the OAuth URL directly and open it in the browser:
   ```
   https://www.facebook.com/v26.0/dialog/oauth?client_id=YOUR_APP_ID&redirect_uri=https%3A%2F%2Fdevelopers.facebook.com%2Ftools%2Fexplorer%2Fcallback&response_type=token&scope=email,public_profile&auth_type=rerequest
   ```
   Replace `YOUR_APP_ID` with your app's ID. `auth_type=rerequest` forces Facebook to show the permission screen again even if you'd previously authorized the app with fewer permissions.
4. If it jumps straight to a **"Continue as [Name]"** shortcut screen instead of showing individual permission checkboxes, that means Facebook still has a memory of a prior authorization. Force a truly clean run:
   - Revoke the app's access first: **Accounts Center → [your profile] → Apps and websites → [your app] → Remove**.
   - Then repeat the URL above in a fresh **Incognito/Private window**, logged into Facebook from scratch.
5. Approve **both** "Your public profile" and "Your email address" on the consent screen.
6. You'll land on `developers.facebook.com/tools/explorer/callback#access_token=EAAxxxx...&...` — copy everything between `access_token=` and the next `&` from the address bar.
7. Sanity check before using it in Postman — paste the token into Graph Explorer's Access Token field and run:
   ```
   me?fields=id,name,email,picture
   ```
   Confirm the response actually includes an `email` field.

### Facebook quirk: confirmed email required

If step 7 comes back **without** an `email` field despite everything above being correct, the account itself doesn't have a confirmed email:
1. Go to **Accounts Center → [profile] → Personal details → Contact info**.
2. Check whether the listed email shows as confirmed, or add/confirm a new one (Facebook will email a confirmation link — you must click it).
3. Repeat the `auth_type=rerequest` flow above to get a fresh token, and re-check `me?fields=...` again.

Tokens are short-lived (roughly 1–2 hours), so you'll likely need to regenerate for each test session.

## Calling the endpoints in Postman

**Social login:**
```
POST {{API_BASE}}/api/v1/auth/social-login
Content-Type: application/json
```
```json
{
  "provider": "GOOGLE",
  "token": "<id_token or access_token from above>",
  "deviceDetails": {
    "deviceId": "test-device-1",
    "deviceType": "web",
    "deviceName": "Postman Test"
  }
}
```
Swap `"provider": "FACEBOOK"` to test that path. Expect `200` with `accessToken`/`refreshToken` in `data`. Re-running the exact same request should log into the **same** account, not create a duplicate.

**WhatsApp OTP:**
```
POST {{API_BASE}}/api/v1/auth/login-customer
Content-Type: application/json
```
```json
{
  "contactNumber": "+351912345678",
  "otpChannel": "WHATSAPP"
}
```
Requires `BULKGATE_WHATSAPP_SENDER_ID` to be configured (Part 3) — until then this returns `500 BULKGATE_CONFIGURATION_MISSING` by design.
