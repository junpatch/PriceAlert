import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Link,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  ShoppingCart as ShoppingCartIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import PageContainer from "@components/layout/PageContainer";
import PriceHistoryChart from "@components/products/PriceHistoryChart";
import LoadingSpinner from "@components/common/LoadingSpinner";
import ErrorAlert from "@components/common/ErrorAlert";
import ECSiteLogo from "@components/ec-sites/ECSiteLogo";
import { useProducts } from "@features/products/hooks/useProducts";
import { useGetProductByIdQuery, useGetPriceHistoryQuery } from "@services/api";
import { ProductOnECSite } from "@/types";
import { formatErrorMessage } from "@/utils/apiUtils";

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const navigate = useNavigate();

  const { error: productsError, updateProduct } = useProducts();
  const {
    data: userProduct,
    isLoading: isProductLoading,
    error: productError,
  } = useGetProductByIdQuery(productId, {
    refetchOnMountOrArgChange: true,
  });
  const { data: priceHistory, isLoading: isPriceHistoryLoading } =
    useGetPriceHistoryQuery(
      { productId: userProduct?.product?.id || 0 },
      { skip: !userProduct?.product?.id }
    );

  const [priceThreshold, setPriceThreshold] = useState<number | undefined>(
    undefined
  );
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const loading = isProductLoading || isPriceHistoryLoading;
  const rawError = productsError || productError;
  const errorMessage = formatErrorMessage(rawError);

  // APIから返されたデータの構造に合わせて状態変数を更新
  useEffect(() => {
    if (userProduct) {
      setPriceThreshold(
        userProduct.price_threshold
          ? Number(userProduct.price_threshold)
          : undefined
      );
      setNotificationEnabled(userProduct.notification_enabled || false);
      setMemo(userProduct.memo || "");

      // デバッグ用
      if (import.meta.env.DEV) {
        console.log("UserProduct 詳細:", userProduct);
      }
    }
  }, [userProduct]);

  if (loading) {
    return (
      <PageContainer title="商品詳細" maxWidth="lg">
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (!userProduct || !userProduct.product) {
    return (
      <PageContainer title="商品詳細" maxWidth="lg">
        <Typography color="error">商品が見つかりません</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/dashboard")}
          sx={{ mt: 2 }}
        >
          ダッシュボードに戻る
        </Button>
      </PageContainer>
    );
  }

  const product = userProduct.product;

  const handleSaveSettings = async () => {
    if (!userProduct) return;

    setIsSaving(true);
    try {
      await updateProduct(userProduct.id, {
        price_threshold: priceThreshold,
        notification_enabled: notificationEnabled,
        memo,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("設定の更新に失敗しました", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getBestEcSite = () => {
    if (!product.ec_sites || product.ec_sites.length === 0) return null;

    // 型を明示的に指定して、初期値をnullではなく最初の要素に
    return product.ec_sites.reduce<ProductOnECSite | null>((best, site) => {
      // 価格情報がない場合は比較しない
      if (!site.current_price) return best;
      if (!best || !best.current_price) return site;

      // 文字列または数値からNumber型に変換して比較
      const currentPrice = parseFloat(site.current_price.toString());
      const bestPrice = parseFloat(best.current_price.toString());

      return currentPrice < bestPrice ? site : best;
    }, null);
  };

  const bestSite = getBestEcSite();

  // ECサイトのリストを価格の安い順に並べ替える
  const sortedEcSites = product.ec_sites
    ? [...product.ec_sites].sort((a, b) => {
        // 価格情報がない場合は最後に表示
        if (!a.current_price) return 1;
        if (!b.current_price) return -1;

        // 文字列または数値からNumber型に変換して比較
        const priceA = parseFloat(a.current_price.toString());
        const priceB = parseFloat(b.current_price.toString());

        return priceA - priceB;
      })
    : [];

  // 商品説明を短く切り詰める文字数
  const MAX_DESCRIPTION_LENGTH = 150;
  const isDescriptionLong =
    product.description && product.description.length > MAX_DESCRIPTION_LENGTH;

  // 表示する説明文
  const displayDescription =
    product.description && isDescriptionLong && !descriptionExpanded
      ? `${product.description.substring(0, MAX_DESCRIPTION_LENGTH)}...`
      : product.description;

  // 説明文の折りたたみ状態を切り替える
  const toggleDescription = () => {
    setDescriptionExpanded(!descriptionExpanded);
  };

  return (
    <PageContainer title={product.name} maxWidth="lg">
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/dashboard")}
        >
          ダッシュボードに戻る
        </Button>
      </Box>

      <ErrorAlert error={errorMessage} />

      <Grid container spacing={3}>
        {/* 商品情報 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardMedia
              component="img"
              sx={{
                height: 300,
                objectFit: "contain",
                backgroundColor: "#f5f5f5",
                p: 2,
              }}
              image={product.image_url || "/placeholder.png"}
              alt={product.name}
            />
            <CardContent>
              <Typography gutterBottom variant="h5" component="div">
                {product.name}
              </Typography>

              {product.manufacturer && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  メーカー: {product.manufacturer}
                </Typography>
              )}

              {product.model_number && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  型番: {product.model_number}
                </Typography>
              )}

              {product.jan_code && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  JANコード: {product.jan_code}
                </Typography>
              )}

              {product.description && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {displayDescription}
                  </Typography>

                  {isDescriptionLong && (
                    <Button
                      size="small"
                      onClick={toggleDescription}
                      endIcon={
                        descriptionExpanded ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )
                      }
                      sx={{ mt: 1 }}
                    >
                      {descriptionExpanded ? "閉じる" : "続きを読む"}
                    </Button>
                  )}
                </Box>
              )}

              {bestSite && bestSite.product_url && (
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<ShoppingCartIcon />}
                  component="a"
                  href={bestSite.affiliate_url || bestSite.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  最安値で購入
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 通知設定 */}
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">通知設定</Typography>
                {isEditing ? (
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                  >
                    {isSaving ? "保存中..." : "保存"}
                  </Button>
                ) : (
                  <Button variant="outlined" onClick={() => setIsEditing(true)}>
                    編集
                  </Button>
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <TextField
                  label="目標価格"
                  type="number"
                  value={priceThreshold}
                  onChange={(e) =>
                    setPriceThreshold(Number(e.target.value) || undefined)
                  }
                  disabled={!isEditing}
                  fullWidth
                  margin="normal"
                  InputProps={{
                    startAdornment: <span>¥</span>,
                  }}
                  helperText="この価格以下になったら通知します"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationEnabled}
                      onChange={(e) => setNotificationEnabled(e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label="価格通知を有効にする"
                />
              </Box>

              <TextField
                label="メモ"
                multiline
                rows={4}
                value={memo || ""}
                onChange={(e) => setMemo(e.target.value)}
                disabled={!isEditing}
                fullWidth
                margin="normal"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* 価格履歴 */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                価格推移
              </Typography>
              {priceHistory && priceHistory.length > 0 ? (
                <PriceHistoryChart
                  data={priceHistory}
                  threshold={priceThreshold || 0}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  価格履歴データがありません
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* ECサイト比較テーブル */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                各ECサイトの価格情報
              </Typography>

              {sortedEcSites.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>販売店</TableCell>
                        <TableCell align="right">価格</TableCell>
                        <TableCell align="right">ポイント</TableCell>
                        <TableCell align="right">実質価格</TableCell>
                        <TableCell align="right">送料</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedEcSites.map((site) => {
                        // サイトへのリンク
                        const siteUrl = site.affiliate_url || site.product_url;

                        return (
                          <TableRow
                            key={site.id}
                            hover
                            onClick={() => {
                              if (siteUrl) {
                                window.open(
                                  siteUrl,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }
                            }}
                            sx={{
                              backgroundColor:
                                site === bestSite
                                  ? "rgba(76, 175, 80, 0.08)"
                                  : "inherit",
                              cursor: siteUrl ? "pointer" : "default",
                              "&:hover": {
                                backgroundColor:
                                  site === bestSite
                                    ? "rgba(76, 175, 80, 0.15)"
                                    : "rgba(0, 0, 0, 0.04)",
                              },
                            }}
                          >
                            <TableCell>
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <ECSiteLogo
                                  ecSiteCode={site.ec_site?.code}
                                  ecSiteName={site.ec_site?.name || "ECサイト"}
                                />
                                {siteUrl ? (
                                  <Link
                                    href={siteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    underline="hover"
                                  >
                                    {site.seller_name ||
                                      site.ec_site?.name ||
                                      "ECサイト"}
                                  </Link>
                                ) : (
                                  <Typography>
                                    {site.seller_name ||
                                      site.ec_site?.name ||
                                      "ECサイト"}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                }}
                              >
                                {site.current_price
                                  ? `¥${Number(
                                      site.current_price
                                    ).toLocaleString()}`
                                  : "情報なし"}
                                {site === bestSite && (
                                  <Chip
                                    label="最安値"
                                    size="small"
                                    color="success"
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              {site.current_points
                                ? `${Number(
                                    site.current_points
                                  ).toLocaleString()}P`
                                : "-"}
                            </TableCell>
                            <TableCell align="right">
                              {site.effective_price
                                ? `¥${Number(
                                    site.effective_price
                                  ).toLocaleString()}`
                                : "情報なし"}
                            </TableCell>
                            <TableCell align="right">
                              {site.shipping_fee !== null
                                ? site.shipping_fee > 0
                                  ? `¥${Number(
                                      site.shipping_fee
                                    ).toLocaleString()}`
                                  : "無料"
                                : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  ECサイト情報がありません
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default ProductDetailPage;
