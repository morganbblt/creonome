type TikTokOAuthConfig = {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
};

export class TikTokOAuthClient {
  constructor(private readonly config: TikTokOAuthConfig) {}

  createAuthorizationUrl(state: string): string {
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.search = new URLSearchParams({
      client_key: this.config.clientKey,
      response_type: "code",
      scope: "user.info.basic,video.list",
      redirect_uri: this.config.redirectUri,
      state,
    }).toString();
    return url.toString();
  }
}
