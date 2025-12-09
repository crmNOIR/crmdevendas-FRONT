"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Funnel, Stage, Lead, Collaborator } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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

export default function FunnelDashboardPage() {
    const params = useParams();
    const funnelId = params.id as string;

    const [funnel, setFunnel] = useState<Funnel | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
    const [stageLeadCounts, setStageLeadCounts] = useState<StageLeadCount[]>([]);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [showAddCollaborator, setShowAddCollaborator] = useState(false);
    const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
    const [newCollaboratorPermission, setNewCollaboratorPermission] = useState<'VIEW' | 'EDIT' | 'DELETE'>('VIEW');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userPermission, setUserPermission] = useState<'OWNER' | 'VIEW' | 'EDIT' | 'DELETE' | null>(null);
    const canManageCollaborators = userPermission === 'OWNER' || userPermission === 'DELETE';

    const loadUserPermission = async () => {
        try {
            const permission = await api.getCurrentUserPermission(funnelId);
            setUserPermission(permission);
        } catch (err: any) {
            console.error('Erro ao carregar permissão do usuário:', err);
            setUserPermission(null);
        }
    };

    useEffect(() => {
        if (funnelId) {
            loadFunnelData();
        }
    }, [funnelId]);

    const loadFunnelData = async () => {
        try {
            setLoading(true);
            const [funnelData, leadsData] = await Promise.all([
                api.getFunnel(funnelId),
                api.getLeads(funnelId)
            ]);

            setFunnel(funnelData);
            setLeads(leadsData);

            // Calculate metrics
            const totalLeads = leadsData.length;
            const activeLeads = leadsData.filter(lead => lead.stageId !== funnelData.stages[funnelData.stages.length - 1]?.id).length;
            const conversionRate = totalLeads > 0 ? (leadsData.filter(lead => lead.stageId === funnelData.stages[funnelData.stages.length - 1]?.id).length / totalLeads) : 0;

            setMetrics({
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

        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados do funil');
        } finally {
            setLoading(false);
        }
    };

    const loadCollaborators = async () => {
        try {
            const collaboratorsData = await api.getCollaborators(funnelId);
            setCollaborators(collaboratorsData);
        } catch (err: any) {
            console.error('Erro ao carregar colaboradores:', err);
        }
    };

    const handleAddCollaborator = async () => {
        try {
            await api.addCollaborator(funnelId, newCollaboratorEmail, newCollaboratorPermission);
            setNewCollaboratorEmail('');
            setNewCollaboratorPermission('VIEW');
            setShowAddCollaborator(false);
            await loadCollaborators();
        } catch (err: any) {
            alert('Erro ao adicionar colaborador: ' + err.message);
        }
    };

    const handleRemoveCollaborator = async (collaboratorId: string) => {
        if (confirm('Tem certeza que deseja remover este colaborador?')) {
            try {
                await api.removeCollaborator(funnelId, collaboratorId);
                await loadCollaborators();
            } catch (err: any) {
                alert('Erro ao remover colaborador: ' + err.message);
            }
        }
    };

    const handleUpdatePermission = async (collaboratorId: string, permission: 'VIEW' | 'EDIT' | 'DELETE') => {
        try {
            await api.updateCollaboratorPermission(funnelId, collaboratorId, permission);
            await loadCollaborators();
        } catch (err: any) {
            alert('Erro ao atualizar permissão: ' + err.message);
        }
    };

    useEffect(() => {
        if (funnelId) {
            loadFunnelData();
            loadCollaborators();
            loadUserPermission();
        }
    }, [funnelId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Carregando dashboard do funil...</div>
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

    if (!funnel) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Funil não encontrado</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/funnels"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                >
                    ← Voltar para Funis
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">{funnel.name}</h1>
            </div>

            {funnel.description && (
                <p className="text-gray-600">{funnel.description}</p>
            )}

            {/* Funnel Metrics */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-700">Total de Leads</h3>
                        <p className="text-3xl font-bold text-blue-600">{metrics.totalLeads}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-700">Taxa de Conversão</h3>
                        <p className="text-3xl font-bold text-green-600">{(metrics.conversionRate * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-700">Leads Ativos</h3>
                        <p className="text-3xl font-bold text-purple-600">{metrics.activeLeads}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-700">Estágios</h3>
                        <p className="text-3xl font-bold text-orange-600">{metrics.stagesCount}</p>
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
                <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Fluxo do Funil</h2>
                    <div className="space-y-4">
                        {funnel.stages.map((stage, index) => {
                            const stageLeads = leads.filter(lead => lead.stageId === stage.id).length;
                            const conversionFromPrevious = index === 0 ? 100 :
                                leads.length > 0 ? (stageLeads / leads.length) * 100 : 0;

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
            </div>

            {/* Recent Leads */}
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
                            {leads.slice(0, 10).map((lead) => {
                                const currentStage = funnel.stages.find(s => s.id === lead.stageId);
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
                                                        {funnel.leadFields.find(f => f.id === data.fieldId)?.name}: {data.value}
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

            {/* Collaborators Section */}
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
        </div>
    );
}
