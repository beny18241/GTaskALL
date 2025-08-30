const API_BASE_URL = 'http://localhost:3001/api';

// Add a flag to check if backend is available
let isBackendAvailable = true;

// TypeScript interfaces
interface Connection {
  gtask_account_email: string;
  gtask_account_name: string;
  gtask_account_picture: string;
  created_at: string;
  status?: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  picture: string;
  created_at: string;
  last_login: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  connections?: Connection[];
  token?: string;
  connectionId?: number;
  user?: User;
  userId?: number;
  settings?: { [key: string]: string };
}

// API service for managing Google Tasks account connections
export const apiService = {
  // Check if backend is available
  isBackendAvailable() {
    return isBackendAvailable;
  },
  // User Management Methods

  // Create or update user account
  async createOrUpdateUser(email: string, name: string, picture?: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          picture
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      isBackendAvailable = false;
      // Return a mock response when backend is not available
      return { success: true, message: 'User created/updated successfully (offline mode)' };
    }
  },

  // Get user by email
  async getUser(email: string): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // User not found
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      return data.user || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      isBackendAvailable = false;
      return null;
    }
  },

  // Update user's last login
  async updateUserLogin(email: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${email}/login`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating user login:', error);
      isBackendAvailable = false;
      return { success: true, message: 'Login updated (offline mode)' };
    }
  },

  // Get all connected Google Tasks accounts for a main user
  async getConnections(mainUserEmail: string): Promise<Connection[]> {
    if (!isBackendAvailable) {
      console.log('Backend not available, returning empty connections');
      return [];
    }
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${encodeURIComponent(mainUserEmail)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ApiResponse = await response.json();
      return data.connections || [];
    } catch (error) {
      console.error('Error fetching connections:', error);
      isBackendAvailable = false;
      return [];
    }
  },

  // Add a new Google Tasks account connection
  async addConnection(
    mainUserEmail: string, 
    gtaskAccountEmail: string, 
    gtaskAccountName: string, 
    gtaskAccountPicture: string, 
    token: string | null = null
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mainUserEmail,
          gtaskAccountEmail,
          gtaskAccountName,
          gtaskAccountPicture,
          token
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding connection:', error);
      throw error;
    }
  },

  // Remove a Google Tasks account connection
  async removeConnection(mainUserEmail: string, gtaskAccountEmail: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/connections/${encodeURIComponent(mainUserEmail)}/${encodeURIComponent(gtaskAccountEmail)}`,
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error removing connection:', error);
      throw error;
    }
  },

  // Get stored token for a specific connection
  async getToken(mainUserEmail: string, gtaskAccountEmail: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tokens/${encodeURIComponent(mainUserEmail)}/${encodeURIComponent(gtaskAccountEmail)}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Token not found
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      return data.token || null;
    } catch (error) {
      console.error('Error fetching token:', error);
      isBackendAvailable = false;
      return null;
    }
  },

  // Update token for a connection
  async updateToken(mainUserEmail: string, gtaskAccountEmail: string, token: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tokens/${encodeURIComponent(mainUserEmail)}/${encodeURIComponent(gtaskAccountEmail)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating token:', error);
      throw error;
    }
  },

  // Health check
  async healthCheck(): Promise<ApiResponse | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ApiResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Health check failed:', error);
      return null;
    }
  },

  // User Settings Methods

  // Get user settings
  async getUserSettings(email: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${email}/settings`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
  },

  // Update user setting
  async updateUserSetting(email: string, settingKey: string, settingValue: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${email}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setting_key: settingKey,
          setting_value: settingValue,
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating user setting:', error);
      throw error;
    }
  },

  // AI Summary Methods

  // Generate AI summary for tasks
  async generateTaskSummary(email: string, tasks: any[], gtaskAccountEmail?: string): Promise<{ summary: string; insights: string[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          tasks,
          gtaskAccountEmail
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw error;
    }
  },

  // Chat with AI about tasks
  async chatWithAI(email: string, tasks: any[], message: string, gtaskAccountEmail?: string): Promise<{ response: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          tasks,
          message,
          gtaskAccountEmail
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error chatting with AI:', error);
      throw error;
    }
  },

  // Mark a connection as expired
  async expireConnection(mainUserEmail: string, gtaskAccountEmail: string): Promise<void> {
    await fetch(`${API_BASE_URL}/connections/${encodeURIComponent(mainUserEmail)}/${encodeURIComponent(gtaskAccountEmail)}/expire`, { method: 'PUT' });
  },

  // Mark a connection as active
  async activateConnection(mainUserEmail: string, gtaskAccountEmail: string): Promise<void> {
    await fetch(`${API_BASE_URL}/connections/${encodeURIComponent(mainUserEmail)}/${encodeURIComponent(gtaskAccountEmail)}/activate`, { method: 'PUT' });
  },

  // Save API key for a user/account
  async saveApiKey(mainUserEmail: string, gtaskAccountEmail: string, apiKey: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainUserEmail, gtaskAccountEmail, apiKey })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error saving API key:', error);
      throw error;
    }
  },

  // Retrieve API key for a user/account
  async getApiKey(mainUserEmail: string, gtaskAccountEmail: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api-keys/${encodeURIComponent(mainUserEmail)}/${encodeURIComponent(gtaskAccountEmail)}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.apiKey || null;
    } catch (error) {
      console.error('Error fetching API key:', error);
      return null;
    }
  },


}; 