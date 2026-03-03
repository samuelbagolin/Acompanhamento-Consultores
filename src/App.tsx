import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Plus, 
  ChevronRight, 
  Calendar, 
  Filter,
  Trash2,
  Edit2,
  Image as ImageIcon,
  TrendingDown,
  TrendingUp,
  X,
  Settings,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { domToPng } from 'modern-screenshot';
import { Month, Sector, Employee, Indicator, PerformanceValue, DashboardData } from './types';

const formatValue = (val: number, type: Indicator['type']) => {
  if (type === 'CURRENCY') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }
  if (type === 'PERCENT') {
    return `${(val * 100).toFixed(0)}%`;
  }
  return val.toString();
};

export default function App() {
  const [months, setMonths] = useState<Month[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null);
  const [activeSectorId, setActiveSectorId] = useState<number | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const dashboardRef = React.useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Modals
  const [showNewMonthModal, setShowNewMonthModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState<{show: boolean, emp?: Employee}>({show: false});
  const [showIndicatorModal, setShowIndicatorModal] = useState<{show: boolean, ind?: Indicator}>({show: false});
  const [showSectorLogoModal, setShowSectorLogoModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, title: string, onConfirm: () => void}>({show: false, title: '', onConfirm: () => {}});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [monthsRes, sectorsRes] = await Promise.all([
        fetch('/api/months'),
        fetch('/api/sectors')
      ]);
      const monthsData = await monthsRes.json();
      const sectorsData = await sectorsRes.json();
      
      setMonths(monthsData);
      setSectors(sectorsData);
      
      if (monthsData.length > 0) setSelectedMonthId(monthsData[0].id);
      if (sectorsData.length > 0) setActiveSectorId(sectorsData.find((s: Sector) => s.name === 'Onboarding')?.id || sectorsData[0].id);
    } catch (err) {
      console.error("Error fetching initial data", err);
    }
  };

  useEffect(() => {
    if (selectedMonthId && activeSectorId) {
      fetchDashboardData();
    }
  }, [selectedMonthId, activeSectorId]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/${selectedMonthId}/${activeSectorId}`);
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateValue = async (indicatorId: number, employeeId: number, value: number) => {
    try {
      await fetch('/api/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicator_id: indicatorId, employee_id: employeeId, value })
      });
      setDashboardData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          values: prev.values.map(v => 
            v.indicator_id === indicatorId && v.employee_id === employeeId ? { ...v, value } : v
          )
        };
      });
    } catch (err) {
      console.error("Error updating value", err);
    }
  };

  const handleCreateMonth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const copyFromId = formData.get('copyFromId') ? Number(formData.get('copyFromId')) : null;

    try {
      const res = await fetch('/api/months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, copyFromId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      await fetchInitialData();
      setSelectedMonthId(data.id);
      setShowNewMonthModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      id: showEmployeeModal.emp?.id,
      month_id: selectedMonthId,
      sector_id: activeSectorId,
      name: formData.get('name'),
      image_url: formData.get('image_url'),
      goal: formData.get('goal')
    };

    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    fetchDashboardData();
    setShowEmployeeModal({show: false});
  };

  const handleSaveIndicator = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      id: showIndicatorModal.ind?.id,
      month_id: selectedMonthId,
      sector_id: activeSectorId,
      name: formData.get('name'),
      type: formData.get('type'),
      is_negative: formData.get('is_negative') === 'on'
    };

    await fetch('/api/indicators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    fetchDashboardData();
    setShowIndicatorModal({show: false});
  };

  const handleDeleteEmployee = async (id: number) => {
    setConfirmModal({
      show: true,
      title: "Deseja remover este colaborador?",
      onConfirm: async () => {
        await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        await fetchDashboardData();
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleDeleteIndicator = async (id: number) => {
    setConfirmModal({
      show: true,
      title: "Deseja remover este indicador?",
      onConfirm: async () => {
        await fetch(`/api/indicators/${id}`, { method: 'DELETE' });
        await fetchDashboardData();
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };



  const handleUpdateLogo = async (url: string) => {
    if (!activeSectorId) return;
    try {
      const res = await fetch('/api/sectors/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSectorId, logo_url: url })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update logo');
      }
      
      // Refetch sectors to update the logo in the UI
      const sectorsRes = await fetch('/api/sectors');
      if (!sectorsRes.ok) throw new Error('Failed to fetch sectors');
      const sectorsData = await sectorsRes.json();
      setSectors(sectorsData);
      fetchDashboardData();
    } catch (err: any) {
      console.error("Error updating logo", err);
      alert(`Erro ao atualizar logo: ${err.message}`);
    }
  };

  const handleDownloadImage = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    
    try {
      const dataUrl = await domToPng(dashboardRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc',
        filter: (node: any) => {
          // Hide buttons and controls in the exported image
          if (node.tagName === 'BUTTON' || node.tagName === 'SELECT') return false;
          if (node.classList?.contains('opacity-0')) return false;
          return true;
        }
      });
      
      const sanitizedMonth = activeMonth?.name.replace(/[\/\\]/g, '-') || 'month';
      const sanitizedSector = activeSector?.name.replace(/[\/\\]/g, '-') || 'sector';
      
      const link = document.createElement('a');
      link.download = `Performance-${sanitizedSector}-${sanitizedMonth}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting image:', err);
      alert('Não foi possível gerar a imagem. Tente novamente em alguns instantes.');
    } finally {
      setIsExporting(false);
    }
  };

  const activeMonth = months.find(m => m.id === selectedMonthId);
  const activeSector = sectors.find(s => s.id === activeSectorId);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-slate-900 text-white transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <LayoutDashboard size={20} />
          </div>
          {isSidebarOpen && <span className="font-display font-bold text-xl tracking-tight">SITTAX</span>}
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          <button 
            onClick={() => setActiveSectorId(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${!activeSectorId ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            {isSidebarOpen && <span>Visão Geral</span>}
          </button>
          
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isSidebarOpen ? 'Setores' : '...'}
          </div>
          
          {sectors.map(sector => (
            <button
              key={sector.id}
              onClick={() => setActiveSectorId(sector.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeSectorId === sector.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Users size={20} />
              {isSidebarOpen && <span>{sector.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 text-slate-400"
          >
            <ChevronRight className={`transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar size={18} />
              <select 
                value={selectedMonthId || ''} 
                onChange={(e) => setSelectedMonthId(Number(e.target.value))}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                {months.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => setShowNewMonthModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Novo Mês
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <Filter size={20} />
            </button>
          </div>
        </header>

        {/* Dashboard View */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50">
          {!activeSectorId ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <LayoutDashboard size={64} strokeWidth={1} className="mb-4" />
              <h2 className="text-2xl font-display font-bold text-slate-900">Visão Geral</h2>
              <p>Selecione um setor no menu lateral para ver os detalhes.</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : dashboardData ? (
            <div ref={dashboardRef} className="max-w-7xl mx-auto space-y-6">
              {/* Header Card */}
              <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: activeSector?.color }}>
                    <Users size={32} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">{activeSector?.name}</h1>
                    <p className="text-slate-500 font-medium">Performance Mensal - {activeMonth?.name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleDownloadImage}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isExporting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500" /> : <Download size={18} />}
                    Baixar Imagem
                  </button>
                  <button 
                    onClick={() => setShowEmployeeModal({show: true})}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-orange-500/20"
                  >
                    <Plus size={18} />
                    Adicionar Colaborador
                  </button>
                  <button 
                    onClick={() => setShowIndicatorModal({show: true})}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors"
                  >
                    <Settings size={18} />
                    Configurar Indicadores
                  </button>
                </div>
              </div>

              {/* Table Section */}
              <div className="flex gap-6">
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-4 text-left bg-slate-50 border-b border-slate-200 w-64">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Indicador</span>
                          </th>
                          {dashboardData.employees.map(emp => (
                            <th key={emp.id} className="p-4 bg-slate-50 border-b border-slate-200 min-w-[120px]">
                              <div className="flex flex-col items-center gap-2 group relative">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                                  <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <span className="text-sm font-bold text-slate-700">{emp.name}</span>
                                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button onClick={() => setShowEmployeeModal({show: true, emp})} className="p-1 bg-white rounded-full shadow-sm text-slate-400 hover:text-blue-500 border border-slate-100">
                                    <Edit2 size={12} />
                                  </button>
                                  <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1 bg-white rounded-full shadow-sm text-slate-400 hover:text-red-500 border border-slate-100">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </th>
                          ))}
                          <th className="p-4 bg-slate-100 border-b border-slate-200 min-w-[120px]">
                            <span className="text-sm font-bold text-slate-900">Setor</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.indicators.map(ind => {
                          const rowValues = dashboardData.values.filter(v => v.indicator_id === ind.id);
                          const total = rowValues.reduce((acc, curr) => acc + curr.value, 0);
                          const avg = rowValues.length > 0 ? total / rowValues.length : 0;
                          const displayTotal = ind.type === 'PERCENT' ? avg : total;

                          return (
                            <tr key={ind.id} className="indicator-row group">
                              <td className="p-4 border-b border-slate-100 font-medium text-slate-700 flex items-center justify-between">
                                <span>{ind.name}</span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                  <button onClick={() => setShowIndicatorModal({show: true, ind})} className="text-slate-300 hover:text-blue-500">
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteIndicator(ind.id)} className="text-slate-300 hover:text-red-500">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                              {dashboardData.employees.map(emp => {
                                const valObj = dashboardData.values.find(v => v.indicator_id === ind.id && v.employee_id === emp.id);
                                const val = valObj?.value || 0;
                                return (
                                  <td key={emp.id} className="p-4 border-b border-slate-100 text-center">
                                    <input 
                                      type="number"
                                      step={ind.type === 'PERCENT' ? '0.01' : '1'}
                                      defaultValue={ind.type === 'PERCENT' ? (val * 100) : val}
                                      onBlur={(e) => {
                                        const newVal = ind.type === 'PERCENT' ? Number(e.target.value) / 100 : Number(e.target.value);
                                        if (newVal !== val) handleUpdateValue(ind.id, emp.id, newVal);
                                      }}
                                      className={`w-full text-center font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 rounded px-1 ${ind.is_negative && val > 0 ? 'text-red-500' : 'text-slate-600'}`}
                                    />
                                  </td>
                                );
                              })}
                              <td className={`p-4 border-b border-slate-100 text-center font-bold bg-slate-50 ${ind.is_negative && displayTotal > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                {formatValue(displayTotal, ind.type)}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Meta Row */}
                        <tr className="bg-slate-50/50">
                          <td className="p-4 border-b border-slate-100 font-bold text-slate-900">Meta (Migração)</td>
                          {dashboardData.employees.map(emp => (
                            <td key={emp.id} className="p-4 border-b border-slate-100 text-center">
                              <span className="text-sm font-bold text-slate-400">{emp.goal || '-'}</span>
                            </td>
                          ))}
                          <td className="p-4 border-b border-slate-100 text-center font-bold text-slate-900">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Branding Sidebar */}
                <div className="w-80 flex flex-col gap-6">
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-5 pointer-events-none">
                      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100" stroke="currentColor" fill="transparent" strokeWidth="2" />
                      </svg>
                    </div>
                    
                    <div className="relative z-10">
                      <div 
                        className="relative group/logo cursor-pointer"
                        onClick={() => setShowSectorLogoModal(true)}
                      >
                        <div className="w-56 h-80 mb-6 bg-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 overflow-hidden relative shadow-md">
                          {activeSector?.logo_url ? (
                            <img src={activeSector.logo_url} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <ImageIcon size={64} className="text-slate-200" />
                          )}
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300">
                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30">
                              <Edit2 size={24} className="text-white" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Tooltip-like indicator */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/logo:opacity-100 transition-opacity uppercase tracking-tighter">
                          Clique para editar
                        </div>
                      </div>
                      
                      <h2 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tighter mb-2">
                        {activeSector?.name}
                      </h2>
                      <div className="w-12 h-1 bg-orange-500 mx-auto rounded-full" />
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                          <TrendingUp size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Performance</span>
                      </div>
                      <p className="text-2xl font-display font-bold text-slate-900">94.2%</p>
                      <p className="text-sm text-slate-500">Média do Setor</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                          <TrendingDown size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Perdido</span>
                      </div>
                      <p className="text-2xl font-display font-bold text-red-600">R$ 1.549,00</p>
                      <p className="text-sm text-slate-500">Total Acumulado</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showNewMonthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-slate-900">Criar Novo Mês</h3>
                <button onClick={() => setShowNewMonthModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateMonth} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Mês (ex: 04/2026)</label>
                  <input name="name" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" placeholder="MM/AAAA" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Copiar estrutura de:</label>
                  <select name="copyFromId" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none">
                    <option value="">Nenhum (Em branco)</option>
                    {months.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <p className="mt-2 text-xs text-slate-400">Isso copiará os indicadores e colaboradores, mas zerará os valores.</p>
                </div>
                <button type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all">
                  Criar Mês
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showEmployeeModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-slate-900">
                  {showEmployeeModal.emp ? 'Editar Colaborador' : 'Novo Colaborador'}
                </h3>
                <button onClick={() => setShowEmployeeModal({show: false})} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome</label>
                  <input name="name" defaultValue={showEmployeeModal.emp?.name} required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">URL da Imagem</label>
                  <input name="image_url" defaultValue={showEmployeeModal.emp?.image_url} required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Individual</label>
                  <input name="goal" defaultValue={showEmployeeModal.emp?.goal || ''} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" placeholder="Ex: 50 Migrações" />
                </div>
                <button type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all">
                  Salvar
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showIndicatorModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-slate-900">
                  {showIndicatorModal.ind ? 'Editar Indicador' : 'Novo Indicador'}
                </h3>
                <button onClick={() => setShowIndicatorModal({show: false})} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveIndicator} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Indicador</label>
                  <input name="name" defaultValue={showIndicatorModal.ind?.name} required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Dado</label>
                  <select name="type" defaultValue={showIndicatorModal.ind?.type || 'NUMBER'} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none">
                    <option value="NUMBER">Numérico</option>
                    <option value="PERCENT">Percentual</option>
                    <option value="CURRENCY">Moeda (R$)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="is_negative" defaultChecked={showIndicatorModal.ind?.is_negative} id="is_negative" className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                  <label htmlFor="is_negative" className="text-sm font-semibold text-slate-700">Indicador Negativo (Ex: Cancelamentos)</label>
                </div>
                <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all">
                  Salvar
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {showSectorLogoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-slate-900">Editar Brasão do Setor</h3>
                <button onClick={() => setShowSectorLogoModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const url = formData.get('logo_url') as string;
                  handleUpdateLogo(url);
                  setShowSectorLogoModal(false);
                }} 
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">URL da Imagem do Brasão</label>
                  <input name="logo_url" defaultValue={activeSector?.logo_url || ''} required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none" placeholder="https://exemplo.com/imagem.png" />
                </div>
                <button type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all">
                  Salvar
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {confirmModal.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Confirmar Exclusão</h3>
                <p className="text-slate-500 mb-6">{confirmModal.title}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
