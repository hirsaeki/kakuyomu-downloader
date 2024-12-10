import { Episode, Work } from './common';
import { Table } from 'dexie';

export interface WorkRecord {
  url: string;
  workTitle: string;
  author: string;
  lastAccessed: Date;
  lastModified: Date;
}

export interface EpisodeRecord extends Omit<Episode, 'selected'> {
  workUrl: string;
  order: number;
  lastAccessed: Date;
  lastModified: Date;
}

export interface ContentRecord {
  episodeUrl: string;
  title: string;
  content: string;
  lastAccessed: Date;
  lastModified: Date;
}

export interface INovelDatabase {
  works: Table<WorkRecord>;
  episodes: Table<EpisodeRecord>;
  contents: Table<ContentRecord>;

  saveWork(url: string, workTitle: string, author: string): Promise<Work>;
  saveEpisodes(workUrl: string, episodes: EpisodeRecord[]): Promise<void>;
  saveContent(episodeUrl: string, title: string, content: string): Promise<void>;
  
  getWork(url: string): Promise<WorkRecord | undefined>;
  getEpisodes(workUrl: string): Promise<EpisodeRecord[]>;
  getContent(episodeUrl: string): Promise<ContentRecord | undefined>;
  
  clearWorkCache(workUrl: string): Promise<void>;
  cleanOldCache(maxAgeInDays?: number): Promise<void>;
}