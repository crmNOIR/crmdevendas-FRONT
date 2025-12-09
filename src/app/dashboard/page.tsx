"use client";

import { useEffect, useState } from 'react';
import { api, DashboardMetrics, LeadCountByStage, FunnelPerformance, LeadCreationOverTime, Funnel, Lead, Collaborator } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

interface ChartConfig {
    dataSource: 'leadsByStage' | 'funnelPerformance' | 'leadCreation';
    title: string;
    colors: string[];
    height: number;
    timePeriod?: number; // for lead creation chart
}

interface FunnelMetrics {
    totalLeads: number;
    conversionRate: number;
    activeLeads: number;
    stagesCount: number;
}

interface StageLeadCount {
    stageId: string;
    stageName: string;
    color: string;
    leadCount: number;
}

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [leadCountsByStage, setLeadCountsByStage] = useState<LeadCountByStage[]>([]);
    const [funnelPerformance, setFunnelPerformance] = useState<FunnelPerformance[]>([]);
    const [leadCreationOverTime, setLeadCreationOverTime] = useState<LeadCreationOverTime[]>([]);
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Funnel-specific states
    const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
    const [funnelLeads, setFunnelLeads] = useState<Lead[]>([]);
    const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetrics | null>(null);
    const [stageLeadCounts, setStageLeadCounts] = useState<StageLeadCount[]>([]);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [showAddCollaborator, setShowAddCollaborator] = useState(false);
    const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
    const [newCollaboratorPermission, setNewCollaboratorPermission] = useState<'VIEW' | 'EDIT' | 'DELETE'>('VIEW');
    const [userPermission, setUserPermission] = useState<'OWNER' | 'VIEW' | 'EDIT' | 'DELETE' | null>(null);
    const canManageCollaborators = userPermission === 'OWNER' || userPermission === 'DELETE';

    // Chart configurations
    const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([
        {
            dataSource: 'leadsByStage',
            title: 'Leads por Estágio',
            colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
            height: 300
        },
        {
            dataSource: 'funnelPerformance',
            title: 'Distribuição de Leads por Estágio',
            colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
            height: 300
        },
        {
            dataSource: 'leadCreation',
            title: 'Criação de Leads ao Longo do Tempo',
            colors: ['#3B82F6'],
            height: 300,
            timePeriod: 30
        }
    ]);

    useEffect(() => {
        loadFunnels();
    }, []);

    useEffect(() => {
        if (funnels.length > 0) {
            if (!selectedFunnelId) {
                setSelectedFunnelId(funnels[0].id);
            } else {
                loadDashboardData();
            }
        }
    }, [funnels, selectedFunnelId]);

    const loadFunnels = async () => {
        try {
            const funnelsData = await api.getFunnels();
            setFunnels(funnelsData);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar funis');
        }
    };

    const loadDashboardData = async () => {
        if (!selectedFunnelId) return;

        try {
            setLoading(true);
            const [metricsData, leadCounts, funnelPerf, leadCreation, funnelData, leadsData] = await Promise.all([
                api.getDashboardMetrics(),
                api.getLeadCountsByStage(selectedFunnelId),
                api.getFunnelPerformance(),
                api.getFunnelLeadCreationOverTime(selectedFunnelId, 30),
                api.getFunnel(selectedFunnelId),
                api.getLeads(selectedFunnelId)
            ]);

            setMetrics(metricsData);
            setLeadCountsByStage(leadCounts);
            setFunnelPerformance(funnelPerf);
            setLeadCreationOverTime(leadCreation);
            setSelectedFunnel(funnelData);
            setFunnelLeads(leadsData);

            // Calculate funnel metrics
            const totalLeads = leadsData.length;
            const activeLeads = leadsData.filter(lead => lead.stageId !== funnelData.stages[funnelData.stages.length - 1]?.id).length;
            const conversionRate = totalLeads > 0 ? (leadsData.filter(lead => lead.stageId === funnelData.stages[funnelData.stages.length - 1]?.id).length / totalLeads) : 0;

            setFunnelMetrics({
                totalLeads,
                conversionRate,
                activeLeads,
                stagesCount: funnelData.stages.length
            });

            // Calculate leads per stage
            const stageCounts = funnelData.stages.map(stage => {
                const leadCount = leadsData.filter(lead => lead.stageId === stage.id).length;
                return {
                    stageId: stage.id,
                    stageName: stage.name,
                    color: stage.color,
                    leadCount
                };
            });
            setStageLeadCounts(stageCounts);

            // Load collaborators and permissions
            await loadCollaborators();
            await loadUserPermission();
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados do dashboard');
        } finally {
            setLoading(false);
        }
    };

    const loadCollaborators = async () => {
        if (!selectedFunnelId) return;
        try {
            const collaboratorsData = await api.getCollaborators(selectedFunnelId);
            setCollaborators(collaboratorsData);
        } catch (err: any) {
            console.error('Erro ao carregar colaboradores:', err);
        }
    };

    const loadUserPermission = async () => {
        if (!selectedFunnelId) return;
        try {
            const permission = await api.getCurrentUserPermission(selectedFunnelId);
            setUserPermission(permission);
        } catch (err: any) {
            console.error('Erro ao carregar permissão do usuário:', err);
            setUserPermission(null);
        }
    };

    const handleAddCollaborator = async () => {
        if (!selectedFunnelId) return;
        try {
            await api.addCollaborator(selectedFunnelId, newCollaboratorEmail, newCollaboratorPermission);
            setNewCollaboratorEmail('');
            setNewCollaboratorPermission('VIEW');
            setShowAddCollaborator(false);
            await loadCollaborators();
        } catch (err: any) {
            alert('Erro ao adicionar colaborador: ' + err.message);
        }
    };

    const handleRemoveCollaborator = async (collaboratorId: string) => {
        if (!selectedFunnelId) return;
        if (confirm('Tem certeza que deseja remover este colaborador?')) {
            try {
                await api.removeCollaborator(selectedFunnelId, collaboratorId);
                await loadCollaborators();
            } catch (err: any) {
                alert('Erro ao remover colaborador: ' + err.message);
            }
        }
    };

    const handleUpdatePermission = async (collaboratorId: string, permission: 'VIEW' | 'EDIT' | 'DELETE') => {
        if (!selectedFunnelId) return;
        try {
            await api.updateCollaboratorPermission(selectedFunnelId, collaboratorId, permission);
            await loadCollaborators();
        } catch (err: any) {
            alert('Erro ao atualizar permissão: ' + err.message);
        }
    };

    const loadLeadCreationData = async (days: number) => {
        if (!selectedFunnelId) return;

        try {
            const leadCreation = await api.getFunnelLeadCreationOverTime(selectedFunnelId, days);
            setLeadCreationOverTime(leadCreation);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados de criação de leads');
        }
    };

    const updateChartConfig = (index: number, updates: Partial<ChartConfig>) => {
        setChartConfigs(prev => prev.map((config, i) =>
            i === index ? { ...config, ...updates } : config
        ));

        // Reload data if timePeriod changed for lead creation chart
        if (updates.timePeriod && updates.timePeriod !== chartConfigs[index]?.timePeriod) {
            loadLeadCreationData(updates.timePeriod);
        }
    };

    const renderChart = (config: ChartConfig, index: number) => {
        const commonProps = {
            margin: { top: 20, right: 30, left: 20, bottom: 5 }
        };

        switch (config.dataSource) {
            case 'leadsByStage':
                const barData = leadCountsByStage.map((item, idx) => ({
                    name: item.stageName,
                    value: item.leadCount
                }));
                return (
                    <ResponsiveContainer width="100%" height={config.height}>
                        <BarChart data={barData} {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#3B82F6" />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'funnelPerformance':
                // Show stages of the selected funnel
                const selectedFunnel = funnelPerformance.find(f => f.funnelId === selectedFunnelId);
                const pieData = selectedFunnel ? selectedFunnel.stages.map((stage, idx) => ({
                    name: stage.stageName,
                    value: stage.leadCount
                })) : [];
                return (
                    <ResponsiveContainer width="100%" height={config.height}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case 'leadCreation':
                const lineData = leadCreationOverTime.map(item => ({
                    name: item.date,
                    value: item.count
                }));
                return (
                    <ResponsiveContainer width="100%" height={config.height}>
                        <LineChart data={lineData} {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                );

            default:
                return <div>Tipo de gráfico não suportado</div>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Carregando dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-500 text-lg">Erro: {error}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

                {/* Funnel Selector */}
                <div className="flex items-center space-x-4">
                    <label htmlFor="funnel-select" className="text-sm font-medium text-gray-700">
                        Selecionar Funil:
                    </label>
                    <select
                        id="funnel-select"
                        value={selectedFunnelId}
                        onChange={(e) => setSelectedFunnelId(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {funnels.map((funnel) => (
                            <option key={funnel.id} value={funnel.id}>
                                {funnel.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Metrics Cards */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-700">Total de Funis</h3>
                        <p className="text-3xl font-bold text-blue-600">{metrics.totalFunnels}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-700">Contagem de Leads</h3>
                        <p className="text-3xl font-bold text-green-600">{metrics.totalLeads}</p>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leads by Stage */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Leads por Estágio</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stageLeadCounts} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="stageName" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="leadCount" fill="#3B82F6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Stage Distribution Pie Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Distribuição por Estágio</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={stageLeadCounts}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ stageName, percent }) => `${stageName} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="leadCount"
                            >
                                {stageLeadCounts.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Funnel Flow Visualization */}
                {selectedFunnel && (
                    <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Fluxo do Funil</h2>
                        <div className="space-y-4">
                            {selectedFunnel.stages.map((stage, index) => {
                                const stageLeads = funnelLeads.filter(lead => lead.stageId === stage.id).length;
                                const conversionFromPrevious = index === 0 ? 100 :
                                    funnelLeads.length > 0 ? (stageLeads / funnelLeads.length) * 100 : 0;

                                return (
                                    <div key={stage.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                        <div
                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: stage.color }}
                                        ></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">{stage.name}</span>
                                                <span className="text-sm text-gray-600">{stageLeads} leads</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                                <div
                                                    className="h-2 rounded-full"
                                                    style={{
                                                        width: `${conversionFromPrevious}%`,
                                                        backgroundColor: stage.color
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {conversionFromPrevious.toFixed(1)}% do total
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Leads */}
            {selectedFunnel && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Leads Recentes</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estágio Atual
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Dados do Lead
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Criado em
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {funnelLeads.slice(0, 10).map((lead) => {
                                    const currentStage = selectedFunnel.stages.find(s => s.id === lead.stageId);
                                    return (
                                        <tr key={lead.id}>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div
                                                        className="w-3 h-3 rounded-full mr-2"
                                                        style={{ backgroundColor: currentStage?.color }}
                                                    ></div>
                                                    {currentStage?.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {lead.data.map((data, idx) => (
                                                        <span key={idx}>
                                                            {selectedFunnel.leadFields.find(f => f.id === data.fieldId)?.name}: {data.value}
                                                            {idx < lead.data.length - 1 ? ', ' : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                {new Date().toLocaleDateString()} {/* Placeholder - would need createdAt from API */}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Collaborators Section */}
            {selectedFunnel && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Colaboradores</h2>
                        {canManageCollaborators && (
                            <button
                                onClick={() => setShowAddCollaborator(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Adicionar Colaborador
                            </button>
                        )}
                    </div>

                    {showAddCollaborator && (
                        <div className="mb-4 p-4 border rounded bg-gray-50">
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email do Usuário
                                    </label>
                                    <input
                                        type="email"
                                        value={newCollaboratorEmail}
                                        onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Permissão
                                    </label>
                                    <select
                                        value={newCollaboratorPermission}
                                        onChange={(e) => setNewCollaboratorPermission(e.target.value as 'VIEW' | 'EDIT' | 'DELETE')}
                                        className="px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="VIEW">Visualizar</option>
                                        <option value="EDIT">Editar</option>
                                        <option value="DELETE">Excluir</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleAddCollaborator}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                >
                                    Adicionar
                                </button>
                                <button
                                    onClick={() => setShowAddCollaborator(false)}
                                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Usuário
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Permissão
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {collaborators.map((collaborator) => (
                                    <tr key={collaborator.id}>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {collaborator.user.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {collaborator.user.email}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {canManageCollaborators ? (
                                                <select
                                                    value={collaborator.permission}
                                                    onChange={(e) => handleUpdatePermission(collaborator.id, e.target.value as 'VIEW' | 'EDIT' | 'DELETE')}
                                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                                >
                                                    <option value="VIEW">Visualizar</option>
                                                    <option value="EDIT">Editar</option>
                                                    <option value="DELETE">Excluir</option>
                                                </select>
                                            ) : (
                                                <span className="text-sm text-gray-500">
                                                    {collaborator.permission === 'VIEW' ? 'Visualizar' :
                                                     collaborator.permission === 'EDIT' ? 'Editar' : 'Excluir'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {canManageCollaborators && (
                                                <button
                                                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                                                    className="text-red-600 hover:text-red-900 text-sm"
                                                >
                                                    Remover
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {collaborators.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Nenhum colaborador adicionado ainda.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
