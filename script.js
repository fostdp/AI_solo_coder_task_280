class NeuronLab {
    constructor() {
        this.canvas = document.getElementById('neuronCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dataCanvas = document.getElementById('dataCanvas');
        this.dataCtx = this.dataCanvas ? this.dataCanvas.getContext('2d') : null;
        
        this.currentTab = 'basic';
        this.restingPotential = -70;
        this.currentPotential = -70;
        this.threshold = -55;
        this.peakPotential = 40;
        
        this.isStimulated = false;
        this.isRunning = false;
        
        this.naChannelOpen = false;
        this.kChannelOpen = false;
        
        this.sodiumIons = [];
        this.potassiumIons = [];
        this.neurotransmitters = [];
        
        this.ttxApplied = false;
        
        this.patchSealed = false;
        this.wholeCell = false;
        this.recording = false;
        this.recordedData = [];
        
        this.learningProgress = this.loadProgress();
        this.currentStep = 1;
        
        this.nodesOfRanvier = [150, 300, 450, 600, 750];
        this.activeNode = -1;
        
        this.synapseVesicles = 10;
        this.postSynapticPotential = -70;
        
        this.init();
    }
    
    init() {
        this.setupTabListeners();
        this.setupEventListeners();
        this.updateUI();
        this.draw();
        this.animate();
    }
    
    setupTabListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
    }
    
    switchTab(tab) {
        this.currentTab = tab;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.querySelectorAll('.controls').forEach(ctrl => {
            ctrl.style.display = 'none';
        });
        document.getElementById(`${tab}Controls`).style.display = 'flex';
        
        document.getElementById('drugStatus').style.display = tab === 'drug' ? 'block' : 'none';
        document.getElementById('patchStatus').style.display = tab === 'patch' ? 'block' : 'none';
        document.getElementById('dataPanel').style.display = tab === 'patch' ? 'block' : 'none';
        document.getElementById('ttxBlocked').style.display = tab === 'drug' && this.ttxApplied ? 'flex' : 'none';
        
        if (this.currentTab !== tab) {
            this.reset();
            this.updateExplanationForTab(tab);
        }
    }
    
    updateExplanationForTab(tab) {
        const explanations = {
            basic: '🧠 基础动作电位：神经元在静息状态下，膜电位约为-70mV。受到刺激后Na⁺通道开放，产生去极化。',
            saltatory: '⚡ 跳跃传导：在有髓鞘的轴突中，动作电位只在朗飞氏结处产生，信号快速跳跃传导，速度提高约50倍。',
            synapse: '🧬 突触传递：动作电位到达突触前膜，触发神经递质释放，与突触后膜受体结合，产生突触后电位。',
            drug: '☠️ 河豚毒素(TTX)：特异性阻断电压门控Na⁺通道，阻止动作电位的产生和传导，是研究离子通道的重要工具。',
            patch: '🔬 膜片钳技术：通过形成千兆欧封接，可精确记录单个离子通道的电流，是电生理学的重要研究方法。'
        };
        document.getElementById('explanationText').textContent = explanations[tab];
    }
    
    setupEventListeners() {
        document.getElementById('stimulateBtn').addEventListener('click', () => this.stimulate());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('autoBtn').addEventListener('click', () => this.autoDemo());
        
        document.getElementById('saltatoryStimulateBtn').addEventListener('click', () => this.stimulateSaltatory());
        document.getElementById('compareBtn').addEventListener('click', () => this.showComparison());
        document.getElementById('resetSaltatoryBtn').addEventListener('click', () => this.reset());
        
        document.getElementById('synapseStimulateBtn').addEventListener('click', () => this.stimulateSynapse());
        document.getElementById('releaseNeurotransmitterBtn').addEventListener('click', () => this.releaseNeurotransmitter());
        document.getElementById('resetSynapseBtn').addEventListener('click', () => this.reset());
        
        document.getElementById('applyTTXBtn').addEventListener('click', () => this.applyTTX());
        document.getElementById('washoutBtn').addEventListener('click', () => this.washoutTTX());
        document.getElementById('drugStimulateBtn').addEventListener('click', () => this.stimulateWithDrug());
        document.getElementById('resetDrugBtn').addEventListener('click', () => this.reset());
        
        document.getElementById('sealBtn').addEventListener('click', () => this.formSeal());
        document.getElementById('breakthroughBtn').addEventListener('click', () => this.breakthrough());
        document.getElementById('recordBtn').addEventListener('click', () => this.startRecording());
        document.getElementById('stopRecordBtn').addEventListener('click', () => this.stopRecording());
        document.getElementById('resetPatchBtn').addEventListener('click', () => this.reset());
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.currentTab === 'saltatory') {
            const clickedNode = this.nodesOfRanvier.findIndex(nodeX => 
                Math.abs(x - nodeX) < 30 && Math.abs(y - 250) < 40
            );
            if (clickedNode !== -1) {
                this.stimulateNode(clickedNode);
            }
        } else if (this.currentTab === 'basic') {
            if (Math.abs(y - 250) < 60) {
                this.stimulateAtPosition(x);
            }
        }
    }
    
    stimulate() {
        if (this.isRunning) return;
        this.stimulateAtPosition(450);
    }
    
    stimulateAtPosition(position) {
        if (this.isRunning) return;
        
        this.resetState();
        this.isRunning = true;
        this.isStimulated = true;
        this.conductionPosition = position;
        this.animationTime = 0;
        
        this.runActionPotential();
    }
    
    resetState() {
        this.currentPotential = this.restingPotential;
        this.isStimulated = false;
        this.isRunning = false;
        this.naChannelOpen = false;
        this.kChannelOpen = false;
        this.sodiumIons = [];
        this.potassiumIons = [];
        this.neurotransmitters = [];
        this.animationTime = 0;
        this.phaseProgress = 0;
    }
    
    runActionPotential() {
        const phases = [
            { phase: 'depolarization', duration: 1500, naOpen: true, kOpen: false },
            { phase: 'peak', duration: 500, naOpen: true, kOpen: true },
            { phase: 'repolarization', duration: 2000, naOpen: false, kOpen: true },
            { phase: 'hyperpolarization', duration: 1500, naOpen: false, kOpen: true },
            { phase: 'resting', duration: 500, naOpen: false, kOpen: false }
        ];
        
        let currentPhase = 0;
        let phaseStartTime = Date.now();
        
        const runPhase = () => {
            const now = Date.now();
            const elapsed = now - phaseStartTime;
            const phase = phases[currentPhase];
            const progress = Math.min(elapsed / phase.duration, 1);
            
            this.naChannelOpen = phase.naOpen && !this.ttxApplied;
            this.kChannelOpen = phase.kOpen;
            
            this.updatePotential(phase.phase, progress);
            this.updateIonChannels(phase.phase, progress);
            this.updateConduction(phase.phase, progress);
            this.updateExplanation(phase.phase);
            this.updateUI();
            
            if (progress < 1) {
                requestAnimationFrame(runPhase);
            } else {
                currentPhase++;
                phaseStartTime = now;
                
                if (currentPhase === 2) {
                    this.markStepCompleted(2);
                } else if (currentPhase === 4) {
                    this.markStepCompleted(3);
                } else if (currentPhase >= phases.length) {
                    this.markStepCompleted(4);
                    this.isRunning = false;
                    this.isStimulated = false;
                    return;
                }
                
                requestAnimationFrame(runPhase);
            }
        };
        
        requestAnimationFrame(runPhase);
    }
    
    updatePotential(phase, progress) {
        switch(phase) {
            case 'depolarization':
                if (this.ttxApplied) {
                    this.currentPotential = this.restingPotential + 10 * this.easeInOutQuad(progress);
                } else {
                    this.currentPotential = this.restingPotential + (this.peakPotential - this.restingPotential) * this.easeInOutQuad(progress);
                }
                break;
            case 'peak':
                this.currentPotential = this.ttxApplied ? -60 : this.peakPotential;
                break;
            case 'repolarization':
                this.currentPotential = (this.ttxApplied ? -60 : this.peakPotential) + (this.restingPotential - (this.ttxApplied ? -60 : this.peakPotential)) * this.easeInOutQuad(progress);
                break;
            case 'hyperpolarization':
                this.currentPotential = this.restingPotential + (-10) * (1 - this.easeInOutQuad(progress));
                break;
            case 'resting':
                this.currentPotential = this.restingPotential;
                break;
        }
    }
    
    updateIonChannels(phase, progress) {
        if (this.naChannelOpen && phase === 'depolarization') {
            this.addSodiumIons();
        }
        
        if (this.kChannelOpen && (phase === 'repolarization' || phase === 'hyperpolarization')) {
            this.addPotassiumIons();
        }
    }
    
    updateConduction(phase, progress) {
        if (this.currentTab === 'saltatory') return;
        
        if (phase === 'depolarization' || phase === 'repolarization') {
            const spreadSpeed = 150;
            this.conductionPosition += (progress > 0.5 ? 1 : -1) * spreadSpeed * 0.016;
            this.conductionPosition = Math.max(100, Math.min(800, this.conductionPosition));
        }
    }
    
    addSodiumIons() {
        for (let i = 0; i < 2; i++) {
            this.sodiumIons.push({
                x: this.conductionPosition + (Math.random() - 0.5) * 80,
                y: 220,
                targetY: 280,
                speed: 2 + Math.random() * 2,
                life: 1
            });
        }
    }
    
    addPotassiumIons() {
        for (let i = 0; i < 2; i++) {
            this.potassiumIons.push({
                x: this.conductionPosition + (Math.random() - 0.5) * 80,
                y: 280,
                targetY: 220,
                speed: 2 + Math.random() * 2,
                life: 1
            });
        }
    }
    
    stimulateSaltatory() {
        if (this.isRunning) return;
        this.resetState();
        this.stimulateNode(0);
        this.markStepCompleted(5);
    }
    
    stimulateNode(nodeIndex) {
        if (this.isRunning) return;
        
        if (nodeIndex < 0 || nodeIndex >= this.nodesOfRanvier.length) {
            console.warn('Invalid node index:', nodeIndex);
            return;
        }
        
        this.resetState();
        this.isRunning = true;
        this.activeNode = nodeIndex;
        
        let node = nodeIndex;
        const animateNode = () => {
            if (node >= this.nodesOfRanvier.length) {
                this.isRunning = false;
                this.activeNode = -1;
                this.currentPotential = -70;
                this.naChannelOpen = false;
                this.kChannelOpen = false;
                this.updateUI();
                return;
            }
            
            if (typeof this.nodesOfRanvier[node] !== 'number') {
                console.error('Invalid node position at index:', node);
                node++;
                requestAnimationFrame(animateNode);
                return;
            }
            
            this.activeNode = node;
            this.conductionPosition = this.nodesOfRanvier[node];
            
            let phaseProgress = 0;
            const nodeAnimation = () => {
                phaseProgress += 0.02;
                
                if (phaseProgress < 0.5) {
                    this.naChannelOpen = true;
                    this.currentPotential = -70 + 110 * (phaseProgress * 2);
                    this.addSodiumIons();
                } else if (phaseProgress < 1) {
                    this.kChannelOpen = true;
                    this.currentPotential = 40 - 120 * ((phaseProgress - 0.5) * 2);
                    this.addPotassiumIons();
                }
                
                this.updateUI();
                
                if (phaseProgress < 1.2) {
                    requestAnimationFrame(nodeAnimation);
                } else {
                    this.naChannelOpen = false;
                    this.kChannelOpen = false;
                    this.currentPotential = -70;
                    node++;
                    setTimeout(() => requestAnimationFrame(animateNode), 150);
                }
            };
            
            requestAnimationFrame(nodeAnimation);
        };
        
        animateNode();
    }
    
    showComparison() {
        const msg = `📊 传导速度对比：
        
无髓鞘轴突：约 0.5 - 2 m/s
有髓鞘轴突：约 20 - 120 m/s

跳跃传导速度提高约 50 - 100 倍！

这是因为：
1. 动作电位只在朗飞氏结产生
2. 髓鞘绝缘减少离子泄漏
3. 电信号在结间快速传递`;
        
        alert(msg);
    }
    
    stimulateSynapse() {
        if (this.isRunning) return;
        this.resetState();
        this.isRunning = true;
        this.markStepCompleted(6);
        
        let phase = 0;
        const animateSynapse = () => {
            phase++;
            
            if (phase <= 30) {
                this.conductionPosition = 300 + phase * 15;
                this.currentPotential = -70 + 110 * Math.min(phase / 15, 1);
                this.naChannelOpen = phase < 20;
                if (phase < 20) this.addSodiumIons();
            } else if (phase <= 60) {
                if (phase === 35) {
                    this.releaseVesicles();
                }
                this.currentPotential = 40 - 110 * Math.min((phase - 30) / 30, 1);
                this.kChannelOpen = phase < 50;
                if (phase < 50) this.addPotassiumIons();
            } else if (phase <= 90) {
                this.postSynapticPotential = -70 + 20 * Math.min((phase - 60) / 30, 1);
            } else {
                this.isRunning = false;
                this.naChannelOpen = false;
                this.kChannelOpen = false;
                this.currentPotential = -70;
                this.postSynapticPotential = -70;
                this.synapseVesicles = 10;
                return;
            }
            
            this.updateUI();
            requestAnimationFrame(animateSynapse);
        };
        
        animateSynapse();
    }
    
    releaseNeurotransmitter() {
        this.releaseVesicles();
        this.markStepCompleted(6);
    }
    
    releaseVesicles() {
        for (let i = 0; i < 5; i++) {
            this.neurotransmitters.push({
                x: 520 + Math.random() * 30,
                y: 240 + Math.random() * 40,
                vx: 2 + Math.random(),
                vy: (Math.random() - 0.5) * 2,
                life: 1
            });
        }
        this.synapseVesicles = Math.max(0, this.synapseVesicles - 2);
    }
    
    applyTTX() {
        this.ttxApplied = true;
        document.getElementById('ttxBlocked').style.display = 'flex';
        document.getElementById('drugStatusText').textContent = 'TTX已应用';
        document.getElementById('drugStatusText').className = 'channel-status open';
        this.markStepCompleted(7);
        
        const ctx = this.ctx;
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                ctx.fillStyle = 'rgba(128, 0, 128, 0.3)';
                ctx.beginPath();
                ctx.arc(
                    100 + Math.random() * 700,
                    200 + Math.random() * 100,
                    5 + Math.random() * 10,
                    0, Math.PI * 2
                );
                ctx.fill();
            }, i * 50);
        }
    }
    
    washoutTTX() {
        this.ttxApplied = false;
        document.getElementById('ttxBlocked').style.display = 'none';
        document.getElementById('drugStatusText').textContent = '无药物';
        document.getElementById('drugStatusText').className = 'channel-status closed';
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.draw();
        
        this.updateExplanationForTab(this.currentTab);
        this.updateUI();
    }
    
    stimulateWithDrug() {
        if (this.isRunning) return;
        this.resetState();
        this.stimulateAtPosition(450);
    }
    
    formSeal() {
        this.patchSealed = true;
        document.getElementById('patchStatusText').textContent = '封接成功';
        document.getElementById('sealBtn').disabled = true;
        document.getElementById('breakthroughBtn').disabled = false;
        
        let resistance = 0;
        const sealAnimation = () => {
            resistance += 50;
            if (resistance < 1000) {
                document.getElementById('patchStatusText').textContent = `封接中: ${resistance} MΩ`;
                requestAnimationFrame(sealAnimation);
            } else {
                document.getElementById('patchStatusText').textContent = '千兆欧封接 ✓';
            }
        };
        sealAnimation();
    }
    
    breakthrough() {
        if (!this.patchSealed) return;
        this.wholeCell = true;
        document.getElementById('patchStatusText').textContent = '全细胞记录模式';
        document.getElementById('breakthroughBtn').disabled = true;
        document.getElementById('recordBtn').disabled = false;
        this.markStepCompleted(8);
    }
    
    startRecording() {
        if (!this.wholeCell) return;
        this.recording = true;
        this.recordedData = [];
        document.getElementById('recordBtn').disabled = true;
        document.getElementById('stopRecordBtn').disabled = false;
        
        let frame = 0;
        const record = () => {
            if (!this.recording) return;
            
            const noise = (Math.random() - 0.5) * 2;
            let current = noise;
            
            if (frame % 100 > 20 && frame % 100 < 30) {
                current = -10 + noise;
            }
            
            this.recordedData.push(current);
            if (this.recordedData.length > 300) {
                this.recordedData.shift();
            }
            
            this.drawData();
            frame++;
            requestAnimationFrame(record);
        };
        record();
    }
    
    stopRecording() {
        this.recording = false;
        document.getElementById('recordBtn').disabled = false;
        document.getElementById('stopRecordBtn').disabled = true;
    }
    
    drawData() {
        if (!this.dataCtx) return;
        
        const ctx = this.dataCtx;
        const w = this.dataCanvas.width;
        const h = this.dataCanvas.height;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            ctx.beginPath();
            ctx.moveTo(0, h / 4 * i);
            ctx.lineTo(w, h / 4 * i);
            ctx.stroke();
        }
        
        if (this.recordedData.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#1e3c72';
            ctx.lineWidth = 2;
            
            this.recordedData.forEach((val, i) => {
                const x = (i / this.recordedData.length) * w;
                const y = h / 2 + val * 3;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }
        
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.fillText('单通道电流记录', 10, 20);
    }
    
    updateExplanation(phase) {
        const explanations = {
            depolarization: '⚡ 去极化：刺激达到阈值，Na⁺通道大量开放，Na⁺快速内流，膜电位迅速上升。',
            peak: '🔺 峰值：膜电位达到峰值约+40mV，Na⁺通道开始失活关闭。',
            repolarization: '🔽 复极化：K⁺通道开放，K⁺外流，膜电位快速下降恢复静息水平。',
            hyperpolarization: '📉 超极化：K⁺通道延迟关闭，膜电位短暂低于静息电位。',
            resting: '💤 静息状态：钠钾泵工作，恢复离子分布，膜电位回到-70mV。'
        };
        
        if (this.currentTab === 'basic') {
            document.getElementById('explanationText').textContent = explanations[phase] || '';
        }
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        switch(this.currentTab) {
            case 'basic':
                this.drawBasicAxon();
                break;
            case 'saltatory':
                this.drawMyelinatedAxon();
                break;
            case 'synapse':
                this.drawSynapse();
                break;
            case 'drug':
                this.drawDrugAxon();
                break;
            case 'patch':
                this.drawPatchClamp();
                break;
        }
        
        this.drawIons();
    }
    
    drawBasicAxon() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(100, 250);
        ctx.lineTo(800, 250);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(74, 144, 217, 0.3)';
        ctx.lineWidth = 25;
        ctx.beginPath();
        ctx.moveTo(100, 250);
        ctx.lineTo(800, 250);
        ctx.stroke();
        
        ctx.fillStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.ellipse(70, 250, 35, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(65, 245, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        this.drawChannels(300, 250);
        this.drawChannels(450, 250);
        this.drawChannels(600, 250);
        
        if (this.isStimulated) {
            const gradient = ctx.createRadialGradient(
                this.conductionPosition, 250, 0,
                this.conductionPosition, 250, 50
            );
            gradient.addColorStop(0, 'rgba(255, 107, 107, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.conductionPosition, 250, 50, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#1e3c72';
        ctx.fillText('胞体', 50, 300);
        ctx.fillText('轴突', 430, 210);
        ctx.fillText('突触末梢', 750, 300);
        
        this.drawMembranePotentialGraph();
    }
    
    drawMyelinatedAxon() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(80, 250);
        ctx.lineTo(820, 250);
        ctx.stroke();
        
        for (let i = 0; i < 5; i++) {
            const x = 100 + i * 140;
            ctx.fillStyle = '#f5f5dc';
            ctx.strokeStyle = '#d4a574';
            ctx.lineWidth = 2;
            
            for (let j = 0; j < 6; j++) {
                ctx.beginPath();
                ctx.ellipse(x + j * 12, 250, 18, 30 - j * 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
        
        this.nodesOfRanvier.forEach((x, i) => {
            ctx.fillStyle = this.activeNode === i ? '#ff6b6b' : '#ffc107';
            ctx.beginPath();
            ctx.ellipse(x, 250, 20, 25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`结${i + 1}`, x, 254);
            
            this.drawChannels(x, 250);
        });
        ctx.textAlign = 'left';
        
        ctx.fillStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.ellipse(50, 250, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#1e3c72';
        ctx.fillText('有髓鞘轴突 - 跳跃传导', 350, 180);
        ctx.fillText('髓鞘', 130, 220);
        ctx.fillText('朗飞氏结', 420, 295);
        
        this.drawMembranePotentialGraph();
    }
    
    drawSynapse() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(100, 250);
        ctx.lineTo(500, 250);
        ctx.stroke();
        
        ctx.fillStyle = '#5a9fd4';
        ctx.beginPath();
        ctx.ellipse(520, 250, 40, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        
        for (let i = 0; i < this.synapseVesicles; i++) {
            ctx.fillStyle = '#9c27b0';
            ctx.beginPath();
            ctx.arc(500 + (i % 5) * 8, 235 + Math.floor(i / 5) * 15, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(560, 220);
        ctx.lineTo(560, 280);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(100, 100, 255, 0.1)';
        ctx.fillRect(560, 220, 30, 60);
        
        ctx.fillStyle = '#7cb342';
        ctx.beginPath();
        ctx.ellipse(600, 250, 45, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#7cb342';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(645, 250);
        ctx.lineTo(800, 250);
        ctx.stroke();
        
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = '#e91e63';
            ctx.beginPath();
            ctx.arc(590 + i * 10, 250, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        this.neurotransmitters.forEach((nt, i) => {
            ctx.globalAlpha = nt.life;
            ctx.fillStyle = '#9c27b0';
            ctx.beginPath();
            ctx.arc(nt.x, nt.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#1e3c72';
        ctx.fillText('突触前神经元', 200, 220);
        ctx.fillText('突触间隙', 550, 210);
        ctx.fillText('突触后神经元', 650, 220);
        ctx.fillText('神经递质', 550, 310);
        ctx.fillText('受体', 585, 290);
        
        if (this.isRunning) {
            ctx.fillStyle = '#ff6b6b';
            ctx.font = '16px Arial';
            ctx.fillText(`突触后电位: ${Math.round(this.postSynapticPotential)} mV`, 350, 350);
        }
    }
    
    drawDrugAxon() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(100, 250);
        ctx.lineTo(800, 250);
        ctx.stroke();
        
        this.drawChannels(300, 250);
        this.drawChannels(450, 250);
        this.drawChannels(600, 250);
        
        if (this.ttxApplied) {
            ctx.fillStyle = 'rgba(128, 0, 128, 0.4)';
            
            [300, 450, 600].forEach(x => {
                ctx.beginPath();
                ctx.arc(x, 230, 15, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('TTX', x, 234);
                ctx.fillStyle = 'rgba(128, 0, 128, 0.4)';
            });
            ctx.textAlign = 'left';
        }
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#1e3c72';
        ctx.fillText(this.ttxApplied ? '☠️ Na⁺通道被河豚毒素阻断' : '💊 添加河豚毒素观察效果', 300, 180);
        
        this.drawMembranePotentialGraph();
    }
    
    drawPatchClamp() {
        const ctx = this.ctx;
        
        ctx.fillStyle = '#ffb74d';
        ctx.beginPath();
        ctx.ellipse(450, 250, 150, 100, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.ellipse(450, 250, 130, 80, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(450, 100);
        ctx.lineTo(450, 200);
        ctx.stroke();
        
        ctx.strokeStyle = '#546e7a';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(450, 180);
        ctx.lineTo(450, 200);
        ctx.stroke();
        
        if (this.patchSealed) {
            ctx.fillStyle = 'rgba(76, 175, 80, 0.5)';
            ctx.beginPath();
            ctx.arc(450, 210, 25, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#4caf50';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(450, 210, 25, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.fillStyle = '#e57373';
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const x = 450 + Math.cos(angle) * 100;
            const y = 250 + Math.sin(angle) * 60;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#1e3c72';
        ctx.fillText('细胞膜', 550, 250);
        ctx.fillText('玻璃微电极', 470, 130);
        
        if (this.patchSealed) {
            ctx.fillStyle = '#4caf50';
            ctx.fillText('✓ 千兆欧封接', 470, 210);
        }
        
        if (this.wholeCell) {
            ctx.fillStyle = '#2196f3';
            ctx.fillText('✓ 全细胞模式', 470, 230);
        }
        
        if (this.recording) {
            ctx.fillStyle = '#f44336';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('🔴 正在记录...', 200, 150);
        }
    }
    
    drawChannels(x, y) {
        const ctx = this.ctx;
        
        ctx.fillStyle = this.naChannelOpen && !this.ttxApplied ? '#4caf50' : '#f44336';
        ctx.beginPath();
        ctx.ellipse(x, y - 25, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Na', x, y - 22);
        
        ctx.fillStyle = this.kChannelOpen ? '#4caf50' : '#f44336';
        ctx.beginPath();
        ctx.ellipse(x, y + 25, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.fillText('K', x, y + 28);
        
        ctx.textAlign = 'left';
    }
    
    drawMembranePotentialGraph() {
        const ctx = this.ctx;
        const graphX = 100;
        const graphY = 380;
        const graphWidth = 700;
        const graphHeight = 120;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(graphX - 10, graphY - 20, graphWidth + 20, graphHeight + 30);
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const yPos = graphY + (graphHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(graphX, yPos);
            ctx.lineTo(graphX + graphWidth, yPos);
            ctx.stroke();
        }
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(graphX, graphY + graphHeight / 2);
        ctx.lineTo(graphX + graphWidth, graphY + graphHeight / 2);
        ctx.stroke();
        
        const potentialToY = (potential) => {
            const normalized = (potential + 100) / 140;
            return graphY + graphHeight - normalized * graphHeight;
        };
        
        ctx.beginPath();
        ctx.strokeStyle = this.ttxApplied ? '#9c27b0' : '#ff6b6b';
        ctx.lineWidth = 3;
        
        for (let i = 0; i <= 100; i++) {
            const x = graphX + (graphWidth / 100) * i;
            const progress = i / 100;
            let potential = this.restingPotential;
            
            if (this.isRunning || this.isStimulated) {
                if (this.ttxApplied) {
                    if (progress < 0.3) {
                        potential = -70 + 10 * (progress / 0.3);
                    } else if (progress < 0.6) {
                        potential = -60 - 10 * ((progress - 0.3) / 0.3);
                    }
                } else {
                    if (progress < 0.2) {
                        const p = progress / 0.2;
                        potential = this.restingPotential + (this.peakPotential - this.restingPotential) * this.easeInOutQuad(p);
                    } else if (progress < 0.5) {
                        const p = (progress - 0.2) / 0.3;
                        potential = this.peakPotential + (-80 - this.peakPotential) * this.easeInOutQuad(p);
                    } else if (progress < 0.7) {
                        const p = (progress - 0.5) / 0.2;
                        potential = -80 + (this.restingPotential - (-80)) * this.easeInOutQuad(p);
                    }
                }
            }
            
            if (i === 0) {
                ctx.moveTo(x, potentialToY(potential));
            } else {
                ctx.lineTo(x, potentialToY(potential));
            }
        }
        ctx.stroke();
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('+40mV', graphX - 45, potentialToY(40));
        ctx.fillText('-70mV', graphX - 45, potentialToY(-70));
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#1e3c72';
        ctx.fillText('膜电位变化', graphX + 10, graphY - 5);
    }
    
    drawIons() {
        const ctx = this.ctx;
        
        this.sodiumIons = this.sodiumIons.filter(ion => {
            ion.y += (ion.targetY - ion.y) * 0.05;
            ion.life -= 0.008;
            
            if (ion.life > 0) {
                ctx.globalAlpha = ion.life;
                ctx.fillStyle = '#ff9800';
                ctx.beginPath();
                ctx.arc(ion.x, ion.y, 5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 7px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Na⁺', ion.x, ion.y + 2);
                return true;
            }
            return false;
        });
        
        this.potassiumIons = this.potassiumIons.filter(ion => {
            ion.y += (ion.targetY - ion.y) * 0.05;
            ion.life -= 0.008;
            
            if (ion.life > 0) {
                ctx.globalAlpha = ion.life;
                ctx.fillStyle = '#9c27b0';
                ctx.beginPath();
                ctx.arc(ion.x, ion.y, 5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 7px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('K⁺', ion.x, ion.y + 2);
                return true;
            }
            return false;
        });
        
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }
    
    updateUI() {
        const stateEl = document.getElementById('currentState');
        const potentialEl = document.getElementById('potentialValue');
        const naChannelEl = document.getElementById('naChannel');
        const kChannelEl = document.getElementById('kChannel');
        
        const displayPotential = this.currentTab === 'synapse' && this.isRunning ? 
            this.postSynapticPotential : this.currentPotential;
        potentialEl.textContent = Math.round(displayPotential) + ' mV';
        
        if (this.currentPotential < -72) {
            stateEl.className = 'state hyperpolarized';
            stateEl.textContent = '超极化';
        } else if (this.currentPotential < -65) {
            stateEl.className = 'state resting';
            stateEl.textContent = '静息电位';
        } else if (this.currentPotential < 0) {
            stateEl.className = 'state depolarizing';
            stateEl.textContent = '去极化中';
        } else {
            stateEl.className = 'state depolarizing';
            stateEl.textContent = '去极化峰值';
        }
        
        naChannelEl.className = 'channel-status ' + (this.naChannelOpen ? 'open' : 'closed');
        naChannelEl.textContent = this.naChannelOpen ? '开放' : '关闭';
        
        kChannelEl.className = 'channel-status ' + (this.kChannelOpen ? 'open' : 'closed');
        kChannelEl.textContent = this.kChannelOpen ? '开放' : '关闭';
        
        this.updateProgressUI();
    }
    
    markStepCompleted(step) {
        if (step > this.learningProgress) {
            this.learningProgress = step;
            this.saveProgress();
        }
        
        const stepEl = document.getElementById('step' + step);
        if (stepEl) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        }
        
        if (step < 8) {
            const nextStepEl = document.getElementById('step' + (step + 1));
            if (nextStepEl) {
                nextStepEl.classList.add('active');
            }
        }
    }
    
    updateProgressUI() {
        const progress = Math.min((this.learningProgress / 8) * 100, 100);
        document.getElementById('progressText').textContent = Math.round(progress) + '%';
        document.getElementById('progressFill').style.width = progress + '%';
    }
    
    saveProgress() {
        localStorage.setItem('neuronLabProgress', JSON.stringify({
            step: this.learningProgress,
            timestamp: Date.now()
        }));
    }
    
    loadProgress() {
        try {
            const saved = localStorage.getItem('neuronLabProgress');
            if (saved) {
                const data = JSON.parse(saved);
                for (let i = 1; i <= data.step; i++) {
                    const stepEl = document.getElementById('step' + i);
                    if (stepEl) stepEl.classList.add('completed');
                }
                if (data.step < 8) {
                    const nextStepEl = document.getElementById('step' + (data.step + 1));
                    if (nextStepEl) nextStepEl.classList.add('active');
                }
                return data.step;
            }
        } catch (e) {
            console.log('No saved progress found');
        }
        return 0;
    }
    
    reset() {
        this.resetState();
        this.postSynapticPotential = -70;
        this.activeNode = -1;
        this.synapseVesicles = 10;
        this.ttxApplied = false;
        
        if (this.currentTab === 'patch') {
            this.patchSealed = false;
            this.wholeCell = false;
            this.recording = false;
            this.recordedData = [];
            document.getElementById('sealBtn').disabled = false;
            document.getElementById('breakthroughBtn').disabled = true;
            document.getElementById('recordBtn').disabled = true;
            document.getElementById('stopRecordBtn').disabled = true;
            document.getElementById('patchStatusText').textContent = '未封接';
        }
        
        document.getElementById('ttxBlocked').style.display = 'none';
        document.getElementById('drugStatusText').textContent = '无药物';
        document.getElementById('drugStatusText').className = 'channel-status closed';
        
        this.updateExplanationForTab(this.currentTab);
        this.updateUI();
        this.draw();
    }
    
    autoDemo() {
        if (this.isRunning) return;
        
        this.reset();
        setTimeout(() => {
            this.stimulateAtPosition(450);
        }, 500);
    }
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    
    animate() {
        this.neurotransmitters = this.neurotransmitters.filter(nt => {
            nt.x += nt.vx;
            nt.y += nt.vy;
            nt.life -= 0.005;
            return nt.life > 0 && nt.x < 600;
        });
        
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NeuronLab();
});
