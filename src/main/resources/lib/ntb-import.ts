import { create, createMedia, modify, publish, query, exists, type Content } from "/lib/xp/content";
import { sanitize } from "/lib/xp/common";
import { request } from "/lib/http-client";
import { PressRelease, getNtbResponsePressReleases, GetPressReleaseParams } from "./ntb";
import { getContentPathById, notNullOrUndefined, substringAfter } from "./utils";
import type { NtbArticle } from "/site/content-types/ntb-article";
import type { SiteConfig } from "/site/index";

const CONTENT_CREATE_FAILED = null;

export function importFromNtb(params: SiteConfig, page?: number): void {
  const parentPath = getContentPathById(params.parentId);

  let pressReleaseParams: GetPressReleaseParams = {
    publisher: params.publisher,
    channels: params.channels,
  };

  if (page) {
    pressReleaseParams.page = page;
  }

  const ntbResponsePressReleases = getNtbResponsePressReleases(pressReleaseParams);
  const pressReleases = ntbResponsePressReleases.releases;

  const createdContentIds = pressReleases
    .filter(notAlreadyImported)
    .filter((pressRelease) => !exists({ key: `${parentPath}/${sanitize(pressRelease.title)}` }))
    .map((pressRelease) => importPressRelease(pressRelease, parentPath))
    .filter(notNullOrUndefined);

  log.info(`Created ${createdContentIds.length} articles by importing from NTB`);

  const publishResults = publish({
    keys: createdContentIds,
    sourceBranch: "draft",
    targetBranch: "master",
    includeDependencies: true,
  });

  if (publishResults.pushedContents.length > 0) {
    log.info(`Published ${publishResults.pushedContents.length} contents as part of import from NTB`);
  }

  if (publishResults.failedContents.length > 0) {
    log.error(`Failed to publish ${publishResults.failedContents.length} as part of import from NTB`);
  }

  if (params?.fetchAllPressReleases && ntbResponsePressReleases.nextPage) {
    log.info(`There exists more pages, getting the next press releases from page: ${ntbResponsePressReleases.nextPage}`);
    importFromNtb(params, ntbResponsePressReleases.nextPage);
  }
}

function importPressRelease(pressRelease: PressRelease, parentPath: string) {
  try {
    const articleContent = create<NtbArticle>({
      contentType: `${app.name}:ntb-article`,
      displayName: pressRelease.title,
      parentPath,
      name: sanitize(pressRelease.title),
      refresh: false,
      data: pressReleaseToNtbArticle(pressRelease),
      language: pressRelease.language,
    });

    const imageContent = pressRelease.mainImage?.url
      ? createImageContent(pressRelease.mainImage.url, articleContent._path, pressRelease.mainImage?.caption)
      : undefined;

    const imageIds = pressRelease.images
      .map((image) => {
        return image.url ? createImageContent(image.url, articleContent._path, image.caption) : undefined;
      })
      .filter(notNullOrUndefined)
      .map((content) => content._id);

    // Update content with images
    return modify<NtbArticle>({
      key: articleContent._id,
      editor: (content) => {
        content.data.imageId = imageContent?._id;
        content.data.images = imageIds;
        return content;
      },
    })?._id;
  } catch (e) {
    log.error(`Could not import press release`, e);

    return CONTENT_CREATE_FAILED;
  }
}

function notAlreadyImported(pressRelease: PressRelease): boolean {
  const res = query({
    query: `data.ntbId = '${pressRelease.id}'`,
    count: 1,
  });

  return res.count === 0;
}

interface MediaImage {
  caption?: string;
  altText?: string;
}

function createImageContent(
  url: string,
  parentPath: string,
  caption: string | null
): Content<MediaImage> | typeof CONTENT_CREATE_FAILED {
  const name = substringAfter(url);
  const imageResponse = request({ url });

  if (imageResponse.status === 200) {
    const image = createMedia<MediaImage>({
      name,
      parentPath,
      data: imageResponse.bodyStream,
      mimeType: imageResponse.contentType,
    });

    return modify<MediaImage>({
      key: image._id,
      editor: (c) => {
        return {
          ...c,
          data: {
            ...c.data,
            caption: caption ?? undefined,
            altText: caption ?? undefined,
          },
        };
      },
    });
  } else {
    log.warning(`Could not retrieve image for NTB import: url=${url}, status=${imageResponse.status} `);
    return CONTENT_CREATE_FAILED;
  }
}

function pressReleaseToNtbArticle(pressRelease: PressRelease): NtbArticle {
  return {
    title: pressRelease.title,
    leadtext: pressRelease.leadtext ?? pressRelease.leadTextOrBodyStrip,
    body: pressRelease.body,
    links: pressRelease.links,
    keywords: pressRelease.keywords ?? [],
    ntbId: pressRelease.id,
    published: pressRelease.published,
    url: `https://kommunikasjon.ntb.no${pressRelease.url}`,
    publisherId: pressRelease.publisher.id,
    channelId: pressRelease.channels.length > 0 ? pressRelease.channels[0].id : undefined,
    type: pressRelease.type,
    language: pressRelease.language,
  };
}
