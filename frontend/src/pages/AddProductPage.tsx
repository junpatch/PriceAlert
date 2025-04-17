import React, { useState } from "react";
import { Typography, Box, Alert, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PageContainer from "@components/layout/PageContainer";
import ProductForm, { ProductFormData } from "@components/products/ProductForm";
import { useProducts } from "@features/products/hooks/useProducts";
import ErrorAlert from "@components/common/ErrorAlert";

const AddProductPage: React.FC = () => {
  const { registerProduct, loading, error } = useProducts();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (data: ProductFormData) => {
    try {
      await registerProduct(data.url, data.price_threshold);
      setSuccess(true);

      // 3秒後にダッシュボードへリダイレクト
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (err) {
      // エラーはuseProductsフックで処理されるので、ここでは何もしない
      console.error("商品登録エラー:", err);
    }
  };

  // エラー内容に基づいてアラートの重大度を決定
  const getErrorSeverity = (): "error" | "warning" | "info" => {
    if (!error) return "error";

    // 404エラーや商品が見つからない場合は警告として表示
    if (error.includes("見つかりません")) {
      return "warning";
    }

    // 一時的なサービスエラーも警告として表示
    if (error.includes("外部サービス") || error.includes("接続に失敗")) {
      return "warning";
    }

    return "error";
  };

  return (
    <PageContainer
      title="商品の追加"
      subTitle="追跡したい商品のURLを入力してください"
      maxWidth="sm"
    >
      {success ? (
        <Box sx={{ mb: 4 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            商品の登録に成功しました。ダッシュボードへリダイレクトします...
          </Alert>
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate("/dashboard")}
          >
            ダッシュボードへ戻る
          </Button>
        </Box>
      ) : (
        <>
          <Typography paragraph>
            Amazon（または他のサポートされているECサイト）の商品URLを入力すると、
            商品情報を自動的に取得して登録します。
          </Typography>

          <ErrorAlert error={error} severity={getErrorSeverity()} />

          <ProductForm onSubmit={handleSubmit} isLoading={loading} />
        </>
      )}
    </PageContainer>
  );
};

export default AddProductPage;
