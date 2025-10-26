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
      {/* Language selector - top right */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
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
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-6xl w-full">
          {!showAuth ? (
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
            </div>
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
