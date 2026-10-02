import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import ApiDetailPage from './pages/ApiDetailPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ApiModal from './components/ApiModal';
import { monitorService } from './services/api';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const { user, loading, isAdmin } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'detail', 'admin'
  const [selectedApiId, setSelectedApiId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState(null);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    return authView === 'login' ? (
      <LoginPage onNavigateToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onNavigateToLogin={() => setAuthView('login')} />
    );
  }

  // Handlers
  const handleOpenAddModal = () => {
    setEditingApi(null);
    setIsModalOpen(true);
  };

  const handleEditApi = (api) => {
    setEditingApi(api);
    setIsModalOpen(true);
  };

  const handleSaveApi = async (formData) => {
    if (editingApi) {
      await monitorService.updateMonitor(editingApi.id, formData);
    } else {
      await monitorService.createMonitor(formData);
    }
  };

  const handleSelectApi = (api) => {
    setSelectedApiId(api.id);
    setCurrentView('detail');
  };

  return (
    <div className="app-container">
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          if (view !== 'detail') setSelectedApiId(null);
        }}
        onOpenAddModal={handleOpenAddModal}
      />

      <main className="main-content">
        {currentView === 'dashboard' && (
          <DashboardPage
            onSelectApi={handleSelectApi}
            onOpenAddModal={handleOpenAddModal}
            onEditApi={handleEditApi}
          />
        )}

        {currentView === 'detail' && selectedApiId && (
          <ApiDetailPage
            apiId={selectedApiId}
            onBack={() => {
              setCurrentView('dashboard');
              setSelectedApiId(null);
            }}
            onEditApi={handleEditApi}
          />
        )}

        {currentView === 'admin' && isAdmin && <AdminPage />}
      </main>

      {/* Register / Edit API Modal */}
      <ApiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveApi}
        editingApi={editingApi}
      />
    </div>
  );
}
