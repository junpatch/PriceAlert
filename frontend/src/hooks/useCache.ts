import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { clearAllCache } from '@/store/slices/cacheSlice';
import { clearCacheData } from '@/utils/cache';

export const useCache = () => {
  const dispatch = useDispatch();
  const cacheState = useSelector((state: RootState) => state.cache);

  const clearCacheByKey = (key: string) => {
    clearCacheData(dispatch, key);
  };

  const clearAllCaches = () => {
    dispatch(clearAllCache());
  };

  const getCacheByKey = (key: string) => {
    return cacheState[key];
  };

  return {
    clearCacheByKey,
    clearAllCaches,
    getCacheByKey,
    cacheState,
  };
}; 