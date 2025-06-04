import { useState, FormEvent } from 'react'
import { Priority, Group } from '../types'

interface TodoFormProps {
  onSubmit: (text: string, dueDate: string, priority: Priority, group: Group) => void
}

const TodoForm: React.FC<TodoFormProps> = ({ onSubmit }) => {
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [group, setGroup] = useState<Group>('work')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onSubmit(text.trim(), dueDate, priority, group)
      setText('')
      setDueDate('')
      setPriority('medium')
      setGroup('work')
    }
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <div className="form-main">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a new task..."
          className="todo-input"
        />
        <button type="submit" className="add-btn" disabled={!text.trim()}>
          Add Task
        </button>
      </div>
      <div className="form-details">
        <div className="form-group">
          <label htmlFor="dueDate">Due Date</label>
          <input
            type="date"
            id="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="form-input"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="group">Category</label>
          <select
            id="group"
            value={group}
            onChange={(e) => setGroup(e.target.value as Group)}
            className="form-input"
          >
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="shopping">Shopping</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </form>
  )
}

export default TodoForm 