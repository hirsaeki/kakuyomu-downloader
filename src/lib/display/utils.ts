import { Episode } from "@/types";
import EPUB_CONFIG from "@/config/epub";

export function getDisplayTitle(episode: Episode | null | undefined, showGroupTitle: boolean): string {
  if (!episode) {
    return EPUB_CONFIG.DEFAULTS.CHAPTER_TITLE;
  }

  if (!showGroupTitle || !episode.groupTitle) {
    return episode.title;
  }

  return `${episode.groupTitle} - ${episode.title}`;
}