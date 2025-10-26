import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { useLanguage } from "@/App";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = useTranslation(language);
  
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      await axios.post(`${API}/auth/verify-email`, { token });
      setStatus("success");
      setMessage("Email verified successfully!");
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.detail || "Verification failed");
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="glass max-w-md w-full p-8 rounded-3xl text-center">
        {status === "verifying" && (
          <>
            <div className="text-binance-gold text-4xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold mb-2 neon-text">Verifying...</h2>
            <p className="text-gray-400">Please wait</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-binance-green text-4xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-2 neon-text-green">Success!</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <Button
              data-testid="go-to-login-btn"
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-binance-gold to-yellow-600 hover:from-yellow-600 hover:to-binance-gold text-black"
            >
              {t.login}
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-binance-red text-4xl mb-4">✗</div>
            <h2 className="text-2xl font-bold mb-2 text-binance-red">Error</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <Button
              data-testid="back-home-btn"
              onClick={() => navigate("/")}
              variant="outline"
              className="border-gray-600"
            >
              {t.back_home}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
