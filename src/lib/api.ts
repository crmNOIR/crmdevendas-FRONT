const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    tenantName: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface User {
    id: string;
    email: string;
    name?: string;
    role: 'ADMIN' | 'USER' | 'COLLABORATOR';
    tenant: Tenant;
}

export interface Tenant {
    id: string;
    name: string;
    domain: string;
}

export interface Funnel {
    id: string;
    name: string;
    description?: string;
    stages: Stage[];
    leadFields: LeadField[];
    leads: Lead[];
}

export interface Stage {
    id: string;
    name: string;
    order: number;
    color: string;
}

export interface LeadField {
    id: string;
    name: string;
    type: 'TEXT' | 'EMAIL' | 'PHONE' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'TEXTAREA';
    required: boolean;
}

export interface Lead {
    id: string;
    stageId: string;
    data: LeadData[];
}

export interface LeadData {
    fieldId: string;
    value: string;
}

export interface DashboardMetrics {
    totalLeads: number;
    totalFunnels: number;
    conversionRate: number;
    activeLeads: number;
}

export interface LeadCountByStage {
    stageId: string;
    stageName: string;
    color: string;
    leadCount: number;
}

export interface FunnelPerformance {
    funnelId: string;
    funnelName: string;
    stages: Array<{
        stageId: string;
        stageName: string;
        color: string;
        leadCount: number;
    }>;
}

export interface LeadCreationOverTime {
    date: string;
    count: number;
}

export interface Collaborator {
    id: string;
    userId: string;
    funnelId: string;
    permission: 'VIEW' | 'EDIT' | 'DELETE';
    user: {
        id: string;
        email: string;
        name: string;
    };
    createdAt: string;
}

export interface CreateFunnelRequest {
    name: string;
    description?: string;
    leadFields: Omit<LeadField, 'id'>[];
    stages: Omit<Stage, 'id'>[];
}

class ApiClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', token);
        }
    }

    getToken(): string | null {
        if (this.token) return this.token;
        if (typeof window !== 'undefined') {
            return localStorage.getItem('authToken');
        }
        return null;
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = this.getToken();

        const config: RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
            credentials: 'include',
            ...options,
        };

        const response = await fetch(url, config);

        if (!response.ok) {
            if (response.status === 401) {
                // Token is invalid or expired, clear it and redirect to login
                this.clearToken();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                throw new Error('Session expired. Please login again.');
            }
            const error = await response.text();
            throw new Error(error || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    // Auth endpoints
    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.setToken(response.token);
        return response;
    }

    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.setToken(response.token);
        return response;
    }

    // Funnel endpoints
    async getFunnels(): Promise<Funnel[]> {
        return this.request<Funnel[]>('/api/funnels');
    }

    async getFunnel(id: string): Promise<Funnel> {
        return this.request<Funnel>(`/api/funnels/${id}`);
    }

    async createFunnel(data: CreateFunnelRequest): Promise<Funnel> {
        return this.request<Funnel>('/api/funnels', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateFunnel(id: string, data: Partial<CreateFunnelRequest>): Promise<Funnel> {
        return this.request<Funnel>(`/api/funnels/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteFunnel(id: string): Promise<void> {
        await this.request(`/api/funnels/${id}`, { method: 'DELETE' });
    }

    // Stage endpoints
    async getStages(funnelId: string): Promise<Stage[]> {
        return this.request<Stage[]>(`/api/stages/funnel/${funnelId}`);
    }

    async createStage(funnelId: string, data: Omit<Stage, 'id'>): Promise<Stage> {
        return this.request<Stage>(`/api/stages/funnel/${funnelId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateStage(id: string, funnelId: string, data: Partial<Stage>): Promise<Stage> {
        return this.request<Stage>(`/api/stages/${id}/funnel/${funnelId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteStage(id: string, funnelId: string): Promise<void> {
        await this.request(`/api/stages/${id}/funnel/${funnelId}`, { method: 'DELETE' });
    }

    async reorderStages(funnelId: string, stages: Array<{ id: string; order: number }>): Promise<void> {
        await this.request(`/api/stages/reorder/funnel/${funnelId}`, {
            method: 'PUT',
            body: JSON.stringify({ stages }),
        });
    }

    // Lead endpoints
    async getLeads(funnelId: string): Promise<Lead[]> {
        return this.request<Lead[]>(`/api/leads/funnel/${funnelId}`);
    }

    async getLead(id: string, funnelId: string): Promise<Lead> {
        return this.request<Lead>(`/api/leads/${id}/funnel/${funnelId}`);
    }

    async createLead(funnelId: string, data: { stageId: string; leadData: Array<{ fieldId: string; value: string }> }): Promise<Lead> {
        return this.request<Lead>(`/api/leads/funnel/${funnelId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateLead(id: string, funnelId: string, data: { stageId?: string; leadData?: Record<string, string> }): Promise<Lead> {
        return this.request<Lead>(`/api/leads/${id}/funnel/${funnelId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteLead(id: string, funnelId: string): Promise<void> {
        await this.request(`/api/leads/${id}/funnel/${funnelId}`, { method: 'DELETE' });
    }

    async moveLead(id: string, stageId: string, funnelId: string): Promise<void> {
        await this.request(`/api/leads/${id}/move/funnel/${funnelId}`, {
            method: 'PUT',
            body: JSON.stringify({ stageId }),
        });
    }

    async getMe(): Promise<User> {
        return this.request<User>('/auth/me');
    }

    async logout(): Promise<void> {
        await this.request('/auth/logout', { method: 'GET' });
        this.clearToken();
    }

    // Dashboard endpoints
    async getDashboardMetrics(): Promise<DashboardMetrics> {
        return this.request<DashboardMetrics>('/api/dashboard/metrics');
    }

    async getLeadCountsByStage(funnelId?: string): Promise<LeadCountByStage[]> {
        const query = funnelId ? `?funnelId=${funnelId}` : '';
        return this.request<LeadCountByStage[]>(`/api/dashboard/lead-counts-by-stage${query}`);
    }

    async getFunnelPerformance(): Promise<FunnelPerformance[]> {
        return this.request<FunnelPerformance[]>('/api/dashboard/funnel-performance');
    }

    async getLeadCreationOverTime(days?: number): Promise<LeadCreationOverTime[]> {
        const query = days ? `?days=${days}` : '';
        return this.request<LeadCreationOverTime[]>(`/api/dashboard/lead-creation-over-time${query}`);
    }

    async getFunnelLeadCreationOverTime(funnelId: string, days?: number): Promise<LeadCreationOverTime[]> {
        const query = days ? `?days=${days}` : '';
        return this.request<LeadCreationOverTime[]>(`/api/dashboard/funnels/${funnelId}/lead-creation-over-time${query}`);
    }

    // Collaboration endpoints
    async getCollaborators(funnelId: string): Promise<Collaborator[]> {
        return this.request<Collaborator[]>(`/api/funnels/${funnelId}/collaborators`);
    }

    async addCollaborator(funnelId: string, email: string, permission: 'VIEW' | 'EDIT' | 'DELETE'): Promise<Collaborator> {
        return this.request<Collaborator>(`/api/funnels/${funnelId}/collaborators`, {
            method: 'POST',
            body: JSON.stringify({ email, permission }),
        });
    }

    async createAndAddCollaborator(funnelId: string, data: { email: string; password: string; name: string; permission: 'VIEW' | 'EDIT' | 'DELETE' }): Promise<{ collaborator: User; funnelUser: Collaborator }> {
        return this.request<{ collaborator: User; funnelUser: Collaborator }>(`/api/funnels/${funnelId}/collaborators/create-and-add`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async removeCollaborator(funnelId: string, collaboratorId: string): Promise<void> {
        await this.request(`/api/funnels/${funnelId}/collaborators/${collaboratorId}`, { method: 'DELETE' });
    }

    async updateCollaboratorPermission(funnelId: string, collaboratorId: string, permission: 'VIEW' | 'EDIT' | 'DELETE'): Promise<void> {
        await this.request(`/api/funnels/${funnelId}/collaborators/${collaboratorId}`, {
            method: 'PUT',
            body: JSON.stringify({ permission }),
        });
    }

    async getCurrentUserPermission(funnelId: string): Promise<'OWNER' | 'VIEW' | 'EDIT' | 'DELETE' | null> {
        try {
            const response = await this.request<{ permission: 'OWNER' | 'VIEW' | 'EDIT' | 'DELETE' }>(`/api/funnels/${funnelId}/permission`);
            return response.permission;
        } catch (error) {
            return null;
        }
    }
}

export const api = new ApiClient();
