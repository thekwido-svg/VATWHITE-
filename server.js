// Server inatengeneza Multiplier moja kwa wote
let currentMultiplier = 1.00;
let isGameRunning = true;

setInterval(() => {
    if (isGameRunning) {
        currentMultiplier += 0.01;
        if (currentMultiplier > Math.random() * 10 + 2) { // Ndege inapasuka (Crash)
            isGameRunning = false;
            setTimeout(() => { currentMultiplier = 1.00; isGameRunning = true; }, 5000);
        }
    }
}, 100);

// Njia ya Search kwa Admin
app.get('/admin/search', async (req, res) => {
    const { term } = req.query;
    const result = await pool.query(
        "SELECT * FROM users WHERE name ILIKE $1 OR phone LIKE $1", 
        [`%${term}%`]
    );
    res.json(result.rows);
});

// Usajili wa majina mawili
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, phone, password } = req.body;
    const fullName = `${firstName} ${lastName}`;
    const result = await pool.query(
        "INSERT INTO users (name, phone, password, balance) VALUES ($1, $2, $3, 0) RETURNING *",
        [fullName, phone, password]
    );
    res.json({ success: true, user: result.rows[0] });
});
