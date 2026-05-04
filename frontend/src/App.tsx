import { useEffect, useState } from 'react';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const API = '/api/todos';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    fetch(API).then(r => r.json()).then(setTodos);
  }, []);

  async function addTodo() {
    if (!input.trim()) return;
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.trim() }),
    });
    const todo = await res.json();
    setTodos(prev => [todo, ...prev]);
    setInput('');
  }

  async function toggleTodo(id: number) {
    const res = await fetch(`${API}/${id}`, { method: 'PATCH' });
    const updated = await res.json();
    setTodos(prev => prev.map(t => (t.id === id ? updated : t)));
  }

  async function deleteTodo(id: number) {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', fontFamily: 'sans-serif' }}>
      <h1>Todo App</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Add a todo..."
          style={{ flex: 1, padding: '8px 12px', fontSize: 16 }}
        />
        <button onClick={addTodo} style={{ padding: '8px 16px', fontSize: 16 }}>
          Add
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map(todo => (
          <li
            key={todo.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{ flex: 1, textDecoration: todo.done ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
