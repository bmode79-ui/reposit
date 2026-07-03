export interface KakaoConfig {
  restApiKey?: string;
  refreshToken?: string;
  accessToken?: string;
  apiBaseUrl: string;
  authBaseUrl: string;
}

const DEFAULT_API_BASE_URL = "https://kapi.kakao.com";
const DEFAULT_AUTH_BASE_URL = "https://kauth.kakao.com";

/** Build the Kakao configuration from environment variables. */
export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): KakaoConfig {
  return {
    restApiKey: env.KAKAO_REST_API_KEY?.trim() || undefined,
    refreshToken: env.KAKAO_REFRESH_TOKEN?.trim() || undefined,
    accessToken: env.KAKAO_ACCESS_TOKEN?.trim() || undefined,
    apiBaseUrl: env.KAKAO_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
    authBaseUrl: env.KAKAO_AUTH_BASE_URL?.trim() || DEFAULT_AUTH_BASE_URL,
  };
}
