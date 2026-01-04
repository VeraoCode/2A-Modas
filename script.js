// ============================================================
// 1. FAILSAFE (SEGURANÇA CONTRA LOOP INFINITO)
// ============================================================

// Se o site não carregar em 3 segundos, forçamos a abertura
setTimeout(() => { 
    const l = document.getElementById('loading-screen'); 
    if(l) {
        l.style.opacity = '0';
        setTimeout(() => l.style.display='none', 500);
        console.warn("Failsafe: Carregamento forçado após tempo limite.");
    }
}, 3000);

// Tratamento de erros visual
window.onerror = function(msg) { 
    const sb = document.getElementById('status-bar'); 
    if(sb) { sb.style.display='flex'; sb.className='err'; sb.innerHTML = `⚠️ ${msg}`; } 
    // Em caso de erro crítico, remove o loader para o usuário não ficar preso
    document.getElementById('loading-screen').style.display='none';
    return false; 
};

// ================= CONFIG =================
const SUPABASE_URL = 'https://sdeslwemzhxqixmphyye.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZXNsd2Vtemh4cWl4bXBoeXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDUxNDUsImV4cCI6MjA4MjI4MTE0NX0.QK7PkbYOnT6nIRFZHtHsuh42EuCjMSVvdnxf7h1bD80';
const GOOGLE_CLOUD_URL = 'https://criarpagamentoss-967029810770.southamerica-east1.run.app'; 
const EMAILJS_PUBLIC_KEY = 'vEXIgVw6GynR5W1qj'; 
const EMAILJS_SERVICE_ID = 'service_3x4ghcd';
const EMAILJS_TEMPLATE_CLIENTE = 'template_rwf0bay';
const EMAILJS_TEMPLATE_ADMIN = 'template_rwf0bay';

// ================= STATE & INIT =================
let sb = null; 
try { 
    // Configuração explícita para salvar login no LocalStorage
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: true,
            storageKey: '2a_auth_token',
            storage: window.localStorage,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }); 
} catch(e) { console.error("Erro Supabase:", e); }

const state = { products: [], cart: [], current: null, var: null, qty: 1, user: null, address: null, adminOrders: [], filterStatus: 'all', filterPay: 'all', selectedFiles: [], mainImageIndex: 0 };
const PRESETS_VOL = ['25ml','50ml','75ml','100ml','200ml','P','M','G','GG','Unico'];
const COLOR_MAP = { 'Preto': '#000000', 'Branco': '#ffffff', 'Vermelho': '#e74c3c', 'Azul': '#3498db', 'Rosa': '#e91e63', 'Verde': '#2ecc71', 'Nude': '#e3c0a5', 'Estampado': 'linear-gradient(45deg, red, blue)', 'Bege': '#f5f5dc', 'Amarelo': '#f1c40f', 'Cinza': '#95a5a6' };

const safeVal = (v) => (v === null || v === undefined || v === "null") ? "" : v;
const setSafe = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = safeVal(val); };

document.addEventListener('DOMContentLoaded', () => {
    if(window.flatpickr) flatpickr(".flatpickr-input", { dateFormat: "Y-m-d", locale: "pt", altInput: true, altFormat: "d/m/Y" });
});

// ================= AUTH =================
const auth = {
    user: null,
    
    // Verifica sessão e carrega perfil
    checkProfile: async (openModal = false) => {
        try {
            const { data } = await sb.auth.getSession();
            
            if(data.session) {
                // Tenta buscar perfil no banco
                const { data: profile, error } = await sb.from('customers').select('*').eq('id', data.session.user.id).single();
                
                if (profile) {
                    state.user = profile;
                    // Carrega endereços
                    if(profile.address) {
                        try {
                            const addrList = typeof profile.address === 'string' ? JSON.parse(profile.address) : profile.address;
                            localStorage.setItem('2a_addrs', JSON.stringify(addrList));
                            // Define padrão se não houver
                            if(addrList.length > 0 && !state.address) {
                                state.address = addrList[0];
                                localStorage.setItem('2a_active_addr', JSON.stringify(state.address));
                            }
                        } catch(e) { console.error("Erro parsing address", e); }
                    }
                } else {
                    // Fallback se não existir no banco
                    state.user = { 
                        id: data.session.user.id, 
                        email: data.session.user.email, 
                        name: data.session.user.user_metadata.name || 'Cliente', 
                        phone: '' 
                    };
                }
                app.updateUI();
                if(openModal) auth.openClientArea();
            } else {
                state.user = null;
                app.updateUI();
                if(openModal) app.showModal('auth-modal');
            }
        } catch (err) {
            console.error("Erro fatal checkProfile:", err);
        }
    },

    handleHeaderClick: () => {
        if(state.user) auth.openClientArea();
        else app.showModal('auth-modal');
    },

    login: async () => {
        const email = document.getElementById('l-email').value;
        const pass = document.getElementById('l-pass').value;
        if(!email || !pass) return alert("Preencha todos os campos");
        
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
        if(error) return alert("Erro: " + error.message);
        
        app.success("Login realizado!");
        app.closeModal('auth-modal');
        // onAuthStateChange vai disparar
    },

    register: async () => {
        const name = document.getElementById('r-name').value;
        const email = document.getElementById('r-email').value;
        const pass = document.getElementById('r-pass').value;
        const phone = document.getElementById('r-phone').value;
        
        // Endereço
        const cep = document.getElementById('r-cep').value;
        const street = document.getElementById('r-street').value;
        const num = document.getElementById('r-num').value;
        const bairro = document.getElementById('r-bairro').value;
        const city = document.getElementById('r-city').value;
        const uf = document.getElementById('r-uf').value;

        if(!name || !email || !pass) return alert("Preencha dados obrigatórios");

        const { data, error } = await sb.auth.signUp({ 
            email, password: pass, options: { data: { name, phone } } 
        });
        
        if(error) return alert("Erro: " + error.message);

        if(data.user) {
            const newAddr = { name, phone, cep, street, number: num, bairro, city, uf, type: 'Principal' };
            // Tenta criar perfil
            await sb.from('customers').insert([{ id: data.user.id, name, email, phone, address: [newAddr] }]);
            
            app.success("Conta criada! Entrando...");
            // Login automático
            await sb.auth.signInWithPassword({ email, password: pass });
            app.closeModal('auth-modal');
        }
    },

    logout: async () => {
        await sb.auth.signOut();
        state.user = null;
        state.address = null;
        localStorage.clear();
        window.location.reload();
    },

    toggle: (mode) => {
        document.getElementById('form-login').style.display = mode === 'login' ? 'block' : 'none';
        document.getElementById('form-register').style.display = mode === 'register' ? 'block' : 'none';
        document.getElementById('auth-title').innerText = mode === 'login' ? 'Acesso' : 'Criar Conta';
    },

    openClientArea: () => {
        if(!state.user) return;
        document.getElementById('c-profile-name').value = state.user.name || '';
        document.getElementById('c-profile-email').value = state.user.email || '';
        document.getElementById('c-profile-phone').value = state.user.phone || '';
        
        const addrDiv = document.getElementById('c-profile-addrs');
        addrDiv.innerHTML = '';
        const addrs = JSON.parse(localStorage.getItem('2a_addrs') || '[]');
        if(addrs.length === 0) addrDiv.innerHTML = "<small>Nenhum endereço salvo.</small>";
        addrs.forEach((a, i) => {
            addrDiv.innerHTML += `<div style="font-size:0.8rem; padding:8px; border-bottom:1px dashed #eee;"><b>${a.street}, ${a.number}</b> - ${a.city}/${a.uf} <br><small onclick="app.editAddress(${i}); app.closeModal('client-modal')" style="color:blue; cursor:pointer;">Editar</small></div>`;
        });
        auth.loadClientOrders();
        app.showModal('client-modal');
    },

    updateProfileData: async () => {
        const name = document.getElementById('c-profile-name').value;
        const phone = document.getElementById('c-profile-phone').value;
        const { error } = await sb.from('customers').update({ name, phone }).eq('id', state.user.id);
        if(!error) {
            state.user.name = name; state.user.phone = phone;
            app.updateUI(); app.success("Dados salvos!");
        } else alert("Erro: " + error.message);
    },

    loadClientOrders: async () => {
        const div = document.getElementById('client-orders-list');
        div.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
        const uid = String(state.user.id);
        const { data } = await sb.from('orders').select('*').eq('customer_id', uid).order('created_at', {ascending: false});
        div.innerHTML = '';
        if(!data || !data.length) { div.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Você ainda não fez pedidos.</p>'; return; }
        
        data.forEach(o => {
            let progress = 5; let truckClass = ''; let statusLabel = 'Processando';
            if(o.status.includes('Pendente')) { progress = 15; statusLabel = 'Separando'; }
            if(o.status.includes('Enviado')) { progress = 60; statusLabel = 'Em Trânsito'; }
            if(o.status.includes('Entregue')) { progress = 100; statusLabel = 'Entregue'; }
            if(o.status.includes('Cancelado')) { progress = 100; truckClass = 'cancelled'; statusLabel = 'Cancelado'; }
            
            let paidAmount = 0; let installmentsHtml = '';
            if(o.payment_status === 'Pago') { paidAmount = o.total; } else if (o.installments) {
                try { const inst = JSON.parse(o.installments); inst.forEach(i => { if(i.paid) paidAmount += parseFloat(i.amount); }); const next = inst.find(i => !i.paid); if(next) installmentsHtml = `<div style="color:#e67e22; font-size:0.8rem;">Próx. Parcela: ${next.date.split('-').reverse().join('/')} (R$ ${parseFloat(next.amount).toFixed(2)})</div>`; } catch(e){}
            }
            const remaining = Math.max(0, o.total - paidAmount);

            div.innerHTML += `
            <div class="client-track-card">
                <div class="track-header"><span class="track-id">Pedido #${o.id.slice(-4)}</span><span class="track-date">${o.date}</span></div>
                <div style="margin-bottom:20px;">
                    <div class="track-bar-container"><div class="track-bar-fill ${truckClass}" style="width: ${progress}%"><i class="fas fa-truck track-truck ${truckClass}"></i></div></div>
                    <div class="track-labels"><span class="${progress >= 15 ? 'active' : ''}">Pedido</span><span class="${progress >= 60 ? 'active' : ''}">Enviado</span><span class="${progress >= 100 && !truckClass ? 'active' : ''}">Entregue</span></div>
                    <div style="text-align:center; font-weight:bold; margin-top:5px; color:var(--accent); font-size:0.8rem;">Status: ${statusLabel}</div>
                </div>
                <div class="client-fin-box">
                    <div class="cf-row"><span>Total:</span> <strong>R$ ${o.total.toFixed(2)}</strong></div>
                    <div class="cf-row"><span>Pago:</span> <span class="cf-status-paid">R$ ${paidAmount.toFixed(2)}</span></div>
                    ${remaining > 0.1 ? `<div class="cf-row"><span>Restante:</span> <span class="cf-status-pending">R$ ${remaining.toFixed(2)}</span></div>` : '<div style="color:var(--success); font-weight:bold; text-align:center;">Quitado!</div>'}${installmentsHtml}
                </div>
            </div>`;
        });
    }
};

// ================= APP (LOJA) =================
const app = {
    load: async () => {
        if(!sb) return;
        const { data, error } = await sb.from('products').select('*');
        if(!error) { state.products = data || []; app.render(state.products); }
    },
    success: (msg) => {
        const toast = document.getElementById('success-toast');
        document.getElementById('st-text').innerText = msg;
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 5000);
    },
    render: (list) => {
        const div = document.getElementById('products-list'); if(!div) return; div.innerHTML = "";
        if(list.length === 0) div.innerHTML = '<p style="grid-column:1/-1;text-align:center">Nenhum produto cadastrado.</p>';
        list.forEach(p => {
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            const minP = (vars && vars.length) ? Math.min(...vars.map(v => parseFloat(v.price))) : 0;
            const isPromo = p.is_promo ? '<span class="tag-promo">OFERTA</span>' : '';
            let mainImg = "https://via.placeholder.com/300";
            try { const media = JSON.parse(p.image_url); mainImg = Array.isArray(media) ? media[0] : p.image_url; } catch(e) { mainImg = p.image_url; }
            div.innerHTML += `<div class="card" onclick="app.openModal('${p.id}')">${isPromo}<img src="${mainImg}" onerror="this.src='https://via.placeholder.com/300'"><div class="card-info"><span style="font-size:0.8rem;color:#999;text-transform:uppercase;">${p.category}</span><div style="font-weight:bold;margin:5px 0;">${p.name}</div><div style="color:var(--primary);font-weight:bold;">A partir R$ ${minP.toFixed(2)}</div><span class="tag-delivery">🚚 03 a 05 dias úteis</span></div></div>`;
        });
    },
    ask: (title, msg, onYes) => {
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-msg').innerText = msg;
        const modal = document.getElementById('custom-confirm-modal');
        modal.classList.add('active');
        const yesBtn = document.getElementById('btn-confirm-yes');
        const noBtn = document.getElementById('btn-confirm-no');
        const newYes = yesBtn.cloneNode(true);
        const newNo = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYes, yesBtn);
        noBtn.parentNode.replaceChild(newNo, noBtn);
        newYes.addEventListener('click', () => { modal.classList.remove('active'); if(onYes) onYes(); });
        newNo.addEventListener('click', () => { modal.classList.remove('active'); });
    },
    renderCart: () => {
        const ul = document.getElementById('cart-list'); if(!ul) return; ul.innerHTML=""; let t=0;
        if(state.cart.length === 0) ul.innerHTML = `<div style="text-align:center; padding:40px 0; color:#999;"><i class="fas fa-shopping-basket" style="font-size:3rem; margin-bottom:10px; opacity:0.3;"></i><p>Sua sacola está vazia</p></div>`;
        state.cart.forEach((i,idx) => {
            t += i.price*i.qty;
            ul.innerHTML += `<li class="cart-item"><img src="${i.image || 'https://via.placeholder.com/60'}" class="cart-thumb"><div class="cart-details"><span class="cart-name">${i.name}</span><span class="cart-variant">${i.variant}</span><div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;"><div class="qty-selector"><button class="qty-btn" onclick="app.cQty(${idx},-1)">-</button><div class="qty-val">${i.qty}</div><button class="qty-btn" onclick="app.cQty(${idx},1)">+</button></div><div style="font-weight:bold; color:var(--accent);">R$ ${(i.price*i.qty).toFixed(2)}</div></div></div><button class="btn-remove-modern" onclick="app.removeFromCart(${idx})"><i class="fas fa-trash-alt"></i></button></li>`;
        });
        if(state.cart.length > 0) ul.innerHTML += `<button onclick="app.toggleCart()" class="btn-continue-shop"><i class="fas fa-arrow-left"></i> Continuar Comprando</button>`;
        document.getElementById('cart-total').innerText = `R$ ${t.toFixed(2)}`;
        document.getElementById('cart-count').innerText = state.cart.length;
    },
    removeFromCart: (idx) => { state.cart.splice(idx,1); app.renderCart(); },
    openPromoModal: () => {
        const promos = state.products.filter(p => p.is_promo);
        if(!promos.length) return alert("Sem promoções ativas.");
        const cDiv = document.getElementById('promo-track'); cDiv.innerHTML = "";
        const shownIds = new Set();
        promos.forEach(p => {
            if(shownIds.has(p.id)) return;
            shownIds.add(p.id);
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            const minP = Math.min(...vars.map(v => v.price));
            let mainImg = "https://via.placeholder.com/100";
            try { const m = JSON.parse(p.image_url); mainImg = Array.isArray(m) ? m[0] : p.image_url; } catch(e) { mainImg = p.image_url; }
            cDiv.innerHTML += `<div class="promo-list-card" onclick="app.closeModal('promo-modal'); setTimeout(() => app.openModal('${p.id}'), 100)"><img src="${mainImg}"><div><small class="promo-price">R$ ${minP.toFixed(2)}</small><br><strong>${p.name}</strong></div></div>`;
        });
        app.showModal('promo-modal');
    },
    openModal: (id) => {
        const p = state.products.find(x => String(x.id) === String(id));
        if(!p) return;
        state.current = p; state.qty=1; state.var=null;
        let media = []; try { media = JSON.parse(p.image_url); } catch(e) { media = [p.image_url]; }
        if(!Array.isArray(media)) media = [p.image_url];
        app.renderCarousel(media);
        setSafe('m-title', p.name); setSafe('m-cat', p.category); setSafe('m-desc', p.description); setSafe('m-price', "Selecione...");
        const vDiv = document.getElementById('m-vars'); vDiv.innerHTML = "";
        const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
        if(vars) {
            vars.forEach(v => {
                const hasStock = parseInt(v.stock) > 0;
                const chip = document.createElement('div');
                chip.className = `var-chip ${!hasStock ? 'disabled' : ''}`;
                let dot = COLOR_MAP[v.name] ? `<div class="color-circle" style="background:${COLOR_MAP[v.name]}"></div>` : "";
                chip.innerHTML = `${dot}<span>${v.name}</span><small style="opacity:0.8">R$ ${parseFloat(v.price).toFixed(2)}</small>`;
                if(hasStock) {
                    chip.onclick = () => {
                        state.var = v;
                        document.getElementById('m-price').innerText = `R$ ${parseFloat(v.price).toFixed(2)}`;
                        Array.from(vDiv.children).forEach(c => c.classList.remove('selected'));
                        chip.classList.add('selected');
                    };
                }
                vDiv.appendChild(chip);
            });
        }
        app.showModal('product-modal');
    },
    renderCarousel: (media) => {
        const area = document.getElementById('m-media-area');
        if(!media.length) { area.innerHTML = ''; return; }
        const renderMain = (url) => `<img src="${url}">`;
        area.innerHTML = `<div class="carousel-main-container" id="c-main">${renderMain(media[0])}</div>`;
    },
    updQty: (n) => { 
        if (n > 0) {
            if (!state.var) return alert("Selecione a variação primeiro.");
            if (state.qty + n > parseInt(state.var.stock)) return alert("Estoque máximo atingido.");
        }
        state.qty += n; if(state.qty<1) state.qty=1; 
        document.getElementById('m-qty').innerText = state.qty; 
    },
    cQty: (idx,n) => { state.cart[idx].qty+=n; if(state.cart[idx].qty<1) state.cart[idx].qty=1; app.renderCart(); },
    toggleCart: () => document.querySelector('.sidebar').classList.toggle('open'),
    
    fetchCep: async (cep, prefix) => {
        cep = cep.replace(/\D/g, '');
        if(cep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if(!data.erro) {
                    const map = prefix === 'addr' ? {s:'addr-street', b:'addr-bairro', c:'addr-city', u:'addr-uf', n:'addr-num'} : 
                                prefix === 'manual' ? {s:'m-client-street', b:'m-client-bairro', c:'m-client-city', u:'m-client-uf', n:'m-client-num'} :
                                {s:'r-street', b:'r-bairro', c:'r-city', u:'r-uf', n:'r-num'};
                    
                    if(document.getElementById(map.s)) document.getElementById(map.s).value = data.logradouro;
                    if(document.getElementById(map.b)) document.getElementById(map.b).value = data.bairro;
                    if(document.getElementById(map.c)) document.getElementById(map.c).value = data.localidade;
                    if(document.getElementById(map.u)) document.getElementById(map.u).value = data.uf;
                    if(document.getElementById(map.n)) document.getElementById(map.n).focus();
                }
            } catch(e) {}
        }
    },
    openAddressModal: () => { app.showModal('address-modal'); },
    addNewAddress: async () => {
        const val = id => document.getElementById(id).value;
        const a = { name: val('addr-name'), phone: val('addr-phone'), cep: val('addr-cep'), street: val('addr-street'), number: val('addr-num'), bairro: val('addr-bairro'), city: val('addr-city'), uf: val('addr-uf'), ref: val('addr-ref'), type: document.getElementById('addr-type').value };
        if(!a.name || !a.street || !a.number) return alert("Preencha campos obrigatórios.");
        
        let list = JSON.parse(localStorage.getItem('2a_addrs') || '[]');
        list.push(a);
        localStorage.setItem('2a_addrs', JSON.stringify(list));
        state.address = a; localStorage.setItem('2a_active_addr', JSON.stringify(a));

        if(state.user) await sb.from('customers').update({ address: list }).eq('id', state.user.id);
        app.updateUI(); app.closeModal('address-modal');
    },
    delAddress: async (i) => {
        if(!confirm("Remover este endereço?")) return;
        let list = JSON.parse(localStorage.getItem('2a_addrs') || '[]');
        list.splice(i, 1);
        localStorage.setItem('2a_addrs', JSON.stringify(list));
        if(state.user) await sb.from('customers').update({ address: list }).eq('id', state.user.id);
        app.openAddressModal(); 
    },
    editAddress: (i) => {
        const list = JSON.parse(localStorage.getItem('2a_addrs'));
        const a = list[i];
        const setVal = (id, v) => document.getElementById(id).value = safeVal(v);
        setVal('addr-name', a.name); setVal('addr-phone', a.phone); setVal('addr-cep', a.cep); setVal('addr-street', a.street); setVal('addr-num', a.number); setVal('addr-bairro', a.bairro); setVal('addr-city', a.city); setVal('addr-uf', a.uf); setVal('addr-ref', a.ref);
        app.delAddress(i); 
    },
    setAddr: (i) => {
        const list = JSON.parse(localStorage.getItem('2a_addrs'));
        state.address = list[i]; localStorage.setItem('2a_active_addr', JSON.stringify(state.address));
        app.updateUI(); app.closeModal('address-modal');
    },
    
    checkout: async (method) => {
        if(!state.cart.length) return alert("Carrinho vazio");
        if(!state.user) { alert("Faça login para continuar"); return app.showModal('auth-modal'); }
        if(!state.address) { app.openAddressModal(); return alert("Selecione entrega"); }
        
        const btn = document.querySelector(method === 'whatsapp' ? '.btn-whatsapp' : '.btn-mp');
        const originalText = btn.innerText;
        btn.innerText = "Processando...";
        
        try {
            const newOrderId = Date.now().toString();
            const statusInicial = method === 'whatsapp' ? 'Pendente (WhatsApp)' : 'Pendente (Mercado Pago)';
            const payStatus = method === 'mercadopago' ? 'Pago' : 'Pendente';
            
            const orderData = await app.registerOrder(newOrderId, method === 'whatsapp' ? 'WhatsApp/Dinheiro' : 'Mercado Pago', statusInicial, payStatus);
            await app.updateStockDatabase();
            await app.sendEmails(orderData, state.cart, state.user.email);
            
            if(method === 'whatsapp') app.sendPaidOrder('Dinheiro/Combinar'); 
            else {
                alert("Redirecionando para pagamento...");
            }
        } catch(e) {
            console.error(e);
            alert("Erro ao processar: " + e.message);
            btn.innerText = originalText;
        }
    },
    registerOrder: async (oid, method, status, payStatus) => {
        const total = state.cart.reduce((a,b)=>a+(b.price*b.qty),0);
        const order = {
            id: oid, 
            customer_name: state.user.name, 
            customer_email: state.user.email, 
            customer_id: String(state.user.id), 
            total: total, 
            items: JSON.stringify(state.cart), 
            address: JSON.stringify(state.address), 
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            method: method, status: status, payment_status: payStatus, created_at: new Date().toISOString()
        };
        const { error } = await sb.from('orders').insert([order]);
        if(error) throw new Error(error.message);
        return order;
    },
    updateStockDatabase: async () => {
        for (const item of state.cart) {
            const { data: prod } = await sb.from('products').select('*').eq('name', item.name).single();
            if(prod) {
                let vars = typeof prod.variations === 'string' ? JSON.parse(prod.variations) : prod.variations;
                const targetVar = vars.find(v => v.name === item.variant);
                if(targetVar) {
                    targetVar.stock = Math.max(0, parseInt(targetVar.stock) - item.qty);
                    await sb.from('products').update({ variations: JSON.stringify(vars) }).eq('id', prod.id);
                }
            }
        }
    },
    sendEmails: async (order, cartItems, recipientEmail) => {
        if(!recipientEmail) return;
        const itemsTxt = cartItems.map(i => `${i.qty}x ${i.name} (${i.variant}) - R$ ${i.price.toFixed(2)}`).join('\n');
        const total = cartItems.reduce((a,b)=>a+(b.price*b.qty),0).toFixed(2);
        let fullAddr = "Não informado";
        try { const addrObj = typeof order.address === 'string' ? JSON.parse(order.address) : order.address; fullAddr = `${addrObj.street}, ${addrObj.number} - ${addrObj.city}`; } catch(e) {}
        const templateParams = { to_name: order.customer_name, to_email: recipientEmail, message: `PEDIDO #${order.id}\n\nPAGAMENTO: ${order.method}\n\nITENS:\n${itemsTxt}\n\nTOTAL: R$ ${total}\n\nENDEREÇO:\n${fullAddr}\n\nStatus: ${order.status}`, admin_email: 'erickveraosilva@gmail.com' };
        if(window.emailjs) {
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENTE, templateParams);
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ADMIN, {...templateParams, to_email: 'erickveraosilva@gmail.com'});
        }
    },
    sendPaidOrder: (paymentType) => {
        let addr = state.address;
        const fullAddr = `${addr.street}, ${addr.number} - ${addr.bairro}`;
        let msg = `*NOVO PEDIDO 2A MODAS (${state.user.name})*\n--------------------------------\n*PAGAMENTO:* ${paymentType}\n*TOTAL:* R$ ${document.getElementById('cart-total').innerText.replace('R$ ','')}\n--------------------------------\n*ENTREGA:*\n📍 ${fullAddr}\n--------------------------------\n*ITENS:*\n`;
        state.cart.forEach(i=>{ msg += `▪ ${i.qty}x ${i.name} (${i.variant})\n`; });
        localStorage.removeItem('2a_cart'); state.cart = []; app.renderCart(); app.toggleCart();
        window.location.href = `https://wa.me/5567998951120?text=${encodeURIComponent(msg)}`;
    },
    showModal: (id) => document.getElementById(id).classList.add('active'),
    closeModal: (id) => document.getElementById(id).classList.remove('active')
};

// ================= ADMIN =================
const admin = {
    showLogin: async () => {
        const { data } = await sb.auth.getSession();
        if(data.session) admin.openPanel(); else app.showModal('admin-auth-modal');
    },
    verifyLogin: async () => {
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-pass').value;
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if(error) alert(error.message); else { app.closeModal('admin-auth-modal'); admin.openPanel(); }
    },
    openPanel: () => {
        app.showModal('admin-modal');
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // AUTO-REFRESH ON FILTER CHANGE
        const bindDate = (id, d) => {
            const el = document.getElementById(id);
            if(el && el._flatpickr) {
                el._flatpickr.setDate(d);
                el._flatpickr.set('onChange', () => admin.renderPayments());
            }
        };
        bindDate('fin-start', firstDay);
        bindDate('fin-end', today);
        
        admin.renderList(); 
        admin.updateStats(); 
        admin.renderPayments(); 
        admin.renderClients();
        admin.populateManualProdSelect();
    },
    logout: async () => {
        if(confirm("Sair do modo Admin?")) {
            await sb.auth.signOut();
            app.closeModal('admin-modal');
            window.location.reload(); 
        }
    },
    
    // ABA CLIENTES
    renderClients: async () => {
        const div = document.getElementById('clients-table-list');
        if(!div) return;
        div.innerHTML = 'Carregando...';
        const { data } = await sb.from('customers').select('*');
        div.innerHTML = '';
        if(data && data.length) {
            data.forEach(c => {
                let addrsHtml = '';
                if(c.address && Array.isArray(c.address)) {
                    addrsHtml = c.address.map(a => `<small style="display:block; color:#666;">📍 ${a.street}, ${a.number} - ${a.city}</small>`).join('');
                }
                div.innerHTML += `
                <div class="client-admin-card" style="padding:15px;">
                    <div style="display:flex; justify-content:space-between;">
                        <h4 style="color:var(--accent);">${c.name}</h4>
                        <small>ID: ...${c.id.slice(-4)}</small>
                    </div>
                    <div style="margin:10px 0; font-size:0.9rem;">
                        <div>📧 ${c.email}</div>
                        <div>📞 ${c.phone || 'Sem telefone'}</div>
                    </div>
                    ${addrsHtml}
                </div>`;
            });
        } else {
            div.innerHTML = '<p>Nenhum cliente.</p>';
        }
    },
    
    // NOVO PEDIDO
    fillClientData: async (cid) => {
        if(!cid) return;
        const { data } = await sb.from('customers').select('*').eq('id', cid).single();
        if(data) {
            document.getElementById('m-client-name').value = data.name;
            document.getElementById('m-client-email').value = data.email;
            document.getElementById('m-client-phone').value = data.phone;
            if(data.address && data.address.length > 0) {
                const a = data.address[0];
                document.getElementById('m-client-cep').value = a.cep;
                document.getElementById('m-client-street').value = a.street;
                document.getElementById('m-client-num').value = a.number;
                document.getElementById('m-client-bairro').value = a.bairro;
                document.getElementById('m-client-city').value = a.city;
                document.getElementById('m-client-uf').value = a.uf;
            }
        }
    },
    populateManualProdSelect: async () => {
        const { data } = await sb.from('customers').select('id, name');
        const sel = document.getElementById('m-existing-client');
        sel.innerHTML = '<option value="">-- Buscar Cliente --</option>';
        if(data) data.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.name}</option>`);
        
        const prodSel = document.getElementById('m-prod-select');
        prodSel.innerHTML = '<option value="">Selecione produto...</option>';
        state.products.forEach(p => {
             const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
             vars.forEach(v => {
                 prodSel.innerHTML += `<option value="${p.id}|${v.name}|${v.price}|${p.name}">${p.name} - ${v.name} (R$ ${v.price})</option>`;
             });
        });
    },

    // GESTÃO FINANCEIRA E PEDIDOS
    renderPayments: async () => {
        const startStr = document.getElementById('fin-start').value;
        const endStr = document.getElementById('fin-end').value;
        let query = sb.from('orders').select('*').neq('status', 'Cancelado').order('created_at', {ascending: false});
        if(startStr) query = query.gte('created_at', new Date(startStr).toISOString());
        if(endStr) query = query.lte('created_at', new Date(endStr + 'T23:59:59').toISOString());
        
        const { data } = await query;
        const div = document.getElementById('pay-list'); 
        div.innerHTML = "";
        
        if(!data || !data.length) { div.innerHTML = "<p>Sem registros no período.</p>"; return; }

        let totalRec = 0; let totalAreceber = 0;
        const clients = {};

        data.forEach(o => {
            const key = o.customer_id || o.customer_name;
            if(!clients[key]) clients[key] = { name: o.customer_name, email: o.customer_email, orders: [] };
            
            let paid = 0;
            if(o.payment_status === 'Pago') paid = o.total;
            else if(o.installments) {
                try { JSON.parse(o.installments).forEach(i => { if(i.paid) paid += parseFloat(i.amount); }); } catch(e){}
            }
            totalRec += paid;
            totalAreceber += (o.total - paid);
            clients[key].orders.push(o);
        });
        
        document.getElementById('fin-real-revenue').innerText = `R$ ${totalRec.toFixed(2)}`;
        document.getElementById('fin-total-created').innerText = `R$ ${totalAreceber.toFixed(2)}`;

        Object.values(clients).forEach((c, idx) => {
            const html = c.orders.map(o => admin.generateOrderCardHTML(o)).join('');
            div.innerHTML += `
            <div class="client-admin-card">
                <div class="cac-header" onclick="document.getElementById('cb-${idx}').classList.toggle('open')">
                    <strong>${c.name}</strong> <small>(${c.orders.length} pedidos)</small>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div id="cb-${idx}" class="cac-body">${html}</div>
            </div>`;
        });
    },

    generateOrderCardHTML: (o) => {
        let stClass = '';
        if(o.status.includes('Pendente')) stClass = 'st-pendente';
        if(o.status.includes('Enviado')) stClass = 'st-enviado';
        if(o.status.includes('Entregue')) stClass = 'st-entregue';
        if(o.status.includes('Cancelado')) stClass = 'st-cancelado';
        
        // Renderiza itens com miniatura
        let prodListHTML = '';
        try {
            const prods = JSON.parse(o.items);
            prodListHTML = prods.map(i => `
                <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px; border-bottom:1px dashed #eee; padding-bottom:5px;">
                    <img src="${i.image || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;">
                    <div style="font-size:0.85rem;">
                        <strong>${i.name}</strong> <small>(${i.variant})</small><br>
                        <span style="color:#666;">${i.qty}x R$ ${i.price.toFixed(2)}</span>
                    </div>
                </div>
            `).join('');
        } catch(e) { prodListHTML = 'Itens não carregados'; }

        return `
        <div class="debt-card" style="border-left: 4px solid var(--accent);">
            <div style="display:flex; justify-content:space-between;">
                <strong>#${o.id.slice(-4)} - ${o.date}</strong>
                <span>R$ ${o.total.toFixed(2)}</span>
            </div>
            
            <div style="margin-top:10px;">
                <label style="font-size:0.7rem; font-weight:bold; color:#999;">STATUS ENTREGA</label>
                <div class="status-wrapper">
                    <select onchange="admin.updateStatus('${o.id}', this.value)" class="status-selector ${stClass}">
                        <option value="Pendente" ${o.status.includes('Pendente')?'selected':''}>Pendente</option>
                        <option value="Enviado" ${o.status==='Enviado'?'selected':''}>Enviado</option>
                        <option value="Entregue" ${o.status==='Entregue'?'selected':''}>Entregue</option>
                        <option value="Cancelado" ${o.status==='Cancelado'?'selected':''}>Cancelado</option>
                    </select>
                </div>
            </div>
            
            <div style="margin-top:10px; border-top:1px dashed #eee; padding-top:10px;">
                ${prodListHTML}
            </div>
            
            <div style="margin-top:10px;">
                <label style="font-size:0.7rem; font-weight:bold; color:#999;">EMAIL CLIENTE</label>
                <div style="font-size:0.9rem;">${o.customer_email || 'Não informado'}</div>
            </div>
        </div>`;
    },
    
    updateStatus: async (id, val) => {
        await sb.from('orders').update({status: val}).eq('id', id);
        app.success("Status atualizado!");
        admin.renderPayments();
    },

    tab: (t) => {
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
        const tabBtn = document.querySelector(`.admin-tab[onclick*='${t}']`);
        if(tabBtn) tabBtn.classList.add('active');
        ['dash','prod','orders','fin','pay','new-order','clients'].forEach(i => {
            const el = document.getElementById(`tab-${i}`);
            if(el) el.style.display = i===t ? 'block' : 'none';
        });
        if(t === 'new-order') admin.populateManualProdSelect();
        if(t === 'clients') admin.renderClients();
    },
    
    // ... FUNÇÕES CRUD ...
    handleFileSelect: (input) => {
        const files = Array.from(input.files);
        if(files.length > 5) { alert("Máximo 5 arquivos"); input.value=""; return; }
        state.selectedFiles = files;
        state.mainImageIndex = 0; 
        const area = document.getElementById('file-preview-area');
        area.innerHTML = "";
        files.forEach((f, idx) => {
            const url = URL.createObjectURL(f);
            area.innerHTML += `<div class="preview-wrapper" onclick="admin.setMain(${idx})"><img src="${url}" class="file-preview-item ${idx===0?'main-selected':''}" id="prev-${idx}"><div class="main-tag">PRINCIPAL</div></div>`;
        });
    },
    setMain: (idx) => {
        state.mainImageIndex = idx;
        document.querySelectorAll('.file-preview-item').forEach(el => el.classList.remove('main-selected'));
        document.getElementById(`prev-${idx}`).classList.add('main-selected');
    },

    save: async () => {
        if(!sb) return;
        const btn = document.getElementById('btn-save'); btn.innerText="Salvando..."; btn.disabled=true;
        try {
            const vars = [];
            document.querySelectorAll('.var-inputs').forEach(d => {
                const p = d.querySelector('.v-price').value, s = d.querySelector('.v-stock').value;
                if(p && s) vars.push({ name: d.querySelector('.v-name').value, cost: d.querySelector('.v-cost').value||0, price: p, stock: s });
            });
            if(vars.length === 0) {
                const gPrice = document.getElementById('f-price-global').value, gStock = document.getElementById('f-stock-global').value;
                if(!gPrice || !gStock) throw new Error("Preencha variações OU Global");
                vars.push({ name: 'Padrão', price: gPrice, stock: gStock, cost: document.getElementById('f-cost').value || 0 });
            }
            let mediaUrls = [];
            const editId = document.getElementById('edit-id').value;
            if(editId && state.selectedFiles.length === 0) {
                const oldP = state.products.find(x => String(x.id) === String(editId));
                if(oldP) { try { mediaUrls = JSON.parse(oldP.image_url); } catch(e) { mediaUrls = [oldP.image_url]; } }
                if(!Array.isArray(mediaUrls)) mediaUrls = [oldP.image_url];
            } else if(state.selectedFiles.length > 0) {
                if(state.mainImageIndex > 0) {
                    const main = state.selectedFiles.splice(state.mainImageIndex, 1)[0];
                    state.selectedFiles.unshift(main);
                }
                for(let i=0; i<state.selectedFiles.length; i++) {
                    const file = state.selectedFiles[i];
                    const fName = 'prod_' + Date.now() + '_' + i;
                    await sb.storage.from('images').upload(fName, file);
                    const { data } = sb.storage.from('images').getPublicUrl(fName);
                    mediaUrls.push(data.publicUrl);
                }
            }
            const payload = {
                name: document.getElementById('f-name').value, category: document.getElementById('f-cat').value,
                cost_price: document.getElementById('f-cost').value || 0, description: document.getElementById('f-desc').value || "",
                is_promo: document.getElementById('f-promo').checked, variations: JSON.stringify(vars)
            };
            if(mediaUrls.length > 0) payload.image_url = JSON.stringify(mediaUrls);
            else if(!editId) payload.image_url = JSON.stringify(["https://via.placeholder.com/300"]);

            if(editId) await sb.from('products').update(payload).eq('id', editId);
            else { payload.id = Date.now(); await sb.from('products').insert([payload]); }
            app.success("Salvo!"); 
            admin.clear(); await app.load(); admin.renderList(); admin.updateStats();
        } catch(e) { alert(e.message); } finally { btn.innerText="Salvar Produto"; btn.disabled=false; }
    },
    clear: () => { 
        document.getElementById('edit-id').value=""; 
        ['f-name','f-desc','f-cost','f-price-global','f-stock-global'].forEach(i=>{ const el = document.getElementById(i); if(el) el.value=""; });
        state.selectedFiles = []; document.getElementById('file-preview-area').innerHTML = "";
        document.getElementById('active-vars-area').innerHTML="";
        document.querySelectorAll('.hidden-check').forEach(c => c.checked=false);
    },
    del: async (id) => { if(confirm("Excluir?")) { if(sb) await sb.from('products').delete().eq('id', id); await app.load(); admin.renderList(); } },
    edit: (id) => {
        const p = state.products.find(x => String(x.id) === String(id));
        document.getElementById('edit-id').value = p.id;
        document.getElementById('f-name').value = safeVal(p.name); document.getElementById('f-desc').value = safeVal(p.description);
        document.getElementById('f-cost').value = safeVal(p.cost_price); document.getElementById('f-promo').checked = p.is_promo;
        admin.clear(); document.getElementById('edit-id').value = p.id; // Clear soft
        const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
        if(vars) vars.forEach(v => {
            if(v.name === 'Padrão') { document.getElementById('f-price-global').value = v.price; document.getElementById('f-stock-global').value = v.stock; }
            else {
                document.querySelectorAll('.hidden-check').forEach(cb => {
                    if(cb.value === v.name) { cb.checked = true; admin.toggleInput(cb); 
                        setTimeout(() => { const d = document.getElementById(`grp-${cb.value.replace(/[^a-z0-9]/gi,'')}`); if(d) { d.querySelector('.v-price').value=v.price; d.querySelector('.v-stock').value=v.stock; } }, 50); 
                    }
                });
            }
        });
        admin.tab('prod'); 
    },
    renderList: () => {
        const div = document.getElementById('admin-list'); div.innerHTML="";
        state.products.forEach(p => {
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            let stock = 0; if(vars) vars.forEach(v => stock += parseInt(v.stock||0));
            let mainImg = "https://via.placeholder.com/50";
            try { const m = JSON.parse(p.image_url); if(Array.isArray(m)) mainImg = m[0]; else mainImg = p.image_url; } catch(e){}
            const isSoldOut = stock === 0;
            div.innerHTML += `<div class="mini-prod ${isSoldOut ? 'stock-zero' : ''}"><img src="${mainImg}"><div style="flex:1"><strong>${p.name}</strong><br>${isSoldOut ? 'ESGOTADO' : 'Estoque: '+stock}</div><div><button onclick="admin.edit('${p.id}'); admin.tab('prod')" class="btn-chip-edit"><i class="fas fa-pen"></i></button><button onclick="admin.del('${p.id}')" style="color:red;border:none;background:none; margin-left:10px;"><i class="fas fa-trash"></i></button></div></div>`;
        });
    },
    updateStats: () => {
        const grid = document.getElementById('dash-stock-grid'); if(!grid) return; grid.innerHTML = "";
        let grandTotalStock = 0, grandTotalValue = 0, grandTotalCost = 0;
        state.products.forEach(p => {
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations || '[]') : (p.variations || []);
            let pStock = 0, pValue = 0; 
            vars.forEach(v => {
                const q = parseInt(v.stock||0); const price = parseFloat(v.price||0); const cost = parseFloat(v.cost) || parseFloat(p.cost_price) || 0;
                pStock += q; pValue += (q * price); grandTotalStock += q; grandTotalValue += (q * price); grandTotalCost += (q * cost);
            });
            const isSoldOut = pStock === 0;
            grid.innerHTML += `<div class="dash-card" style="${isSoldOut?'opacity:0.7;filter:grayscale(1)':''}"><div style="flex:1"><strong>${p.name}</strong><br>R$ ${pValue.toFixed(2)}</div></div>`;
        });
        setSafe('st-rev', `R$ ${grandTotalValue.toFixed(2)}`); setSafe('st-cost', `R$ ${grandTotalCost.toFixed(2)}`); setSafe('st-qty', grandTotalStock);
    },
    
    // MANUAL ORDER LOGIC
    manualCart: [],
    addManualItem: () => {
        const val = document.getElementById('m-prod-select').value;
        const qty = parseInt(document.getElementById('m-prod-qty').value);
        if(!val || qty < 1) return alert("Selecione produto");
        const [pid, vname, price, pname] = val.split('|');
        admin.manualCart.push({ name: pname, variant: vname, price: parseFloat(price), qty: qty, image: "https://via.placeholder.com/50", is_stock: true, pid: pid });
        admin.renderManualCart();
    },
    addCustomItem: () => {
        const name = document.getElementById('m-custom-item').value;
        const price = parseFloat(document.getElementById('m-custom-price').value);
        if(!name || !price) return alert("Preencha item");
        admin.manualCart.push({ name: name, variant: "Avulso", price: price, qty: 1, image: "https://via.placeholder.com/50", is_stock: false });
        admin.renderManualCart();
    },
    renderManualCart: () => {
        const div = document.getElementById('manual-cart-list'); div.innerHTML = ""; let total = 0;
        admin.manualCart.forEach((i, idx) => { total += i.price * i.qty; div.innerHTML += `<div class="manual-cart-item"><div><strong>${i.name}</strong><br>${i.qty}x R$ ${i.price}</div><button onclick="admin.manualCart.splice(${idx},1); admin.renderManualCart()">X</button></div>`; });
        document.getElementById('m-total-display').innerText = `R$ ${total.toFixed(2)}`;
    },
    saveManualOrder: async () => {
        if(admin.manualCart.length === 0) return alert("Adicione itens.");
        const name = document.getElementById('m-client-name').value || "Cliente Balcão";
        const email = document.getElementById('m-client-email').value || "manual@admin.com";
        const addressObj = { 
            street: document.getElementById('m-client-street').value, 
            number: document.getElementById('m-client-num').value, 
            bairro: document.getElementById('m-client-bairro').value, 
            city: document.getElementById('m-client-city').value, 
            uf: document.getElementById('m-client-uf').value,
            phone: document.getElementById('m-client-phone').value
        };
        const total = admin.manualCart.reduce((a,b)=>a+(b.price*b.qty),0);
        const method = document.getElementById('m-payment-method').value;
        const pStatus = document.getElementById('m-payment-status').value;
        
        const order = {
            id: Date.now().toString(), customer_name: name, customer_email: email, customer_id: "0", 
            total: total, items: JSON.stringify(admin.manualCart), address: JSON.stringify(addressObj),
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            method: `Manual (${method})`, status: pStatus === 'Pago' ? 'Entregue' : 'Pendente', 
            payment_status: pStatus, created_at: new Date().toISOString()
        };

        const { error } = await sb.from('orders').insert([order]);
        if(error) return alert("Erro: " + error.message);
        
        // Update Stock
        for (const item of admin.manualCart) {
            if(item.is_stock) {
                const { data: prod } = await sb.from('products').select('*').eq('id', item.pid).single();
                if(prod) {
                    let vars = typeof prod.variations === 'string' ? JSON.parse(prod.variations) : prod.variations;
                    const targetVar = vars.find(v => v.name === item.variant);
                    if(targetVar) {
                        targetVar.stock = Math.max(0, parseInt(targetVar.stock) - item.qty);
                        await sb.from('products').update({ variations: JSON.stringify(vars) }).eq('id', prod.id);
                    }
                }
            }
        }
        app.success("Pedido Salvo!");
        admin.manualCart = []; admin.renderManualCart(); admin.renderOrders();
    },
    openEntryModal: (oid, total) => {
        document.getElementById('entry-oid').value = oid;
        document.getElementById('entry-total').value = total;
        document.getElementById('entry-val').value = "";
        app.showModal('entry-modal');
        setTimeout(() => document.getElementById('entry-val').focus(), 100);
    },
    confirmEntry: async () => {
        const oid = document.getElementById('entry-oid').value;
        const total = parseFloat(document.getElementById('entry-total').value);
        const valStr = document.getElementById('entry-val').value;
        
        if(!valStr || isNaN(valStr)) return alert("Digite um valor válido");
        const paid = parseFloat(valStr);
        const rest = total - paid;
        
        if(paid >= total) return alert("Valor igual ou maior que o total. Use 'Quitar Tudo'.");
        if(paid <= 0) return alert("Valor inválido.");
        
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate() + 30);
        
        const installments = [
            { date: today, amount: paid.toFixed(2), paid: true },
            { date: nextMonth.toISOString().split('T')[0], amount: rest.toFixed(2), paid: false }
        ];
        
        await sb.from('orders').update({
            payment_status: 'Parcelado', installments: JSON.stringify(installments)
        }).eq('id', oid);
        
        app.closeModal('entry-modal');
        app.success("Valor de Entrada inserido com sucesso!");
        admin.renderPayments();
    },
    openPartialPay: (oid, idx, amount) => {
        document.getElementById('pp-oid').value = oid;
        document.getElementById('pp-idx').value = idx;
        document.getElementById('pp-total-show').value = "R$ " + parseFloat(amount).toFixed(2);
        document.getElementById('pp-val').value = "";
        app.showModal('partial-pay-modal');
        setTimeout(() => document.getElementById('pp-val').focus(), 100);
    },
    processPartialPay: async () => {
        const oid = document.getElementById('pp-oid').value;
        const idx = parseInt(document.getElementById('pp-idx').value);
        const valStr = document.getElementById('pp-val').value;
        
        if(!valStr || isNaN(valStr) || parseFloat(valStr) <= 0) return alert("Valor inválido");
        
        const paidVal = parseFloat(valStr);
        
        app.ask("Confirmar Pagamento", `Confirma o recebimento de R$ ${paidVal.toFixed(2)}?`, async () => {
            const { data } = await sb.from('orders').select('installments').eq('id', oid).single();
            if(data) {
                const arr = JSON.parse(data.installments);
                const originalVal = parseFloat(arr[idx].amount);
                
                if(paidVal >= originalVal) {
                    arr[idx].amount = originalVal;
                    arr[idx].paid = true;
                } else {
                    const remaining = originalVal - paidVal;
                    arr[idx].amount = paidVal;
                    arr[idx].paid = true;
                    arr[idx].note = "Pagto Parcial";
                    
                    arr.splice(idx + 1, 0, {
                        date: arr[idx].date,
                        amount: remaining.toFixed(2),
                        paid: false,
                        is_remaining: true
                    });
                }
                
                await sb.from('orders').update({ installments: JSON.stringify(arr) }).eq('id', oid);
                app.success("Pagamento parcial registrado!");
                app.closeModal('partial-pay-modal');
                admin.renderPayments();
            }
        });
    },
    editInstField: async (oid, idx, field, val) => {
        if(field === 'amount' && (isNaN(val) || val < 0)) return alert("Valor inválido");
        if(field === 'date' && !val) return alert("Data inválida");

        const { data } = await sb.from('orders').select('installments').eq('id', oid).single();
        if(data) {
            const arr = JSON.parse(data.installments);
            if(arr[idx]) {
                arr[idx][field] = val; 
                await sb.from('orders').update({ installments: JSON.stringify(arr) }).eq('id', oid);
                setTimeout(() => admin.renderPayments(), 500); 
            }
        }
    },
    updatePaymentStatusSimple: async (id, status) => {
        let updateObj = { payment_status: status };
        await sb.from('orders').update(updateObj).eq('id', id);
        app.success("Financeiro atualizado!");
        admin.renderPayments(); 
    },
    quickPayInst: async (oid, idx, isPaid) => {
        const { data } = await sb.from('orders').select('installments, total').eq('id', oid).single();
        if(data) {
            const arr = JSON.parse(data.installments);
            if(arr[idx]) {
                arr[idx].paid = isPaid;
                const allPaid = arr.every(i => i.paid);
                let updateObj = { installments: JSON.stringify(arr) };
                if(allPaid && confirm("Todas as parcelas foram pagas. Deseja marcar o pedido como 'Pago'?")) {
                    updateObj.payment_status = 'Pago'; updateObj.installments = null; 
                }
                await sb.from('orders').update(updateObj).eq('id', oid);
                admin.renderPayments();
            }
        }
    }
};

// ================= EXECUTION =================
(async function init() {
    // 1. Configura o listener ANTES de checar o perfil
    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Só carrega se o usuário não estiver carregado para evitar loops
            if (!state.user || state.user.id !== session.user.id) {
                auth.checkProfile();
            }
        } else if (event === 'SIGNED_OUT') {
            state.user = null;
            app.updateUI();
        }
    });

    // 2. Carrega estado inicial
    await auth.checkProfile(); // Tenta recuperar sessão existente
    await app.load(); 
    admin.initCheckboxes(); 
    app.updateUI();
    
    // 3. Libera tela
    document.getElementById('loading-screen').style.display='none';
})();
