export interface Column {
  id: string;
  title: string;
  color: string;
}

export type Priority = 'low' | 'medium' | 'high';

export type Group = 'work' | 'personal' | 'shopping' | 'other';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  group: Group;
  dueDate: string;
} 