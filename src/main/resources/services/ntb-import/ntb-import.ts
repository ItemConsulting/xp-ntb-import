import { schedule } from "/lib/cron";
import { importFromNtb } from "/lib/ntb-import";
import type { Response } from "@item-enonic-types/global/controller";
import { getAllSiteConfigsInCron } from "/lib/portal";
import { buildBaseContext } from "/lib/utils";

const MIME_TYPE_JSON = "application/json";

export function get(): Response {
  const siteConfigsInCron = getAllSiteConfigsInCron();

  try {
    siteConfigsInCron.forEach((siteWithConfig) => {
      schedule({
        name: `import-from-ntb_${siteWithConfig.siteName}`,
        delay: 1,
        fixedDelay: 1,
        times: 1,
        callback: () => importFromNtb(siteWithConfig.appConfig),
        context: buildBaseContext(siteWithConfig.repoId),
      });
    });

    return {
      status: 200,
      contentType: MIME_TYPE_JSON,
      body: {
        status: "Started import",
      },
    };
  } catch (e) {
    return {
      status: 500,
      contentType: MIME_TYPE_JSON,
      body: {
        status: "Failure! " + String(e),
      },
    };
  }
}
