export type Platform = "facebook" | "instagram" | "youtube" | "x";
export const PLATFORMS: Platform[] = ["facebook", "instagram", "youtube", "x"];
export const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
};

export type Media = { url: string; type: "image" | "video"; path?: string; mime?: string };

export type Account = {
  id: string;
  company_id: string;
  platform: Platform;
  external_id: string;
  display_name: string | null;
  username: string | null;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  expires_at: string | null;
};

export type PostInput = { body: string; title?: string | null; media: Media[] };
export type PublishResult = { id: string; url?: string };
export type SyncResult = {
  followers?: number | null;
  items: { external_id: string; title?: string; url?: string; published_at?: string; likes?: number; comments?: number; views?: number; shares?: number }[];
};
