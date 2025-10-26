import { useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LandingPage = ({ onLogin }) => {
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
        toast.success("Giriş başarılı!");
      } else {
        toast.success("Kayıt başarılı! Lütfen e-postanızı doğrulayın.");
        setIsLogin(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
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
            // Hero section
            <div className="text-center space-y-8">
              <div className="inline-block mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full" />
                  <h1 className="relative text-7xl sm:text-8xl lg:text-9xl font-bold neon-text mb-4">
                    BitSleuth
                  </h1>
                </div>
              </div>
              
              <p className="text-xl sm:text-2xl lg:text-3xl text-cyan-300 font-light max-w-3xl mx-auto">
                En hızlı kripto cüzdan tarama sistemi
              </p>
              
              <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
                Gelişmiş algoritmalar ile Tron blockchain'de fonlu cüzdanları keşfedin.
                Premium mod ile 10x daha hızlı tarama yapın.
              </p>

              <div className="flex flex-wrap gap-4 justify-center mt-12">
                <Button
                  data-testid="get-started-btn"
                  onClick={() => setShowAuth(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-full font-semibold shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
                >
                  Başlayın
                </Button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
                <div className="glass p-6 rounded-2xl hover:border-cyan-500/50 transition-all duration-300">
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="text-xl font-semibold mb-2 text-cyan-300">Yüksek Hız</h3>
                  <p className="text-slate-400">Premium modda saniyede binlerce adres taraması</p>
                </div>
                
                <div className="glass p-6 rounded-2xl hover:border-cyan-500/50 transition-all duration-300">
                  <div className="text-4xl mb-4">🔐</div>
                  <h3 className="text-xl font-semibold mb-2 text-cyan-300">Güvenli</h3>
                  <p className="text-slate-400">Private key'ler hiçbir zaman sunucuya gönderilmez</p>
                </div>
                
                <div className="glass p-6 rounded-2xl hover:border-cyan-500/50 transition-all duration-300">
                  <div className="text-4xl mb-4">💎</div>
                  <h3 className="text-xl font-semibold mb-2 text-cyan-300">Karlı</h3>
                  <p className="text-slate-400">Fonlu cüzdanları bulun ve kazanın</p>
                </div>
              </div>
            </div>
          ) : (
            // Auth form
            <div className="max-w-md mx-auto">
              <div className="glass p-8 rounded-3xl">
                <h2 className="text-3xl font-bold text-center mb-6 neon-text">
                  {isLogin ? "Giriş Yap" : "Kayıt Ol"}
                </h2>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-slate-300">E-posta</Label>
                    <Input
                      id="email"
                      data-testid="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 bg-slate-900/50 border-slate-700 text-white focus:border-cyan-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password" className="text-slate-300">Şifre</Label>
                    <Input
                      id="password"
                      data-testid="password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 bg-slate-900/50 border-slate-700 text-white focus:border-cyan-500"
                      required
                    />
                  </div>
                  
                  <Button
                    data-testid="auth-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3 rounded-full font-semibold"
                  >
                    {loading ? "Yükleniyor..." : isLogin ? "Giriş Yap" : "Kayıt Ol"}
                  </Button>
                </form>
                
                <div className="mt-6 text-center">
                  <button
                    data-testid="toggle-auth-mode-btn"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {isLogin ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
                  </button>
                </div>
                
                <div className="mt-4 text-center">
                  <button
                    data-testid="back-to-home-btn"
                    onClick={() => setShowAuth(false)}
                    className="text-slate-400 hover:text-slate-300 transition-colors text-sm"
                  >
                    ← Ana sayfaya dön
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
