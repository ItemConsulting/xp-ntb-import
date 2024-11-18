import { query, get as getOne, type Site } from "/lib/xp/content";
import { forceArray, buildBaseContext } from "./utils";
import { list as listRepositories } from "/lib/xp/repo";
import { run } from "/lib/xp/context";
import type { SiteConfig } from "/site/index";
import type { EnonicEventDataNode } from "/lib/xp/event";

export interface RepoSiteAppConfig {
  repoId: string;
  siteName: string;
  appConfig: SiteConfig;
}

function getSites<Config extends object>(): Site<Config>[] {
  return query<Site<Config>>({
    query: `_path LIKE '/content/*' AND data.siteConfig.applicationKey = '${app.name}'`,
    contentTypes: ["portal:site"],
  }).hits;
}

function runInDraftRepoContext<T>(callback: () => T, repositoryId = "com.enonic.cms.default"): T {
  return run(buildBaseContext(repositoryId), callback);
}

export function getAllSiteConfigsInCron(): RepoSiteAppConfig[] {
  return listRepositories()
    .reduce((acc: RepoSiteAppConfig[], repository) => {
      if (repository.branches.indexOf("draft") >= 0) {
        const sites = runInDraftRepoContext(getSites, repository.id);

        sites.forEach((site) => {
          const ntbAppGeneralSiteConfig = forceArray(site?.data?.siteConfig).filter(
            (cfg) => cfg.applicationKey === app.name
          )[0];
          acc.push({
            repoId: repository.id,
            siteName: site._name,
            appConfig: ntbAppGeneralSiteConfig.config as SiteConfig,
          });
        });
      }
      return acc;
    }, []);
}

export function getSiteConfigsFromNodes(nodes: EnonicEventDataNode[]): RepoSiteAppConfig[] {
  return nodes.reduce((acc: RepoSiteAppConfig[], node) => {
    const repositoryId = node.repo;

    const site = runInDraftRepoContext(() => getOne<Site<SiteConfig>>({ key: node.id }), repositoryId);
    if (site?._name) {
      const ntbAppGeneralSiteConfig = forceArray(site?.data?.siteConfig).filter(
        (cfg) => cfg.applicationKey === app.name
      )[0];

      if (ntbAppGeneralSiteConfig?.config) {
        acc.push({
          repoId: repositoryId,
          siteName: site._name,
          appConfig: ntbAppGeneralSiteConfig.config,
        });
      }
    }
    return acc;
  }, []);
}
