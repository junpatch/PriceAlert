import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";
import PageContainer from "@components/layout/PageContainer";
import ProductCard from "@components/products/ProductCard";
import { useProducts } from "@features/products/hooks/useProducts";
import ErrorAlert from "@components/common/ErrorAlert";
import LoadingSpinner from "@components/common/LoadingSpinner";
import { UserProduct } from "../types";

const DashboardPage: React.FC = () => {
  const { productList, loading, error, updateProduct, deleteProduct } =
    useProducts();

  const stats = useMemo(() => {
    const validProducts = productList.filter((item) => !!item.product);
    return {
      total: productList.length,
      valid: validProducts.length,
      invalid: productList.length - validProducts.length,
    };
  }, [productList]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("商品リストの状態が更新されました:", {
        商品リスト: productList,
        有効な商品数: stats.valid,
        無効な商品数: stats.invalid,
      });
    }
  }, [productList, stats]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UserProduct | null>(
    null
  );

  const handleDeleteClick = (product: UserProduct) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedProduct) {
      try {
        await deleteProduct(selectedProduct.id);
        setDeleteDialogOpen(false);
        setSelectedProduct(null);
      } catch (error) {
        console.error("商品の削除に失敗しました", error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleToggleNotification = async (id: number, enabled: boolean) => {
    try {
      await updateProduct(id, { notification_enabled: enabled });
    } catch (error) {
      console.error("通知設定の更新に失敗しました", error);
    }
  };

  return (
    <PageContainer
      title="ダッシュボード"
      subTitle="登録された商品の一覧と価格情報"
    >
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">登録商品一覧</Typography>
        <Button
          component={Link}
          to="/products/add"
          variant="contained"
          startIcon={<AddIcon />}
        >
          商品を追加
        </Button>
      </Box>

      <ErrorAlert error={error} />

      {loading ? (
        <LoadingSpinner />
      ) : stats.valid === 0 ? (
        <Box sx={{ py: 5, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary" paragraph>
            まだ商品が登録されていません。
          </Typography>
          <Button
            component={Link}
            to="/products/add"
            variant="contained"
            startIcon={<AddIcon />}
          >
            最初の商品を追加
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {productList.map((userProduct) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={userProduct.id}>
              <ProductCard
                userProduct={userProduct}
                onDelete={() => handleDeleteClick(userProduct)}
                onToggleNotification={handleToggleNotification}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">商品の削除</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {selectedProduct?.product?.name ? (
              <>「{selectedProduct.product.name}」を削除しますか？</>
            ) : (
              <>この商品を削除しますか？</>
            )}
            この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>キャンセル</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DashboardPage;
