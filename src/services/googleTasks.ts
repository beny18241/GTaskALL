import { gapi } from 'gapi-script';

const CLIENT_ID = '251184335563-bdf3sv4vc1sr4v2itciiepd7fllvshec.apps.googleusercontent.com';
const API_KEY = '';
const DISCOVERY_DOCS = ['https://tasks.googleapis.com/$discovery/rest?version=v1'];
const SCOPES = 'https://www.googleapis.com/auth/tasks';

export interface GoogleTask {
  id?: string;
  title: string;
  notes?: string;
  status?: string;
  due?: string;
  completed?: string;
  position?: string;
  parent?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

// Extend the gapi.client type to include tasks
declare global {
  namespace gapi.client {
    const tasks: {
      tasklists: {
        list: () => Promise<{ result: { items: GoogleTaskList[] } }>;
      };
      tasks: {
        list: (params: { tasklist: string }) => Promise<{ result: { items: GoogleTask[] } }>;
        insert: (params: { tasklist: string; resource: GoogleTask }) => Promise<{ result: GoogleTask }>;
        update: (params: { tasklist: string; task: string; resource: GoogleTask }) => Promise<{ result: GoogleTask }>;
        delete: (params: { tasklist: string; task: string }) => Promise<void>;
        patch: (params: { tasklist: string; task: string; resource: Partial<GoogleTask> }) => Promise<{ result: GoogleTask }>;
      };
    };
  }
}

class GoogleTasksService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private async loadGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        gapi.load('client:auth2', () => {
          console.log('GAPI client loaded');
          resolve();
        });
      } catch (error) {
        console.error('Error loading GAPI client:', error);
        reject(error);
      }
    });
  }

  private async initClient(): Promise<void> {
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      });
      console.log('GAPI client initialized');
    } catch (error) {
      console.error('Error initializing GAPI client:', error);
      throw error;
    }
  }

  private async loadTasksApi(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        gapi.client.load('tasks', 'v1', () => {
          console.log('Tasks API loaded');
          resolve();
        });
      } catch (error) {
        console.error('Error loading Tasks API:', error);
        reject(error);
      }
    });
  }

  async initialize() {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Step 1: Load GAPI client
        await this.loadGapi();
        
        // Step 2: Initialize GAPI client
        await this.initClient();
        
        // Step 3: Load Tasks API
        await this.loadTasksApi();

        // Set up auth state listener
        const auth2 = gapi.auth2.getAuthInstance();
        auth2.isSignedIn.listen((isSignedIn) => {
          console.log('Sign-in state changed:', isSignedIn);
          if (!isSignedIn) {
            localStorage.removeItem('googleTasksToken');
          }
        });

        // Check for stored token and restore session if possible
        const storedToken = localStorage.getItem('googleTasksToken');
        if (storedToken) {
          try {
            await auth2.signIn();
            console.log('Session restored successfully');
          } catch (err) {
            console.error('Failed to restore session:', err);
            localStorage.removeItem('googleTasksToken');
          }
        }

        this.isInitialized = true;
        console.log('Google Tasks API fully initialized');
      } catch (error) {
        console.error('Failed to initialize Google Tasks:', error);
        this.isInitialized = false;
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async signIn() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const auth2 = gapi.auth2.getAuthInstance();
      if (!auth2) {
        throw new Error('Auth2 not initialized');
      }

      const googleUser = await auth2.signIn();
      const token = googleUser.getAuthResponse().access_token;
      localStorage.setItem('googleTasksToken', token);
      console.log('Access token obtained and stored successfully');
      return googleUser;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async signOut() {
    if (!this.isInitialized) {
      throw new Error('Google Tasks API not initialized');
    }

    try {
      const auth2 = gapi.auth2.getAuthInstance();
      if (!auth2) {
        throw new Error('Auth2 not initialized');
      }

      await auth2.signOut();
      localStorage.removeItem('googleTasksToken');
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async getTaskLists(): Promise<GoogleTaskList[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await gapi.client.tasks.tasklists.list();
      console.log('Task lists fetched successfully:', response.result.items);
      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching task lists:', error);
      throw error;
    }
  }

  async getTasks(taskListId: string): Promise<GoogleTask[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await gapi.client.tasks.tasks.list({
        tasklist: taskListId,
      });
      console.log('Tasks fetched successfully:', response.result.items);
      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  async createTask(taskListId: string, task: GoogleTask): Promise<GoogleTask> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await gapi.client.tasks.tasks.insert({
        tasklist: taskListId,
        resource: task,
      });
      console.log('Task created successfully:', response.result);
      return response.result;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(taskListId: string, taskId: string, updates: Partial<GoogleTask>): Promise<GoogleTask> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // If status is being updated to 'completed', also set the completed date
      if (updates.status === 'completed') {
        updates.completed = new Date().toISOString();
      } else if (updates.status === 'needsAction') {
        updates.completed = undefined;
      }

      console.log('Updating task with data:', { taskListId, taskId, updates });
      
      const response = await gapi.client.tasks.tasks.patch({
        tasklist: taskListId,
        task: taskId,
        resource: updates
      });

      console.log('Task updated successfully:', response.result);
      return response.result;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await gapi.client.tasks.tasks.delete({
        tasklist: taskListId,
        task: taskId,
      });
      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
}

export const googleTasksService = new GoogleTasksService(); 