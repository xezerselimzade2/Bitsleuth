import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Geçersiz doğrulama linki");
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      await axios.post(`${API}/auth/verify-email`, { token });
      setStatus("success");
      setMessage("E-posta başarıyla doğrulandı!");
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.detail || "Doğrulama başarısız");
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="glass max-w-md w-full p-8 rounded-3xl text-center">
        {status === "verifying" && (
          <>
            <div className="text-cyan-400 text-4xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold mb-2 neon-text">Doğrulanıyor...</h2>
            <p className="text-slate-400">Lütfen bekleyin</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-green-400 text-4xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-2 neon-text-green">Başarılı!</h2>
            <p className="text-slate-300 mb-6">{message}</p>
            <Button
              data-testid="go-to-login-btn"
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              Giriş Yapmaya Git
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-400 text-4xl mb-4">✗</div>
            <h2 className="text-2xl font-bold mb-2 text-red-400">Hata</h2>
            <p className="text-slate-300 mb-6">{message}</p>
            <Button
              data-testid="back-home-btn"
              onClick={() => navigate("/")}
              variant="outline"
              className="border-slate-600"
            >
              Ana Sayfaya Dön
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
