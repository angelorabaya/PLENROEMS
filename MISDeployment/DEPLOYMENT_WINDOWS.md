# Windows Server Deployment (IIS + NSSM)

This guide assumes you will deploy the contents of `MISDeployment` to a Windows Server and run the backend with NSSM while serving the frontend with IIS over HTTPS.

**Prerequisites**
- Windows Server with admin access.
- Node.js LTS installed on the server.
- IIS installed with Static Content and HTTP Features.
- URL Rewrite and Application Request Routing (ARR) installed.
- NSSM installed.
- A valid TLS certificate (internal CA, public CA, or win-acme).

**1. Prepare Build Output (on build machine)**
1. From the repo root, build the frontend:
```
powershell
npm ci
npm run build
```
2. Refresh the deployment folder contents:
- Copy `dist` to `MISDeployment\frontend\dist`.
- Copy backend runtime files to `MISDeployment\backend` (already included in this repo snapshot).
- Copy `reference` to `MISDeployment\reference`.

**2. Copy to Server**
1. Copy the whole `MISDeployment` folder to the server (example path: `D:\MISDeployment`).
2. Confirm these paths exist on the server:
- `D:\MISDeployment\frontend\dist`
- `D:\MISDeployment\backend`
- `D:\MISDeployment\reference`

**3. Backend Setup (NSSM)**
1. Create the backend environment file:
- Copy `D:\MISDeployment\backend\.env.example` to `D:\MISDeployment\backend\.env`.
- Fill in database values and `ATTACHMENTS_BASE_PATH`.
2. Install backend dependencies:
```
powershell
cd D:\MISDeployment\backend
npm ci --omit=dev
```
3. Register the backend as a Windows service using NSSM:
```
powershell
nssm install PLENRO-Backend
```
4. In the NSSM UI:
- Application path: path to `node.exe` (use `where node` to find it).
- Startup directory: `D:\MISDeployment\backend`
- Arguments: `server.js`
- Optional: set `NODE_ENV=production` in the Environment tab.
- Optional: set Stdout/Stderr log files in the I/O tab.
5. Start the service:
```
powershell
nssm start PLENRO-Backend
```

**4. Frontend Setup (IIS)**
1. Open IIS Manager.
2. Create a new site (or use Default Web Site):
- Physical path: `D:\MISDeployment\frontend\dist`
- Binding: `https` on port `443` with your TLS certificate.
3. Ensure URL Rewrite + ARR are installed and Proxy is enabled:
- IIS Manager -> Server -> Application Request Routing Cache -> Server Proxy Settings -> Enable Proxy.

**5. IIS Rewrite Rules (SPA + API Proxy)**
1. Create or update `D:\MISDeployment\frontend\dist\web.config` with this content:
```
xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Reverse Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:5000/api/{R:1}" />
        </rule>
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```
2. If your backend runs on a different port, update the `localhost:5000` target.

**6. HTTPS Notes**
1. Install the certificate to `Local Machine` -> `Personal` store.
2. Bind the certificate to your IIS site on port 443.
3. Open Windows Firewall inbound rule for port 443.

**7. Quick Validation**
1. Open `https://<your-domain>/` in a browser.
2. If the API is proxied, try `https://<your-domain>/api/clients` (requires DB connectivity).

**8. Common Issues**
- 502/504 from IIS: confirm NSSM service is running and `localhost:5000` is reachable.
- 404 on page refresh: confirm the SPA fallback rule in `web.config`.
- Attachments not found: verify `ATTACHMENTS_BASE_PATH` and the service account permissions on the share.