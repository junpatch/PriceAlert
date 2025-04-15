import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SettingsState, UserSettings } from '@/types';

const initialState: SettingsState = {
  userSettings: null,
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setUserSettings: (state, action: PayloadAction<UserSettings>) => {
      state.userSettings = action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setUserSettings,
  setLoading,
  setError,
} = settingsSlice.actions;

export default settingsSlice.reducer; 