import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@hooks/index';
import {
  useGetUserProductsQuery,
  useGetProductByIdQuery,
  useGetPriceHistoryQuery,
  useRegisterProductMutation,
  useUpdateUserProductMutation,
  useDeleteUserProductMutation
} from '@services/api';
import {
  setProductList,
  setSelectedProduct,
  setPriceHistory,
  setLoading,
  setError
} from '../slices/productsSlice';
import { Product } from '../../../types';

export const useProducts = () => {
  const { productList, selectedProduct, priceHistory, loading, error } = useAppSelector(state => state.products);
  const dispatch = useAppDispatch();

  const { data: userProducts, isLoading: isProductsLoading } = useGetUserProductsQuery();
  const [registerProduct, { isLoading: isRegisterLoading }] = useRegisterProductMutation();
  const [updateUserProduct, { isLoading: isUpdateLoading }] = useUpdateUserProductMutation();
  const [deleteUserProduct, { isLoading: isDeleteLoading }] = useDeleteUserProductMutation();

  useEffect(() => {
    if (userProducts) {
      dispatch(setProductList(userProducts));
    }
  }, [userProducts, dispatch]);

  useEffect(() => {
    dispatch(setLoading(
      isProductsLoading || 
      isRegisterLoading || 
      isUpdateLoading || 
      isDeleteLoading
    ));
  }, [isProductsLoading, isRegisterLoading, isUpdateLoading, isDeleteLoading, dispatch]);

  const getProductDetails = async (productId: number) => {
    dispatch(setLoading(true));
    try {
      const { data: userProduct } = await useGetProductByIdQuery(productId);
      if (userProduct?.product) {
        const product: Product = {
          ...userProduct,
          name: userProduct.product.name,
          ec_sites: userProduct.product.ec_sites
        };
        dispatch(setSelectedProduct(product));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '商品詳細の取得に失敗しました';
      dispatch(setError(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const getPriceHistory = async (productId: number, ecSiteId?: number, period?: string) => {
    dispatch(setLoading(true));
    try {
      const { data: history } = await useGetPriceHistoryQuery({ productId, ecSiteId, period });
      if (history) {
        dispatch(setPriceHistory(history));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '価格履歴の取得に失敗しました';
      dispatch(setError(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleRegisterProduct = async (url: string, priceThreshold?: number) => {
    try {
      await registerProduct({ url, price_threshold: priceThreshold }).unwrap();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '商品の登録に失敗しました';
      dispatch(setError(errorMessage));
      throw err;
    }
  };

  const handleUpdateProduct = async (id: number, data: { 
    price_threshold?: number;
    notification_enabled?: boolean;
    memo?: string; 
  }) => {
    try {
      await updateUserProduct({ id, ...data }).unwrap();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '商品の更新に失敗しました';
      dispatch(setError(errorMessage));
      throw err;
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await deleteUserProduct(id).unwrap();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '商品の削除に失敗しました';
      dispatch(setError(errorMessage));
      throw err;
    }
  };

  return {
    productList,
    selectedProduct,
    priceHistory,
    loading,
    error,
    getProductDetails,
    getPriceHistory,
    registerProduct: handleRegisterProduct,
    updateProduct: handleUpdateProduct,
    deleteProduct: handleDeleteProduct,
  };
}; 