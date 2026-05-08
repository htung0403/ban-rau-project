import fs from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Zalo } = require('zca-js') as {
  Zalo: new (options?: Record<string, unknown>) => any;
};

type StoredCredentials = {
  cookie: unknown;
  imei: string;
  userAgent: string;
  language?: string;
};

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';

async function main() {
  const credentialsPath = process.env.ZCA_CREDENTIALS_PATH || './credentials/zca-credentials.json';
  const qrPath = process.env.ZCA_QR_PATH || './tmp/zca-qr.png';

  const absoluteCredentialsPath = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(process.cwd(), credentialsPath);

  const absoluteQrPath = path.isAbsolute(qrPath) ? qrPath : path.resolve(process.cwd(), qrPath);

  fs.mkdirSync(path.dirname(absoluteCredentialsPath), { recursive: true });
  fs.mkdirSync(path.dirname(absoluteQrPath), { recursive: true });

  console.log('[zca-login] Starting QR login flow...');
  console.log(`[zca-login] QR image will be written to: ${absoluteQrPath}`);
  console.log('[zca-login] Scan QR with your Zalo app and confirm on phone.');

  const zalo = new Zalo({
    logging: true,
    checkUpdate: false,
    selfListen: false,
  });

  const api = await zalo.loginQR(
    {
      qrPath: absoluteQrPath,
      userAgent: process.env.ZCA_USER_AGENT || DEFAULT_USER_AGENT,
      language: process.env.ZCA_LANGUAGE || 'vi',
    },
    async (event: any) => {
      if (event?.type === 0) {
        if (event?.actions?.saveToFile) {
          await event.actions.saveToFile(absoluteQrPath);
        }
        console.log('[zca-login] QR generated.');
        console.log(`[zca-login] Open this file and scan: ${absoluteQrPath}`);
      } else if (event?.type === 2) {
        console.log('[zca-login] QR scanned. Waiting confirm...');
      } else if (event?.type === 1) {
        console.log('[zca-login] QR expired. A new QR will be generated.');
      } else if (event?.type === 3) {
        console.log('[zca-login] QR declined, please retry.');
      } else if (event?.type === 4) {
        console.log('[zca-login] Received login info from QR flow.');
      }
    },
  );

  const context = api.getContext();
  const credentials: StoredCredentials = {
    cookie: context.cookie.toJSON()?.cookies || [],
    imei: context.imei,
    userAgent: context.userAgent,
    language: context.language || 'vi',
  };

  fs.writeFileSync(absoluteCredentialsPath, JSON.stringify(credentials, null, 2), 'utf-8');

  console.log(`[zca-login] Credentials saved to: ${absoluteCredentialsPath}`);
  console.log('[zca-login] Done. You can now set ZCA_CREDENTIALS_PATH and test sending.');
}

main().catch((error) => {
  console.error('[zca-login] Failed:', error);
  process.exit(1);
});
