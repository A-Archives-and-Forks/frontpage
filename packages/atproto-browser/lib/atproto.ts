import { cache } from "react";
import { z } from "zod";

import { FETCH_LIMIT } from "@/app/consts";

const ListRecordsResponse = z.object({
  records: z.array(
    z.object({
      uri: z.string(),
      cid: z.string(),
    }),
  ),
  cursor: z.string().optional(),
});

export const listRecords = cache(
  async (pds: string, repo: string, collection: string, cursor?: string) => {
    const listRecordsUrl = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
    listRecordsUrl.searchParams.set("repo", repo);
    listRecordsUrl.searchParams.set("collection", collection);
    listRecordsUrl.searchParams.set("limit", FETCH_LIMIT);
    if (cursor) {
      listRecordsUrl.searchParams.set("cursor", cursor);
    }
    const res = await fetch(listRecordsUrl.toString());
    if (!res.ok) {
      throw new Error(`Failed to list records: ${res.statusText}`);
    }
    return ListRecordsResponse.parse(await res.json());
  },
);

export const describeRepo = cache(async (pds: string, repo: string) => {
  const describeRepoUrl = new URL(`${pds}/xrpc/com.atproto.repo.describeRepo`);
  describeRepoUrl.searchParams.set("repo", repo);
  const res = await fetch(describeRepoUrl.toString());
  if (!res.ok && res.status !== 400) {
    throw new Error(`Failed to describe repo: ${res.statusText}`);
  }
  const body = await res.json();

  if (res.status >= 500) {
    throw new Error(`Failed to describe repo: ${res.statusText}`);
  }

  if (!res.ok) {
    const parsed = DescribeRespoFailure.parse(body);
    const knownError: "RepoTakenDown" | "RepoNotFound" | null =
      parsed.error === "RepoTakenDown" || parsed.error === "RepoNotFound"
        ? parsed.error
        : null;

    return {
      success: false as const,
      knownError,
      ...parsed,
    };
  }

  return {
    success: true as const,
    ...DescribeRepoSuccess.parse(body),
  };
});

const DescribeRepoSuccess = z.object({
  collections: z.array(z.string()),
});

const DescribeRespoFailure = z.object({
  error: z.string(),
  message: z.string().optional(),
});
