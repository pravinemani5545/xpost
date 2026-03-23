import { getTwitterClient } from "./client";

export async function postTweet(
  accessToken: string,
  content: string
): Promise<string> {
  const client = getTwitterClient(accessToken);
  const { data } = await client.v2.tweet(content);
  return data.id;
}
