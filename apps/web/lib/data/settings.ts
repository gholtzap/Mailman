import { WithId } from "mongodb";
import { serialize } from "./serialize";
import { User } from "@/lib/types";

export function fetchSettings(user: WithId<User>) {
  return serialize({
    email: user.email || "",
    settings: {
      ...user.settings,
      keywords: user.settings.keywords || [],
      keywordMatchMode: user.settings.keywordMatchMode || "any",
    },
    hasApiKey: !!user.apiKey?.encryptedValue,
    apiKeyValid: user.apiKey?.isValid ?? false,
    usage: user.usage,
  });
}
