const express = require('express');
const cors = require('cors');
const pool = require('./db/mysql');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;
const propertiesRouter = require('./routes/properties');
app.use('/api/properties', propertiesRouter);
app.use(cors());
app.use(express.json());
app.get('/api/health', async (req, res) => {
try {
await pool.query('SELECT 1');
res.json({ status: 'ok', database: 'connected' });
} catch (error) {
res.status(500).json({ status: 'error', message: error.message });
}
});
app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});