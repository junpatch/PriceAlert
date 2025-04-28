import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ProductsState, UserProduct, Product, PriceHistory } from '@/types';
import { logout } from '@/features/auth/slices/authSlice';
const initialState: ProductsState = {
  productList: [],
  selectedProduct: null,
  priceHistory: [],
  loading: false,
  error: null,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProductList: (state, action: PayloadAction<UserProduct[]>) => {
      state.productList = action.payload;
      state.error = null;
    },
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },
    setPriceHistory: (state, action: PayloadAction<PriceHistory[]>) => {
      state.priceHistory = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    addProduct: (state, action: PayloadAction<UserProduct>) => {
      state.productList.push(action.payload);
    },
    updateProduct: (state, action: PayloadAction<UserProduct>) => {
      const index = state.productList.findIndex(product => product.id === action.payload.id);
      if (index !== -1) {
        state.productList[index] = action.payload;
      }
    },
    removeProduct: (state, action: PayloadAction<number>) => {
      state.productList = state.productList.filter(product => product.id !== action.payload);
    },
    resetProducts: () => initialState
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const {
  setProductList,
  setSelectedProduct,
  setPriceHistory,
  setLoading,
  setError,
  addProduct,
  updateProduct,
  removeProduct,
  resetProducts,
} = productsSlice.actions;

export default productsSlice.reducer; 