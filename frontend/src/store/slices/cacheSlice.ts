import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CacheConfig, CacheState } from '@/types';
import { logout } from '@/features/auth/slices/authSlice';
const initialState: CacheState = {};

const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    setCache: (state, action: PayloadAction<CacheConfig>) => {
      state[action.payload.key] = action.payload;
    },
    clearCache: (state, action: PayloadAction<string>) => {
      delete state[action.payload];
    },
    clearAllCache: () => {
      return {};
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const { setCache, clearCache, clearAllCache } = cacheSlice.actions;
export default cacheSlice.reducer; 