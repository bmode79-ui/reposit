import type { KakaoConfig } from "./config.js";

/** Raised when the client is missing the credentials required to authenticate. */
export class KakaoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KakaoConfigError";
  }
}

/** Raised when the Kakao API responds with a non-success status code. */
export class KakaoApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "KakaoApiError";
    this.status = status;
    this.body = body;
  }
}

export interface Link {
  webUrl?: string;
  mobileWebUrl?: string;
}

export interface SendMemoParams {
  text: string;
  link?: Link;
  buttonTitle?: string;
}

export interface SendToFriendsParams {
  receiverUuids: string[];
  text: string;
  link?: Link;
  buttonTitle?: string;
}

export interface ListFriendsParams {
  offset?: number;
  limit?: number;
}

export interface KakaoFriend {
  uuid: string;
  profileNickname?: string;
  favorite?: boolean;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

/** How many milliseconds before expiry we proactively refresh the access token. */
const TOKEN_EXPIRY_SKEW_MS = 60_000;

/**
 * Thin client for the Kakao Talk message API. Handles OAuth access-token
 * lifecycle (refreshing via a refresh token when possible) and exposes the
 * three message operations used by the MCP server.
 */
export class KakaoClient {
  private readonly config: KakaoConfig;
  private accessToken?: string;
  private refreshToken?: string;
  private accessTokenExpiresAt = 0;

  constructor(config: KakaoConfig) {
    this.config = config;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    // A directly-supplied access token has unknown lifetime; treat it as valid
    // until Kakao rejects it, at which point we try to refresh (if possible).
    this.accessTokenExpiresAt = config.accessToken ? Number.MAX_SAFE_INTEGER : 0;
  }

  /** True when the client has enough configuration to attempt a request. */
  hasCredentials(): boolean {
    return Boolean(this.accessToken || (this.refreshToken && this.config.restApiKey));
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken || !this.config.restApiKey) {
      throw new KakaoConfigError(
        "Cannot refresh the Kakao access token: KAKAO_REFRESH_TOKEN and KAKAO_REST_API_KEY are both required.",
      );
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.restApiKey,
      refresh_token: this.refreshToken,
    });

    const res = await fetch(`${this.config.authBaseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body,
    });

    const data = (await this.parseJson(res)) as TokenResponse & { error?: string; error_description?: string };
    if (!res.ok || !data.access_token) {
      throw new KakaoApiError(
        `Failed to refresh Kakao access token: ${data.error_description ?? data.error ?? res.statusText}`,
        res.status,
        data,
      );
    }

    this.accessToken = data.access_token;
    this.accessTokenExpiresAt = Date.now() + data.expires_in * 1000;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }
    return this.accessToken;
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    const stillValid = this.accessToken && Date.now() < this.accessTokenExpiresAt - TOKEN_EXPIRY_SKEW_MS;
    if (!forceRefresh && stillValid) {
      return this.accessToken as string;
    }
    if (this.refreshToken && this.config.restApiKey) {
      return this.refreshAccessToken();
    }
    if (this.accessToken) {
      return this.accessToken;
    }
    throw new KakaoConfigError(
      "No Kakao credentials configured. Set KAKAO_ACCESS_TOKEN, or set KAKAO_REFRESH_TOKEN together with KAKAO_REST_API_KEY.",
    );
  }

  private async parseJson(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  /**
   * Perform an authenticated request. On a 401 (expired/invalid token) it will
   * transparently refresh the token once and retry when a refresh token exists.
   */
  private async authorizedRequest(path: string, init: RequestInit): Promise<unknown> {
    const doFetch = async (token: string): Promise<Response> => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return fetch(`${this.config.apiBaseUrl}${path}`, { ...init, headers });
    };

    let token = await this.getAccessToken();
    let res = await doFetch(token);

    if (res.status === 401 && this.refreshToken && this.config.restApiKey) {
      token = await this.getAccessToken(true);
      res = await doFetch(token);
    }

    const data = await this.parseJson(res);
    if (!res.ok) {
      const errObj = data as { msg?: string; code?: number };
      throw new KakaoApiError(
        `Kakao API request failed (${res.status})${errObj?.msg ? `: ${errObj.msg}` : ""}`,
        res.status,
        data,
      );
    }
    return data;
  }

  private buildTextTemplate(text: string, link?: Link, buttonTitle?: string): Record<string, unknown> {
    const template: Record<string, unknown> = {
      object_type: "text",
      text,
      link: {
        web_url: link?.webUrl,
        mobile_web_url: link?.mobileWebUrl,
      },
    };
    if (buttonTitle) {
      template.button_title = buttonTitle;
    }
    return template;
  }

  /** Send a text message to the authenticated user themselves ("나에게 보내기"). */
  async sendMemo(params: SendMemoParams): Promise<unknown> {
    const body = new URLSearchParams({
      template_object: JSON.stringify(this.buildTextTemplate(params.text, params.link, params.buttonTitle)),
    });
    return this.authorizedRequest("/v2/api/talk/memo/default/send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body,
    });
  }

  /** Send a text message to one or more friends by their uuids. */
  async sendToFriends(params: SendToFriendsParams): Promise<unknown> {
    if (!params.receiverUuids.length) {
      throw new KakaoConfigError("receiver_uuids must contain at least one friend uuid.");
    }
    const body = new URLSearchParams({
      receiver_uuids: JSON.stringify(params.receiverUuids),
      template_object: JSON.stringify(this.buildTextTemplate(params.text, params.link, params.buttonTitle)),
    });
    return this.authorizedRequest("/v1/api/talk/friends/message/default/send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body,
    });
  }

  /** List the authenticated user's message-eligible friends (with uuids). */
  async listFriends(params: ListFriendsParams = {}): Promise<{ friends: KakaoFriend[]; total: number; raw: unknown }> {
    const query = new URLSearchParams();
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const data = (await this.authorizedRequest(`/v1/api/talk/friends${suffix}`, {
      method: "GET",
    })) as { elements?: Array<Record<string, unknown>>; total_count?: number };

    const friends: KakaoFriend[] = (data.elements ?? []).map((el) => ({
      uuid: String(el.uuid),
      profileNickname: el.profile_nickname as string | undefined,
      favorite: el.favorite as boolean | undefined,
    }));
    return { friends, total: data.total_count ?? friends.length, raw: data };
  }
}
