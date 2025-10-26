import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [foundWallets, setFoundWallets] = useState([]);
  const [scanMode, setScanMode] = useState(user.is_premium ? "premium" : "free");
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("1month");
  const [invoice, setInvoice] = useState(null);
  const [txHash, setTxHash] = useState("");
  const workersRef = useRef([]);

  useEffect(() => {
    return () => {
      // Cleanup workers
      workersRef.current.forEach(w => w.terminate());
    };
  }, []);

  const startScanning = () => {
    if (!user.email_verified) {
      toast.error("Taramaya başlamadan önce e-postanızı doğrulamanız gerekiyor");
      return;
    }

    setScanning(true);
    setScannedCount(0);
    
    const workerCount = scanMode === "premium" ? Math.min(8, navigator.hardwareConcurrency || 4) : 1;
    
    // Create workers
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        new URL("../workers/scanWorker.js", import.meta.url),
        { type: "module" }
      );
      
      worker.onmessage = async (e) => {
        const { address, hasBalance } = e.data;
        setScannedCount(prev => prev + 1);
        
        if (hasBalance) {
          // Check with server
          try {
            const response = await axios.post(`${API}/scan/check-address`, { address });
            if (response.data.has_balance) {
              setFoundWallets(prev => [...prev, response.data]);
              toast.success(`Fonlu cüzdan bulundu! ${response.data.balance / 1_000_000} TRX`);
            }
          } catch (error) {
            console.error("Error checking address:", error);
          }
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
      toast.success("Fatura oluşturuldu!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Fatura oluşturulamadı");
    }
  };

  const submitPayment = async () => {
    if (!txHash || !invoice) {
      toast.error("Lütfen işlem hash'ini girin");
      return;
    }

    try {
      await axios.post(`${API}/payments/manual?tx_hash=${txHash}&invoice_id=${invoice.invoice_id}`);
      toast.success("Ödeme doğrulamaya gönderildi! 3 onay beklenecek.");
      setShowInvoice(false);
      setInvoice(null);
      setTxHash("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Ödeme gönderilemedi");
    }
  };

  const isPremiumActive = user.is_premium && user.access_until && new Date(user.access_until) > new Date();

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="glass border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold neon-text">BitSleuth</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-300">{user.email}</span>
            {isPremiumActive && (
              <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-sm font-semibold">
                Premium ⚡
              </span>
            )}
            {user.is_admin && (
              <Button
                data-testid="admin-panel-btn"
                onClick={() => navigate("/admin")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Admin Panel
              </Button>
            )}
            <Button
              data-testid="logout-btn"
              onClick={onLogout}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Çıkış
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!user.email_verified && (
          <div className="glass border-yellow-500/50 p-4 rounded-lg mb-6">
            <p className="text-yellow-400">⚠️ E-postanızı doğrulayın. Kayıt sırasında gönderilen linke tıklayın.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanning control */}
          <div className="lg:col-span-2 space-y-6">
            <Card data-testid="scan-control-card" className="glass p-6">
              <h2 className="text-2xl font-bold mb-4 text-cyan-300">Tarama Kontrol</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 block mb-2">Tarama Modu</label>
                  <div className="flex gap-4">
                    <Button
                      data-testid="free-mode-btn"
                      onClick={() => setScanMode("free")}
                      variant={scanMode === "free" ? "default" : "outline"}
                      className={scanMode === "free" ? "bg-cyan-600" : "border-slate-600"}
                      disabled={scanning}
                    >
                      Ücretsiz (Yavaş)
                    </Button>
                    <Button
                      data-testid="premium-mode-btn"
                      onClick={() => setScanMode("premium")}
                      variant={scanMode === "premium" ? "default" : "outline"}
                      className={scanMode === "premium" ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "border-slate-600"}
                      disabled={scanning || !isPremiumActive}
                    >
                      Premium (Hızlı) ⚡
                    </Button>
                  </div>
                  {scanMode === "premium" && !isPremiumActive && (
                    <p className="text-sm text-orange-400 mt-2">Premium moda erişmek için premium satın alın</p>
                  )}
                </div>

                <div>
                  {!scanning ? (
                    <Button
                      data-testid="start-scan-btn"
                      onClick={startScanning}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-6 text-lg font-semibold rounded-xl"
                    >
                      Taramayı Başlat
                    </Button>
                  ) : (
                    <Button
                      data-testid="stop-scan-btn"
                      onClick={stopScanning}
                      className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-6 text-lg font-semibold rounded-xl"
                    >
                      Taramayı Durdur
                    </Button>
                  )}
                </div>

                {scanning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Taranan Adres Sayısı</span>
                      <span className="text-cyan-400 font-mono" data-testid="scanned-count">{scannedCount.toLocaleString()}</span>
                    </div>
                    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="scanning-line absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Found wallets */}
            <Card data-testid="found-wallets-card" className="glass p-6">
              <h2 className="text-2xl font-bold mb-4 neon-text-green">Bulunan Cüzdanlar</h2>
              {foundWallets.length === 0 ? (
                <p className="text-slate-400">Henüz fonlu cüzdan bulunamadı</p>
              ) : (
                <div className="space-y-2">
                  {foundWallets.map((wallet, idx) => (
                    <div key={idx} className="glass p-4 rounded-lg border border-green-500/30">
                      <div className="flex justify-between items-center">
                        <code className="text-green-400 text-sm">{wallet.address}</code>
                        <span className="text-green-300 font-semibold">
                          {wallet.balance / 1_000_000} TRX
                        </span>
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
              <Card data-testid="premium-upgrade-card" className="glass p-6 border-yellow-500/30">
                <h3 className="text-xl font-bold mb-3 text-yellow-400">Premium'a Geçin</h3>
                <p className="text-slate-300 text-sm mb-4">
                  10x daha hızlı tarama, çoklu worker desteği ve daha fazlası!
                </p>
                <Button
                  data-testid="show-plans-btn"
                  onClick={() => setShowInvoice(!showInvoice)}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  Planları Görüntüle
                </Button>
              </Card>
            )}

            {showInvoice && (
              <Card data-testid="invoice-card" className="glass p-6">
                {!invoice ? (
                  <>
                    <h3 className="text-xl font-bold mb-3 text-cyan-300">Plan Seçin</h3>
                    <div className="space-y-3">
                      <Button
                        data-testid="plan-1week-btn"
                        onClick={() => setSelectedPlan("1week")}
                        variant={selectedPlan === "1week" ? "default" : "outline"}
                        className="w-full justify-between"
                      >
                        <span>1 Hafta</span>
                        <span>10 USDT</span>
                      </Button>
                      <Button
                        data-testid="plan-1month-btn"
                        onClick={() => setSelectedPlan("1month")}
                        variant={selectedPlan === "1month" ? "default" : "outline"}
                        className="w-full justify-between"
                      >
                        <span>1 Ay</span>
                        <span>30 USDT</span>
                      </Button>
                      <Button
                        data-testid="plan-3months-btn"
                        onClick={() => setSelectedPlan("3months")}
                        variant={selectedPlan === "3months" ? "default" : "outline"}
                        className="w-full justify-between"
                      >
                        <span>3 Ay</span>
                        <span>75 USDT</span>
                      </Button>
                    </div>
                    <Button
                      data-testid="create-invoice-btn"
                      onClick={createInvoice}
                      className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700"
                    >
                      Fatura Oluştur
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold mb-3 text-green-400">Ödeme Bilgileri</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-slate-400">Miktar</p>
                        <p className="text-white font-mono text-lg">{invoice.amount} USDT (TRC20)</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Cüzdan Adresi</p>
                        <code className="text-cyan-400 text-xs break-all">{invoice.wallet_address}</code>
                      </div>
                      <div>
                        <p className="text-slate-400">Plan</p>
                        <p className="text-white">{invoice.plan}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="text-slate-300 text-sm">İşlem Hash (TX)</label>
                      <input
                        data-testid="tx-hash-input"
                        type="text"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded text-white text-sm"
                        placeholder="0x..."
                      />
                    </div>
                    <Button
                      data-testid="submit-payment-btn"
                      onClick={submitPayment}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    >
                      Ödemeyi Gönder
                    </Button>
                  </>
                )}
              </Card>
            )}

            <Card data-testid="stats-card" className="glass p-6">
              <h3 className="text-xl font-bold mb-3 text-cyan-300">İstatistikler</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Durum</span>
                  <span className="text-green-400">
                    {isPremiumActive ? "Premium Aktif" : "Ücretsiz"}
                  </span>
                </div>
                {isPremiumActive && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bitiş Tarihi</span>
                    <span className="text-cyan-400">
                      {new Date(user.access_until).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Bulunan Cüzdan</span>
                  <span className="text-green-400">{foundWallets.length}</span>
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
