import { NovelSiteAdapter, AdapterConfig } from '../types';
import { KakuyomuAdapter } from './adapter';
import { KakuyomuValidator } from './validator';

export class KakuyomuAdapterFactory {
  isCompatible(url: string): boolean {
    return KakuyomuValidator.isValidWorkUrl(url);
  }

  createAdapter(config: AdapterConfig): NovelSiteAdapter {
    return new KakuyomuAdapter(config.httpClient);
  }
}