import { storage } from './storage';
import type { ApiConnection } from '@shared/schema';

interface FreshbooksTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface FreshbooksClient {
  id: number;
  fname: string;
  lname: string;
  email: string;
  bus_phone: string;
  mob_phone: string;
  organization: string;
  p_street: string;
  p_city: string;
  p_province: string;
  p_country: string;
  p_code: string;
}

interface FreshbooksProject {
  id: number;
  title: string;
  description: string;
  client_id: number;
  due_date: string | null;
  budget: {
    amount: string;
    currency_code: string;
  } | null;
}

interface FreshbooksInvoice {
  invoiceid: number;
  invoice_number: string;
  customerid: number;
  amount: {
    amount: string;
    code: string;
  };
  v3_status: string;
  payment_status: string;
  create_date: string;
  due_offset_days: number;
}

export class FreshbooksService {
  private static instance: FreshbooksService;
  private baseUrl = 'https://api.freshbooks.com';
  private clientId = process.env.FRESHBOOKS_CLIENT_ID || '';
  private clientSecret = process.env.FRESHBOOKS_CLIENT_SECRET || '';
  private redirectUri = process.env.FRESHBOOKS_REDIRECT_URI || '';

  private constructor() {}

  public static getInstance(): FreshbooksService {
    if (!FreshbooksService.instance) {
      FreshbooksService.instance = new FreshbooksService();
    }
    return FreshbooksService.instance;
  }

  public getAuthUrl(): string {
    return `https://my.freshbooks.com/service/auth/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}`;
  }

  public async exchangeCodeForToken(code: string): Promise<ApiConnection> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to exchange code for token: ${response.statusText}`);
      }

      const data: FreshbooksTokenResponse = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      return await storage.updateApiConnection('freshbooks', {
        provider: 'freshbooks',
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        isActive: true,
      });
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  private async getCurrentAccountId(accessToken: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user profile: ${response.statusText}`);
      }

      const data = await response.json();
      // Use the first account as default
      return data.response.business_memberships[0].business.account_id;
    } catch (error) {
      console.error('Error getting account ID:', error);
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<ApiConnection> {
    try {
      const integration = await storage.getApiConnection('freshbooks');
      if (!integration) {
        throw new Error('No FreshBooks integration found');
      }

      const response = await fetch(`${this.baseUrl}/auth/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: integration.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data: FreshbooksTokenResponse = await response.json();
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      return await storage.updateApiConnection('freshbooks', {
        provider: 'freshbooks',
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        isActive: true,
      });
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const integration = await storage.getApiConnection('freshbooks');
      if (!integration?.accessToken) {
        throw new Error('No FreshBooks integration found');
      }

      if (integration.expiresAt && new Date() >= new Date(integration.expiresAt)) {
        const refreshed = await this.refreshAccessToken();
        return refreshed.accessToken!;
      }

      return integration.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  // API methods for clients
  public async getClients(): Promise<FreshbooksClient[]> {
    try {
      const accessToken = await this.getAccessToken();
      const integration = await storage.getApiConnection('freshbooks');

      if (!integration?.accountId) {
        throw new Error('FreshBooks account ID not found. Please reconnect.');
      }

      const response = await fetch(`${this.baseUrl}/accounting/account/${integration.accountId}/users/clients`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get clients: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response.result.clients;
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  }

  // API methods for projects
  public async getProjects(): Promise<FreshbooksProject[]> {
    try {
      const accessToken = await this.getAccessToken();
      const integration = await storage.getApiConnection('freshbooks');

      if (!integration?.businessId) {
        throw new Error('FreshBooks business ID not found. Please reconnect.');
      }

      const response = await fetch(`${this.baseUrl}/projects/business/${integration.businessId}/projects`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get projects: ${response.statusText}`);
      }

      const data = await response.json();
      return data.projects;
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  }

  // API methods for invoices
  public async getInvoices(): Promise<FreshbooksInvoice[]> {
    try {
      const accessToken = await this.getAccessToken();
      const integration = await storage.getApiConnection('freshbooks');

      if (!integration?.accountId) {
        throw new Error('FreshBooks account ID not found. Please reconnect.');
      }

      const response = await fetch(`${this.baseUrl}/accounting/account/${integration.accountId}/invoices/invoices`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get invoices: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response.result.invoices;
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }

  public async isConnected(): Promise<boolean> {
    try {
      const integration = await storage.getApiConnection('freshbooks');
      return !!(integration?.accessToken);
    } catch (error) {
      console.error('Error checking if connected:', error);
      return false;
    }
  }

  private async getClientByFreshbooksId(freshbooksId: string) {
    const clients = await storage.getAllClients();
    return clients.find(c => c.freshbooksId === freshbooksId);
  }

  // Sync clients from Freshbooks to local storage
  public async syncClients(): Promise<void> {
    try {
      const clients = await this.getClients();

      for (const client of clients) {
        const freshbooksId = String(client.id);
        const name = [client.fname, client.lname].filter(Boolean).join(' ') || client.organization || 'Unknown';
        const phone = client.bus_phone || client.mob_phone || '';
        const address = [client.p_street, client.p_city, client.p_province, client.p_country, client.p_code]
          .filter(Boolean).join(', ');

        const existingClient = await this.getClientByFreshbooksId(freshbooksId);

        if (existingClient) {
          await storage.updateClient(existingClient.id, { name, email: client.email, phone, address });
        } else {
          await storage.createClient({
            freshbooksId,
            name,
            email: client.email,
            phone,
            address,
            notes: '',
            userId: null,
          });
        }
      }
    } catch (error) {
      console.error('Error syncing clients:', error);
      throw error;
    }
  }

  // Sync projects from Freshbooks to local storage
  public async syncProjects(): Promise<void> {
    try {
      const projects = await this.getProjects();
      
      for (const project of projects) {
        const client = await this.getClientByFreshbooksId(String(project.client_id));

        if (!client) continue;

        const freshbooksId = String(project.id);
        const existingProject = await this.getProjectByFreshbooksId(freshbooksId);

        if (existingProject) {
          await storage.updateProject(existingProject.id, {
            name: project.title,
            description: project.description,
            budget: project.budget?.amount ? parseFloat(project.budget.amount) : undefined,
            dueDate: project.due_date ? new Date(project.due_date) : undefined,
          });
        } else {
          await storage.createProject({
            freshbooksId,
            clientId: client.id,
            name: project.title,
            description: project.description,
            budget: project.budget?.amount ? parseFloat(project.budget.amount) : undefined,
            status: 'in_progress',
            progress: 0,
            startDate: new Date(),
            dueDate: project.due_date ? new Date(project.due_date) : undefined,
          });
        }
      }
    } catch (error) {
      console.error('Error syncing projects:', error);
      throw error;
    }
  }

  // Sync invoices from Freshbooks to local storage
  public async syncInvoices(): Promise<void> {
    try {
      const invoices = await this.getInvoices();
      
      for (const invoice of invoices) {
        const client = await this.getClientByFreshbooksId(String(invoice.customerid));

        if (!client) continue;

        const freshbooksId = String(invoice.invoiceid);
        const existingInvoice = await this.getInvoiceByFreshbooksId(freshbooksId);
        const status = this.mapInvoiceStatus(invoice.payment_status || invoice.v3_status);
        const amount = parseFloat(invoice.amount.amount);
        const issueDate = new Date(invoice.create_date);
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + (invoice.due_offset_days || 30));

        if (existingInvoice) {
          await storage.updateInvoice(existingInvoice.id, { amount, status });
        } else {
          await storage.createInvoice({
            freshbooksId,
            clientId: client.id,
            projectId: null,
            invoiceNumber: invoice.invoice_number,
            amount,
            status,
            issueDate,
            dueDate,
            paidDate: status === 'paid' ? issueDate : null,
          });
        }
      }
    } catch (error) {
      console.error('Error syncing invoices:', error);
      throw error;
    }
  }

  // Sync all data from Freshbooks
  public async syncAll(): Promise<void> {
    try {
      await this.syncClients();
      await this.syncProjects();
      await this.syncInvoices();
    } catch (error) {
      console.error('Error syncing all data:', error);
      throw error;
    }
  }

  // Helper methods
  private async getProjectByFreshbooksId(freshbooksId: string) {
    const projects = await storage.getAllProjects();
    return projects.find(p => p.freshbooksId === freshbooksId);
  }

  private async getInvoiceByFreshbooksId(freshbooksId: string) {
    const invoices = await storage.getAllInvoices();
    return invoices.find(i => i.freshbooksId === freshbooksId);
  }

  private mapInvoiceStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'paid';
      case 'sent':
      case 'viewed':
      case 'draft':
        return 'pending';
      case 'overdue':
        return 'overdue';
      default:
        return 'pending';
    }
  }
}

export const freshbooksService = FreshbooksService.getInstance();
