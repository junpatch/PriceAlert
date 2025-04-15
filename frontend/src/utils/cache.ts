import { CacheConfig, CacheOptions } from '@/types';
import { RootState } from '@/store';
import { setCache, clearCache } from '@/store/slices/cacheSlice';

/**
 * キャッシュキーを生成する
 */
export const createCacheKey = (endpoint: string, params?: any): string => {
  if (!params) return endpoint;
  return `${endpoint}:${JSON.stringify(params)}`;
};

/**
 * キャッシュが有効かどうかをチェックする
 */
export const isCacheValid = (cache: CacheConfig): boolean => {
  return Date.now() - cache.timestamp < cache.ttl;
};

/**
 * キャッシュを取得する
 */
export const getCache = (state: RootState, key: string): CacheConfig | null => {
  const cache = state.cache[key];
  if (!cache) return null;
  if (!isCacheValid(cache)) {
    // キャッシュが無効な場合は削除
    clearCache(key);
    return null;
  }
  return cache;
};

/**
 * キャッシュを設定する
 */
export const setCacheData = (
  dispatch: any,
  key: string,
  data: any,
  options: CacheOptions = {}
): void => {
  const { ttl = 5 * 60 * 1000 } = options; // デフォルトは5分
  const cache: CacheConfig = {
    key,
    ttl,
    data,
    timestamp: Date.now(),
  };
  dispatch(setCache(cache));
};

/**
 * キャッシュをクリアする
 */
export const clearCacheData = (dispatch: any, key: string): void => {
  dispatch(clearCache(key));
}; 