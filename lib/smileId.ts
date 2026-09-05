import { initialize, SmileConfig } from '@smile_identity/react-native-expo';

// Values come from the smile_config.json Smile ID gives you on their dashboard —
// copy its fields into .env (see .env.example) rather than committing the json itself.
function readConfig() {
  const partnerId = process.env.EXPO_PUBLIC_SMILE_PARTNER_ID;
  const authToken = process.env.EXPO_PUBLIC_SMILE_AUTH_TOKEN;
  const prodLambdaUrl = process.env.EXPO_PUBLIC_SMILE_PROD_URL;
  const testLambdaUrl = process.env.EXPO_PUBLIC_SMILE_TEST_URL;
  if (!partnerId || !authToken || !prodLambdaUrl || !testLambdaUrl) return null;
  return { partnerId, authToken, prodLambdaUrl, testLambdaUrl };
}

export function isSmileIdConfigured(): boolean {
  return readConfig() !== null;
}

let initPromise: Promise<void> | null = null;

// Safe to call every time a verification flow starts — only initializes once.
export function initializeSmileId(): Promise<void> {
  if (initPromise) return initPromise;

  const config = readConfig();
  if (!config) {
    return Promise.reject(new Error('Smile ID is not configured — missing EXPO_PUBLIC_SMILE_* env vars.'));
  }

  const useSandbox = process.env.EXPO_PUBLIC_SMILE_ENV !== 'production';
  const smileConfig = new SmileConfig(config.partnerId, config.authToken, config.prodLambdaUrl, config.testLambdaUrl);

  initPromise = initialize(useSandbox, true, smileConfig);
  return initPromise;
}
