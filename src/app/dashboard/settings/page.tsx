"use client";

import { useState, useEffect } from "react";
import { api, Collaborator, Funnel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus } from "lucide-react";

export default function SettingsPage() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
    const [newCollaboratorPermission, setNewCollaboratorPermission] = useState<'VIEW' | 'EDIT' | 'DELETE'>('VIEW');
    const [newAccountEmail, setNewAccountEmail] = useState("");
    const [newAccountPassword, setNewAccountPassword] = useState("");
    const [newAccountName, setNewAccountName] = useState("");
    const [newAccountPermission, setNewAccountPermission] = useState<'VIEW' | 'EDIT' | 'DELETE'>('VIEW');
    const [newAccountFunnelId, setNewAccountFunnelId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadFunnels();
    }, []);

    useEffect(() => {
        if (selectedFunnelId) {
            loadCollaborators();
        }
    }, [selectedFunnelId]);

    const loadFunnels = async () => {
        try {
            const funnelList = await api.getFunnels();
            setFunnels(funnelList);
        } catch (err) {
            setError("Failed to load funnels");
        }
    };

    const loadCollaborators = async () => {
        try {
            setLoading(true);
            const collaboratorList = await api.getCollaborators(selectedFunnelId);
            setCollaborators(collaboratorList);
        } catch (err) {
            setError("Failed to load collaborators");
        } finally {
            setLoading(false);
        }
    };

    const addCollaborator = async () => {
        if (!newCollaboratorEmail.trim()) return;

        try {
            setLoading(true);
            await api.addCollaborator(selectedFunnelId, newCollaboratorEmail, newCollaboratorPermission);
            setNewCollaboratorEmail("");
            setNewCollaboratorPermission('VIEW');
            loadCollaborators();
        } catch (err) {
            setError("Failed to add collaborator");
        } finally {
            setLoading(false);
        }
    };

    const removeCollaborator = async (collaboratorId: string) => {
        try {
            setLoading(true);
            await api.removeCollaborator(selectedFunnelId, collaboratorId);
            loadCollaborators();
        } catch (err) {
            setError("Failed to remove collaborator");
        } finally {
            setLoading(false);
        }
    };

    const updateCollaboratorPermission = async (collaboratorId: string, permission: 'VIEW' | 'EDIT' | 'DELETE') => {
        try {
            setLoading(true);
            await api.updateCollaboratorPermission(selectedFunnelId, collaboratorId, permission);
            loadCollaborators();
        } catch (err) {
            setError("Failed to update permission");
        } finally {
            setLoading(false);
        }
    };

    const createCollaboratorAccount = async () => {
        if (!newAccountEmail.trim() || !newAccountPassword.trim() || !newAccountName.trim() || !newAccountFunnelId) return;

        try {
            setLoading(true);
            await api.createAndAddCollaborator(newAccountFunnelId, {
                email: newAccountEmail,
                password: newAccountPassword,
                name: newAccountName,
                permission: newAccountPermission
            });
            setNewAccountEmail("");
            setNewAccountPassword("");
            setNewAccountName("");
            setNewAccountPermission('VIEW');
            setNewAccountFunnelId("");
            setError("");
        } catch (err) {
            setError("Failed to create collaborator account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Create Collaborator Account</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="accountEmail">Email</Label>
                            <Input
                                id="accountEmail"
                                type="email"
                                value={newAccountEmail}
                                onChange={(e) => setNewAccountEmail(e.target.value)}
                                placeholder="Enter email"
                            />
                        </div>
                        <div>
                            <Label htmlFor="accountPassword">Password</Label>
                            <Input
                                id="accountPassword"
                                type="password"
                                value={newAccountPassword}
                                onChange={(e) => setNewAccountPassword(e.target.value)}
                                placeholder="Enter password"
                            />
                        </div>
                        <div>
                            <Label htmlFor="accountName">Name</Label>
                            <Input
                                id="accountName"
                                value={newAccountName}
                                onChange={(e) => setNewAccountName(e.target.value)}
                                placeholder="Enter name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="accountPermission">Permission</Label>
                            <Select value={newAccountPermission} onValueChange={(value: 'VIEW' | 'EDIT' | 'DELETE') => setNewAccountPermission(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VIEW">View</SelectItem>
                                    <SelectItem value="EDIT">Edit</SelectItem>
                                    <SelectItem value="DELETE">Delete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="accountFunnel">Funnel</Label>
                            <Select value={newAccountFunnelId} onValueChange={setNewAccountFunnelId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a funnel" />
                                </SelectTrigger>
                                <SelectContent>
                                    {funnels.map((funnel) => (
                                        <SelectItem key={funnel.id} value={funnel.id}>
                                            {funnel.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Button onClick={createCollaboratorAccount} disabled={loading}>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Create Collaborator Account
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Select Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a funnel to manage collaborators" />
                        </SelectTrigger>
                        <SelectContent>
                            {funnels.map((funnel) => (
                                <SelectItem key={funnel.id} value={funnel.id}>
                                    {funnel.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {selectedFunnelId && (
                <>
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Add Collaborator</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={newCollaboratorEmail}
                                        onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                                        placeholder="Enter collaborator email"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="permission">Permission</Label>
                                    <Select value={newCollaboratorPermission} onValueChange={(value: 'VIEW' | 'EDIT' | 'DELETE') => setNewCollaboratorPermission(value)}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="VIEW">View</SelectItem>
                                            <SelectItem value="EDIT">Edit</SelectItem>
                                            <SelectItem value="DELETE">Delete</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={addCollaborator} disabled={loading}>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Current Collaborators</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <p>Loading...</p>
                            ) : collaborators.length === 0 ? (
                                <p>No collaborators found.</p>
                            ) : (
                                <div className="space-y-4">
                                    {collaborators.map((collaborator) => (
                                        <div key={collaborator.id} className="flex items-center justify-between p-4 border rounded">
                                            <div>
                                                <p className="font-medium">{collaborator.user.name || collaborator.user.email}</p>
                                                <p className="text-sm text-gray-600">{collaborator.user.email}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Select
                                                    value={collaborator.permission}
                                                    onValueChange={(value: 'VIEW' | 'EDIT' | 'DELETE') => updateCollaboratorPermission(collaborator.id, value)}
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="VIEW">View</SelectItem>
                                                        <SelectItem value="EDIT">Edit</SelectItem>
                                                        <SelectItem value="DELETE">Delete</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => removeCollaborator(collaborator.id)}
                                                    disabled={loading}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
