setTimeout(() => { const l = document.getElementById('loading-screen'); if(l) l.style.display='none'; }, 4000);
window.onerror = function(msg) { const sb = document.getElementById('status-bar'); if(sb) { sb.style.display='flex'; sb.className='err'; sb.innerHTML = `⚠️ Erro: ${msg}`; } return false; };

// CONFIG
const SUPABASE_URL = 'https://sdeslwemzhxqixmphyye.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZXNsd2Vtemh4cWl4bXBoeXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDUxNDUsImV4cCI6MjA4MjI4MTE0NX0.QK7PkbYOnT6nIRFZHtHsuh42EuCjMSVvdnxf7h1bD80';
const GOOGLE_CLOUD_URL = 'https://criarpagamentoss-967029810770.southamerica-east1.run.app'; 
const EMAILJS_PUBLIC_KEY = 'vEXIgVw6GynR5W1qj'; 
const EMAILJS_SERVICE_ID = 'service_3x4ghcd';
const EMAILJS_TEMPLATE_CLIENTE = 'template_rwf0bay';
const EMAILJS_TEMPLATE_ADMIN = 'template_rwf0bay';

let sb = null; try { sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch(e) { console.error(e); }

const state = { products: [], cart: [], current: null, var: null, qty: 1, user: null, address: null, adminOrders: [], filterStatus: 'all', filterPay: 'all', selectedFiles: [], mainImageIndex: 0 };
const PRESETS_VOL = ['25ml','50ml','75ml','100ml','200ml','P','M','G','GG','Unico'];
const COLOR_MAP = { 'Preto': '#000000', 'Branco': '#ffffff', 'Vermelho': '#e74c3c', 'Azul': '#3498db', 'Rosa': '#e91e63', 'Verde': '#2ecc71', 'Nude': '#e3c0a5', 'Estampado': 'linear-gradient(45deg, red, blue)', 'Bege': '#f5f5dc', 'Amarelo': '#f1c40f', 'Cinza': '#95a5a6' };

const safeVal = (v) => (v === null || v === undefined || v === "null") ? "" : v;
const setSafe = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = safeVal(val); };

let autoScrollInterval; // Variável global para controle do carrossel

document.addEventListener('DOMContentLoaded', () => {
    flatpickr(".flatpickr-input", { dateFormat: "Y-m-d", locale: "pt", altInput: true, altFormat: "d/m/Y" });
});

const app = {
    load: async () => {
        if(!sb) return;
        const { data, error } = await sb.from('products').select('*');
        if(!error) { state.products = data || []; app.render(state.products); }
    },
    render: (list) => {
        const div = document.getElementById('products-list'); if(!div) return; div.innerHTML = "";
        if(list.length === 0) div.innerHTML = '<p style="grid-column:1/-1;text-align:center">Nenhum produto cadastrado.</p>';
        list.forEach(p => {
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            const minP = (vars && vars.length) ? Math.min(...vars.map(v => parseFloat(v.price))) : 0;
            const isPromo = p.is_promo ? '<span class="tag-promo">OFERTA</span>' : '';
            
            let mainImg = "https://via.placeholder.com/300";
            try {
                const media = JSON.parse(p.image_url);
                if(Array.isArray(media) && media.length > 0) mainImg = media[0];
                else if(typeof p.image_url === 'string') mainImg = p.image_url;
            } catch(e) { mainImg = p.image_url; }

            div.innerHTML += `<div class="card" onclick="app.openModal('${p.id}')">${isPromo}<img src="${mainImg}" onerror="this.src='https://via.placeholder.com/300'"><div class="card-info"><span style="font-size:0.8rem;color:#999;text-transform:uppercase;">${p.category}</span><div style="font-weight:bold;margin:5px 0;">${p.name}</div><div style="color:var(--primary);font-weight:bold;">A partir R$ ${minP.toFixed(2)}</div><span class="tag-delivery">🚚 03 a 05 dias úteis</span></div></div>`;
        });
    },
    openPromoModal: () => {
        const promos = state.products.filter(p => p.is_promo);
        if(!promos.length) return alert("Sem promoções ativas.");
        const cDiv = document.getElementById('promo-track'); cDiv.innerHTML = "";
        const shownIds = new Set();
        
        promos.forEach(p => {
            if(shownIds.has(p.id)) return; // Evita duplicatas no carrossel
            shownIds.add(p.id);
            
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            const minP = Math.min(...vars.map(v => v.price));
            let mainImg = "https://via.placeholder.com/100";
            try { const m = JSON.parse(p.image_url); mainImg = Array.isArray(m) ? m[0] : p.image_url; } catch(e) { mainImg = p.image_url; }
            
            cDiv.innerHTML += `
            <div class="promo-list-card" onclick="app.closeModal('promo-modal'); setTimeout(() => app.openModal('${p.id}'), 100)">
                <img src="${mainImg}">
                <div><strong>${p.name}</strong><br><small class="promo-price">R$ ${minP.toFixed(2)}</small></div>
            </div>`;
        });
        app.showModal('promo-modal');
    },
    openModal: (id) => {
        const p = state.products.find(x => String(x.id) === String(id));
        if(!p) return;
        state.current = p; state.qty=1; state.var=null;
        
        let media = [];
        try { media = JSON.parse(p.image_url); } catch(e) { media = [p.image_url]; }
        if(!Array.isArray(media)) media = [p.image_url];
        app.renderCarousel(media);

        setSafe('m-title', p.name); setSafe('m-cat', p.category); setSafe('m-desc', p.description); setSafe('m-price', "Selecione...");
        const vDiv = document.getElementById('m-vars'); vDiv.innerHTML = "";
        const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
        
        // CRIAÇÃO DOS CHIPS MODERNOS
        if(vars) {
            vars.forEach(v => {
                const hasStock = parseInt(v.stock) > 0;
                const chip = document.createElement('div');
                chip.className = `var-chip ${!hasStock ? 'disabled' : ''}`;
                
                let dot = "";
                if(COLOR_MAP[v.name]) dot = `<div class="color-circle" style="background:${COLOR_MAP[v.name]}"></div>`;
                
                chip.innerHTML = `${dot}<span>${v.name}</span><small style="opacity:0.8">R$ ${parseFloat(v.price).toFixed(2)}</small>`;
                
                if(hasStock) {
                    chip.onclick = () => {
                        state.var = v;
                        document.getElementById('m-price').innerText = `R$ ${parseFloat(v.price).toFixed(2)}`;
                        // Remove selected from all siblings
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
        
        const isVideo = (url) => url && url.match && url.match(/\.(mp4|webm)$/i);
        
        // Gera dots se houver mais de uma imagem
        let dotsHtml = '';
        if(media.length > 1) {
            dotsHtml = `<div class="carousel-dots">${media.map((_, i) => `<div class="carousel-dot ${i===0?'active':''}" onclick="app.swapMedia('${media[i]}', this, ${i})"></div>`).join('')}</div>`;
        }

        // Renderiza a primeira imagem/video como main
        const renderMain = (url) => isVideo(url) ? `<video src="${url}" controls autoplay muted loop></video>` : `<img src="${url}">`;
        let html = `
            <div class="carousel-main-container" id="c-main" onmouseenter="clearInterval(autoScrollInterval)" onmouseleave="app.startAutoScroll()">
                ${renderMain(media[0])}
                ${dotsHtml}
            </div>
        `;
        
        area.innerHTML = html;

        // Inicia Auto Scroll se houver múltiplas imagens
        if(media.length > 1) {
            app.currentMediaIndex = 0;
            app.currentMediaList = media;
            app.startAutoScroll();
        } else {
            clearInterval(autoScrollInterval);
        }
    },
    startAutoScroll: () => {
        if(app.currentMediaList && app.currentMediaList.length > 1) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = setInterval(() => {
                let nextIndex = app.currentMediaIndex + 1;
                if(nextIndex >= app.currentMediaList.length) nextIndex = 0;
                
                const dots = document.querySelectorAll('.carousel-dot');
                if(dots[nextIndex]) app.swapMedia(app.currentMediaList[nextIndex], dots[nextIndex], nextIndex);
            }, 3000); // 3 segundos
        }
    },
    swapMedia: (url, dot, index) => {
        const isVideo = (u) => u.match(/\.(mp4|webm)$/i);
        const main = document.getElementById('c-main');
        
        // Verifica se o elemento main tem imagem ou video filho para trocar o src
        const imgEl = main.querySelector('img');
        const vidEl = main.querySelector('video');
        
        if(isVideo(url)) {
            main.innerHTML = `<video src="${url}" controls autoplay muted loop></video>` + (main.querySelector('.carousel-dots')?.outerHTML || '');
        } else {
            // Tenta reaproveitar a tag img para transição suave, ou recria
            if(imgEl) {
                imgEl.style.opacity = 0;
                setTimeout(() => { imgEl.src = url; imgEl.style.opacity = 1; }, 200);
            } else {
                main.innerHTML = `<img src="${url}">` + (main.querySelector('.carousel-dots')?.outerHTML || '');
            }
        }

        if(dot) {
            document.querySelectorAll('.carousel-dot').forEach(t => t.classList.remove('active'));
            dot.classList.add('active');
        }
        
        if(typeof index !== 'undefined') app.currentMediaIndex = index;
    },
    updQty: (n) => { 
        if (n > 0) {
            if (!state.var) return alert("Selecione a variação primeiro.");
            if (state.qty + n > parseInt(state.var.stock)) return alert("Estoque máximo atingido.");
        }
        state.qty += n; 
        if(state.qty<1) state.qty=1; 
        document.getElementById('m-qty').innerText = state.qty; 
    },
    addCart: () => {
        if(!state.var) return alert("Selecione uma opção");
        const existingItem = state.cart.find(i => i.name === state.current.name && i.variant === state.var.name);
        const currentCartQty = existingItem ? existingItem.qty : 0;
        if (currentCartQty + state.qty > parseInt(state.var.stock)) return alert(`Estoque insuficiente.`);
        
        let img = state.current.image_url;
        try { const m = JSON.parse(img); if(Array.isArray(m)) img = m[0]; } catch(e){}

        if(existingItem) { existingItem.qty += state.qty; } else {
            state.cart.push({name: state.current.name, variant: state.var.name, price: parseFloat(state.var.price), qty: state.qty, image: img});
        }
        app.renderCart(); app.closeModal('product-modal'); app.toggleCart();
    },
    renderCart: () => {
        const ul = document.getElementById('cart-list'); if(!ul) return; ul.innerHTML=""; let t=0;
        state.cart.forEach((i,idx) => {
            t += i.price*i.qty;
            ul.innerHTML += `<li class="cart-item"><img src="${i.image || 'https://via.placeholder.com/70'}" class="cart-thumb"><div><b>${i.name}</b><br><small>${i.variant}</small><div class="qty-controls"><button class="qty-btn" onclick="app.cQty(${idx},-1)">-</button><span class="qty-val">${i.qty}</span><button class="qty-btn" onclick="app.cQty(${idx},1)">+</button></div></div><div style="text-align:right">R$ ${(i.price*i.qty).toFixed(2)}<br><button class="btn-remove" onclick="state.cart.splice(${idx},1);app.renderCart()"><i class="fas fa-trash"></i></button></div></li>`;
        });
        document.getElementById('cart-total').innerText = `R$ ${t.toFixed(2)}`;
        document.getElementById('cart-count').innerText = state.cart.length;
    },
    cQty: (idx,n) => { state.cart[idx].qty+=n; if(state.cart[idx].qty<1) state.cart[idx].qty=1; app.renderCart(); },
    toggleCart: () => document.querySelector('.sidebar').classList.toggle('open'),
    fetchCep: async (cep, prefix='addr') => {
        cep = cep.replace(/\D/g, '');
        if(cep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if(!data.erro) {
                    // Suporte para form cliente (addr-) e manual admin (m-client-)
                    const streetId = prefix === 'manual' ? 'm-client-street' : 'addr-street';
                    const bairroId = prefix === 'manual' ? 'm-client-bairro' : 'addr-bairro';
                    const cityId = prefix === 'manual' ? 'm-client-city' : 'addr-city';
                    const ufId = prefix === 'manual' ? 'm-client-uf' : 'addr-uf';
                    const numId = prefix === 'manual' ? 'm-client-num' : 'addr-num';

                    if(document.getElementById(streetId)) document.getElementById(streetId).value = data.logradouro;
                    if(document.getElementById(bairroId)) document.getElementById(bairroId).value = data.bairro;
                    if(document.getElementById(cityId)) document.getElementById(cityId).value = data.localidade;
                    if(document.getElementById(ufId)) document.getElementById(ufId).value = data.uf;
                    if(document.getElementById(numId)) document.getElementById(numId).focus();
                } else { alert("CEP não encontrado."); }
            } catch(e) { console.error(e); }
        }
    },
    openAddressModal: () => {
        const list = JSON.parse(localStorage.getItem('2a_addrs') || '[]');
        const div = document.getElementById('saved-addresses-list'); div.innerHTML="";
        list.forEach((a,i) => {
            const fullAddr = `${a.street}, ${a.number} - ${a.bairro}, ${a.city}/${a.uf}`;
            div.innerHTML += `<div style="border:1px solid #eee; padding:10px; margin-bottom:5px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;"><div onclick="app.setAddr(${i})" style="cursor:pointer; flex:1;"><b>${a.type || 'Endereço'}</b>: ${fullAddr}<br><small>${a.name} (${a.phone})</small></div><div><i class="fas fa-edit" onclick="app.editAddress(${i})" style="color:blue; margin-right:10px; cursor:pointer;"></i><i class="fas fa-trash" onclick="app.delAddress(${i})" style="color:red; cursor:pointer;"></i></div></div>`;
        });
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
    delAddress: (i) => {
        const list = JSON.parse(localStorage.getItem('2a_addrs'));
        list.splice(i, 1);
        localStorage.setItem('2a_addrs', JSON.stringify(list));
        if(state.user) sb.from('customers').update({ address: list }).eq('id', state.user.id).then();
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
    updateUI: () => {
        const btn = document.getElementById('btn-address-trigger');
        if(btn && state.address) { btn.classList.add('filled'); btn.innerHTML = `📍 Entregar em: ${state.address.city}/${state.address.uf} (${state.address.street})`; }
        const authArea = document.getElementById('cart-auth-area');
        if(authArea) {
            if(state.user) authArea.innerHTML = `<small style="color:#27ae60"><i class="fas fa-check-circle"></i> Olá, ${state.user.name}</small>`;
            else authArea.innerHTML = `<button onclick="app.showModal('auth-modal')" style="width:100%; padding:10px; background:#f0f0f0; border:none; border-radius:8px; color:#555; font-weight:bold;"><i class="fas fa-user-circle"></i> Login / Cadastro</button>`;
        }
        const headerBtn = document.querySelector('.login-btn-header');
        if(headerBtn && state.user) headerBtn.innerHTML = `<i class="fas fa-user-circle"></i> Olá, ${state.user.name.split(' ')[0]}!`;
    },
    checkout: async (method) => {
        if(!state.cart.length) return alert("Carrinho vazio");
        if(!state.user) { alert("Por favor, faça Login ou Cadastre-se."); app.showModal('auth-modal'); return; }
        if(!state.address) { app.openAddressModal(); return alert("Selecione entrega"); }
        const btn = document.querySelector(method === 'whatsapp' ? '.btn-whatsapp' : '.btn-mp');
        const btnOriginalText = btn.innerText;
        try {
            btn.innerText = "Registrando...";
            const newOrderId = Date.now().toString();
            const statusInicial = method === 'whatsapp' ? 'Pendente (WhatsApp)' : 'Pendente (Mercado Pago)';
            const payStatus = method === 'mercadopago' ? 'Pago' : 'Pendente';
            const orderData = await app.registerOrder(newOrderId, method === 'whatsapp' ? 'WhatsApp/Dinheiro' : 'Mercado Pago', statusInicial, payStatus);
            await app.updateStockDatabase();
            // Refatoração: envia dados explicitamente
            await app.sendEmails(orderData, state.cart, state.user.email);
            
            if(method === 'whatsapp') app.sendPaidOrder('Dinheiro/Combinar'); 
            else {
                localStorage.setItem('2a_cart', JSON.stringify(state.cart));
                const items = state.cart.map(i => ({name: `${i.name} - ${i.variant}`, price: i.price, qty: i.qty}));
                const res = await fetch(GOOGLE_CLOUD_URL, {
                    method:'POST', headers:{'Content-Type':'application/json'}, 
                    body:JSON.stringify({items, buyer: { email: state.user.email, name: state.user.name }, address: state.address})
                });
                const data = await res.json();
                if(data.init_point) window.location.href = data.init_point;
                else throw new Error("Erro ao gerar link de pagamento");
            }
        } catch(e) { console.error(e); alert(e.message); btn.innerText = btnOriginalText; }
    },
    registerOrder: async (oid, method, status = 'Pendente', payStatus = 'Pendente') => {
        if(!sb) throw new Error("Banco de dados desconectado.");
        const total = state.cart.reduce((a,b)=>a+(b.price*b.qty),0);
        const order = {
            id: oid.toString(), customer_name: state.user.name, customer_email: state.user.email, customer_id: String(state.user.id), 
            total: total, items: JSON.stringify(state.cart), address: JSON.stringify(state.address), date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            method: method, status: status, payment_status: payStatus, created_at: new Date().toISOString()
        };
        const { data, error } = await sb.from('orders').insert([order]).select();
        if(error) throw new Error(`Erro no Banco: ${error.message}`);
        return order; 
    },
    sendEmails: async (order, cartItems, recipientEmail) => {
        if(!recipientEmail) return;
        const itemsTxt = cartItems.map(i => `${i.qty}x ${i.name} (${i.variant}) - R$ ${i.price.toFixed(2)}`).join('\n');
        const total = cartItems.reduce((a,b)=>a+(b.price*b.qty),0).toFixed(2);
        let fullAddr = "Não informado";
        try {
            const addrObj = typeof order.address === 'string' ? JSON.parse(order.address) : order.address;
            fullAddr = `${addrObj.street}, ${addrObj.number} - ${addrObj.city}`;
        } catch(e) {}

        const templateParams = { 
            to_name: order.customer_name, 
            to_email: recipientEmail, 
            message: `PEDIDO #${order.id}\n\nPAGAMENTO: ${order.method}\n\nITENS:\n${itemsTxt}\n\nTOTAL: R$ ${total}\n\nENDEREÇO:\n${fullAddr}\n\nStatus: ${order.status}`, 
            admin_email: 'erickveraosilva@gmail.com' 
        };
        if(window.emailjs) {
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENTE, templateParams);
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ADMIN, {...templateParams, to_email: 'erickveraosilva@gmail.com'});
        }
    },
    updateStockDatabase: async () => {
        if(!sb) return;
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
    sendPaidOrder: (paymentType) => {
        let addr = state.address;
        const fullAddr = `${addr.street}, ${addr.number} - ${addr.bairro} (${addr.city})`;
        let msg = `*NOVO PEDIDO 2A MODAS (${state.user.name})*\n--------------------------------\n*PAGAMENTO:* ${paymentType}\n*TOTAL:* R$ ${document.getElementById('cart-total').innerText.replace('R$ ','')}\n--------------------------------\n*ENTREGA:*\n📍 ${fullAddr}\n--------------------------------\n*ITENS:*\n`;
        state.cart.forEach(i=>{ msg += `▪ ${i.qty}x ${i.name} (${i.variant})\n`; });
        localStorage.removeItem('2a_cart'); state.cart = []; app.renderCart(); app.toggleCart();
        window.location.href = `https://wa.me/5567998951120?text=${encodeURIComponent(msg)}`;
    },
    showModal: (id) => { document.getElementById(id).classList.add('active'); history.pushState({modal:id}, null, ""); },
    closeModal: (id) => { 
        document.getElementById(id).classList.remove('active'); 
        history.back();
        // Limpa auto scroll se fechar modal produto
        if(id === 'product-modal') clearInterval(autoScrollInterval);
    },
    filter: (cat, btn) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        app.render(cat==='all' ? state.products : state.products.filter(p => p.category===cat));
    }
};

const auth = {
    checkProfile: () => { 
        if(state.user) { 
            app.showModal('client-modal'); 
            const today = new Date();
            const prior = new Date(new Date().setDate(today.getDate() - 30));
            if(document.getElementById('client-date-end')._flatpickr) {
                document.getElementById('client-date-end')._flatpickr.setDate(today);
                document.getElementById('client-date-start')._flatpickr.setDate(prior);
            }
            auth.loadClientOrders();
            document.getElementById('client-info-txt').innerHTML = `<strong>${safeVal(state.user.name)}</strong><br>${safeVal(state.user.email)}`;
        } else app.showModal('auth-modal'); 
    },
    toggle: (m) => { document.getElementById('form-login').style.display=m==='login'?'block':'none'; document.getElementById('form-register').style.display=m==='register'?'block':'none'; },
    login: async () => {
        const e = document.getElementById('l-email').value, p = document.getElementById('l-pass').value;
        if(sb) {
            const {data} = await sb.from('customers').select('*').eq('email',e).eq('password',p).single();
            if(data) { 
                state.user=data; localStorage.setItem('2a_user', JSON.stringify(data)); 
                if(data.address && Array.isArray(data.address)) localStorage.setItem('2a_addrs', JSON.stringify(data.address));
                app.updateUI(); history.back(); 
            } else alert("Inválido");
        }
    },
    register: async () => {
        const n=document.getElementById('r-name').value, e=document.getElementById('r-email').value, p=document.getElementById('r-pass').value;
        if(sb) await sb.from('customers').insert([{id: Date.now(), name:n, email:e, password:p, address: []}]);
        alert("Sucesso!"); auth.toggle('login');
    },
    logout: () => { localStorage.removeItem('2a_user'); location.reload(); },
    loadClientOrders: async () => {
        if(!state.user || !state.user.email) return;
        if(sb) {
            let query = sb.from('orders').select('*').eq('customer_email', state.user.email).order('created_at', {ascending: false});
            const startStr = document.getElementById('client-date-start').value;
            const endStr = document.getElementById('client-date-end').value;
            if(startStr && endStr) {
                const start = new Date(startStr + 'T00:00:00');
                const end = new Date(endStr + 'T23:59:59');
                query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
            }
            const { data } = await query;
            const div = document.getElementById('client-orders-list'); div.innerHTML = "";
            if(!data || data.length === 0) { div.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>Sem pedidos no período.</p>"; return; }
            
            data.forEach(o => {
                let pct = 0; 
                let isCancelled = o.status === 'Cancelado';
                let cancelledClass = isCancelled ? 'cancelled' : '';
                
                // Lógica de % para a animação do caminhão
                if(o.status.includes('Pendente')) pct = 10; 
                if(o.status.includes('Enviado')) pct = 50; 
                if(o.status.includes('Entregue')) pct = 100;
                if(isCancelled) pct = 100;

                const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                const itemsHtml = items.map(i => `
                    <div class="order-prod-row">
                        <img src="${i.image || 'https://via.placeholder.com/50'}" onerror="this.src='https://via.placeholder.com/50'">
                        <div class="order-prod-info">
                            <div class="order-prod-name">${i.name}</div>
                            <div class="order-prod-var">${i.variant}</div>
                        </div>
                        <div class="order-prod-qty">x${i.qty}</div>
                    </div>
                `).join('');
                
                const trackStepsHTML = isCancelled ? 
                    `<div style="text-align:center; width:100%; color:var(--danger); font-weight:bold; margin-top:25px;">PEDIDO CANCELADO</div>` :
                    `<div class="track-step ${pct>=10?'active':''}"><div class="dot"></div><span>Pendente</span></div>
                     <div class="track-step ${pct>=50?'active':''}"><div class="dot"></div><span>Enviado</span></div>
                     <div class="track-step ${pct>=100?'active':''}"><div class="dot"></div><span>Entregue</span></div>`;
                
                div.innerHTML += `
                <div class="client-order">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px dashed #eee; padding-bottom:5px;">
                        <strong>Pedido #${o.id.slice(-6)}</strong>
                        <span style="color:var(--success); font-weight:bold;">R$ ${o.total.toFixed(2)}</span>
                    </div>
                    <div style="background:#f9f9f9; padding:15px; border-radius:12px; margin-bottom:15px;">${itemsHtml}</div>
                    
                    <div class="track-container">
                        <div class="track-line-bg"></div>
                        <div class="track-fill ${cancelledClass}" style="width:${pct}%"></div>
                        <div class="truck-icon-3d ${cancelledClass}" style="left:${pct}%">
                            <i class="fas fa-truck"></i>
                        </div>
                        <div class="track-steps">${trackStepsHTML}</div>
                    </div>
                    <div style="text-align:center; font-size:0.8rem; color:#999; margin-top:10px;">${o.date}</div>
                </div>`;
                if(o.status === 'Entregue') {
                    const celebrated = JSON.parse(localStorage.getItem('2a_celebrated') || '[]');
                    if(!celebrated.includes(o.id)) {
                        confetti({ particleCount: 150, spread: 180, origin: { y: 0.6 } });
                        celebrated.push(o.id);
                        localStorage.setItem('2a_celebrated', JSON.stringify(celebrated));
                    }
                }
            });
        }
    }
};

const admin = {
    // Abre o modal de login
    showLogin: async () => {
        // Verifica se já tem sessão ativa antes de pedir senha
        const { data } = await sb.auth.getSession();
        if(data.session) {
            admin.openPanel(); // Já está logado, abre direto
        } else {
            app.showModal('admin-auth-modal'); // Abre a janelinha de senha
        }
    },

    // Faz o Login Real no Supabase
    verifyLogin: async () => {
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-pass').value;
        const btn = document.querySelector('#admin-auth-modal button');
        
        // Feedback visual
        const originalText = btn.innerText;
        btn.innerText = "Autenticando...";
        btn.disabled = true;

        try {
            // Tenta logar no Supabase
            const { data, error } = await sb.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // Se deu certo:
            app.closeModal('admin-auth-modal');
            admin.openPanel();
            
            // Limpa campos
            document.getElementById('admin-pass').value = "";
            
        } catch (e) {
            alert("Erro de acesso: " + (e.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : e.message));
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    // Função auxiliar para abrir o painel e carregar dados
    openPanel: () => {
        setTimeout(() => { 
            app.showModal('admin-modal'); 
            const today = new Date();
            const prior = new Date(new Date().setDate(today.getDate() - 30));
            
            // Configura os datepickers do admin
            const setDateAndBind = (id, date, callback) => {
                const el = document.getElementById(id);
                if(el && el._flatpickr) {
                    el._flatpickr.setDate(date);
                    el._flatpickr.set('onChange', callback);
                }
            };
            setDateAndBind('order-end', today, () => admin.renderOrders());
            setDateAndBind('order-start', prior, () => admin.renderOrders());
            setDateAndBind('fin-end', today, () => admin.renderFinance());
            setDateAndBind('fin-start', prior, () => admin.renderFinance());
            
            // Carrega todos os dados do painel
            admin.renderList(); 
            admin.renderOrders(); 
            admin.updateStats(); 
            admin.renderPayments(); 
            admin.renderFinance();
        }, 100);
    },

    // Logout Real
    logout: async () => {
        if(confirm("Sair do modo Admin?")) {
            await sb.auth.signOut();
            app.closeModal('admin-modal');
            window.location.reload(); // Recarrega para limpar memória
        }
    },

    // --- MANTENHA AS OUTRAS FUNÇÕES DO ADMIN ABAIXO DESTA LINHA ---
    // (Copie as funções antigas: initCheckboxes, toggleInput, tab, handleFileSelect, etc... 
    //  elas continuam iguais, apenas a parte de LOGIN mudou acima)

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
    tab: (t) => { 
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
        const tabBtn = document.querySelector(`.admin-tab[onclick*='${t}']`);
        if(tabBtn) tabBtn.classList.add('active');
        ['dash','prod','orders','fin','pay', 'new-order'].forEach(i => {
            const el = document.getElementById(`tab-${i}`);
            if(el) el.style.display = i===t ? 'block' : 'none';
        });
        if(t === 'new-order') {
            admin.populateManualProdSelect();
            admin.manualCart = []; 
            admin.renderManualCart();
        }
    },
    handleFileSelect: (input) => {
        const files = Array.from(input.files);
        if(files.length > 5) { alert("Máximo 5 arquivos"); input.value=""; return; }
        const sizeErr = files.some(f => f.size > 5*1024*1024);
        if(sizeErr) { alert("Arquivos devem ser menores que 5MB"); input.value=""; return; }
        state.selectedFiles = files;
        state.mainImageIndex = 0; 
        const area = document.getElementById('file-preview-area');
        area.innerHTML = "";
        files.forEach((f, idx) => {
            const url = URL.createObjectURL(f);
            const isImg = f.type.startsWith('image/');
            area.innerHTML += `
            <div class="preview-wrapper" onclick="admin.setMain(${idx})">
                ${isImg ? `<img src="${url}" class="file-preview-item ${idx===0?'main-selected':''}" id="prev-${idx}">` 
                        : `<video src="${url}" class="file-preview-item ${idx===0?'main-selected':''}" id="prev-${idx}"></video>`}
                <div class="main-tag">PRINCIPAL</div>
            </div>`;
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
            alert("Salvo!"); admin.clear(); await app.load(); admin.renderList(); admin.updateStats();
        } catch(e) { alert(e.message); } finally { btn.innerText="Salvar Produto"; btn.disabled=false; }
    },
    edit: (id) => {
        const p = state.products.find(x => String(x.id) === String(id));
        document.getElementById('edit-id').value = p.id;
        document.getElementById('f-name').value = safeVal(p.name); document.getElementById('f-desc').value = safeVal(p.description);
        document.getElementById('f-cost').value = safeVal(p.cost_price); document.getElementById('f-promo').checked = p.is_promo;
        admin.clear(true); document.getElementById('edit-id').value = p.id;
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
    del: async (id) => { if(confirm("Excluir?")) { if(sb) await sb.from('products').delete().eq('id', id); await app.load(); admin.renderList(); } },
    clear: (soft=false) => { 
        if(!soft) document.getElementById('edit-id').value=""; 
        ['f-name','f-desc','f-cost','f-file','f-price-global','f-stock-global'].forEach(i=>{ const el = document.getElementById(i); if(el) el.value=""; });
        state.selectedFiles = []; state.mainImageIndex = 0;
        document.getElementById('file-preview-area').innerHTML = "";
        document.getElementById('active-vars-area').innerHTML="";
        document.querySelectorAll('.hidden-check').forEach(c => c.checked=false);
    },
    resetData: async () => {
        if(confirm("ATENÇÃO: Isso apagará TODO o histórico de compras e vendas do sistema. Tem certeza?")) {
            const confirmTxt = prompt("Digite 'DELETAR' para confirmar a limpeza total dos dados:");
            if(confirmTxt === "DELETAR") {
                if(sb) {
                    const { error } = await sb.from('orders').delete().neq('id', 0);
                    if(!error) { 
                        alert("Histórico resetado com sucesso.");
                        state.adminOrders = [];
                        document.getElementById('orders-list').innerHTML = '';
                        document.getElementById('pay-list').innerHTML = '';
                        admin.renderOrders(); 
                        admin.renderPayments(); 
                        admin.renderFinance(); 
                    }
                    else alert("Erro ao resetar: " + error.message);
                }
            } else { alert("Ação cancelada."); }
        }
    },
    renderList: () => {
        const div = document.getElementById('admin-list'); div.innerHTML="";
        state.products.forEach(p => {
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            let stock = 0; if(vars) vars.forEach(v => stock += parseInt(v.stock||0));
            let mainImg = "https://via.placeholder.com/50";
            try { const m = JSON.parse(p.image_url); if(Array.isArray(m)) mainImg = m[0]; else mainImg = p.image_url; } catch(e){}
            const tag = stock === 0 ? '<span class="tag-soldout">ESGOTADO</span>' : `<span class="stock-info">Estoque: ${stock}</span>`;
            div.innerHTML += `
            <div class="mini-prod ${stock===0?'sold-out':''}">
                <img src="${mainImg}" onerror="this.src='https://via.placeholder.com/50'"> 
                <div style="flex:1"><strong>${p.name}</strong><br>${tag}</div>
                <div>
                    <button onclick="admin.edit('${p.id}'); admin.tab('prod')" class="btn-chip-edit"><i class="fas fa-pen"></i> Editar</button> 
                    <button onclick="admin.del('${p.id}')" style="color:red;border:none;background:none; margin-left:10px;"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        });
    },
    filterOrders: (status, btn) => {
        state.filterStatus = status;
        document.querySelectorAll('#order-filters .chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        admin.renderOrders(true);
    },
    populateManualProdSelect: () => {
        const sel = document.getElementById('m-prod-select');
        sel.innerHTML = '<option value="">Selecione um produto do estoque...</option>';
        state.products.forEach(p => {
            const vars = typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations;
            vars.forEach(v => {
                sel.innerHTML += `<option value="${p.id}|${v.name}|${v.price}|${p.name}">${p.name} - ${v.name} (R$ ${parseFloat(v.price).toFixed(2)}) - Est: ${v.stock}</option>`;
            });
        });
    },
    manualCart: [],
    addManualItem: () => {
        const val = document.getElementById('m-prod-select').value;
        const qty = parseInt(document.getElementById('m-prod-qty').value);
        if(!val || qty < 1) return alert("Selecione produto e quantidade.");
        const [pid, vname, price, pname] = val.split('|');
        admin.manualCart.push({ name: pname, variant: vname, price: parseFloat(price), qty: qty, image: "https://via.placeholder.com/50?text=Manual", is_stock: true, pid: pid });
        admin.renderManualCart();
        document.getElementById('m-prod-select').value = "";
    },
    addCustomItem: () => {
        const name = document.getElementById('m-custom-item').value;
        const price = parseFloat(document.getElementById('m-custom-price').value);
        if(!name || !price) return alert("Preencha nome e valor.");
        admin.manualCart.push({ name: name, variant: "Avulso", price: price, qty: 1, image: "https://via.placeholder.com/50?text=Avulso", is_stock: false });
        admin.renderManualCart();
        document.getElementById('m-custom-item').value=""; document.getElementById('m-custom-price').value="";
    },
    renderManualCart: () => {
        const div = document.getElementById('manual-cart-list');
        div.innerHTML = "";
        let total = 0;
        if(admin.manualCart.length === 0) div.innerHTML = '<div style="padding:15px; text-align:center; color:#999;">Nenhum item adicionado</div>';
        admin.manualCart.forEach((i, idx) => {
            total += i.price * i.qty;
            div.innerHTML += `
            <div class="manual-cart-item">
                <div>
                    <strong>${i.name}</strong> <small>(${i.variant})</small><br>
                    ${i.qty}x R$ ${i.price.toFixed(2)}
                </div>
                <button onclick="admin.manualCart.splice(${idx},1); admin.renderManualCart()" style="color:red; border:none; background:none;"><i class="fas fa-trash"></i></button>
            </div>`;
        });
        document.getElementById('m-total-display').innerText = `R$ ${total.toFixed(2)}`;
    },
    saveManualOrder: async () => {
        if(admin.manualCart.length === 0) return alert("Adicione itens.");
        const name = document.getElementById('m-client-name').value || "Cliente Balcão";
        const email = document.getElementById('m-client-email').value || "manual@admin.com";
        const phone = document.getElementById('m-client-phone').value || "";
        const street = document.getElementById('m-client-street').value;
        const num = document.getElementById('m-client-num').value;
        const bairro = document.getElementById('m-client-bairro').value;
        const city = document.getElementById('m-client-city').value;
        const method = document.getElementById('m-payment-method').value;
        const pStatus = document.getElementById('m-payment-status').value;
        const addressObj = { street: street, number: num, bairro: bairro, city: city, uf: 'MS', phone: phone };
        const total = admin.manualCart.reduce((a,b)=>a+(b.price*b.qty),0);
        
        const order = {
            id: Date.now().toString(), customer_name: name, customer_email: email, customer_id: "0", 
            total: total, items: JSON.stringify(admin.manualCart), address: JSON.stringify(addressObj),
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            method: `Manual (${method})`, status: pStatus === 'Pago' ? 'Entregue' : 'Pendente', 
            payment_status: pStatus, created_at: new Date().toISOString()
        };

        if(sb) {
            const { error } = await sb.from('orders').insert([order]);
            if(error) return alert("Erro ao salvar: " + error.message);
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
            if(email && email.includes('@')) { app.sendEmails(order, admin.manualCart, email); }
            alert("Pedido Manual Salvo!");
            admin.manualCart = []; admin.renderManualCart();
            ['m-client-name','m-client-email','m-client-phone','m-client-cep','m-client-street','m-client-num','m-client-bairro'].forEach(id => document.getElementById(id).value="");
            admin.tab('orders'); admin.renderOrders();
        }
    },
    registerPartialOnPending: async (id, total) => {
        const val = prompt(`Valor total é R$ ${total.toFixed(2)}. Quanto o cliente pagou de entrada/sinal?`);
        if(val && !isNaN(val)) {
            const paid = parseFloat(val);
            const rest = total - paid;
            if(paid >= total) return alert("Valor igual ou maior que o total. Use a opção 'Marcar como Pago'.");
            if(paid <= 0) return alert("Valor inválido.");
            const today = new Date().toISOString().split('T')[0];
            const nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate() + 30);
            const installments = [
                { date: today, amount: paid.toFixed(2), paid: true },
                { date: nextMonth.toISOString().split('T')[0], amount: rest.toFixed(2), paid: false }
            ];
            await sb.from('orders').update({
                payment_status: 'Parcelado', installments: JSON.stringify(installments)
            }).eq('id', id);
            alert(`Pagamento de R$ ${paid.toFixed(2)} registrado! Restam R$ ${rest.toFixed(2)}.`);
            admin.renderOrders(); admin.renderPayments();
        }
    },
    renderOrders: async (useCache = false) => {
        if(!sb) return;
        if(!useCache || !state.adminOrders.length) {
            let query = sb.from('orders').select('*').order('created_at', {ascending:false});
            const startStr = document.getElementById('order-start').value;
            const endStr = document.getElementById('order-end').value;
            if(startStr && endStr) {
                const start = new Date(startStr + 'T00:00:00');
                const end = new Date(endStr + 'T23:59:59');
                query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
            }
            const { data } = await query;
            state.adminOrders = data || [];
        }
        const div = document.getElementById('orders-list'); if(!div) return; div.innerHTML="";
        let filtered = state.adminOrders;
        if(state.filterStatus !== 'all') filtered = filtered.filter(o => o.status.includes(state.filterStatus));
        if(filtered.length === 0) { div.innerHTML = "<p>Nenhum pedido encontrado.</p>"; return; }
        filtered.forEach(o => {
            const iList = typeof o.items==='string'?JSON.parse(o.items):o.items;
            const itemsHtml = iList.map(i => `<div class="order-prod-row"><img src="${i.image||'https://via.placeholder.com/50'}" onerror="this.src='https://via.placeholder.com/50'"><div class="order-prod-info"><div class="order-prod-name">${i.name}</div><div class="order-prod-var">${i.variant}</div></div><div class="order-prod-qty">x${i.qty}</div></div>`).join('');
            const addr = JSON.parse(o.address || '{}');
            const phoneRaw = addr.phone || '';
            const phoneClean = phoneRaw.replace(/\D/g, ''); 
            const fullAddrString = `${addr.street || ''}, ${addr.number || ''} - ${addr.bairro || ''}, ${addr.city || ''}`;
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddrString)}`;
            let stClass = 'st-pendente';
            if(o.status.includes('Enviado')) stClass = 'st-enviado';
            if(o.status.includes('Entregue')) stClass = 'st-entregue';
            if(o.status === 'Cancelado') stClass = 'st-cancelado';
            const payStatus = o.payment_status || 'Pendente';
            const showPayDetails = (payStatus === 'Parcelado') ? 'block' : 'none';
            const btnPartial = (payStatus === 'Pendente' || payStatus === 'A_pagar') 
                ? `<button onclick="admin.registerPartialOnPending('${o.id}', ${o.total})" class="btn-modern small outline" style="margin-top:5px; width:100%; border-color:#f39c12; color:#e67e22;"><i class="fas fa-coins"></i> Registrar Entrada/Sinal</button>` 
                : '';
            div.innerHTML += `
            <div class="order-card-modern">
                <div class="oc-header"><span class="oc-id">Pedido #${o.id.slice(-6)}</span><span class="oc-date">${o.date}</span></div>
                <div class="oc-body">
                    <div class="oc-section">
                        <label>Cliente</label>
                        <div class="oc-val">${o.customer_name}</div>
                        <div style="font-size:0.8rem; color:#666;">${o.customer_email}</div>
                        ${phoneClean ? `<a href="https://wa.me/55${phoneClean}" target="_blank" class="admin-wa-btn"><i class="fab fa-whatsapp"></i> Conversar no Whats</a>` : `<span style="color:#999; font-size:0.8rem;">Tel: ${phoneRaw}</span>`}
                    </div>
                    <div class="oc-section" style="grid-column: span 2; background:#fff; border:1px solid #eee;">
                        <label><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> Entrega</label>
                        <div style="font-size:0.9rem; color:#444; margin-bottom:5px;">${fullAddrString} <br> <small style="color:#777;">Ref: ${addr.ref || 'Sem referência'}</small></div>
                        <a href="${mapLink}" target="_blank" class="btn-map">Ver no Google Maps <i class="fas fa-external-link-alt"></i></a>
                    </div>
                    <div class="oc-section">
                        <label>Total</label><div class="oc-val" style="color:var(--success)">R$ ${o.total.toFixed(2)}</div>
                    </div>
                    <div class="oc-section">
                        <label>Status Pedido</label>
                        <select onchange="admin.updateStatus('${o.id}', this.value)" class="status-selector ${stClass}"><option value="Pendente" ${o.status.includes('Pendente')?'selected':''}>Pendente</option><option value="Enviado" ${o.status==='Enviado'?'selected':''}>Enviado</option><option value="Entregue" ${o.status==='Entregue'?'selected':''}>Entregue</option><option value="Cancelado" ${o.status==='Cancelado'?'selected':''}>Cancelado</option></select>
                    </div>
                    <div class="payment-box">
                        <label style="font-weight:bold; color:var(--accent);">Financeiro:</label>
                        <select onchange="admin.togglePaymentDetails(this, '${o.id}', ${o.total})" class="input" style="margin-top:5px;">
                            <option value="A_pagar" ${(payStatus==='Pendente' || payStatus==='A_pagar')?'selected':''}>À pagar</option>
                            <option value="Pago" ${payStatus==='Pago'?'selected':''}>Pago</option>
                            <option value="Parcelado" ${payStatus==='Parcelado'?'selected':''}>Parcelado</option>
                        </select>
                        ${btnPartial}
                        <div id="pay-det-${o.id}" class="gen-installments-area" style="display:${showPayDetails}">
                            <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                                <input type="number" id="inst-n-${o.id}" class="input qty-installments-input" placeholder="Qtd Parc.">
                                <button onclick="admin.genInstallments('${o.id}', ${o.total})" class="btn-modern outline small" style="flex:1;"><i class="fas fa-magic"></i> Gerar Parcelas</button>
                            </div>
                            <div id="inst-list-${o.id}"></div>
                        </div>
                        <button onclick="admin.updatePaymentStatus('${o.id}')" class="btn-modern success small" style="width:100%; margin-top:10px;"><i class="fas fa-save"></i> Salvar Financeiro</button>
                    </div>
                    <div class="oc-items-box">${itemsHtml}</div>
                </div>
            </div>`;
            if(payStatus === 'Parcelado' && o.installments) {
                try {
                    const instData = JSON.parse(o.installments);
                    if(Array.isArray(instData)) {
                        document.getElementById(`inst-n-${o.id}`).value = instData.length;
                        admin.renderInstInputs(o.id, instData);
                    }
                } catch(e) {}
            }
        });
    },
    togglePaymentDetails: (sel, id, total) => {
        const div = document.getElementById(`pay-det-${id}`);
        if(div) div.style.display = (sel.value === 'Parcelado') ? 'block' : 'none';
    },
    genInstallments: (id, total) => {
        const n = parseInt(document.getElementById(`inst-n-${id}`).value);
        if(!n || n < 1) return alert("Digite qtd parcelas");
        const arr = [];
        const val = (total / n).toFixed(2);
        for(let i=0; i<n; i++) {
            const d = new Date(); d.setDate(d.getDate() + (30 * (i+1)));
            arr.push({ date: d.toISOString().split('T')[0], amount: val, paid: false });
        }
        admin.renderInstInputs(id, arr);
    },
    renderInstInputs: (id, arr) => {
        const box = document.getElementById(`inst-list-${id}`);
        box.innerHTML = "";
        arr.forEach((item, idx) => {
            box.innerHTML += `<div class="inst-gen-row"><span style="font-weight:bold;">${idx+1}x</span><input type="date" value="${item.date}" class="i-date"><input type="number" value="${item.amount}" class="i-amount"><label class="custom-checkbox"><input type="checkbox" class="i-check" ${item.paid?'checked':''}><span class="checkmark"></span></label></div>`;
        });
    },
    updatePaymentStatus: async (id) => {
        const div = document.getElementById(`pay-det-${id}`);
        const row = div.parentElement;
        const status = row.querySelector('select').value;
        let installmentsJson = null;
        if(status === 'Parcelado') {
            const list = document.getElementById(`inst-list-${id}`);
            const rows = list.querySelectorAll('.inst-gen-row');
            const arr = [];
            rows.forEach(r => { arr.push({ date: r.querySelector('.i-date').value, amount: r.querySelector('.i-amount').value, paid: r.querySelector('.i-check').checked }); });
            installmentsJson = JSON.stringify(arr);
        }
        await sb.from('orders').update({ payment_status: status, installments: installmentsJson }).eq('id', id);
        alert("Financeiro salvo!");
        admin.renderPayments();
    },
    filterPayments: (status, btn) => {
        state.filterPay = status;
        document.querySelectorAll('#pay-filters .chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        admin.renderPayments();
    },
    togglePartialCard: (idx) => {
        const card = document.getElementById(`partial-card-${idx}`);
        if(card) {
            if(card.classList.contains('show')) {
                card.classList.remove('show');
                setTimeout(() => card.style.display = 'none', 300);
            } else {
                card.style.display = 'block';
                setTimeout(() => card.classList.add('show'), 10);
            }
        }
    },
    confirmPartialPay: async (oid, idx) => {
        const input = document.getElementById(`partial-input-${idx}`);
        const amount = input.value;
        if(!amount || isNaN(amount) || parseFloat(amount) <= 0) return alert("Digite um valor válido.");
        const { data } = await sb.from('orders').select('installments').eq('id', oid).single();
        if(data) {
            const arr = JSON.parse(data.installments);
            const paidVal = parseFloat(amount);
            const originalVal = parseFloat(arr[idx].amount);
            arr[idx].amount = paidVal;
            arr[idx].paid = true;
            const remaining = originalVal - paidVal;
            if(remaining > 0.01) { 
                if(arr[idx+1]) {
                    arr[idx+1].amount = (parseFloat(arr[idx+1].amount) + remaining).toFixed(2);
                } else {
                    const nextDate = new Date(arr[idx].date);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    arr.push({ date: nextDate.toISOString().split('T')[0], amount: remaining.toFixed(2), paid: false });
                }
                alert(`R$ ${paidVal} pagos. O restante (R$ ${remaining.toFixed(2)}) foi jogado para frente.`);
            } else {
                alert("Parcela quitada integralmente.");
            }
            await sb.from('orders').update({ installments: JSON.stringify(arr) }).eq('id', oid);
            admin.renderPayments();
        }
    },
    renderPayments: async () => {
        const { data } = await sb.from('orders').select('*').neq('status', 'Cancelado').order('created_at', {ascending: false});
        const div = document.getElementById('pay-list'); if(!div) return; div.innerHTML = "";
        if(!data || data.length === 0) { div.innerHTML = "<p>Nenhum pedido.</p>"; return; }
        let filtered = data;
        if(state.filterPay !== 'all') {
            if(state.filterPay === 'A_pagar') filtered = data.filter(o => o.payment_status === 'Pendente' || o.payment_status === 'A_pagar');
            else filtered = data.filter(o => o.payment_status === state.filterPay);
        }
        if(filtered.length === 0) { div.innerHTML = "<p>Nenhum registro encontrado.</p>"; return; }
        filtered.forEach(o => {
            let items = [];
            try { items = JSON.parse(o.installments || '[]'); } catch(e) {}
            let totalPaid = 0;
            let nextDue = null;
            const today = new Date().toISOString().split('T')[0];
            const isPaidStatus = o.payment_status === 'Pago';
            if(isPaidStatus) totalPaid = o.total;
            if(items.length > 0) {
                items.forEach(i => {
                    if(i.paid) totalPaid += parseFloat(i.amount);
                    else if(!nextDue) nextDue = i.date;
                });
            }
            const remaining = Math.max(0, o.total - totalPaid);
            const isOverdue = nextDue && nextDue < today && !isPaidStatus;
            const isPending = o.payment_status === 'Pendente' || o.payment_status === 'A_pagar';
            const prodList = JSON.parse(o.items).map(i => `<div class="order-prod-row"><img src="${i.image || 'https://via.placeholder.com/50'}" onerror="this.src='https://via.placeholder.com/50'"><div class="order-prod-info"><div class="order-prod-name">${i.name}</div><div class="order-prod-var">${i.variant}</div></div><div class="order-prod-qty">x${i.qty}</div></div>`).join('');
            
            div.innerHTML += `
            <div class="debt-card ${isOverdue ? 'overdue' : ''} ${isPaidStatus ? 'paid' : ''}">
                <div class="debt-header"><span class="debt-client">${o.customer_name}</span><span class="debt-badge">${o.payment_status === 'Pendente' ? 'À pagar' : o.payment_status.replace('_', ' ')}</span></div>
                <div class="debt-val-box"><div class="debt-total">Total: R$ ${o.total.toFixed(2)}</div><div class="debt-rest">Resta: R$ ${remaining.toFixed(2)}</div></div>
                <div class="debt-info" style="color:${isOverdue?'var(--danger)':'#555'}">${isPaidStatus ? '<i class="fas fa-check-circle" style="color:var(--success)"></i> Totalmente Pago' : (nextDue ? `Próx Vencimento: <strong>${nextDue.split('-').reverse().join('/')}</strong>` : '')}</div>
                <div class="oc-items-box" style="margin: 10px 0; background: #fff;">${prodList}</div>
                
                ${isPending ? `
                    <button onclick="admin.registerPartialOnPending('${o.id}', ${o.total})" class="btn-modern small outline" style="margin-top:5px; width:100%; border-color:#f39c12; color:#e67e22;"><i class="fas fa-coins"></i> Registrar Entrada/Sinal</button>
                    <button onclick="admin.markAsPaidFull('${o.id}')" class="btn-modern success small" style="width:100%; margin-top:5px;"><i class="fas fa-check-double"></i> Confirmar Pagamento Total</button>
                ` : ''}
                
                ${(items.length > 0 && !isPaidStatus) ? `
                <button onclick="admin.expandInstallments('${o.id}')" class="btn-modern outline small" style="width:100%; margin-top:10px;"><i class="fas fa-list-ol"></i> Ver Detalhes / Parcelas</button>
                <div id="inst-manage-${o.id}" class="installment-list">
                    ${items.map((i, idx) => {
                        const uniqueIdx = `${o.id}-${idx}`; 
                        return `
                        <div class="installment-item ${i.paid ? 'is-paid' : ''}" style="flex-wrap:wrap;">
                            <div style="flex:1; display:flex; gap:10px; align-items:center; min-width: 250px;">
                                <span style="font-weight:bold;">${idx+1}x</span>
                                <input type="date" value="${i.date}" class="input" style="flex:1;" onchange="admin.editInstField('${o.id}', ${idx}, 'date', this.value)">
                                <input type="number" value="${i.amount}" class="input" style="width:100px;" onchange="admin.editInstField('${o.id}', ${idx}, 'amount', this.value)">
                            </div>
                            <div style="display:flex; gap:10px; align-items:center; margin-top:5px;">
                                ${!i.paid ? `
                                    <button onclick="admin.togglePartialCard('${uniqueIdx}')" class="btn-modern small outline" style="font-size:0.75rem; padding: 5px 10px;">
                                        Pagamento Parcial
                                    </button>
                                ` : ''}
                                <label class="custom-checkbox">
                                    <input type="checkbox" class="inst-check" ${i.paid?'checked':''} onchange="admin.quickPayInst('${o.id}', ${idx}, this.checked)">
                                    <span class="checkmark"></span>
                                </label>
                            </div>
                            <div id="partial-card-${uniqueIdx}" class="partial-pay-card" style="width:100%; flex-basis:100%;">
                                <label style="font-size:0.8rem; font-weight:bold; color:var(--accent);">Valor pago nesta parcela:</label>
                                <div style="display:flex; gap:10px; margin-top:5px;">
                                    <input type="number" id="partial-input-${idx}" class="input" placeholder="R$ 0,00" style="margin:0;">
                                    <button onclick="admin.confirmPartialPay('${o.id}', ${idx})" class="btn-modern success small">Confirmar</button>
                                </div>
                                <small style="color:#666;">O restante será somado à próxima parcela.</small>
                            </div>
                        </div>
                    `}).join('')}
                </div>` : ''}
            </div>`;
        });
    },
    editInstField: async (oid, idx, field, val) => {
        const { data } = await sb.from('orders').select('installments').eq('id', oid).single();
        if(data) {
            const arr = JSON.parse(data.installments);
            if(arr[idx]) {
                arr[idx][field] = val;
                await sb.from('orders').update({ installments: JSON.stringify(arr) }).eq('id', oid);
            }
        }
    },
    expandInstallments: (id) => {
        const el = document.getElementById(`inst-manage-${id}`);
        if(el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
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
    },
    markAsPaidFull: async (id) => {
        if(confirm("Confirmar o recebimento TOTAL deste pedido?")) {
            await sb.from('orders').update({ payment_status: 'Pago', installments: null }).eq('id', id);
            admin.renderPayments(); admin.renderOrders(); 
        }
    },
    renderFinance: async () => {
        const startStr = document.getElementById('fin-start').value;
        const endStr = document.getElementById('fin-end').value;
        if(!startStr || !endStr) return;
        const start = new Date(startStr + 'T00:00:00');
        const end = new Date(endStr + 'T23:59:59');
        const { data: orders } = await sb.from('orders').select('*').neq('status', 'Cancelado');
        let realRevenue = 0;
        let totalCreated = 0;
        if(orders) {
            orders.forEach(o => {
                const orderDate = new Date(o.created_at);
                if(orderDate >= start && orderDate <= end) {
                    totalCreated += o.total;
                }
                if(o.payment_status === 'Pago') {
                    if(orderDate >= start && orderDate <= end) {
                        realRevenue += o.total;
                    }
                } else if(o.installments) {
                    try {
                        const inst = JSON.parse(o.installments);
                        inst.forEach(i => {
                            if(i.paid) {
                                const payDate = i.date ? new Date(i.date + 'T12:00:00') : orderDate;
                                if(payDate >= start && payDate <= end) {
                                    realRevenue += parseFloat(i.amount);
                                }
                            }
                        });
                    } catch(e) {}
                }
            });
        }
        document.getElementById('fin-real-revenue').innerText = `R$ ${realRevenue.toFixed(2)}`;
        document.getElementById('fin-total-created').innerText = `R$ ${totalCreated.toFixed(2)}`;
    },
    updateStatus: async (id, val) => { if(sb) await sb.from('orders').update({status: val}).eq('id', id); alert("Status atualizado!"); admin.renderOrders(); },
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
            const color = isSoldOut ? '#888' : (pStock < 5 ? '#f39c12' : '#27ae60');
            let mainImg = "https://via.placeholder.com/60";
            try { const m = JSON.parse(p.image_url); if(Array.isArray(m)) mainImg = m[0]; else mainImg = p.image_url; } catch(e) {}
            grid.innerHTML += `<div class="dash-card ${isSoldOut ? 'sold-out' : ''}">${isSoldOut ? '<span class="tag-dashboard-sold">ESGOTADO</span>' : ''}<img src="${mainImg}" onerror="this.src='https://via.placeholder.com/60'"><div style="flex:1"><strong style="font-size:0.95rem; display:block;">${p.name}</strong><small style="color:#666;">${vars.length} Variações</small><div style="margin-top:5px; font-weight:bold; color:${color}"><i class="fas fa-box"></i> ${pStock} un.</div></div><div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;"><div style="text-align:right; font-size:0.8rem; color:#888;">Est. Venda:<br><span style="color:var(--accent); font-weight:bold;">R$ ${pValue.toFixed(2)}</span></div><button class="btn-modern small outline" onclick="admin.edit('${p.id}')">Editar</button></div></div>`;
        });
        setSafe('st-rev', `R$ ${grandTotalValue.toFixed(2)}`); setSafe('st-cost', `R$ ${grandTotalCost.toFixed(2)}`); setSafe('st-qty', grandTotalStock);
    }
};

(async function init() {
    if(window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);
    const u = localStorage.getItem('2a_user'); if(u) state.user=JSON.parse(u);
    const a = localStorage.getItem('2a_active_addr'); if(a) state.address=JSON.parse(a);
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'approved' && localStorage.getItem('2a_cart')) {
        state.cart = JSON.parse(localStorage.getItem('2a_cart'));
        await app.registerOrder(Date.now().toString(), 'Mercado Pago', 'Pendente (Pago)', 'Pago');
        await app.updateStockDatabase(); await app.sendEmails(state.cart);
        localStorage.removeItem('2a_cart'); window.history.replaceState({}, document.title, window.location.pathname);
        alert("Pagamento Confirmado!");
    }
    await app.load(); admin.initCheckboxes(); app.updateUI();
    document.getElementById('loading-screen').style.display='none';
})();

window.addEventListener('popstate', (e) => { document.querySelectorAll('.overlay.active').forEach(m => m.classList.remove('active')); });
document.addEventListener('keydown', (e) => { if(e.key === "Escape") { document.querySelectorAll('.overlay.active').forEach(m => m.classList.remove('active')); history.back(); } });