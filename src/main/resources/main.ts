import { schedule, unschedule } from "/lib/cron";
import {importFromNtb } from "/lib/ntb-import";
import {getAllSiteConfigsInCron, getSiteConfigsFromNodes, RepoSiteAppConfig} from "/lib/portal";
import { EnonicEventDataNode, listener } from "/lib/xp/event";
import { run } from "/lib/xp/context";
import { buildBaseContext } from "/lib/utils";

const CRON_NAME = "import-from-ntb";
const CRON_EVERY_HOUR = "0 * * * *";

// run on deployment
toggleImport();

listener({
  type: "node.updated",
  callback: (event) => {
    const siteWasUpdated = event.data.nodes.some(isRoot);

    if (siteWasUpdated) {
      toggleImport(getSiteConfigsFromNodes(event.data.nodes));
    }
  },
});

function toggleImport(siteConfig?: RepoSiteAppConfig[]) {
  let siteConfigsInCron;

  if (siteConfig) {
    siteConfigsInCron = siteConfig;
  } else {
    siteConfigsInCron =  run(buildBaseContext(), () => getAllSiteConfigsInCron());
  }

  siteConfigsInCron.forEach((siteWithConfig) => {
    const { disableImport } = siteWithConfig.appConfig;
    const scheduleJobName = `${CRON_NAME}_${siteWithConfig.siteName}`;

    if (disableImport) {
      unschedule({ name: scheduleJobName });
    } else {
      schedule({
        name: scheduleJobName,
        cron: CRON_EVERY_HOUR,
        callback: () => importFromNtb(siteWithConfig.appConfig),
        context: buildBaseContext(siteWithConfig.repoId),
      });
    }

    log.info(
      disableImport
        ? `Unscheduled cron job "${scheduleJobName}"`
        : `Create cron job for "${scheduleJobName}" that runs "${CRON_EVERY_HOUR}"`
    );
  })
}

function isRoot(node: EnonicEventDataNode): boolean {
  return node.path.substring(9).indexOf("/") === -1; // is there any "/" after we remove "/content/"?
}
