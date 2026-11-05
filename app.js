document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. BROWSER BACK BUTTON WARNING ---
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        window.history.pushState(null, null, window.location.href);
        window.addEventListener('popstate', (event) => {
            const leave = confirm("Are you sure you want to go back? Any unsaved work in this portal will be lost.");
            if (leave) {
                window.history.back();
            } else {
                window.history.pushState(null, null, window.location.href);
            }
        });
    }

    // --- 2. INITIALIZE LOCAL DATABASE ---
    const initDatabase = () => {
        if (!localStorage.getItem('mediflow_db_init')) {
            localStorage.setItem('receptionQ', JSON.stringify([]));
            localStorage.setItem('doctorQ', JSON.stringify([]));
            localStorage.setItem('pharmacyQ', JSON.stringify([]));
            localStorage.setItem('billingQ', JSON.stringify([]));
            localStorage.setItem('billStats', JSON.stringify({ rev: 0, count: 0 }));
            localStorage.setItem('tokenCounter', '40'); 
            localStorage.setItem('mediflow_db_init', 'true');
        }
    };
    initDatabase();

    const getDB = (key) => JSON.parse(localStorage.getItem(key));
    const setDB = (key, data) => localStorage.setItem(key, JSON.stringify(data));

    // --- GLOBAL SIDEBAR ---
    const sidebarToggle = document.getElementById('toggle-sidebar');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));
    }

    // --- LOGIN & PATIENT REGISTRATION ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');

    // Toggle to Register View
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.style.display = 'none';
        registerView.style.display = 'block';
    });

    // Toggle to Login View
    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.style.display = 'none';
        loginView.style.display = 'block';
    });

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            window.location.href = `${document.getElementById('role').value}.html`;
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = document.getElementById('reg-phone').value.trim();
            
            if (!/^\d{10}$/.test(phone)) {
                alert("Please enter a valid 10-digit mobile number.");
                return;
            }

            alert('Patient account created successfully! You can now sign in to the Patient Dashboard.');
            registerForm.reset();
            registerView.style.display = 'none';
            loginView.style.display = 'block';
            
            // Automatically select Patient Dashboard after registering
            document.getElementById('role').value = 'patient';
        });
    }

    // --- RECEPTION MODULE ---
    if (document.getElementById('queue-body')) {
        const renderReception = () => {
            const rPatients = getDB('receptionQ');
            const tbody = document.getElementById('queue-body');
            tbody.innerHTML = '';
            
            if (rPatients.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:gray;">No patients registered yet.</td></tr>';
            }

            rPatients.forEach(p => {
                const badge = p.status === 'Waiting' ? 'waiting' : 'consulting';
                tbody.innerHTML += `<tr><td><strong>${p.token}</strong></td><td>${p.name}<br><span style="font-size:12px;color:gray;">${p.phone}</span></td><td>${p.time}</td><td><span class="badge ${badge}">${p.status}</span></td></tr>`;
            });
        };
        renderReception();

        document.getElementById('reg-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('patient-name').value.trim();
            const phone = document.getElementById('patient-phone').value.trim();
            const type = document.getElementById('consultation-type').value;
            
            if (!name) {
                alert("Please enter a valid patient name.");
                return;
            }
            if (!/^\d{10}$/.test(phone)) {
                alert("Please enter a valid 10-digit mobile number containing only numbers.");
                return;
            }
            
            const recQ = getDB('receptionQ');
            const docQ = getDB('doctorQ');
            let tCounter = parseInt(localStorage.getItem('tokenCounter')) + 1;
            const token = `A-${tCounter}`;
            localStorage.setItem('tokenCounter', tCounter.toString());
            
            recQ.push({ token, name, phone, type, time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), status: 'Waiting' });
            
            docQ.push({ token, name, age: '35/U', history: `Phone: ${phone} | Type: ${type}`, temp: '98.4°F', bp: '120/80', spo2: '99%' });
            
            setDB('receptionQ', recQ);
            setDB('doctorQ', docQ);
            
            renderReception(); 
            e.target.reset(); 
            alert(`${name} registered successfully! Sent to Doctor queue. Token: ${token}`);
        });
    }

    // --- DOCTOR MODULE ---
    if (document.getElementById('doctor-queue')) {
        let activeIdx = null;

        const updateDoctorUI = () => {
            const docQ = getDB('doctorQ');
            if (activeIdx === null || !docQ[activeIdx]) {
                document.getElementById('p-name').innerText = '--'; document.getElementById('p-demographics').innerText = '--'; document.getElementById('p-history').innerText = '--';
                document.getElementById('v-temp').innerText = '--'; document.getElementById('v-bp').innerText = '--'; document.getElementById('v-spo2').innerText = '--';
                document.getElementById('active-token').innerText = 'No Patient Selected';
                document.getElementById('active-token').className = 'badge waiting';
                document.getElementById('clinical-notes').disabled = true; document.getElementById('medicines').disabled = true; document.getElementById('btn-prescribe').disabled = true;
            } else {
                const p = docQ[activeIdx];
                document.getElementById('p-name').innerText = p.name; document.getElementById('p-demographics').innerText = p.age; document.getElementById('p-history').innerText = p.history;
                document.getElementById('v-temp').innerText = p.temp; document.getElementById('v-bp').innerText = p.bp; document.getElementById('v-spo2').innerText = p.spo2;
                document.getElementById('active-token').innerText = `Token: ${p.token}`;
                document.getElementById('active-token').className = 'badge consulting';
                document.getElementById('clinical-notes').disabled = false; document.getElementById('medicines').disabled = false; document.getElementById('btn-prescribe').disabled = false;
            }
        };
        
        const renderDoctor = () => {
            const docQ = getDB('doctorQ');
            const dq = document.getElementById('doctor-queue'); dq.innerHTML = '';
            
            if(docQ.length === 0) dq.innerHTML = '<p style="color:gray; font-size:14px;">No patients waiting.</p>';
            
            docQ.forEach((p, i) => {
                const div = document.createElement('div');
                div.className = `queue-item ${activeIdx === i ? 'active' : ''}`;
                div.innerHTML = `<strong>${p.token}</strong> <span>${p.name}</span>`;
                div.onclick = () => {
                    activeIdx = i; 
                    renderDoctor();
                    updateDoctorUI();
                };
                dq.appendChild(div);
            });
        };
        
        renderDoctor();
        updateDoctorUI();

        document.getElementById('prescription-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const notesText = document.getElementById('clinical-notes').value.trim();
            const medsText = document.getElementById('medicines').value.trim();
            
            if (!notesText || !medsText) {
                alert("Please fill out both clinical notes and digital prescription before submitting.");
                return;
            }

            const docQ = getDB('doctorQ');
            const pharQ = getDB('pharmacyQ');
            const billQ = getDB('billingQ');
            const recQ = getDB('receptionQ');
            
            const patient = docQ[activeIdx];
            
            const rIdx = recQ.findIndex(r => r.token === patient.token);
            if (rIdx > -1) recQ[rIdx].status = 'Consulted';
            
            pharQ.push({ token: patient.token, name: patient.name, doc: 'Dr. Smith', meds: [{ name: 'Prescribed Regimen', dose: medsText }] });
            billQ.push({ token: patient.token, name: patient.name, desc: 'Doctor Consultation', amt: 125.00, status: 'Pending' });

            docQ.splice(activeIdx, 1); 
            activeIdx = null; 
            
            setDB('doctorQ', docQ); setDB('pharmacyQ', pharQ); setDB('billingQ', billQ); setDB('receptionQ', recQ);
            
            e.target.reset();
            updateDoctorUI();
            renderDoctor();
            alert(`Consultation finished! Prescription sent to Pharmacy, and Consultation fee sent to Billing.`);
        });
    }

    // --- PHARMACY MODULE ---
    if (document.getElementById('pharmacy-queue')) {
        let activePhIdx = null;

        const updatePharmacyUI = () => {
            const pharQ = getDB('pharmacyQ');
            if (activePhIdx === null || !pharQ[activePhIdx]) {
                document.getElementById('ph-name').innerText = '--'; document.getElementById('ph-token').innerText = '--'; document.getElementById('ph-doc').innerText = '--';
                document.getElementById('medicine-list').innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Select an order to view medicines.</p>';
                document.getElementById('pharmacy-status').innerText = 'No Order Selected';
                document.getElementById('pharmacy-status').className = 'badge waiting';
                document.getElementById('btn-dispense').disabled = true;
            } else {
                const o = pharQ[activePhIdx];
                document.getElementById('ph-name').innerText = o.name; document.getElementById('ph-token').innerText = o.token; document.getElementById('ph-doc').innerText = o.doc;
                document.getElementById('pharmacy-status').innerText = 'Preparing Order';
                document.getElementById('pharmacy-status').className = 'badge consulting';
                
                const mList = document.getElementById('medicine-list'); mList.innerHTML = '';
                o.meds.forEach(m => {
                    mList.innerHTML += `<div class="medicine-item"><div class="medicine-details"><strong>${m.name}</strong><span>${m.dose}</span></div></div>`;
                });
                document.getElementById('btn-dispense').disabled = false;
            }
        };
        
        const renderPharmacy = () => {
            const pharQ = getDB('pharmacyQ');
            const pq = document.getElementById('pharmacy-queue'); pq.innerHTML = '';
            
            if(pharQ.length === 0) pq.innerHTML = '<p style="color: gray; font-size: 14px;">No pending orders.</p>';
            
            pharQ.forEach((o, i) => {
                const div = document.createElement('div');
                div.className = `queue-item ${activePhIdx === i ? 'active' : ''}`;
                div.innerHTML = `<strong>${o.token}</strong> <span>${o.name}</span>`;
                div.onclick = () => {
                    activePhIdx = i; 
                    renderPharmacy();
                    updatePharmacyUI();
                };
                pq.appendChild(div);
            });
        };
        
        renderPharmacy();
        updatePharmacyUI();
        
        document.getElementById('btn-dispense')?.addEventListener('click', () => {
            const pharQ = getDB('pharmacyQ');
            const billQ = getDB('billingQ');
            const patient = pharQ[activePhIdx];
            
            billQ.push({ token: patient.token, name: patient.name, desc: 'Pharmacy Medications', amt: 45.50, status: 'Pending' });
            
            pharQ.splice(activePhIdx, 1); 
            activePhIdx = null;
            
            setDB('pharmacyQ', pharQ); setDB('billingQ', billQ);

            updatePharmacyUI();
            renderPharmacy();
            alert(`Medicines dispensed! Bill sent to Billing Department.`);
        });
    }

    // --- BILLING MODULE ---
    if (document.getElementById('billing-body')) {
        const renderBilling = () => {
            const billQ = getDB('billingQ');
            const stats = getDB('billStats');
            const bb = document.getElementById('billing-body'); bb.innerHTML = '';
            
            document.getElementById('pending-count').innerText = billQ.filter(b => b.status === 'Pending').length;
            document.getElementById('total-revenue').innerText = `$${stats.rev.toFixed(2)}`;
            document.getElementById('processed-count').innerText = stats.count;

            if (billQ.length === 0) {
                bb.innerHTML = '<tr><td colspan="4" style="text-align:center; color:gray;">No invoices generated yet.</td></tr>';
            }

            billQ.forEach((b, i) => {
                const tr = document.createElement('tr');
                const badge = b.status === 'Pending' ? 'waiting' : 'paid';
                tr.innerHTML = `<td><strong>${b.token}</strong><br><span style="font-size:12px;color:gray;">${b.name}</span></td><td>${b.desc}</td><td><strong>$${b.amt.toFixed(2)}</strong></td>`;
                
                const tdAct = document.createElement('td');
                if (b.status === 'Pending') {
                    const btn = document.createElement('button'); btn.className = 'btn-small'; btn.innerText = 'Process Payment';
                    btn.onclick = () => { 
                        billQ[i].status = 'Paid'; 
                        stats.rev += b.amt; stats.count++; 
                        setDB('billingQ', billQ); setDB('billStats', stats);
                        alert(`Payment of $${b.amt.toFixed(2)} processed for ${b.name}`); 
                        renderBilling();
                    };
                    tdAct.appendChild(btn);
                } else {
                    tdAct.innerHTML = `<span class="badge ${badge}">Paid</span>`;
                }
                tr.appendChild(tdAct); bb.appendChild(tr);
            });
        };
        renderBilling();
        
        const header = document.querySelector('.top-header h1');
        if (header && !document.getElementById('reset-db-btn')) {
            const resetBtn = document.createElement('button');
            resetBtn.id = 'reset-db-btn';
            resetBtn.innerText = 'Clear Database';
            resetBtn.className = 'btn-small';
            resetBtn.style.backgroundColor = '#dc2626'; 
            resetBtn.style.marginLeft = '15px';
            resetBtn.onclick = () => { localStorage.clear(); location.reload(); };
            header.parentElement.appendChild(resetBtn);
        }
    }

    // --- PATIENT MODULE ---
    if (document.getElementById('patient-reminders')) {
        const pReminders = document.getElementById('patient-reminders');
        pReminders.innerHTML = `
            <div class="medicine-item" id="med-1">
                <div class="medicine-details"><strong>Paracetamol 500mg</strong><span>After Breakfast - 09:00 AM</span></div>
                <div class="action-buttons"><button class="btn-small" onclick="document.getElementById('med-1').style.opacity='0.5'; alert('Marked as Taken')">Taken</button></div>
            </div>
        `;
        document.getElementById('discomfort-form')?.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const symptoms = document.getElementById('symptom-desc').value.trim();
            if (!symptoms) {
                alert("Please describe your symptoms before submitting.");
                return;
            }
            alert("Your report has been sent to your consulting doctor."); 
            e.target.reset();
        });
    }
});