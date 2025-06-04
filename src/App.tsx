import React, { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import GoogleTasksIntegration from './components/GoogleTasksIntegration';
import './styles/App.css';

const CLIENT_ID = '251184335563-bdf3sv4vc1sr4v2itciiepd7fllvshec.apps.googleusercontent.com';

const App: React.FC = () => {
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('dueDate');

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="app">
        <header>
          <h1>GTaskALL</h1>
          <div className="controls">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'createdAt')}>
              <option value="none">Sort by: None</option>
              <option value="dueDate">Sort by: Due Date</option>
              <option value="priority">Sort by: Priority</option>
            </select>
          </div>
        </header>

        <GoogleTasksIntegration sortBy={sortBy} />
      </div>
    </GoogleOAuthProvider>
  );
};

export default App; 