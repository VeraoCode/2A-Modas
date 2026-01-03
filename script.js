setTimeout(() => { const l = document.getElementById('loading-screen'); if(l) l.style.display='none'; }, 4000);
window.onerror = function(msg) { const sb = document.getElementById('status-bar'); if(sb) { sb.style.display='flex'; sb.className='err'; sb.innerHTML = `⚠️ Erro: ${msg}`; } return false; };

const SUPABASE_URL = 'https://sdeslwemzhxqixmphyye.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZXNsd2Vtemh4cWl4bXBoeXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDUxNDUsImV4cCI6MjA4MjI4MTE0NX0.QK7PkbYOnT6nIRFZHtHsuh42EuCjMSVvdnxf7h1bD80';
const GOOGLE_CLOUD_URL = 'https://criarpagamentoss-967029810770.southamerica-east1.run.app'; 
const EMAILJS_PUBLIC_KEY = 'vEXIgVw6GynR5W1qj'; 
const EMAILJS_SERVICE_ID = 'service_3x4ghcd';
const EMAILJS_TEMPLATE_CLIENTE = 'template_rwf0bay';
const EMAILJS_TEMPLATE_ADMIN = 'template_rwf0bay';

let sb = null; try { sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch(e) { console.error(e); }

const state = { products: [], cart: [], current: null, var: null, qty: 1, user: null, address: null, adminOrders: [], filterStatus: 'all', filterPay: 'all', selectedFiles: [], mainImageIndex: 0 };
const PRESETS_VOL = ['25ml','50ml','100ml','P','M','G','GG','Unico'];
const COLOR_MAP = { 'Preto': '#000000', 'Branco': '#ffffff', 'Vermelho': '#e74c3c', 'Azul': '#3498db', 'Rosa': '#e91e63', 'Verde': '#2ecc71', 'Bege': '#f5f5dc', 'Amarelo': '#f1c40f', 'Cinza': '#95a5a6' };

const safeVal = (v) => (v === null || v === undefined || v === "null") ? "" : v;
const setSafe = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = safeVal(val); };
let autoScrollInterval; 

document.addEventListener('DOMContentLoaded', () => { flatpickr(".flatpickr-input", { dateFormat: "Y-m-d", locale: "pt", altInput: true, altFormat: "d/m/Y" }); });

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
        setTimeout(() => { toast.classList.remove('active'); }, 3000);
    },
    render: (list) => {
        const div = document.getElementById('products-list'); if(!div) return; div.innerHTML = "";
        if(list.length === 0) div.innerHTML = '<p style="grid-column:1/-1;text-align:center">Nenhum produto cadastrado.</p>';
        list.forEach(p => {
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            const minP = (vars && vars.length) ? Math.min(...vars.map(v => parseFloat(v.price))) : 0;
            const isPromo = p.is_promo ? '<span class="tag-promo">OFERTA</span>' : '';
            let mainImg = "https://via.placeholder.com/300";
            try { const m = JSON.parse(p.image_url); if(Array.isArray(m) && m.length > 0) mainImg = m[0]; else if(typeof p.image_url === 'string') mainImg = p.image_url; } catch(e) { mainImg = p.image_url; }
            div.innerHTML += `<div class="card" onclick="app.openModal('${p.id}')">${isPromo}<img src="${mainImg}" onerror="this.src='https://via.placeholder.com/300'"><div class="card-info"><div class="card-title">${p.name}</div><div class="card-price">R$ ${minP.toFixed(2)}</div><span class="tag-delivery"><i class="fas fa-truck"></i> 3-5 dias</span></div></div>`;
        });
    },
    openPromoModal: () => {
        const promos = state.products.filter(p => p.is_promo);
        if(!promos.length) return alert("Sem promoções ativas.");
        const cDiv = document.getElementById('promo-track'); cDiv.innerHTML = "";
        const shownIds = new Set();
        promos.forEach(p => {
            if(shownIds.has(p.id)) return; shownIds.add(p.id);
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            const minP = Math.min(...vars.map(v => v.price));
            let mainImg = "https://via.placeholder.com/100";
            try { const m = JSON.parse(p.image_url); mainImg = Array.isArray(m) ? m[0] : p.image_url; } catch(e) { mainImg = p.image_url; }
            cDiv.innerHTML += `<div class="promo-list-card" onclick="app.closeModal('promo-modal'); setTimeout(() => app.openModal('${p.id}'), 100)"><img src="${mainImg}"><div><span class="promo-price">R$ ${minP.toFixed(2)}</span></div></div>`;
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
                let dot = ""; if(COLOR_MAP[v.name]) dot = `<div class="color-circle" style="background:${COLOR_MAP[v.name]}"></div>`;
                chip.innerHTML = `${dot}<span>${v.name}</span>`;
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
        const area = document.getElementById('m-media-area'); if(!media.length) { area.innerHTML = ''; return; }
        let dotsHtml = '';
        if(media.length > 1) { dotsHtml = `<div class="carousel-dots">${media.map((_, i) => `<div class="carousel-dot ${i===0?'active':''}" onclick="app.swapMedia('${media[i]}', this, ${i})"></div>`).join('')}</div>`; }
        const renderMain = (url) => url.match(/\.(mp4|webm)$/i) ? `<video src="${url}" controls autoplay muted loop></video>` : `<img src="${url}">`;
        area.innerHTML = `<div class="carousel-main-container" id="c-main" onmouseenter="clearInterval(autoScrollInterval)" onmouseleave="app.startAutoScroll()">${renderMain(media[0])}${dotsHtml}</div>`;
        if(media.length > 1) { app.currentMediaIndex = 0; app.currentMediaList = media; app.startAutoScroll(); } else { clearInterval(autoScrollInterval); }
    },
    startAutoScroll: () => {
        if(app.currentMediaList && app.currentMediaList.length > 1) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = setInterval(() => {
                let nextIndex = app.currentMediaIndex + 1;
                if(nextIndex >= app.currentMediaList.length) nextIndex = 0;
                const dots = document.querySelectorAll('.carousel-dot');
                if(dots[nextIndex]) app.swapMedia(app.currentMediaList[nextIndex], dots[nextIndex], nextIndex);
            }, 3000);
        }
    },
    swapMedia: (url, dot, index) => {
        const main = document.getElementById('c-main');
        main.innerHTML = (url.match(/\.(mp4|webm)$/i) ? `<video src="${url}" controls autoplay muted loop></video>` : `<img src="${url}">`) + (main.querySelector('.carousel-dots')?.outerHTML || '');
        if(dot) { document.querySelectorAll('.carousel-dot').forEach(t => t.classList.remove('active')); dot.classList.add('active'); }
        if(typeof index !== 'undefined') app.currentMediaIndex = index;
    },
    updQty: (n) => { 
        if (n > 0) { if (!state.var) return alert("Selecione a variação primeiro."); if (state.qty + n > parseInt(state.var.stock)) return alert("Estoque máximo."); }
        state.qty += n; if(state.qty<1) state.qty=1; document.getElementById('m-qty').innerText = state.qty; 
    },
    addCart: () => {
        if(!state.var) return alert("Selecione uma opção");
        const existingItem = state.cart.find(i => i.name === state.current.name && i.variant === state.var.name);
        if (existingItem && existingItem.qty + state.qty > parseInt(state.var.stock)) return alert(`Estoque insuficiente.`);
        let img = state.current.image_url; try { const m = JSON.parse(img); if(Array.isArray(m)) img = m[0]; } catch(e){}
        if(existingItem) { existingItem.qty += state.qty; } else { state.cart.push({name: state.current.name, variant: state.var.name, price: parseFloat(state.var.price), qty: state.qty, image: img}); }
        app.renderCart(); app.closeModal('product-modal'); app.toggleCart();
    },
    renderCart: () => {
        const ul = document.getElementById('cart-list'); if(!ul) return; ul.innerHTML=""; let t=0;
        state.cart.forEach((i,idx) => {
            t += i.price*i.qty;
            ul.innerHTML += `<li class="cart-item"><img src="${i.image || 'https://via.placeholder.com/90'}" class="cart-thumb"><div class="cart-info"><b>${i.name}</b><br><small>${i.variant}</small><div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;"><div class="qty-controls"><button class="qty-btn" onclick="app.cQty(${idx},-1)">-</button><span class="qty-val">${i.qty}</span><button class="qty-btn" onclick="app.cQty(${idx},1)">+</button></div><div style="text-align:right"><strong>R$ ${(i.price*i.qty).toFixed(2)}</strong></div></div></div><button class="btn-remove-item" onclick="state.cart.splice(${idx},1);app.renderCart()"><i class="fas fa-trash"></i></button></li>`;
        });
        document.getElementById('cart-total').innerText = `R$ ${t.toFixed(2)}`;
        document.getElementById('cart-count').innerText = state.cart.length;
    },
    cQty: (idx,n) => { state.cart[idx].qty+=n; if(state.cart[idx].qty<1) state.cart[idx].qty=1; app.renderCart(); },
    toggleCart: () => document.querySelector('.sidebar').classList.toggle('open'),
    fetchCep: async (cep, prefix='addr') => {
        cep = cep.replace(/\D/g, ''); if(cep.length !== 8) return;
        try { const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`); const data = await res.json();
            if(!data.erro) {
                const streetId = prefix === 'manual' ? 'm-client-street' : 'addr-street';
                const bairroId = prefix === 'manual' ? 'm-client-bairro' : 'addr-bairro';
                const cityId = prefix === 'manual' ? 'm-client-city' : 'addr-city';
                const ufId = prefix === 'manual' ? 'm-client-uf' : 'addr-uf';
                if(document.getElementById(streetId)) document.getElementById(streetId).value = data.logradouro;
                if(document.getElementById(bairroId)) document.getElementById(bairroId).value = data.bairro;
                if(document.getElementById(cityId)) document.getElementById(cityId).value = data.localidade;
                if(document.getElementById(ufId)) document.getElementById(ufId).value = data.uf;
            } else { alert("CEP não encontrado."); }
        } catch(e) { console.error(e); }
    },
    openAddressModal: () => {
        const list = JSON.parse(localStorage.getItem('2a_addrs') || '[]'); const div = document.getElementById('saved-addresses-list'); div.innerHTML="";
        list.forEach((a,i) => { div.innerHTML += `<div style="border:1px solid #eee; padding:10px; margin-bottom:5px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;"><div onclick="app.setAddr(${i})" style="cursor:pointer; flex:1;"><b>${a.type}</b>: ${a.street}, ${a.number}</div><div><i class="fas fa-trash" onclick="app.delAddress(${i})" style="color:red; cursor:pointer;"></i></div></div>`; });
        app.showModal('address-modal');
    },
    addNewAddress: () => {
        const val = id => document.getElementById(id).value;
        const a = { name: val('addr-name'), phone: val('addr-phone'), cep: val('addr-cep'), street: val('addr-street'), number: val('addr-num'), bairro: val('addr-bairro'), city: val('addr-city'), uf: val('addr-uf'), ref: val('addr-ref'), type: document.getElementById('addr-type').value };
        if(!a.name || !a.street || !a.number) return alert("Preencha campos obrigatórios.");
        const list = JSON.parse(localStorage.getItem('2a_addrs') || '[]'); list.push(a);
        localStorage.setItem('2a_addrs', JSON.stringify(list));
        if(state.user) sb.from('customers').update({ address: list }).eq('id', state.user.id).then();
        state.address = a; localStorage.setItem('2a_active_addr', JSON.stringify(a));
        app.updateUI(); app.closeModal('address-modal');
    },
    delAddress: (i) => { const list = JSON.parse(localStorage.getItem('2a_addrs')); list.splice(i, 1); localStorage.setItem('2a_addrs', JSON.stringify(list)); app.openAddressModal(); },
    setAddr: (i) => { const list = JSON.parse(localStorage.getItem('2a_addrs')); state.address = list[i]; localStorage.setItem('2a_active_addr', JSON.stringify(state.address)); app.updateUI(); app.closeModal('address-modal'); },
    updateUI: () => {
        const btn = document.getElementById('btn-address-trigger');
        if(btn && state.address) { btn.classList.add('filled'); btn.innerHTML = `📍 ${state.address.street}, ${state.address.number}`; }
        const headerBtn = document.querySelector('.login-btn-header');
        if(headerBtn && state.user) headerBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${state.user.name.split(' ')[0]}`;
    },
    checkout: async (method) => {
        if(!state.cart.length) return alert("Carrinho vazio");
        if(!state.user) { alert("Faça login."); app.showModal('auth-modal'); return; }
        if(!state.address) { app.openAddressModal(); return alert("Selecione entrega"); }
        const btn = document.querySelector(method === 'whatsapp' ? '.btn-whatsapp' : '.btn-mp');
        const originalText = btn.innerText; btn.innerText = "Processando...";
        try {
            const orderData = await app.registerOrder(Date.now().toString(), method === 'whatsapp' ? 'WhatsApp/Dinheiro' : 'Mercado Pago', 'Pendente', method === 'mercadopago' ? 'Pago' : 'Pendente');
            await app.updateStockDatabase(); await app.sendEmails(orderData, state.cart, state.user.email);
            if(method === 'whatsapp') app.sendPaidOrder('Dinheiro/Combinar'); 
            else { 
                localStorage.setItem('2a_cart', JSON.stringify(state.cart));
                // Add MP logic here
                alert("Redirecionando para pagamento..."); 
            }
        } catch(e) { console.error(e); alert(e.message); btn.innerText = originalText; }
    },
    registerOrder: async (oid, method, status, payStatus) => {
        const total = state.cart.reduce((a,b)=>a+(b.price*b.qty),0);
        const order = { id: oid, customer_name: state.user.name, customer_email: state.user.email, customer_id: String(state.user.id), total: total, items: JSON.stringify(state.cart), address: JSON.stringify(state.address), date: new Date().toLocaleDateString(), method: method, status: status, payment_status: payStatus, created_at: new Date().toISOString() };
        await sb.from('orders').insert([order]); return order;
    },
    sendEmails: async (order, items, email) => { /* Email logic same as before */ },
    updateStockDatabase: async () => {
        for (const item of state.cart) {
            const { data: prod } = await sb.from('products').select('*').eq('name', item.name).single();
            if(prod) {
                let vars = typeof prod.variations === 'string' ? JSON.parse(prod.variations) : prod.variations;
                const v = vars.find(x => x.name === item.variant);
                if(v) { v.stock = Math.max(0, parseInt(v.stock) - item.qty); await sb.from('products').update({ variations: JSON.stringify(vars) }).eq('id', prod.id); }
            }
        }
    },
    sendPaidOrder: (type) => {
        let msg = `*NOVO PEDIDO (${state.user.name})*\nTotal: R$ ${document.getElementById('cart-total').innerText}\n`;
        state.cart.forEach(i=>{ msg += `${i.qty}x ${i.name} (${i.variant})\n`; });
        localStorage.removeItem('2a_cart'); state.cart = []; app.renderCart(); app.toggleCart();
        window.location.href = `https://wa.me/5567998951120?text=${encodeURIComponent(msg)}`;
    },
    showModal: (id) => { document.getElementById(id).classList.add('active'); history.pushState({modal:id}, null, ""); },
    closeModal: (id) => { document.getElementById(id).classList.remove('active'); history.back(); if(id==='product-modal') clearInterval(autoScrollInterval); },
    filter: (cat, btn) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
        app.render(cat==='all' ? state.products : state.products.filter(p => p.category===cat));
    }
};

const admin = {
    showLogin: async () => { const { data } = await sb.auth.getSession(); if(data.session) admin.openPanel(); else app.showModal('admin-auth-modal'); },
    verifyLogin: async () => {
        try {
            const { error } = await sb.auth.signInWithPassword({ email: document.getElementById('admin-email').value, password: document.getElementById('admin-pass').value });
            if (error) throw error;
            app.closeModal('admin-auth-modal'); admin.openPanel(); document.getElementById('admin-pass').value = "";
        } catch (e) { alert("Erro login"); }
    },
    openPanel: () => {
        setTimeout(() => { app.showModal('admin-modal'); admin.renderClientsAndOrders(); admin.renderList(); admin.updateStats(); }, 100);
    },
    logout: async () => { await sb.auth.signOut(); app.closeModal('admin-modal'); window.location.reload(); },
    initCheckboxes: () => {
        const cDiv = document.getElementById('color-checks'), vDiv = document.getElementById('volume-checks');
        if(!cDiv) return; cDiv.innerHTML = ""; vDiv.innerHTML = "";
        Object.keys(COLOR_MAP).forEach(c => { cDiv.innerHTML += `<label><input type="checkbox" class="hidden-check" value="${c}" onchange="admin.toggleInput(this)"><span class="color-option-label" style="background:${COLOR_MAP[c]}" title="${c}"></span></label>`; });
        PRESETS_VOL.forEach(v => { vDiv.innerHTML += `<label><input type="checkbox" class="hidden-check" value="${v}" onchange="admin.toggleInput(this)"><span class="vol-option-label">${v}</span></label>`; });
    },
    toggleInput: (cb) => {
        const id = `grp-${cb.value.replace(/[^a-z0-9]/gi,'')}`;
        const area = document.getElementById('active-vars-area');
        if(cb.checked) area.innerHTML += `<div id="${id}" class="var-inputs show"><strong style="grid-column:span 2">${cb.value}</strong><input type="hidden" class="v-name" value="${cb.value}"><input type="number" class="input v-cost" placeholder="Custo"><input type="number" class="input v-price" placeholder="Venda"><input type="number" class="input v-stock" placeholder="Estoque" style="grid-column:span 2"></div>`;
        else document.getElementById(id)?.remove();
    },
    tab: (t, btn) => { 
        if(btn) { document.querySelectorAll('.nav-card').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
        ['dash','prod','clients','new-order'].forEach(i => { document.getElementById(`tab-${i}`).style.display = i===t ? 'block' : 'none'; });
        if(t === 'new-order') { admin.populateManualProdSelect(); admin.manualCart = []; admin.renderManualCart(); }
        if(t === 'clients') admin.renderClientsAndOrders();
    },
    handleFileSelect: (input) => {
        const files = Array.from(input.files); state.selectedFiles = files; state.mainImageIndex = 0; 
        const area = document.getElementById('file-preview-area'); area.innerHTML = "";
        files.forEach((f, idx) => { area.innerHTML += `<div class="preview-wrapper" onclick="admin.setMain(${idx})"><img src="${URL.createObjectURL(f)}" class="file-preview-item ${idx===0?'main-selected':''}" id="prev-${idx}"><div class="main-tag">PRINCIPAL</div></div>`; });
    },
    setMain: (idx) => { state.mainImageIndex = idx; document.querySelectorAll('.file-preview-item').forEach(el => el.classList.remove('main-selected')); document.getElementById(`prev-${idx}`).classList.add('main-selected'); },
    save: async () => {
        if(!sb) return;
        const btn = document.getElementById('btn-save'); btn.innerText="Salvando..."; btn.disabled=true;
        try {
            const vars = [];
            document.querySelectorAll('.var-inputs').forEach(d => {
                const p = d.querySelector('.v-price').value, s = d.querySelector('.v-stock').value;
                if(p && s) vars.push({ name: d.querySelector('.v-name').value, cost: d.querySelector('.v-cost').value||0, price: p, stock: s });
            });
            if(vars.length === 0) throw new Error("Preencha variações");
            
            let mediaUrls = [];
            if(state.selectedFiles.length > 0) {
                if(state.mainImageIndex > 0) { const main = state.selectedFiles.splice(state.mainImageIndex, 1)[0]; state.selectedFiles.unshift(main); }
                for(let i=0; i<state.selectedFiles.length; i++) {
                    const fName = 'prod_' + Date.now() + '_' + i;
                    await sb.storage.from('images').upload(fName, state.selectedFiles[i]);
                    const { data } = sb.storage.from('images').getPublicUrl(fName);
                    mediaUrls.push(data.publicUrl);
                }
            } else {
                const editId = document.getElementById('edit-id').value;
                if(editId) { const oldP = state.products.find(x => String(x.id) === String(editId)); if(oldP) try { mediaUrls = JSON.parse(oldP.image_url); } catch(e) { mediaUrls = [oldP.image_url]; } }
                if(mediaUrls.length===0) mediaUrls=["https://via.placeholder.com/300"];
            }

            const payload = {
                name: document.getElementById('f-name').value, category: document.getElementById('f-cat').value,
                cost_price: document.getElementById('f-cost').value || 0, description: document.getElementById('f-desc').value || "",
                is_promo: document.getElementById('f-promo').checked, variations: JSON.stringify(vars), image_url: JSON.stringify(mediaUrls)
            };
            const editId = document.getElementById('edit-id').value;
            if(editId) await sb.from('products').update(payload).eq('id', editId);
            else { payload.id = Date.now(); await sb.from('products').insert([payload]); }
            app.success("Produto Salvo!"); admin.clear(); await app.load(); admin.renderList(); admin.updateStats();
        } catch(e) { alert(e.message); } finally { btn.innerText="Salvar"; btn.disabled=false; }
    },
    edit: (id) => {
        const p = state.products.find(x => String(x.id) === String(id));
        document.getElementById('edit-id').value = p.id;
        document.getElementById('f-name').value = safeVal(p.name); document.getElementById('f-desc').value = safeVal(p.description);
        document.getElementById('f-cost').value = safeVal(p.cost_price); document.getElementById('f-promo').checked = p.is_promo;
        admin.clear(true); document.getElementById('edit-id').value = p.id;
        const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
        if(vars) vars.forEach(v => {
            document.querySelectorAll('.hidden-check').forEach(cb => {
                if(cb.value === v.name) { cb.checked = true; admin.toggleInput(cb); 
                    setTimeout(() => { const d = document.getElementById(`grp-${cb.value.replace(/[^a-z0-9]/gi,'')}`); if(d) { d.querySelector('.v-price').value=v.price; d.querySelector('.v-stock').value=v.stock; } }, 50); 
                }
            });
        });
        admin.tab('prod'); 
    },
    del: async (id) => { if(confirm("Excluir?")) { if(sb) await sb.from('products').delete().eq('id', id); await app.load(); admin.renderList(); } },
    clear: (soft=false) => { 
        if(!soft) document.getElementById('edit-id').value=""; 
        ['f-name','f-desc','f-cost','f-file','f-price-global','f-stock-global'].forEach(i=>{ const el = document.getElementById(i); if(el) el.value=""; });
        state.selectedFiles = []; state.mainImageIndex = 0;
        document.getElementById('file-preview-area').innerHTML = ""; document.getElementById('active-vars-area').innerHTML="";
        document.querySelectorAll('.hidden-check').forEach(c => c.checked=false);
    },
    resetData: async () => { if(confirm("Apagar tudo?") && prompt("Digite DELETAR")==="DELETAR") { await sb.from('orders').delete().neq('id', 0); app.success("Resetado."); admin.renderClientsAndOrders(); } },
    renderList: () => {
        const div = document.getElementById('admin-list'); div.innerHTML="";
        state.products.forEach(p => {
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            let stock = 0; if(vars) vars.forEach(v => stock += parseInt(v.stock||0));
            let mainImg = "https://via.placeholder.com/50"; try { const m = JSON.parse(p.image_url); if(Array.isArray(m)) mainImg = m[0]; else mainImg = p.image_url; } catch(e){}
            div.innerHTML += `<div class="mini-prod"><img src="${mainImg}"><div style="flex:1"><strong>${p.name}</strong><span class="stock-info">Estoque: ${stock}</span></div><div><button onclick="admin.edit('${p.id}');" class="btn-chip-modern">✏️ Editar</button><button onclick="admin.del('${p.id}')" style="margin-left:5px; border:none; background:none;">🗑️</button></div></div>`;
        });
    },
    populateManualProdSelect: () => {
        const sel = document.getElementById('m-prod-select'); sel.innerHTML = '<option value="">Selecione...</option>';
        state.products.forEach(p => { const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations; vars.forEach(v => { sel.innerHTML += `<option value="${p.id}|${v.name}|${v.price}|${p.name}">${p.name} - ${v.name} (R$ ${v.price})</option>`; }); });
    },
    manualCart: [],
    addManualItem: () => {
        const val = document.getElementById('m-prod-select').value; const qty = parseInt(document.getElementById('m-prod-qty').value);
        if(!val) return; const [pid, vname, price, pname] = val.split('|');
        admin.manualCart.push({ name: pname, variant: vname, price: parseFloat(price), qty: qty, is_stock: true, pid: pid }); admin.renderManualCart();
    },
    addCustomItem: () => {
        const name = document.getElementById('m-custom-item').value; const price = parseFloat(document.getElementById('m-custom-price').value);
        if(name && price) { admin.manualCart.push({ name: name, variant: "Avulso", price: price, qty: 1, is_stock: false }); admin.renderManualCart(); }
    },
    renderManualCart: () => {
        const div = document.getElementById('manual-cart-list'); div.innerHTML = ""; let total = 0;
        admin.manualCart.forEach((i, idx) => { total += i.price * i.qty; div.innerHTML += `<div class="manual-cart-item"><span>${i.qty}x ${i.name}</span><button onclick="admin.manualCart.splice(${idx},1); admin.renderManualCart()" style="color:red;border:none;">&times;</button></div>`; });
        document.getElementById('m-total-display').innerText = `R$ ${total.toFixed(2)}`;
    },
    saveManualOrder: async () => {
        if(admin.manualCart.length === 0) return alert("Adicione itens.");
        const total = admin.manualCart.reduce((a,b)=>a+(b.price*b.qty),0);
        const order = { id: Date.now().toString(), customer_name: document.getElementById('m-client-name').value, customer_email: document.getElementById('m-client-email').value, total: total, items: JSON.stringify(admin.manualCart), method: 'Manual', status: document.getElementById('m-payment-status').value==='Pago'?'Entregue':'Pendente', payment_status: document.getElementById('m-payment-status').value, created_at: new Date().toISOString() };
        await sb.from('orders').insert([order]);
        app.success("Pedido Manual Salvo!"); admin.manualCart=[]; admin.renderManualCart(); admin.tab('clients');
    },
    openEntryModal: (oid, total) => { document.getElementById('entry-oid').value = oid; document.getElementById('entry-total').value = total; app.showModal('entry-modal'); },
    confirmEntry: async () => {
        const oid = document.getElementById('entry-oid').value; const total = parseFloat(document.getElementById('entry-total').value); const paid = parseFloat(document.getElementById('entry-val').value);
        const rest = total - paid;
        if(paid > 0 && paid < total) {
            const arr = [{ date: new Date().toISOString(), amount: paid, paid: true }, { date: new Date().toISOString(), amount: rest, paid: false }];
            await sb.from('orders').update({ payment_status: 'Parcelado', installments: JSON.stringify(arr) }).eq('id', oid);
            app.success("Entrada registrada!"); app.closeModal('entry-modal'); admin.renderClientsAndOrders();
        } else { alert("Valor inválido"); }
    },
    togglePaymentDetails: (sel, id, total) => { document.getElementById(`pay-det-${id}`).style.display = sel.value === 'Parcelado' ? 'block' : 'none'; },
    genInstallments: (id, total) => {
        const n = parseInt(document.getElementById(`inst-n-${id}`).value); const arr = []; const val = (total/n).toFixed(2);
        for(let i=0; i<n; i++) arr.push({ date: new Date().toISOString().split('T')[0], amount: val, paid: false });
        admin.renderInstInputs(id, arr);
    },
    renderInstInputs: (id, arr) => {
        const box = document.getElementById(`inst-list-${id}`); box.innerHTML = "";
        arr.forEach((item, idx) => { box.innerHTML += `<div class="inst-gen-row"><span>${idx+1}x</span><input type="date" value="${item.date}" class="i-date"><input type="number" value="${item.amount}" class="i-amount"><label class="custom-checkbox"><input type="checkbox" class="i-check" ${item.paid?'checked':''}><span class="checkmark"></span></label></div>`; });
    },
    updatePaymentStatus: async (id) => {
        const list = document.getElementById(`inst-list-${id}`); const rows = list.querySelectorAll('.inst-gen-row'); const arr = [];
        rows.forEach(r => { arr.push({ date: r.querySelector('.i-date').value, amount: r.querySelector('.i-amount').value, paid: r.querySelector('.i-check').checked }); });
        await sb.from('orders').update({ payment_status: 'Parcelado', installments: JSON.stringify(arr) }).eq('id', id);
        app.success("Parcelas salvas!"); admin.renderClientsAndOrders();
    },
    renderClientsAndOrders: async () => {
        const { data } = await sb.from('orders').select('*').neq('status', 'Cancelado').order('created_at', {ascending: false});
        const div = document.getElementById('pay-list'); div.innerHTML = "";
        if(!data || data.length === 0) { div.innerHTML = "<p style='text-align:center; padding:20px;'>Sem dados.</p>"; return; }
        let totalRec = 0; const clients = {};
        data.forEach(o => {
            const key = o.customer_email || o.customer_name;
            if(!clients[key]) clients[key] = { name: o.customer_name, email: o.customer_email, orders: [] };
            clients[key].orders.push(o);
            let paid = 0; if(o.payment_status==='Pago') paid=o.total; else if(o.installments) JSON.parse(o.installments).forEach(i=>{if(i.paid) paid+=parseFloat(i.amount)});
            totalRec += (o.total - paid);
        });
        document.getElementById('total-receivable').innerText = `R$ ${totalRec.toFixed(2)}`;
        
        Object.values(clients).forEach((c, idx) => {
            let html = `<div class="client-admin-card"><div class="cac-header" onclick="document.getElementById('cb-${idx}').classList.toggle('open')"><div class="cac-info"><h4>${c.name}</h4><div class="cac-actions-row"><a href="https://wa.me/" class="btn-chip-modern chip-whatsapp"><i class="fab fa-whatsapp"></i> Conversar</a> <a href="mailto:${c.email}" class="btn-chip-modern chip-email"><i class="far fa-envelope"></i> Email</a></div></div></div><div id="cb-${idx}" class="cac-body">`;
            c.orders.forEach(o => {
                let paid = 0; if(o.payment_status==='Pago') paid=o.total; else if(o.installments) JSON.parse(o.installments).forEach(i=>{if(i.paid) paid+=parseFloat(i.amount)});
                const debt = o.total - paid;
                html += `<div class="debt-card ${debt>0?'overdue':'paid'}"><div style="display:flex; justify-content:space-between;"><strong>Pedido #${o.id.slice(-4)}</strong><span>Total: R$ ${o.total.toFixed(2)}</span></div><div style="margin:10px 0; color:${debt>0?'red':'green'}; font-weight:bold;">Resta: R$ ${debt.toFixed(2)}</div>
                ${debt>0 ? `<button onclick="admin.openEntryModal('${o.id}', ${o.total})" class="btn-chip-action"><i class="fas fa-coins"></i> Entrada</button>` : ''}
                <details style="margin-top:10px;"><summary class="finance-toggle-btn">Gerenciar Financeiro <i class="fas fa-chevron-down"></i></summary><div style="padding:10px; border-top:1px solid #eee;">
                <label>Status Pagamento:</label><select class="modern-select" onchange="admin.togglePaymentDetails(this, '${o.id}', ${o.total})"><option value="Pendente">Pendente</option><option value="Pago">Pago</option><option value="Parcelado" ${o.payment_status==='Parcelado'?'selected':''}>Parcelado</option></select>
                <div id="pay-det-${o.id}" class="gen-installments-area" style="display:${o.payment_status==='Parcelado'?'block':'none'}; margin-top:10px;"><div style="display:flex; gap:5px;"><input type="number" id="inst-n-${o.id}" class="input" placeholder="Qtd" style="width:60px;"><button onclick="admin.genInstallments('${o.id}', ${o.total})" class="btn-modern small">Gerar</button></div><div id="inst-list-${o.id}"></div></div>
                <button onclick="admin.updatePaymentStatus('${o.id}')" class="btn-modern success small" style="width:100%; margin-top:10px;">Salvar</button>
                </div></details></div>`;
                if(o.installments && o.payment_status === 'Parcelado') setTimeout(() => admin.renderInstInputs(o.id, JSON.parse(o.installments)), 500);
            });
            html += `</div></div>`;
            div.innerHTML += html;
        });
    },
    updateStats: () => {
        const grid = document.getElementById('dash-stock-grid'); grid.innerHTML = "";
        let val = 0, cost = 0, qty = 0;
        state.products.forEach(p => {
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            let stock = 0; vars.forEach(v => { const q = parseInt(v.stock); stock+=q; val+=q*parseFloat(v.price); cost+=q*parseFloat(v.cost||p.cost_price||0); qty+=q; });
            let img = "https://via.placeholder.com/50"; try { const m = JSON.parse(p.image_url); if(Array.isArray(m)) img = m[0]; } catch(e){}
            grid.innerHTML += `<div class="mini-prod"><img src="${img}"><div><strong>${p.name}</strong><span style="font-size:0.8rem; color:${stock<5?'red':'green'}">${stock} un.</span></div></div>`;
        });
        document.getElementById('st-rev').innerText = `R$ ${val.toFixed(2)}`; document.getElementById('st-cost').innerText = `R$ ${cost.toFixed(2)}`; document.getElementById('st-qty').innerText = qty;
    }
};

(async function init() {
    if(window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);
    const u = localStorage.getItem('2a_user'); if(u) state.user=JSON.parse(u);
    const a = localStorage.getItem('2a_active_addr'); if(a) state.address=JSON.parse(a);
    await app.load(); admin.initCheckboxes(); app.updateUI();
    document.getElementById('loading-screen').style.display='none';
})();

document.addEventListener('keydown', (e) => { if(e.key === "Escape") { document.querySelectorAll('.overlay.active').forEach(m => m.classList.remove('active')); const sidebar = document.querySelector('.sidebar'); if(sidebar && sidebar.classList.contains('open')) { app.toggleCart(); } history.back(); } });
