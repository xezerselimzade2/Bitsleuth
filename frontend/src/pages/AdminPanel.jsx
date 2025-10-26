import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useLanguage } from "@/App";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const AdminPanel = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = useTranslation(language);
  
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, paymentsRes, usersRes, auditRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/payments`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/audit-log`)
      ]);
      
      setStats(statsRes.data);
      setPayments(paymentsRes.data.payments);
      setUsers(usersRes.data.users);
      setAuditLogs(auditRes.data.logs);
    } catch (error) {
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-binance-gold text-xl">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="glass border-b border-binance-gold/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold neon-text">{t.admin_panel}</h1>
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-to-dashboard-btn"
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="border-gray-600"
            >
              ← {t.dashboard}
            </Button>
            <Button
              data-testid="admin-logout-btn"
              onClick={onLogout}
              variant="outline"
              className="border-gray-600"
            >
              {t.logout}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="glass p-4">
            <p className="text-gray-400 text-sm">{t.total_users}</p>
            <p className="text-2xl font-bold text-binance-gold">{stats?.total_users || 0}</p>
          </Card>
          <Card className="glass p-4">
            <p className="text-gray-400 text-sm">{t.premium_users}</p>
            <p className="text-2xl font-bold text-yellow-400">{stats?.premium_users || 0}</p>
          </Card>
          <Card className="glass p-4">
            <p className="text-gray-400 text-sm">{t.total_payments}</p>
            <p className="text-2xl font-bold text-binance-green">{stats?.total_payments || 0}</p>
          </Card>
          <Card className="glass p-4">
            <p className="text-gray-400 text-sm">{t.confirmed}</p>
            <p className="text-2xl font-bold text-binance-green">{stats?.confirmed_payments || 0}</p>
          </Card>
          <Card className="glass p-4">
            <p className="text-gray-400 text-sm">{t.pending}</p>
            <p className="text-2xl font-bold text-orange-400">{stats?.pending_payments || 0}</p>
          </Card>
        </div>

        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="glass border border-binance-gold/20">
            <TabsTrigger value="payments" data-testid="payments-tab">{t.payments}</TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">{t.users}</TabsTrigger>
            <TabsTrigger value="audit" data-testid="audit-tab">{t.audit_log}</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" data-testid="payments-content">
            <Card className="glass p-6">
              <h2 className="text-xl font-bold mb-4 text-binance-gold">{t.payments}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 text-gray-400">{t.user_id}</th>
                      <th className="text-left py-2 text-gray-400">{t.amount}</th>
                      <th className="text-left py-2 text-gray-400">{t.status}</th>
                      <th className="text-left py-2 text-gray-400">Conf</th>
                      <th className="text-left py-2 text-gray-400">TX Hash</th>
                      <th className="text-left py-2 text-gray-400">{t.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-slate-800">
                        <td className="py-2 text-gray-300">{payment.user_id.slice(0, 8)}</td>
                        <td className="py-2 text-binance-green">{payment.amount} {payment.currency}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            payment.status === 'confirmed' ? 'bg-binance-green/20 text-binance-green' :
                            payment.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-binance-red/20 text-binance-red'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-2 text-binance-gold">{payment.confirmations || 0}/3</td>
                        <td className="py-2">
                          {payment.tx_hash ? (
                            <code className="text-xs text-gray-400">{payment.tx_hash.slice(0, 12)}...</code>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="py-2 text-gray-400">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users" data-testid="users-content">
            <Card className="glass p-6">
              <h2 className="text-xl font-bold mb-4 text-binance-gold">{t.users}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 text-gray-400">Email</th>
                      <th className="text-left py-2 text-gray-400">{t.verification}</th>
                      <th className="text-left py-2 text-gray-400">Premium</th>
                      <th className="text-left py-2 text-gray-400">{t.expiry_date}</th>
                      <th className="text-left py-2 text-gray-400">{t.reg_date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-800">
                        <td className="py-2 text-gray-300">{u.email}</td>
                        <td className="py-2">
                          {u.email_verified ? (
                            <span className="text-binance-green">✓</span>
                          ) : (
                            <span className="text-orange-400">✗</span>
                          )}
                        </td>
                        <td className="py-2">
                          {u.is_premium ? (
                            <span className="text-binance-gold">⚡</span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="py-2 text-gray-400">
                          {u.access_until ? new Date(u.access_until).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-2 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="audit" data-testid="audit-content">
            <Card className="glass p-6">
              <h2 className="text-xl font-bold mb-4 text-binance-gold">{t.audit_log}</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="glass p-3 rounded border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-binance-gold font-medium">{log.action}</p>
                        <p className="text-gray-400 text-sm">{t.actor}: {log.actor}</p>
                        {Object.keys(log.details).length > 0 && (
                          <pre className="text-xs text-gray-500 mt-1">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      <span className="text-gray-500 text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
