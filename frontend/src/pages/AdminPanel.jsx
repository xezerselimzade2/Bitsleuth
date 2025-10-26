import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const AdminPanel = ({ user, onLogout }) => {
  const navigate = useNavigate();
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
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="glass border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold neon-text">Admin Panel</h1>
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-to-dashboard-btn"
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="border-slate-600"
            >
              ← Dashboard
            </Button>
            <Button
              data-testid="admin-logout-btn"
              onClick={onLogout}
              variant="outline"
              className="border-slate-600"
            >
              Çıkış
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="glass p-4">
            <p className="text-slate-400 text-sm">Toplam Kullanıcı</p>
            <p className="text-2xl font-bold text-cyan-400">{stats?.total_users || 0}</p>
          </Card>
          <Card className="glass p-4">
            <p className="text-slate-400 text-sm">Premium Kullanıcı</p>
            <p className="text-2xl font-bold text-yellow-400">{stats?.premium_users || 0}</p>
          </Card>
          <Card className="glass p-4">
            <p className="text-slate-400 text-sm">Toplam Ödeme</p>
            <p className="text-2xl font-bold text-green-400">{stats?.total_payments || 0}</p>
          </Card>
          <Card className="glass p-4">
            <p className="text-slate-400 text-sm">Onaylanmış</p>
            <p className="text-2xl font-bold text-green-400">{stats?.confirmed_payments || 0}</p>
          </Card>
          <Card className="glass p-4">
            <p className="text-slate-400 text-sm">Beklemede</p>
            <p className="text-2xl font-bold text-orange-400">{stats?.pending_payments || 0}</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="glass border border-cyan-500/20">
            <TabsTrigger value="payments" data-testid="payments-tab">Ödemeler</TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">Kullanıcılar</TabsTrigger>
            <TabsTrigger value="audit" data-testid="audit-tab">Denetim Kayıtları</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" data-testid="payments-content">
            <Card className="glass p-6">
              <h2 className="text-xl font-bold mb-4 text-cyan-300">Ödemeler</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 text-slate-400">Kullanıcı ID</th>
                      <th className="text-left py-2 text-slate-400">Miktar</th>
                      <th className="text-left py-2 text-slate-400">Durum</th>
                      <th className="text-left py-2 text-slate-400">Onay</th>
                      <th className="text-left py-2 text-slate-400">TX Hash</th>
                      <th className="text-left py-2 text-slate-400">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-slate-800">
                        <td className="py-2 text-slate-300">{payment.user_id.slice(0, 8)}</td>
                        <td className="py-2 text-green-400">{payment.amount} {payment.currency}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            payment.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            payment.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-2 text-cyan-400">{payment.confirmations || 0}/3</td>
                        <td className="py-2">
                          {payment.tx_hash ? (
                            <code className="text-xs text-slate-400">{payment.tx_hash.slice(0, 12)}...</code>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2 text-slate-400">
                          {new Date(payment.created_at).toLocaleDateString('tr-TR')}
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
              <h2 className="text-xl font-bold mb-4 text-cyan-300">Kullanıcılar</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 text-slate-400">E-posta</th>
                      <th className="text-left py-2 text-slate-400">Doğrulama</th>
                      <th className="text-left py-2 text-slate-400">Premium</th>
                      <th className="text-left py-2 text-slate-400">Bitiş Tarihi</th>
                      <th className="text-left py-2 text-slate-400">Kayıt Tarihi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-800">
                        <td className="py-2 text-slate-300">{u.email}</td>
                        <td className="py-2">
                          {u.email_verified ? (
                            <span className="text-green-400">✓</span>
                          ) : (
                            <span className="text-orange-400">✗</span>
                          )}
                        </td>
                        <td className="py-2">
                          {u.is_premium ? (
                            <span className="text-yellow-400">⚡</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2 text-slate-400">
                          {u.access_until ? new Date(u.access_until).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td className="py-2 text-slate-400">
                          {new Date(u.created_at).toLocaleDateString('tr-TR')}
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
              <h2 className="text-xl font-bold mb-4 text-cyan-300">Denetim Kayıtları</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="glass p-3 rounded border border-slate-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-cyan-400 font-medium">{log.action}</p>
                        <p className="text-slate-400 text-sm">Actor: {log.actor}</p>
                        {Object.keys(log.details).length > 0 && (
                          <pre className="text-xs text-slate-500 mt-1">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      <span className="text-slate-500 text-xs">
                        {new Date(log.created_at).toLocaleString('tr-TR')}
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
