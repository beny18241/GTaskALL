const API_BASE_URL = 'http://localhost:3001/api';

// TypeScript interfaces
interface Connection {
  gtask_account_email: string;
  gtask_account_name: string;
  gtask_account_picture: string;
  created_at: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  connections?: Connection[];
  token?: string;
  connectionId?: number;
}

// API service for managing Google Tasks account connections
export const apiService = {
  // Get all connected Google Tasks accounts for a main user
  async getConnections(mainUserEmail: string): Promise<Connection[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/connections/${encodeURIComponent(mainUserEmail)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ApiResponse = await response.json();
      return data.connections || [];
    } catch (error) {
      console.error('Error fetching connections:', error);
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
  }
}; 