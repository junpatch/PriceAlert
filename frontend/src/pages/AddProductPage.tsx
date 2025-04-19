import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Alert,
  Button,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PageContainer from "@components/layout/PageContainer";
import ProductForm, { ProductFormData } from "@components/products/ProductForm";
import { useProducts } from "@features/products/hooks/useProducts";
import ErrorAlert from "@components/common/ErrorAlert";
import EcommerceSearchSpinner from "@components/common/EcommerceSearchSpinner";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import QrCodeScanner from "@components/common/QrCodeScanner";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`product-registration-tabpanel-${index}`}
      aria-labelledby={`product-registration-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `product-registration-tab-${index}`,
    "aria-controls": `product-registration-tabpanel-${index}`,
  };
};

const AddProductPage: React.FC = () => {
  const { registerProduct, loading, error } = useProducts();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [janCode, setJanCode] = useState("");
  const [scannerActive, setScannerActive] = useState(true);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageReady(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSubmit = async (data: ProductFormData) => {
    try {
      setSubmitting(true);
      await registerProduct(data.url, data.price_threshold);
      setSuccess(true);

      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (err) {
      console.error("商品登録エラー:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJanSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!janCode) return;

    try {
      setSubmitting(true);
      await registerProduct(`jan_code=${janCode}`);
      setSuccess(true);

      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (err) {
      console.error("商品登録エラー:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScan = async (data: string) => {
    if (!data) return;
    setJanCode(data);
    setScannerActive(false);

    try {
      setSubmitting(true);
      await registerProduct(`jan_code=${data}`);
      setSuccess(true);

      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (err) {
      setScannerActive(true);
      console.error("商品登録エラー:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanError = (errorMessage: string) => {
    console.error("バーコードスキャンエラー:", errorMessage);
    setScannerError(errorMessage);
  };

  const getErrorSeverity = (): "error" | "warning" | "info" => {
    if (!error) return "error";

    if (error.includes("見つかりません")) {
      return "warning";
    }

    if (error.includes("外部サービス") || error.includes("接続に失敗")) {
      return "warning";
    }

    return "error";
  };

  if (!pageReady) {
    return (
      <PageContainer title="商品の追加" maxWidth="sm">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "300px",
          }}
        >
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="商品の追加"
      subTitle="追跡したい商品のURLまたはJANコードを入力してください"
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
            商品URLまたはJANコードから商品情報を自動的に取得して登録します。
          </Typography>

          <ErrorAlert error={error} severity={getErrorSeverity()} />

          {submitting ? (
            <EcommerceSearchSpinner message="商品情報を取得中です..." />
          ) : (
            <>
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  aria-label="商品登録方法"
                  variant="fullWidth"
                >
                  <Tab label="URLで登録" {...a11yProps(0)} />
                  <Tab label="JANコードで登録" {...a11yProps(1)} />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <ProductForm onSubmit={handleSubmit} isLoading={submitting} />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  {scannerActive && (
                    <>
                      <Typography variant="h6" gutterBottom>
                        バーコードをスキャンしてください
                      </Typography>
                      <Box
                        sx={{
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          mb: 3,
                        }}
                      >
                        <QrCodeScanner
                          onScan={handleScan}
                          onError={handleScanError}
                          height={300}
                          width="100%"
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          textAlign="center"
                          sx={{ mt: 2 }}
                        >
                          バーコードリーダーを使ってJANコードを読み込んでください
                          <br />
                          自動的に商品情報を取得します
                        </Typography>
                      </Box>
                    </>
                  )}

                  <Typography variant="h6" gutterBottom>
                    JANコードを手動で入力
                  </Typography>
                  <Box
                    component="form"
                    onSubmit={handleJanSubmit}
                    noValidate
                    sx={{ mt: 1 }}
                  >
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="jan_code"
                      label="JANコード"
                      name="jan_code"
                      value={janCode}
                      onChange={(e) => setJanCode(e.target.value)}
                      placeholder="4901234567890"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <QrCode2Icon />
                          </InputAdornment>
                        ),
                      }}
                      disabled={submitting}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      sx={{ mt: 3, mb: 2 }}
                      disabled={submitting || !janCode}
                    >
                      {submitting ? "登録中..." : "JANコードで商品を登録"}
                    </Button>
                  </Box>
                </Paper>
              </TabPanel>
            </>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default AddProductPage;
