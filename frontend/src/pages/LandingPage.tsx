import React from 'react';
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
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  ShoppingCart as ShoppingCartIcon,
  Compare as CompareIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Box>
      {/* ヒーローセクション */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          py: 8,
          mb: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
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
                    sx={{ color: 'primary.main', bgcolor: 'white' }}
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
                      sx={{ color: 'primary.main', bgcolor: 'white' }}
                    >
                      無料登録する
                    </Button>
                    <Button
                      component={Link}
                      to="/login"
                      variant="outlined"
                      size="large"
                      sx={{ color: 'white', borderColor: 'white' }}
                    >
                      ログイン
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/hero-image.png"
                alt="PriceAlert"
                sx={{
                  width: '100%',
                  maxWidth: '500px',
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
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
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
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
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <NotificationsIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
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
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
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
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <ShoppingCartIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
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
      <Box sx={{ bgcolor: 'grey.100', py: 8, mb: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            使い方はカンタン
          </Typography>
          <Typography variant="body1" align="center" paragraph>
            3ステップで価格追跡をスタート
          </Typography>

          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardMedia
                  component="div"
                  sx={{ height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'primary.light' }}
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
              <Card sx={{ height: '100%' }}>
                <CardMedia
                  component="div"
                  sx={{ height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'primary.light' }}
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
              <Card sx={{ height: '100%' }}>
                <CardMedia
                  component="div"
                  sx={{ height: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'primary.light' }}
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
      <Container maxWidth="md" sx={{ textAlign: 'center', mb: 8 }}>
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