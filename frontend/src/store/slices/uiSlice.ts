import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '@types/index';

const initialState: UIState = {
  isLoading: false,
  error: null,
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});

export const { setLoading, setError, clearError, setTheme } = uiSlice.actions;

export default uiSlice.reducer; 