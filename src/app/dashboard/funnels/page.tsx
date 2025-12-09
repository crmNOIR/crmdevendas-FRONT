"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
    DndContext,
    closestCenter,
    closestCorners,
    pointerWithin,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    arrayMove,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Users,
    UserCheck,
    Target,
    FileText,
    Handshake,
    Trophy,
    XCircle,
    Plus,
    Mail,
    Phone,
    DollarSign,
    Calendar,
    Building,
    Settings,
    Trash2,
    Edit,
    UserPlus,
    ChevronDown,
    BarChart3,
    Share2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { api, Funnel, Stage, Lead, LeadField, LeadData } from "@/lib/api";

type LeadDisplay = {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    value: number;
    lastContact: string;
    notes: string;
};

const stageIcons = {
    prospect: Users,
    lead: UserCheck,
    qualified: Target,
    proposal: FileText,
    negotiation: Handshake,
    closed_won: Trophy,
    closed_lost: XCircle,
};

const stageColors = {
    prospect: "bg-blue-100 border-blue-300",
    lead: "bg-yellow-100 border-yellow-300",
    qualified: "bg-green-100 border-green-300",
    proposal: "bg-purple-100 border-purple-300",
    negotiation: "bg-orange-100 border-orange-300",
    closed_won: "bg-emerald-100 border-emerald-300",
    closed_lost: "bg-red-100 border-red-300",
};

const stageLabels = {
    prospect: "Prospect",
    lead: "Lead",
    qualified: "Qualified",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost",
}

const SortableStage = ({ stage, children, disabled }: { stage: Stage; children: React.ReactNode; disabled?: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: stage.id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: 'none', // Disable transitions to prevent flickering after drop
        opacity: isDragging ? 0.9 : 1,
        zIndex: isDragging ? 1000 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(disabled ? {} : { ...attributes, ...listeners })}
            className={`flex-1 min-w-80 select-none will-change-transform ${disabled ? 'cursor-default' : 'cursor-grab'}`}
        >
            {children}
        </div>
    );
};
const SortableLead = ({ lead, canEdit }: { lead: LeadDisplay; canEdit: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id, disabled: !canEdit });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: 'none', // Disable transitions to prevent flickering after drop
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(canEdit ? { ...attributes, ...listeners } : {})}
            className={`bg-white p-3 rounded border select-none ${canEdit ? 'cursor-grab' : 'cursor-default'}`}
        >
            <div className="font-semibold">{lead.name}</div>
            <div className="text-sm text-gray-600">{lead.company}</div>
            <div className="text-sm">{lead.email}</div>
            <div className="text-sm">{lead.phone}</div>
            <div className="text-sm font-medium">${lead.value}</div>
        </div>
    );
};
const CreateFunnelModal = ({ onCreateFunnel }: { onCreateFunnel: (funnelData: any) => void }) => {
    const [open, setOpen] = useState(false);
    const [funnelName, setFunnelName] = useState("");
    const [funnelDescription, setFunnelDescription] = useState("");
    const [leadFields, setLeadFields] = useState<LeadField[]>([
        { id: "1", name: "Name", type: "TEXT", required: true },
        { id: "2", name: "Email", type: "EMAIL", required: true },
        { id: "3", name: "Phone", type: "PHONE", required: false },
        { id: "4", name: "Company", type: "TEXT", required: false },
        { id: "5", name: "Value", type: "CURRENCY", required: false }
    ]);
    const [stages, setStages] = useState<(Omit<Stage, 'id'> & { icon: string })[]>([
        { name: "Prospect", order: 1, color: "#3B82F6", icon: "Users" },
        { name: "Lead", order: 2, color: "#F59E0B", icon: "UserCheck" },
        { name: "Qualified", order: 3, color: "#10B981", icon: "Target" },
        { name: "Proposal", order: 4, color: "#8B5CF6", icon: "FileText" },
        { name: "Negotiation", order: 5, color: "#F97316", icon: "Handshake" },
        { name: "Closed Won", order: 6, color: "#059669", icon: "Trophy" },
        { name: "Closed Lost", order: 7, color: "#DC2626", icon: "XCircle" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [iconDropdownOpen, setIconDropdownOpen] = useState<number | null>(null);

    const iconOptions = [
        { value: "Users", component: Users },
        { value: "UserCheck", component: UserCheck },
        { value: "Target", component: Target },
        { value: "FileText", component: FileText },
        { value: "Handshake", component: Handshake },
        { value: "Trophy", component: Trophy },
        { value: "XCircle", component: XCircle },
        { value: "Plus", component: Plus },
        { value: "Mail", component: Mail },
        { value: "Phone", component: Phone },
        { value: "DollarSign", component: DollarSign },
        { value: "Calendar", component: Calendar },
        { value: "Building", component: Building },
        { value: "Settings", component: Settings },
        { value: "Edit", component: Edit },
        { value: "UserPlus", component: UserPlus }
    ];

    const addField = () => {
        const newField: LeadField = {
            id: (leadFields.length + 1).toString(),
            name: "",
            type: "TEXT",
            required: false,
        };
        setLeadFields([...leadFields, newField]);
    };

    const updateField = (id: string, updates: Partial<LeadField>) => {
        setLeadFields(fields =>
            fields.map(field =>
                field.id === id ? { ...field, ...updates } : field
            )
        );
    };

    const removeField = (id: string) => {
        setLeadFields(fields => fields.filter(field => field.id !== id));
    };

    const addStage = () => {
        const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) : 0;
        const newStage: Omit<Stage, 'id'> & { icon: string } = {
            name: "",
            order: maxOrder + 1,
            color: "#ffffff",
            icon: "Users",
        };
        setStages([...stages, newStage]);
    };

    const updateStage = (index: number, updates: Partial<Omit<Stage, 'id'> & { icon: string }>) => {
        setStages(stages =>
            stages.map((stage, i) =>
                i === index ? { ...stage, ...updates } : stage
            )
        );
    };

    const removeStage = (index: number) => {
        setStages(stages => stages.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const funnelData = {
                name: funnelName,
                description: funnelDescription,
                leadFields: leadFields.map(({ id, ...field }) => field),
                stages: stages,
            };
            await api.createFunnel(funnelData);
            onCreateFunnel(funnelData);
            setOpen(false);
            setFunnelName("");
            setFunnelDescription("");
            setLeadFields([
                { id: "1", name: "Name", type: "TEXT", required: true },
                { id: "2", name: "Email", type: "EMAIL", required: true },
                { id: "3", name: "Phone", type: "PHONE", required: false },
                { id: "4", name: "Company", type: "TEXT", required: false },
                { id: "5", name: "Value", type: "CURRENCY", required: false },
            ]);
            setStages([
                { name: "Prospect", order: 1, color: "#3B82F6", icon: "Users" },
                { name: "Lead", order: 2, color: "#F59E0B", icon: "UserCheck" },
                { name: "Qualified", order: 3, color: "#10B981", icon: "Target" },
                { name: "Proposal", order: 4, color: "#8B5CF6", icon: "FileText" },
                { name: "Negotiation", order: 5, color: "#F97316", icon: "Handshake" },
                { name: "Closed Won", order: 6, color: "#059669", icon: "Trophy" },
                { name: "Closed Lost", order: 7, color: "#DC2626", icon: "XCircle" }
            ]);
        } catch (error) {
            console.error("Error creating funnel:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <Button className="mb-4">
                    <Plus size={16} className="mr-2" />
                    Create New Funnel
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl max-h-[60vh] overflow-y-auto">
                    <Dialog.Title className="text-lg font-semibold mb-4">Criar Novo Funil</Dialog.Title>
                    <Dialog.Description className="sr-only">Create a new sales funnel with custom fields and stages</Dialog.Description>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="funnelName">Funnel Name</Label>
                            <Input
                                id="funnelName"
                                value={funnelName}
                                onChange={(e) => setFunnelName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="funnelDescription">Descrição (Opcional)</Label>
                            <Input
                                id="funnelDescription"
                                value={funnelDescription}
                                onChange={(e) => setFunnelDescription(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-6">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <Label>Lead Fields</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addField}>
                                        <Plus size={14} className="mr-1" />
                                        Add Field
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {leadFields.map((field) => (
                                        <div key={field.id} className="flex items-center gap-3 p-3 border rounded">
                                            <Input
                                                placeholder="Field name"
                                                value={field.name}
                                                onChange={(e) => updateField(field.id, { name: e.target.value })}
                                                className="flex-1"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                                                className="px-3 py-2 border rounded"
                                            >
                                                <option value="TEXT">Text</option>
                                                <option value="EMAIL">Email</option>
                                                <option value="PHONE">Phone</option>
                                                <option value="NUMBER">Number</option>
                                                <option value="DATE">Date</option>
                                                <option value="CURRENCY">Currency</option>
                                                <option value="TEXTAREA">Textarea</option>
                                            </select>
                                            <label className="flex items-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                />
                                                Required
                                            </label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeField(field.id)}
                                                disabled={leadFields.length <= 1}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <Label>Estágios do Funil</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addStage}>
                                        <Plus size={14} className="mr-1" />
                                        Adicionar Estágio
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                {stages.map((stage, index) => (
                                    <div key={index} className="flex items-center gap-3 p-3 border rounded">
                                        <Input
                                            placeholder="Stage name"
                                            value={stage.name}
                                            onChange={(e) => updateStage(index, { name: e.target.value })}
                                            className="flex-1"
                                        />
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIconDropdownOpen(iconDropdownOpen === index ? null : index)}
                                                className="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50"
                                            >
                                                {(() => {
                                                    const selectedIcon = iconOptions.find(opt => opt.value === stage.icon);
                                                    const IconComp = selectedIcon?.component || Users;
                                                    return <IconComp size={16} />;
                                                })()}
                                                <ChevronDown size={14} />
                                            </button>
                                            {iconDropdownOpen === index && (
                                                <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                                                    {iconOptions.map((option) => {
                                                        const IconComp = option.component;
                                                        return (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    updateStage(index, { icon: option.value });
                                                                    setIconDropdownOpen(null);
                                                                }}
                                                                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 text-left"
                                                            >
                                                                <IconComp size={16} />
                                                                <span className="text-sm">{option.value}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Order"
                                            value={stage.order}
                                            onChange={(e) => updateStage(index, { order: parseInt(e.target.value) || 0 })}
                                            className="w-20"
                                        />
                                        <Input
                                            type="color"
                                            value={stage.color}
                                            onChange={(e) => updateStage(index, { color: e.target.value })}
                                            className="w-12 h-10 border rounded cursor-pointer"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeStage(index)}
                                            disabled={stages.length <= 1}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Creating..." : "Create Funnel"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

const AddStageModal = ({ funnelId, onStageAdded }: { funnelId: string; onStageAdded: () => void }) => {
    const [open, setOpen] = useState(false);
    const [stageName, setStageName] = useState("");
    const [stageOrder, setStageOrder] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Get the next available order number
            const stages = await api.getStages(funnelId);
            const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) : -1;
            const nextOrder = maxOrder + 1;

            await api.createStage(funnelId, { name: stageName, order: nextOrder, color: "#ffffff" });
            onStageAdded();
            setOpen(false);
            setStageName("");
            setStageOrder(0);
        } catch (error) {
            console.error("Error creating stage:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <Button variant="outline">
                    <Plus size={16} className="mr-2" />
                    Add Stage
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                    <Dialog.Title className="text-lg font-semibold mb-4">Adicionar Novo Estágio</Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="stageName">Stage Name</Label>
                            <Input
                                id="stageName"
                                value={stageName}
                                onChange={(e) => setStageName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="stageOrder">Order (Auto-calculated)</Label>
                            <Input
                                id="stageOrder"
                                type="number"
                                value={stageOrder}
                                disabled
                                placeholder="Will be set automatically"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Adding..." : "Add Stage"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

const AddLeadModal = ({ funnel, stageId, onLeadAdded }: { funnel: Funnel; stageId: string; onLeadAdded: () => void }) => {
    const [open, setOpen] = useState(false);
    const [leadData, setLeadData] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const leadDataArray = Object.entries(leadData).map(([fieldId, value]) => ({
                fieldId,
                value
            }));
            await api.createLead(funnel.id, { stageId, leadData: leadDataArray });
            onLeadAdded();
            setOpen(false);
            setLeadData({});
        } catch (error) {
            console.error("Error creating lead:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <Button variant="outline">
                    <UserPlus size={16} className="mr-2" />
                    Add Lead
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
                    <Dialog.Title className="text-lg font-semibold mb-4">Adicionar Novo Lead</Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {funnel.leadFields.map((field) => (
                            <div key={field.id}>
                                <Label htmlFor={field.id}>{field.name} {field.required && '*'}</Label>
                                <Input
                                    id={field.id}
                                    type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'}
                                    value={leadData[field.id] || ''}
                                    onChange={(e) => setLeadData({ ...leadData, [field.id]: e.target.value })}
                                    required={field.required}
                                />
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Adding..." : "Add Lead"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

const ShareFunnelModal = ({ funnel, onCollaboratorAdded }: { funnel: Funnel; onCollaboratorAdded: () => void }) => {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [permission, setPermission] = useState<'VIEW' | 'EDIT' | 'DELETE'>('VIEW');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.createAndAddCollaborator(funnel.id, { email, password, name, permission });
            onCollaboratorAdded();
            setOpen(false);
            setEmail("");
            setPassword("");
            setName("");
            setPermission('VIEW');
        } catch (error) {
            console.error("Error creating collaborator:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <Button variant="outline">
                    <Share2 size={16} className="mr-2" />
                    Share Funnel
                </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                    <Dialog.Title className="text-lg font-semibold mb-4">Share Funnel: {funnel.name}</Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="collaboratorEmail">Email</Label>
                            <Input
                                id="collaboratorEmail"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="collaboratorPassword">Password</Label>
                            <Input
                                id="collaboratorPassword"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="collaboratorName">Name</Label>
                            <Input
                                id="collaboratorName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="permission">Permission</Label>
                            <select
                                id="permission"
                                value={permission}
                                onChange={(e) => setPermission(e.target.value as 'VIEW' | 'EDIT' | 'DELETE')}
                                className="w-full px-3 py-2 border rounded"
                            >
                                <option value="VIEW">View</option>
                                <option value="EDIT">Edit</option>
                                <option value="DELETE">Delete</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Sharing..." : "Share Funnel"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default function FunnelsPage() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingStages, setIsLoadingStages] = useState(false);
    const [userPermission, setUserPermission] = useState<'OWNER' | 'VIEW' | 'EDIT' | 'DELETE' | null>(null);
    const leadsRef = useRef<Lead[]>([]);
    leadsRef.current = leads;

    useEffect(() => {
        // Check if user is authenticated
        const token = api.getToken();
        if (!token) {
            window.location.href = '/login';
            return;
        }
        loadFunnels();
    }, []);

    useEffect(() => {
        if (selectedFunnel) {
            loadFunnelData(selectedFunnel.id);
        }
    }, [selectedFunnel]);

    const loadFunnels = async () => {
        try {
            const funnelList = await api.getFunnels();
            setFunnels(funnelList);
            if (funnelList.length > 0 && !selectedFunnel) {
                setSelectedFunnel(funnelList[0]);
            }
        } catch (error) {
            console.error("Error loading funnels:", error);
            // If token is invalid, the API client will handle redirect
        } finally {
            setIsLoading(false);
        }
    };

    const loadFunnelData = async (funnelId: string) => {
        setIsLoadingStages(true);
        try {
            const [stagesData, leadsData, permission] = await Promise.all([
                api.getStages(funnelId),
                api.getLeads(funnelId),
                api.getCurrentUserPermission(funnelId)
            ]);
            setStages(stagesData);
            setLeads(leadsData);
            setUserPermission(permission);
        } catch (error) {
            console.error("Error loading funnel data:", error);
        } finally {
            setIsLoadingStages(false);
        }
    };

    const handleCreateFunnel = async (funnelData: { name: string; description?: string; leadFields: Omit<LeadField, 'id'>[] }) => {
        await loadFunnels();
    };

    const handleStageAdded = async () => {
        if (selectedFunnel) {
            await loadFunnelData(selectedFunnel.id);
        }
    };

    const handleLeadAdded = async () => {
        if (selectedFunnel) {
            await loadFunnelData(selectedFunnel.id);
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        if (!selectedFunnel) return;
        try {
            await api.deleteStage(stageId, selectedFunnel.id);
            await loadFunnelData(selectedFunnel.id);
        } catch (error) {
            console.error("Error deleting stage:", error);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const findStage = useCallback((leadId: string) => {
        return stages.find(stage => stage.id === leads.find(lead => lead.id === leadId)?.stageId);
    }, [stages, leads]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || !selectedFunnel) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        const isStageDrag = stages.some(stage => stage.id === activeId);
        const isLeadDrag = leads.some(lead => lead.id === activeId);

        if (isStageDrag) {
            // Stage reordering
            const oldIndex = stages.findIndex(stage => stage.id === activeId);
            const newIndex = stages.findIndex(stage => stage.id === overId);

            if (oldIndex !== newIndex) {
                const newStages = arrayMove(stages, oldIndex, newIndex);
                const reorderedStages = newStages.map((stage, index) => ({
                    id: stage.id,
                    order: index + 1
                }));

                try {
                    await api.reorderStages(selectedFunnel.id, reorderedStages);
                    setStages(newStages);
                } catch (error) {
                    console.error("Error reordering stages:", error);
                }
            }
        } else if (isLeadDrag) {
            // Lead movement
            const sourceStage = findStage(activeId);
            const targetStage = stages.find(stage => stage.id === overId);

            if (!sourceStage || !targetStage) return;

            if (sourceStage.id === targetStage.id) {
                // Same stage - reorder
                const stageLeads = leads.filter(lead => lead.stageId === sourceStage.id);
                const oldIndex = stageLeads.findIndex(lead => lead.id === activeId);
                const newIndex = stageLeads.findIndex(lead => lead.id === overId);

                if (oldIndex !== newIndex) {
                    const reorderedStageLeads = arrayMove(stageLeads, oldIndex, newIndex);

                    // Update the leads array with the reordered stage leads - use functional update to avoid flickering
                    setLeads(prev => {
                        const filteredLeads = prev.filter(lead => lead.stageId !== sourceStage.id);
                        return [...filteredLeads, ...reorderedStageLeads];
                    });
                }
            } else {
                // Move to different stage - optimistic update
                const originalStageId = sourceStage.id;
                setLeads(prev => prev.map(lead => lead.id === activeId ? { ...lead, stageId: targetStage.id } : lead));
                try {
                    await api.moveLead(activeId, targetStage.id, selectedFunnel.id);
                } catch (error) {
                    console.error("Error moving lead:", error);
                    // Revert optimistic update
                    setLeads(prev => prev.map(lead => lead.id === activeId ? { ...lead, stageId: originalStageId } : lead));
                }
            }
        }
    };

    const convertLeadToDisplay = (lead: Lead): LeadDisplay => {
        const leadDataMap = lead.data.reduce((acc, data) => {
            acc[data.fieldId] = data.value;
            return acc;
        }, {} as Record<string, string>);

        // Find the first currency field for value display
        const currencyField = selectedFunnel?.leadFields.find(f => f.type === 'CURRENCY');
        const value = currencyField ? parseFloat(leadDataMap[currencyField.id] || '0') : 0;

        return {
            id: lead.id,
            name: leadDataMap[selectedFunnel?.leadFields.find(f => f.name.toLowerCase() === 'name')?.id || ''] || 'Unknown',
            company: leadDataMap[selectedFunnel?.leadFields.find(f => f.name.toLowerCase() === 'company')?.id || ''] || '',
            email: leadDataMap[selectedFunnel?.leadFields.find(f => f.name.toLowerCase() === 'email')?.id || ''] || '',
            phone: leadDataMap[selectedFunnel?.leadFields.find(f => f.name.toLowerCase() === 'phone')?.id || ''] || '',
            value: value,
            lastContact: new Date().toISOString().split('T')[0], // Placeholder
            notes: '', // Placeholder
        };
    };

    const leadsByStage = useMemo(() => {
        const map = new Map<string, LeadDisplay[]>();
        stages.forEach(stage => {
            map.set(stage.id, leadsRef.current
                .filter(lead => lead.stageId === stage.id)
                .map(convertLeadToDisplay));
        });
        return map;
    }, [stages, leads, selectedFunnel]);

    const getLeadsByStage = useCallback((stageId: string) => {
        return leadsByStage.get(stageId) || [];
    }, [leadsByStage]);

    const canEditStages = userPermission === 'OWNER' || userPermission === 'EDIT' || userPermission === 'DELETE';
    const canEditLeads = userPermission === 'OWNER' || userPermission === 'EDIT' || userPermission === 'DELETE';

    if (isLoading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <Tooltip.Provider>
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Funis de Vendas</h1>
                        {funnels.length > 0 && (
                            <div className="flex items-center gap-4 mt-2">
                                <select
                                    value={selectedFunnel?.id || ''}
                                    onChange={(e) => {
                                        const funnel = funnels.find(f => f.id === e.target.value);
                                        setSelectedFunnel(funnel || null);
                                    }}
                                    className="px-3 py-2 border rounded"
                                >
                                    {funnels.map(funnel => (
                                        <option key={funnel.id} value={funnel.id}>
                                            {funnel.name}
                                        </option>
                                    ))}
                                </select>
                                {selectedFunnel && (
                                    <Link href={`/dashboard/funnels/${selectedFunnel.id}`}>
                                        <Button variant="outline" className="flex items-center gap-2">
                                            <BarChart3 size={16} />
                                            Ver Dashboard
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <CreateFunnelModal onCreateFunnel={handleCreateFunnel} />
                        {selectedFunnel && (userPermission === 'OWNER' || userPermission === 'EDIT' || userPermission === 'DELETE') && <AddStageModal funnelId={selectedFunnel.id} onStageAdded={handleStageAdded} />}
                        {selectedFunnel && (userPermission === 'OWNER' || userPermission === 'DELETE') && <ShareFunnelModal funnel={selectedFunnel} onCollaboratorAdded={() => {}} />}
                    </div>
                </div>

                {selectedFunnel && stages.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={stages.map((s) => s.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            <div className="flex gap-6 overflow-x-auto pb-6 touch-pan-x">
                                {stages.map((stage) => {
                                    const IconComponent = (stage as any).icon ? (stageIcons[(stage as any).icon as keyof typeof stageIcons] || Users) : (stageIcons[stage.name.toLowerCase() as keyof typeof stageIcons] || Users);
                                    const colorClass = stageColors[stage.name.toLowerCase() as keyof typeof stageColors] || "bg-gray-100 border-gray-300";
                                    const stageLeads = getLeadsByStage(stage.id);

                                    return (
                                        <SortableStage key={stage.id} stage={stage} disabled={!canEditStages}>
                                            <Card className={`${colorClass}`}>
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="flex items-center gap-2 text-lg">
                                                        <IconComponent size={24} />
                                                        {stage.name}
                                                        <span className="ml-auto bg-white px-2 py-1 rounded-full text-sm font-semibold">
                                                            {stageLeads.length}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteStage(stage.id)}
                                                            className="ml-2 text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-0">
                                                    <SortableContext
                                                        items={stageLeads.map((l) => l.id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <div className="space-y-2 h-96 overflow-y-auto">
                                                            {stageLeads.map((lead) => (
                                                                <SortableLead key={lead.id} lead={lead} canEdit={canEditLeads} />
                                                            ))}
                                                            {stageLeads.length === 0 && (
                                                                <div className="text-center text-gray-400 py-8">
                                                                    No leads in this stage
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-4 pt-4 border-t">
                                                            {(userPermission === 'OWNER' || userPermission === 'EDIT' || userPermission === 'DELETE') && (
                                                                <AddLeadModal funnel={selectedFunnel} stageId={stage.id} onLeadAdded={handleLeadAdded} />
                                                            )}
                                                        </div>
                                                    </SortableContext>
                                                </CardContent>
                                            </Card>
                                        </SortableStage>
                                    );
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No funnels found. Create your first funnel to get started!</p>
                    </div>
                )}
            </div>
        </Tooltip.Provider>
    );
}
