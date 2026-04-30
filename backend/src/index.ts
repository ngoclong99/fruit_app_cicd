import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDB } from './db';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// GET all todos
app.get('/todos', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
  res.json(rows);
});

// POST create todo
app.post('/todos', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const { rows } = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING *',
    [title]
  );
  res.status(201).json(rows[0]);
});

// PATCH toggle done
app.patch('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    'UPDATE todos SET done = NOT done WHERE id = $1 RETURNING *',
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

// DELETE todo
app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM todos WHERE id = $1', [id]);
  res.status(204).send();
});

const PORT = process.env.PORT || 4000;

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
