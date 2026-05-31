const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'progress.json');

function readProgressData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.log('Error reading progress data:', e);
    }
    return {};
}

function writeProgressData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.log('Error writing progress data:', e);
        return false;
    }
}

app.get('/api/progress/:userId', (req, res) => {
    const { userId } = req.params;
    const allProgress = readProgressData();
    const userProgress = allProgress[userId] || { step: 0, timestamp: Date.now() };
    res.json(userProgress);
});

app.post('/api/progress/:userId', (req, res) => {
    const { userId } = req.params;
    const { step } = req.body;
    
    const allProgress = readProgressData();
    allProgress[userId] = {
        step: step,
        timestamp: Date.now()
    };
    
    if (writeProgressData(allProgress)) {
        res.json({ success: true, step: step });
    } else {
        res.status(500).json({ success: false, error: 'Failed to save progress' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🧠 动作电位模拟服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 学习进度将保存在 ${DATA_FILE}`);
});
