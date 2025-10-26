import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useLanguage } from "@/App";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LandingPage = ({ onLogin }) => {
  const { language, changeLanguage } = useLanguage();
  const t = useTranslation(language);
  
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [btcPrice, setBtcPrice] = useState(null);
  const [stats, setStats] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [showSupport, setShowSupport] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  useEffect(() => {
    // Fetch BTC price
    const fetchBtcPrice = async () => {
      try {
        const response = await axios.get(`${API}/price/btc`);
        setBtcPrice(response.data.price);
      } catch (error) {
        console.error("Error fetching BTC price:", error);
      }
    };

    // Fetch public stats
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/stats/public`);
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    // Fetch testimonials
    const fetchTestimonials = async () => {
      try {
        const response = await axios.get(`${API}/testimonials/approved`);
        setTestimonials(response.data.testimonials);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      }
    };

    fetchBtcPrice();
    fetchStats();
    fetchTestimonials();

    // Update BTC price every 60 seconds
    const priceInterval = setInterval(fetchBtcPrice, 60000);
    
    return () => clearInterval(priceInterval);
  }, []);

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSendingSupport(true);

    try {
      await axios.post(`${API}/support/message/public`, {
        email: supportEmail,
        message: supportMessage
      });
      
      toast.success("Support message sent successfully!");
      setSupportMessage("");
      setSupportEmail("");
      setShowSupport(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send message");
    } finally {
      setSendingSupport(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const response = await axios.post(`${API}${endpoint}`, { email, password });

      if (isLogin) {
        onLogin(response.data.token, response.data.user);
        toast.success("Login successful!");
      } else {
        toast.success("Registration successful! Please verify your email.");
        setIsLogin(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* BTC Price Ticker */}
      {btcPrice && (
        <div className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-b border-binance-gold/30 z-50">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-4">
            <span className="text-binance-gold font-semibold">BTC/USD:</span>
            <span className="text-white text-lg font-bold">
              ${btcPrice.toLocaleString()}
            </span>
            <span className="text-green-500 text-sm">●</span>
          </div>
        </div>
      )}

      {/* Help/Support Button - Fixed bottom right */}
      {!showAuth && !showSupport && (
        <button
          onClick={() => setShowSupport(true)}
          className="fixed bottom-8 right-8 z-50 bg-binance-gold text-black p-4 rounded-full shadow-lg hover:shadow-binance-gold/50 transition-all duration-300 hover:scale-110"
          title="Help & Support"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

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
                <Label htmlFor="support-email" className="text-gray-300">Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="mt-1 bg-slate-900/50 border-gray-700 text-white focus:border-binance-gold"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="support-message" className="text-gray-300">Message</Label>
                <textarea
                  id="support-message"
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  className="mt-1 w-full bg-slate-900/50 border border-gray-700 text-white focus:border-binance-gold rounded-md p-3 min-h-[120px]"
                  required
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

      {/* Language selector - top right */}
      <div className="absolute top-20 right-4 z-40 flex gap-2">
        <Button
          data-testid="lang-en"
          onClick={() => changeLanguage("en")}
          variant={language === "en" ? "default" : "outline"}
          className={language === "en" ? "bg-binance-gold text-black" : "border-gray-600 text-gray-300"}
          size="sm"
        >
          EN
        </Button>
        <Button
          data-testid="lang-tr"
          onClick={() => changeLanguage("tr")}
          variant={language === "tr" ? "default" : "outline"}
          className={language === "tr" ? "bg-binance-gold text-black" : "border-gray-600 text-gray-300"}
          size="sm"
        >
          TR
        </Button>
        <Button
          data-testid="lang-ru"
          onClick={() => changeLanguage("ru")}
          variant={language === "ru" ? "default" : "outline"}
          className={language === "ru" ? "bg-binance-gold text-black" : "border-gray-600 text-gray-300"}
          size="sm"
        >
          RU
        </Button>
      </div>

      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#F0B90B 1px, transparent 1px), linear-gradient(90deg, #F0B90B 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-binance-gold rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); opacity: 0.3; }
          50% { transform: translateY(-20px); opacity: 1; }
        }
      `}</style>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-20">
        <div className="max-w-6xl w-full">
          {!showAuth ? (
            <>
              <div className="text-center space-y-8">
                <div className="inline-block mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-binance-gold/20 blur-3xl rounded-full" />
                    <h1 className="relative text-7xl sm:text-8xl lg:text-9xl font-bold neon-text mb-4">
                      {t.hero_title}
                    </h1>
                  </div>
                </div>
                
                <p className="text-xl sm:text-2xl lg:text-3xl text-binance-gold font-light max-w-3xl mx-auto">
                  {t.hero_subtitle}
                </p>
                
                <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
                  {t.hero_description}
                </p>

                <div className="flex flex-wrap gap-4 justify-center mt-12">
                  <Button
                    data-testid="get-started-btn"
                    onClick={() => setShowAuth(true)}
                    className="bg-gradient-to-r from-binance-gold to-yellow-600 hover:from-yellow-600 hover:to-binance-gold text-black px-8 py-6 text-lg rounded-full font-semibold shadow-lg hover:shadow-binance-gold/50 transition-all duration-300"
                  >
                    {t.get_started}
                  </Button>
                </div>

                {/* Live Statistics */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
                    <div className="glass p-4 rounded-xl text-center">
                      <div className="text-3xl font-bold text-binance-gold">
                        {stats.total_users.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Total Users</div>
                    </div>
                    <div className="glass p-4 rounded-xl text-center">
                      <div className="text-3xl font-bold text-binance-gold">
                        {stats.total_mined.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Total Mined</div>
                    </div>
                    <div className="glass p-4 rounded-xl text-center">
                      <div className="text-3xl font-bold text-binance-gold">
                        {stats.total_found}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Wallets Found</div>
                    </div>
                    <div className="glass p-4 rounded-xl text-center">
                      <div className="text-3xl font-bold text-binance-gold">
                        {stats.active_miners}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Active Miners</div>
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
                  <div className="glass p-6 rounded-2xl hover:border-binance-gold/50 transition-all duration-300">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="text-xl font-semibold mb-2 text-binance-gold">{t.feature1_title}</h3>
                    <p className="text-gray-400">{t.feature1_desc}</p>
                  </div>
                  
                  <div className="glass p-6 rounded-2xl hover:border-binance-gold/50 transition-all duration-300">
                    <div className="text-4xl mb-4">🔐</div>
                    <h3 className="text-xl font-semibold mb-2 text-binance-gold">{t.feature2_title}</h3>
                    <p className="text-gray-400">{t.feature2_desc}</p>
                  </div>
                  
                  <div className="glass p-6 rounded-2xl hover:border-binance-gold/50 transition-all duration-300">
                    <div className="text-4xl mb-4">💎</div>
                    <h3 className="text-xl font-semibold mb-2 text-binance-gold">{t.feature3_title}</h3>
                    <p className="text-gray-400">{t.feature3_desc}</p>
                  </div>
                </div>

                {/* Testimonials */}
                {testimonials.length > 0 && (
                  <div className="mt-20">
                    <h2 className="text-4xl font-bold text-center mb-8 text-binance-gold">
                      What Our Users Say
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {testimonials.slice(0, 6).map((testimonial) => (
                        <div key={testimonial.id} className="glass p-6 rounded-2xl">
                          <div className="flex mb-3">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <span key={i} className="text-binance-gold text-xl">★</span>
                            ))}
                          </div>
                          <p className="text-gray-300 mb-4 italic">"{testimonial.message}"</p>
                          <p className="text-binance-gold font-semibold">- {testimonial.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ Section */}
                <div className="mt-20 max-w-4xl mx-auto">
                  <h2 className="text-4xl font-bold text-center mb-8 text-binance-gold">
                    Frequently Asked Questions
                  </h2>
                  <div className="space-y-4">
                    <details className="glass p-6 rounded-2xl group">
                      <summary className="text-lg font-semibold text-binance-gold cursor-pointer list-none flex justify-between items-center">
                        <span>What is Bitcoin mining with BitSleuth?</span>
                        <span className="transform group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <p className="text-gray-400 mt-4">
                        BitSleuth uses advanced algorithms to search for Bitcoin wallets with existing balances. Our system generates and checks millions of wallet addresses to find ones that may contain Bitcoin.
                      </p>
                    </details>

                    <details className="glass p-6 rounded-2xl group">
                      <summary className="text-lg font-semibold text-binance-gold cursor-pointer list-none flex justify-between items-center">
                        <span>Is my private key stored on your servers?</span>
                        <span className="transform group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <p className="text-gray-400 mt-4">
                        No! All private key generation happens locally in your browser. We never see or store your private keys. This ensures maximum security for your mining activities.
                      </p>
                    </details>

                    <details className="glass p-6 rounded-2xl group">
                      <summary className="text-lg font-semibold text-binance-gold cursor-pointer list-none flex justify-between items-center">
                        <span>How does the free trial work?</span>
                        <span className="transform group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <p className="text-gray-400 mt-4">
                        Every new user gets 10,000 free scans to try our service. After that, you can purchase additional scan quotas or upgrade to premium plans for unlimited mining.
                      </p>
                    </details>

                    <details className="glass p-6 rounded-2xl group">
                      <summary className="text-lg font-semibold text-binance-gold cursor-pointer list-none flex justify-between items-center">
                        <span>What happens if I find a wallet with balance?</span>
                        <span className="transform group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <p className="text-gray-400 mt-4">
                        When you discover a wallet with balance, you'll be notified immediately. The wallet details are sent to our administrators for verification, and you'll be contacted about your discovery.
                      </p>
                    </details>

                    <details className="glass p-6 rounded-2xl group">
                      <summary className="text-lg font-semibold text-binance-gold cursor-pointer list-none flex justify-between items-center">
                        <span>Which payment methods do you accept?</span>
                        <span className="transform group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <p className="text-gray-400 mt-4">
                        We accept Bitcoin (BTC) payments directly. Simply select your preferred plan, and you'll receive a Bitcoin address to send the payment to. Access is granted after blockchain confirmation.
                      </p>
                    </details>

                    <details className="glass p-6 rounded-2xl group">
                      <summary className="text-lg font-semibold text-binance-gold cursor-pointer list-none flex justify-between items-center">
                        <span>How long does it take to find a wallet?</span>
                        <span className="transform group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <p className="text-gray-400 mt-4">
                        Finding wallets with balance is rare due to Bitcoin's vast address space. Premium users have better chances with faster scanning speeds and more workers. Results vary based on computational power and luck.
                      </p>
                    </details>
                  </div>
                </div>
              </div>

              {/* Professional Footer */}
              <footer className="mt-32 border-t border-gray-800 pt-12 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                  <div>
                    <h3 className="text-binance-gold font-bold text-xl mb-4">BitSleuth</h3>
                    <p className="text-gray-400 text-sm">
                      Advanced Bitcoin mining platform for discovering wallets with existing balances.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-white font-semibold mb-4">Product</h4>
                    <ul className="space-y-2 text-gray-400 text-sm">
                      <li><a href="#" className="hover:text-binance-gold transition-colors">Features</a></li>
                      <li><a href="#" className="hover:text-binance-gold transition-colors">Pricing</a></li>
                      <li><a href="#" className="hover:text-binance-gold transition-colors">How It Works</a></li>
                      <li><a href="#" className="hover:text-binance-gold transition-colors">FAQ</a></li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-white font-semibold mb-4">Company</h4>
                    <ul className="space-y-2 text-gray-400 text-sm">
                      <li><a href="#" className="hover:text-binance-gold transition-colors">About Us</a></li>
                      <li><a href="#" className="hover:text-binance-gold transition-colors">Terms of Service</a></li>
                      <li><a href="#" className="hover:text-binance-gold transition-colors">Privacy Policy</a></li>
                      <li><a href="#" className="hover:text-binance-gold transition-colors">Contact</a></li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-white font-semibold mb-4">Connect</h4>
                    <ul className="space-y-2 text-gray-400 text-sm">
                      <li><a href="#" className="hover:text-binance-gold transition-colors">Twitter</a></li>
                      <li><a href="#" className="hover:text-binance-gold transition-colors">Telegram</a></li>
                      <li><a href="#" className="hover:text-binance-gold transition-colors">Discord</a></li>
                      <li><a href="#" className="hover:text-binance-gold transition-colors">Reddit</a></li>
                    </ul>
                  </div>
                </div>
                
                <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
                  <p>© 2025 BitSleuth. All rights reserved.</p>
                  <p className="mt-2 text-xs">
                    ⚠️ Disclaimer: Cryptocurrency mining involves risk. Past performance does not guarantee future results.
                  </p>
                </div>
              </footer>
            </>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="glass p-8 rounded-3xl">
                <h2 className="text-3xl font-bold text-center mb-6 neon-text">
                  {isLogin ? t.login : t.register}
                </h2>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-gray-300">{t.email}</Label>
                    <Input
                      id="email"
                      data-testid="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 bg-slate-900/50 border-gray-700 text-white focus:border-binance-gold"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password" className="text-gray-300">{t.password}</Label>
                    <Input
                      id="password"
                      data-testid="password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 bg-slate-900/50 border-gray-700 text-white focus:border-binance-gold"
                      required
                    />
                  </div>
                  
                  <Button
                    data-testid="auth-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-binance-gold to-yellow-600 hover:from-yellow-600 hover:to-binance-gold text-black py-3 rounded-full font-semibold"
                  >
                    {loading ? t.loading : isLogin ? t.login : t.register}
                  </Button>
                </form>
                
                <div className="mt-6 text-center">
                  <button
                    data-testid="toggle-auth-mode-btn"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-binance-gold hover:text-yellow-400 transition-colors"
                  >
                    {isLogin ? t.no_account : t.have_account}
                  </button>
                </div>
                
                <div className="mt-4 text-center">
                  <button
                    data-testid="back-to-home-btn"
                    onClick={() => setShowAuth(false)}
                    className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
                  >
                    {t.back_home}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
