import React, { useEffect, useState, useCallback } from "react";
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
  useTheme,
  useMediaQuery,
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
import NotificationSettingsCard from "@components/products/NotificationSettingsCard";

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
  // ECサイト情報の表示件数管理
  const [visibleSites, setVisibleSites] = useState<number>(10);

  const handleSaveSettings = useCallback(async () => {
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
  }, [
    userProduct,
    priceThreshold,
    notificationEnabled,
    memo,
    updateProduct,
    setIsEditing,
  ]);

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

  const { product } = userProduct;

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

  // 表示中のECサイト情報
  const displayedEcSites = isMobile
    ? sortedEcSites.slice(0, visibleSites)
    : sortedEcSites;

  // さらに表示するボタンの表示/非表示
  const hasMoreSites = isMobile && sortedEcSites.length > visibleSites;

  // 「もっと見る」ボタンクリック時の処理
  const handleShowMoreSites = () => {
    setVisibleSites((prev) => prev + 10);
  };

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
          size="small"
        >
          ダッシュボードに戻る
        </Button>
      </Box>

      <ErrorAlert error={errorMessage} />

      <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
        {/* 商品情報 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: { xs: 2, md: 3 } }}>
            <CardMedia
              component="img"
              sx={{
                height: { xs: 200, sm: 250, md: 300 },
                objectFit: "contain",
                backgroundColor: "#f5f5f5",
                p: { xs: 1, md: 2 },
              }}
              image={product.image_url || "/placeholder.png"}
              alt={product.name}
            />
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
              <Typography
                gutterBottom
                variant="h6"
                component="div"
                sx={{
                  fontSize: { xs: "1.1rem", sm: "1.25rem", md: "1.5rem" },
                }}
              >
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
                  size="small"
                >
                  最安値で購入
                </Button>
              )}
            </CardContent>
          </Card>

          {/* PC表示時は通知設定をここに表示 */}
          {!isMobile && (
            <NotificationSettingsCard
              priceThreshold={priceThreshold}
              setPriceThreshold={setPriceThreshold}
              notificationEnabled={notificationEnabled}
              setNotificationEnabled={setNotificationEnabled}
              memo={memo}
              setMemo={setMemo}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              isSaving={isSaving}
              handleSaveSettings={handleSaveSettings}
            />
          )}
        </Grid>

        {/* 価格履歴 */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: { xs: 2, md: 3 } }}>
            {priceHistory && priceHistory.length > 0 ? (
              <Box
                sx={{
                  height: { xs: "auto", sm: "auto" },
                  minHeight: { xs: 350, sm: 400 },
                  width: "100%",
                  overflow: "visible",
                }}
              >
                <PriceHistoryChart
                  data={priceHistory}
                  threshold={priceThreshold || 0}
                />
              </Box>
            ) : (
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  価格履歴データがありません
                </Typography>
              </CardContent>
            )}
          </Card>

          {/* ECサイト比較テーブル */}
          <Card>
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
              <Typography variant="h6" gutterBottom>
                各ECサイトの価格情報
              </Typography>

              {sortedEcSites.length > 0 ? (
                <>
                  <TableContainer sx={{ overflow: "auto" }}>
                    <Table size="small">
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
                        {displayedEcSites.map((site) => {
                          // サイトへのリンク
                          const siteUrl =
                            site.affiliate_url || site.product_url;

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
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    flexWrap: { xs: "wrap", sm: "nowrap" },
                                  }}
                                >
                                  <ECSiteLogo
                                    ecSiteCode={site.ec_site?.code}
                                    ecSiteName={
                                      site.ec_site?.name || "ECサイト"
                                    }
                                  />
                                  {siteUrl ? (
                                    <Link
                                      href={siteUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      underline="hover"
                                      sx={{
                                        fontSize: {
                                          xs: "0.8rem",
                                          sm: "0.875rem",
                                        },
                                      }}
                                    >
                                      {site.seller_name ||
                                        site.ec_site?.name ||
                                        "ECサイト"}
                                    </Link>
                                  ) : (
                                    <Typography
                                      sx={{
                                        fontSize: {
                                          xs: "0.8rem",
                                          sm: "0.875rem",
                                        },
                                      }}
                                    >
                                      {site.seller_name ||
                                        site.ec_site?.name ||
                                        "ECサイト"}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                }}
                              >
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
                                      sx={{
                                        ml: 1,
                                        height: 20,
                                        fontSize: "0.7rem",
                                      }}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                }}
                              >
                                {site.current_points
                                  ? `${Number(
                                      site.current_points
                                    ).toLocaleString()}P`
                                  : "-"}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                }}
                              >
                                {site.effective_price
                                  ? `¥${Number(
                                      site.effective_price
                                    ).toLocaleString()}`
                                  : "情報なし"}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                }}
                              >
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

                  {/* モバイル表示時で、表示しきれていない場合に「もっと見る」ボタンを表示 */}
                  {hasMoreSites && (
                    <Box sx={{ textAlign: "center", mt: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleShowMoreSites}
                      >
                        さらに
                        {Math.min(10, sortedEcSites.length - visibleSites)}
                        件表示
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  ECサイト情報がありません
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* モバイル表示時のみ通知設定を最下部に配置 */}
        {isMobile && (
          <Grid item xs={12}>
            <NotificationSettingsCard
              priceThreshold={priceThreshold}
              setPriceThreshold={setPriceThreshold}
              notificationEnabled={notificationEnabled}
              setNotificationEnabled={setNotificationEnabled}
              memo={memo}
              setMemo={setMemo}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              isSaving={isSaving}
              handleSaveSettings={handleSaveSettings}
            />
          </Grid>
        )}
      </Grid>
    </PageContainer>
  );
};

export default ProductDetailPage;
