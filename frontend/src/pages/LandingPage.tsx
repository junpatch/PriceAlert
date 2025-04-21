import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Stack,
} from "@mui/material";
import {
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  ShoppingCart as ShoppingCartIcon,
  Compare as CompareIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useAuth } from "@contexts/AuthContext";

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [price, setPrice] = useState(10000);
  const [priceDecreasing, setPriceDecreasing] = useState(true);

  // 価格変動のアニメーション効果
  useEffect(() => {
    const interval = setInterval(() => {
      if (priceDecreasing) {
        setPrice((prev) => {
          const newPrice = prev - 100;
          if (newPrice <= 7000) {
            setPriceDecreasing(false);
            return 7000;
          }
          return newPrice;
        });
      } else {
        setPrice((prev) => {
          const newPrice = prev + 100;
          if (newPrice >= 10000) {
            setPriceDecreasing(true);
            return 10000;
          }
          return newPrice;
        });
      }
    }, 300);

    return () => clearInterval(interval);
  }, [priceDecreasing]);

  return (
    <Box>
      {/* ヒーローセクション */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "primary.contrastText",
          py: 8,
          mb: 6,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%),
              linear-gradient(transparent 0%, rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "200% 100%, 20px 20px, 20px 20px",
            animation: "moveLines 3s infinite linear",
            zIndex: 1,
          },
          "@keyframes pulse": {
            "0%": { opacity: 0.5, transform: "scale(1)" },
            "50%": { opacity: 0.8, transform: "scale(1.5)" },
            "100%": { opacity: 0.5, transform: "scale(1)" },
          },
          "@keyframes moveLines": {
            "0%": { backgroundPosition: "0% 0%, 0 0, 0 0" },
            "100%": { backgroundPosition: "200% 0%, 0 20px, 20px 0" },
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2 }}>
          {/* グラフの線がスピード感を持って流れるアニメーション要素 */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              overflow: "hidden",
            }}
          >
            {[...Array(10)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: "absolute",
                  height: "1px",
                  background: "rgba(255,255,255,0.2)",
                  width: "100%",
                  left: "0%",
                  top: `${10 + i * 8}%`,
                  animation: `moveRightToLeft ${2 + i * 0.2}s infinite linear`,
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.7,
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    width: "50%",
                    height: "100%",
                    left: "25%",
                    background: "rgba(76,175,80,0.5)",
                  },
                  "@keyframes moveRightToLeft": {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(100%)" },
                  },
                }}
              />
            ))}
            {[...Array(5)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: "absolute",
                  height: "1px",
                  background: "rgba(255,255,255,0.15)",
                  width: "100%",
                  left: "0%",
                  top: `${50 + i * 8}%`,
                  animation: `moveLeftToRight ${3 + i * 0.3}s infinite linear`,
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0.7,
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    width: "30%",
                    height: "100%",
                    left: "40%",
                    background: "rgba(255,152,0,0.5)",
                  },
                  "@keyframes moveLeftToRight": {
                    "0%": { transform: "translateX(100%)" },
                    "100%": { transform: "translateX(-100%)" },
                  },
                }}
              />
            ))}
          </Box>
          <Grid
            container
            spacing={4}
            alignItems="center"
            sx={{ position: "relative", zIndex: 3 }}
          >
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                PriceAlert
              </Typography>
              <Typography variant="h5" component="h2" gutterBottom>
                あなたの買い物をもっとスマートに
              </Typography>
              <Typography variant="body1" paragraph>
                ECサイトの価格変動を自動で追跡し、最適な購入タイミングをお知らせします。
                複数のECサイトを横断して最安値を見つけましょう。
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                {isAuthenticated ? (
                  <Button
                    component={Link}
                    to="/dashboard"
                    variant="contained"
                    size="large"
                    sx={{ color: "primary.main", bgcolor: "white" }}
                  >
                    ダッシュボードへ
                  </Button>
                ) : (
                  <>
                    <Button
                      component={Link}
                      to="/register"
                      variant="contained"
                      size="large"
                      sx={{ color: "primary.main", bgcolor: "white" }}
                    >
                      無料登録する
                    </Button>
                    <Button
                      component={Link}
                      to="/login"
                      variant="outlined"
                      size="large"
                      sx={{ color: "white", borderColor: "white" }}
                    >
                      ログイン
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: "relative",
                  height: "300px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.1)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    zIndex: 2,
                    textAlign: "center",
                    p: 3,
                  }}
                >
                  <Typography
                    variant="h3"
                    color="white"
                    sx={{
                      mb: 1,
                      fontWeight: "bold",
                      textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                  >
                    ¥{price.toLocaleString()}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: priceDecreasing ? "#4caf50" : "#ff9800",
                      fontWeight: "bold",
                      textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                  >
                    {priceDecreasing ? "↓ 価格下降中" : "↑ 価格上昇中"}
                  </Typography>
                  <Typography variant="body1" color="white" sx={{ mt: 2 }}>
                    最適な購入タイミングをお知らせします
                  </Typography>
                </Box>
                {/* 背景の流れるグラフ風エフェクト */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "40%",
                    opacity: 0.7,
                    background:
                      "linear-gradient(0deg, rgba(76,175,80,0.3) 0%, rgba(0,0,0,0) 100%), linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "moveGraph 10s infinite linear",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "1px",
                      background: "rgba(255,255,255,0.4)",
                    },
                  }}
                />
                <Box
                  sx={{
                    "@keyframes moveGraph": {
                      "0%": { backgroundPosition: "0% 0%" },
                      "100%": { backgroundPosition: "200% 0%" },
                    },
                    "@keyframes float": {
                      "0%": { transform: "translateY(0px)" },
                      "50%": { transform: "translateY(-10px)" },
                      "100%": { transform: "translateY(0px)" },
                    },
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 機能セクション */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" align="center" gutterBottom>
          主な機能
        </Typography>
        <Typography variant="body1" align="center" paragraph>
          商品価格を常に監視し、最適な購入タイミングをサポートします
        </Typography>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ textAlign: "center" }}>
                <TimelineIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h6" component="h3" gutterBottom>
                  価格履歴の追跡
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  商品の価格変動を時系列で記録し、グラフで見やすく表示します。過去の最安値も確認できます。
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ textAlign: "center" }}>
                <NotificationsIcon
                  color="primary"
                  sx={{ fontSize: 60, mb: 2 }}
                />
                <Typography variant="h6" component="h3" gutterBottom>
                  価格アラート
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  設定した価格を下回ったら自動で通知。見逃しがちな値下げも確実にキャッチできます。
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ textAlign: "center" }}>
                <CompareIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h6" component="h3" gutterBottom>
                  ECサイト比較
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  複数のECサイトから同じ商品の価格を収集し、最安値を一目で比較できます。
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ textAlign: "center" }}>
                <ShoppingCartIcon
                  color="primary"
                  sx={{ fontSize: 60, mb: 2 }}
                />
                <Typography variant="h6" component="h3" gutterBottom>
                  ワンクリック購入
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  最安値のECサイトへすぐにアクセス。タイミングを逃さず、すぐに商品を購入できます。
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* 使い方セクション */}
      <Box sx={{ bgcolor: "grey.100", py: 8, mb: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            使い方はカンタン
          </Typography>
          <Typography variant="body1" align="center" paragraph>
            3ステップで価格追跡をスタート
          </Typography>

          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 60,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    bgcolor: "primary.light",
                  }}
                >
                  <Typography variant="h4" color="white">
                    1
                  </Typography>
                </CardMedia>
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    商品登録
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    監視したい商品のURLをPriceAlertに貼り付けるだけ。商品情報を自動で取得します。
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 60,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    bgcolor: "primary.light",
                  }}
                >
                  <Typography variant="h4" color="white">
                    2
                  </Typography>
                </CardMedia>
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    価格閾値を設定
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    いくらになったら通知を受け取りたいか、希望価格を設定します。
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: "100%" }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 60,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    bgcolor: "primary.light",
                  }}
                >
                  <Typography variant="h4" color="white">
                    3
                  </Typography>
                </CardMedia>
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    通知を待つ
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    あとは価格が下がるのを待つだけ。条件に合致したらすぐにお知らせします。
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTAセクション */}
      <Container maxWidth="md" sx={{ textAlign: "center", mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          今すぐ始めましょう
        </Typography>
        <Typography variant="body1" paragraph>
          登録は無料です。複数の商品を追跡して、最安値で購入するタイミングを逃さないようにしましょう。
        </Typography>
        {isAuthenticated ? (
          <Button
            component={Link}
            to="/dashboard"
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
          >
            ダッシュボードへ
          </Button>
        ) : (
          <Button
            component={Link}
            to="/register"
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
          >
            無料で登録する
          </Button>
        )}
      </Container>
    </Box>
  );
};

export default LandingPage;
