import { gapi } from 'gapi-script';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '251184335563-bdf3sv4vc1sr4v2itciiepd7fllvshec.apps.googleusercontent.com';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const DISCOVERY_DOCS = ['https://tasks.googleapis.com/$discovery/rest?version=v1'];
const SCOPES = 'https://www.googleapis.com/auth/tasks';

// Mock data for UAT environment
const MOCK_TASK_LISTS: GoogleTaskList[] = [
  { id: 'mock-list-1', title: 'Work Tasks' },
  { id: 'mock-list-2', title: 'Personal Tasks' },
  { id: 'mock-list-3', title: 'Shopping List' }
];

const MOCK_TASKS: Record<string, GoogleTask[]> = {
  'mock-list-1': [
    {
      id: 'task-1',
      title: 'Complete project documentation',
      notes: 'Include API documentation and user guides',
      status: 'needsAction',
      due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      position: '00000000000000000001'
    },
    {
      id: 'task-2',
      title: 'Review pull requests',
      notes: 'Check team members\' PRs and provide feedback',
      status: 'completed',
      completed: new Date().toISOString(),
      position: '00000000000000000002'
    },
    {
      id: 'task-3',
      title: 'Schedule team meeting',
      notes: 'Discuss sprint planning and current blockers',
      status: 'needsAction',
      due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      position: '00000000000000000003'
    }
  ],
  'mock-list-2': [
    {
      id: 'task-4',
      title: 'Gym workout',
      notes: 'Focus on upper body today',
      status: 'needsAction',
      due: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      position: '00000000000000000001'
    },
    {
      id: 'task-5',
      title: 'Read new book',
      notes: 'Start reading "Atomic Habits"',
      status: 'needsAction',
      position: '00000000000000000002'
    }
  ],
  'mock-list-3': [
    {
      id: 'task-6',
      title: 'Buy groceries',
      notes: 'Milk, eggs, bread, fruits',
      status: 'needsAction',
      due: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      position: '00000000000000000001'
    },
    {
      id: 'task-7',
      title: 'Order new headphones',
      notes: 'Research noise-cancelling options',
      status: 'completed',
      completed: new Date().toISOString(),
      position: '00000000000000000002'
    }
  ]
};

const MOCK_USER = {
  id: 'mock-user-1',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://ui-avatars.com/api/?name=Test+User&background=random'
};

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
  private isUAT = window.location.hostname.includes('uat') || window.location.hostname.includes('localhost');

  private async loadGapi(): Promise<void> {
    if (this.isUAT) {
      return Promise.resolve();
    }
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
    if (this.isUAT) {
      return Promise.resolve();
    }
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      });
      console.log('GAPI client initialized');
    } catch (error) {
      console.error('Error initializing GAPI client:', error);
      throw error;
    }
  }

  private async loadTasksApi(): Promise<void> {
    if (this.isUAT) {
      return Promise.resolve();
    }
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
        if (!this.isUAT) {
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
              localStorage.removeItem('tokenExpiration');
            }
          });
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

    if (this.isUAT) {
      return {
        getBasicProfile: () => ({
          getId: () => MOCK_USER.id,
          getEmail: () => MOCK_USER.email,
          getName: () => MOCK_USER.name,
          getImageUrl: () => MOCK_USER.picture
        }),
        getAuthResponse: () => ({
          access_token: 'mock-token',
          expires_in: 3600
        })
      };
    }

    try {
      const auth2 = gapi.auth2.getAuthInstance();
      if (!auth2) {
        throw new Error('Auth2 not initialized');
      }

      // Prompt for account selection
      const googleUser = await auth2.signIn({
        prompt: 'select_account'
      });
      const authResponse = googleUser.getAuthResponse();
      
      // Store token and expiration
      localStorage.setItem('googleTasksToken', authResponse.access_token);
      localStorage.setItem('tokenExpiration', (Date.now() + authResponse.expires_in * 1000).toString());
      
      console.log('Access token obtained and stored successfully');
      return googleUser;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async signOut() {
    if (this.isUAT) {
      return Promise.resolve();
    }

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
      localStorage.removeItem('tokenExpiration');
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

    if (this.isUAT) {
      return MOCK_TASK_LISTS;
    }

    try {
      const auth2 = gapi.auth2.getAuthInstance();
      if (!auth2.isSignedIn.get()) {
        throw new Error('User not signed in');
      }

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

    if (this.isUAT) {
      return MOCK_TASKS[taskListId] || [];
    }

    try {
      const auth2 = gapi.auth2.getAuthInstance();
      if (!auth2.isSignedIn.get()) {
        throw new Error('User not signed in');
      }

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
    if (this.isUAT) {
      const newTask = {
        ...task,
        id: `task-${Date.now()}`,
        position: `0000000000000000000${Object.keys(MOCK_TASKS[taskListId] || {}).length + 1}`
      };
      MOCK_TASKS[taskListId] = [...(MOCK_TASKS[taskListId] || []), newTask];
      return newTask;
    }

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
    if (this.isUAT) {
      const taskIndex = MOCK_TASKS[taskListId]?.findIndex(t => t.id === taskId);
      if (taskIndex === -1) throw new Error('Task not found');
      
      const updatedTask = {
        ...MOCK_TASKS[taskListId][taskIndex],
        ...updates
      };
      MOCK_TASKS[taskListId][taskIndex] = updatedTask;
      return updatedTask;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // If status is being updated to 'completed', also set the completed date
      if (updates.status === 'completed') {
        updates.completed = new Date().toISOString();
      }

      const response = await gapi.client.tasks.tasks.patch({
        tasklist: taskListId,
        task: taskId,
        resource: updates,
      });
      console.log('Task updated successfully:', response.result);
      return response.result;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    if (this.isUAT) {
      MOCK_TASKS[taskListId] = MOCK_TASKS[taskListId]?.filter(t => t.id !== taskId) || [];
      return Promise.resolve();
    }

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