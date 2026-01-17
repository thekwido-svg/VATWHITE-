const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// Inasoma DATABASE_URL kutoka kwenye Environment Variables uliyoweka Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Inatengeneza Table ya wateja moja kwa moja ikikosekana
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firstname TEXT,
        lastname TEXT,
        phone TEXT UNIQUE,
        password TEXT,
        balance JSONB DEFAULT '{"gold": 0}'
      )
    `);
    console.log("Database iko tayari!");
  } catch (err) {
    console.error("Database Error:", err);
  }
};
initDb();

// Sehemu ya Kusajili na Kuingia (Login/Register)
app.post('/auth', async (req, res) => {
  const { firstname, lastname, phone, password } = req.body;
  try {
    const userExist = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    
    if (userExist.rows.length > 0) {
      if (userExist.rows[0].password === password) {
        return res.json({ success: true, user: userExist.rows[0] });
      } else {
        return res.json({ success: false, message: "Password siyo sahihi!" });
      }
    } else {
      const newUser = await pool.query(
        'INSERT INTO users (firstname, lastname, phone, password) VALUES ($1, $2, $3, $4) RETURNING *',
        [firstname, lastname, phone, password]
      );
      return res.json({ success: true, user: newUser.rows[0] });
    }
  } catch (err) {
    res.json({ success: false, message: "Tatizo la Database!" });
  }
});

// Sehemu ya Admin kuona wateja
app.get('/get-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server inapumua kwenye port ${PORT}`);
});
