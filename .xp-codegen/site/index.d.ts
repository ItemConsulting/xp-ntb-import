// WARNING: This file was automatically generated by "no.item.xp.codegen". You may lose your changes if you edit it.
export type SiteConfig = XP.SiteConfig;

declare global {
  namespace XP {
    interface SiteConfig {
      /**
       * Folder where articles are stored
       */
      parentId: string;

      /**
       * Publisher id
       */
      publisher: string;

      /**
       * Channels
       */
      channels?: string;
    }
  }
}