import { get as getOne } from "/lib/xp/content";
import type { ContextParams } from "/lib/xp/context";

// Returns the substring after the last instance of the separator
export function substringAfter(str: string, separator = "/"): string {
  return str.substring(str.lastIndexOf(separator) + 1);
}

export function notNullOrUndefined<T>(val: T | null | undefined): val is T {
  return val !== null && val !== undefined;
}

export function forceArray<A>(data: A | Array<A> | undefined): Array<A>;
export function forceArray<A>(data: A | ReadonlyArray<A> | undefined): ReadonlyArray<A>;
export function forceArray<A>(data: A | Array<A> | undefined): ReadonlyArray<A> {
  data = data || [];
  return Array.isArray(data) ? data : [data];
}

export function getContentPathById(key: string): string {
  const content = getOne({ key });

  if (content === null) {
    throw "Parent content doesn't exist";
  } else {
    return content._path;
  }
}

export function buildBaseContext (repoId?: string): ContextParams {
  const baseContext: ContextParams = {
    branch: "draft",
    principals: ["role:system.admin"],
    user: {
      login: "su",
      idProvider: "system",
    }
  };

  if (repoId) {
    baseContext.repository = repoId;
  }

  return baseContext;
}
