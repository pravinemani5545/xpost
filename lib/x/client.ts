import { TwitterApi } from "twitter-api-v2";

export function getTwitterClient(accessToken: string): TwitterApi {
  return new TwitterApi(accessToken);
}

export function getTwitterAuthClient(): TwitterApi {
  return new TwitterApi({
    clientId: process.env.X_CLIENT_ID!,
    clientSecret: process.env.X_CLIENT_SECRET!,
  });
}
