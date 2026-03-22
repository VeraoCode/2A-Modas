const state = {
  activeCategory: "Todos",
  cart: [],
  customers: [
    {
      name: "Camila Rocha",
      email: "camila@email.com",
      phone: "(11) 99888-1122",
      city: "São Paulo"
    },
    {
      name: "Mariana Souza",
      email: "mariana@email.com",
      phone: "(21) 99777-4433",
      city: "Rio de Janeiro"
    }
  ],
  products: [
    {
      id: 1,
      name: "Vestido Midi Elegance",
      category: "Moda Feminina",
      price: 189.9,
      stock: 12,
      tag: "Novo",
      emoji: "👗",
      description: "Vestido moderno com visual elegante e ótimo destaque para sua vitrine."
    },
    {
      id: 2,
      name: "Perfume Essenza Gold",
      category: "Perfumes",
      price: 129.9,
      stock: 20,
      tag: "Mais vendido",
      emoji: "🧴",
      description: "Perfume sofisticado para compor sua loja online com muito estilo."
    },
    {
      id: 3,
      name: "Bolsa Urban Chic",
      category: "Acessórios",
      price: 159.9,
      stock: 9,
      tag: "Destaque",
      emoji: "👜",
      description: "Bolsa charmosa e elegante para looks urbanos e casuais."
    },
    {
      id: 4,
      name: "Scarpin Classic Nude",
      category: "Calçados",
      price: 219.9,
      stock: 7,
      tag: "Coleção",
      emoji: "👠",
      description: "Scarpin refinado para clientes que procuram elegância e conforto."
    }
  ],
  tracking: [
    {
      order: "#2401",
      client: "Camila Rocha",
      status: "Separação",
      progress: 35,
      eta: "Entrega prevista para 25/03",
      code: "BR2399901"
    },
    {
      order: "#2402",
      client: "Mariana Souza",
      status: "Em transporte",
      progress: 72,
      eta: "Saiu para entrega em 23/03",
      code: "BR2399902"
    },
    {
      order: "#2403",
      client: "Juliana Lima",
      status: "Pedido confirmado",
      progress: 18,
      eta: "Postagem em até 24h",
      code: "BR2399903"
    }
  ]
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const elements = {
  filters: document.getElementById("filters"),
  productsGrid: document.getElementById("products-grid"),
  customerForm: document.getElementById("customer-form"),
  customersList: document.getElementById("customers-list"),
  customersTotal: document.getElementById("customers-total"),
  adminProducts: document.getElementById("admin-products"),
  adminCustomers: document.getElementById("admin-customers"),
  adminCart: document.getElementById("admin-cart"),
  trackingGrid: document.getElementById("tracking-grid"),
  cartSidebar: document.getElementById("cart-sidebar"),
  openCart: document.getElementById("open-cart"),
  closeCart: document.getElementById("close-cart"),
  cartItems: document.getElementById("cart-items"),
  cartTotal: document.getElementById("cart-total"),
  cartCount: document.getElementById("cart-count"),
  overlay: document.getElementById("overlay"),
  loginModal: document.getElementById("login-modal"),
  openLogin: document.getElementById("open-login"),
  closeLogin: document.getElementById("close-login"),
  loginButton: document.getElementById("login-button"),
  productForm: document.getElementById("product-form")
};

function getCategories() {
  return ["Todos", ...new Set(state.products.map(product => product.category))];
}

function renderFilters() {
  elements.filters.innerHTML = getCategories()
    .map(category => {
      const activeClass = category === state.activeCategory ? "active" : "";
      return `<button class="filter-btn ${activeClass}" data-category="${category}">${category}</button>`;
    })
    .join("");
}

function renderProducts() {
  const visibleProducts =
    state.activeCategory === "Todos"
      ? state.products
      : state.products.filter(product => product.category === state.activeCategory);

  elements.productsGrid.innerHTML = visibleProducts
    .map(product => {
      return `
        <article class="product-card">
          <div class="product-visual">
            <span class="product-emoji">${product.emoji}</span>
            <span class="product-tag">${product.tag}</span>
          </div>

          <div class="product-body">
            <div class="product-meta">${product.category} • Estoque ${product.stock}</div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>

            <div class="product-footer">
              <span class="price">${money.format(product.price)}</span>
              <button class="btn btn-primary add-cart" data-id="${product.id}">
                Adicionar
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCustomers() {
  elements.customersTotal.textContent = `${state.customers.length} clientes`;
  elements.adminCustomers.textContent = state.customers.length;

  if (!state.customers.length) {
    elements.customersList.innerHTML =
      `<div class="empty-state">Nenhum cliente cadastrado.</div>`;
    return;
  }

  elements.customersList.innerHTML = state.customers
    .map(customer => {
      return `
        <div class="customer-item">
          <div>
            <strong>${customer.name}</strong>
            <small>${customer.email}</small>
          </div>
          <div>
            <strong>${customer.city}</strong>
            <small>${customer.phone}</small>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderTracking() {
  elements.trackingGrid.innerHTML = state.tracking
    .map(item => {
      return `
        <article class="track-card">
          <div class="track-card-head">
            <div>
              <span class="eyebrow">${item.order}</span>
              <h3>${item.client}</h3>
            </div>
            <span class="track-status">${item.status}</span>
          </div>

          <div class="track-bar">
            <div class="track-fill" style="width:${item.progress}%"></div>
          </div>

          <div class="track-steps">
            <span>Pedido</span>
            <span>Envio</span>
            <span>Entrega</span>
          </div>

          <div class="track-info">
            <div>${item.eta}</div>
            <div><strong>Código:</strong> ${item.code}</div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCart() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  elements.cartCount.textContent = totalItems;
  elements.adminCart.textContent = totalItems;
  elements.cartTotal.textContent = money.format(totalPrice);

  if (!state.cart.length) {
    elements.cartItems.innerHTML =
      `<div class="empty-state">Seu carrinho está vazio.</div>`;
    return;
  }

  elements.cartItems.innerHTML = state.cart
    .map(item => {
      return `
        <div class="cart-item">
          <div>
            <strong>${item.name}</strong>
            <small>${item.category} • ${item.quantity}x</small>
          </div>
          <strong>${money.format(item.price * item.quantity)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderAdmin() {
  elements.adminProducts.textContent = state.products.length;
}

function openCartSidebar() {
  elements.cartSidebar.classList.add("open");
  elements.overlay.classList.add("show");
}

function closeCartSidebar() {
  elements.cartSidebar.classList.remove("open");
  hideOverlayIfNothingOpen();
}

function openLoginModal() {
  elements.loginModal.classList.add("show");
  elements.overlay.classList.add("show");
}

function closeLoginModal() {
  elements.loginModal.classList.remove("show");
  hideOverlayIfNothingOpen();
}

function hideOverlayIfNothingOpen() {
  const cartOpen = elements.cartSidebar.classList.contains("open");
  const modalOpen = elements.loginModal.classList.contains("show");

  if (!cartOpen && !modalOpen) {
    elements.overlay.classList.remove("show");
  }
}

function addToCart(productId) {
  const product = state.products.find(item => item.id === Number(productId));
  if (!product) return;

  const existing = state.cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      ...product,
      quantity: 1
    });
  }

  renderCart();
  renderAdmin();
  openCartSidebar();
}

function handleCustomerSubmit(event) {
  event.preventDefault();

  const customer = {
    name: document.getElementById("customer-name").value.trim(),
    email: document.getElementById("customer-email").value.trim(),
    phone: document.getElementById("customer-phone").value.trim(),
    city: document.getElementById("customer-city").value.trim()
  };

  state.customers.unshift(customer);
  elements.customerForm.reset();
  renderCustomers();
}

function handleProductSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("product-name").value.trim();
  const category = document.getElementById("product-category").value;
  const price = Number(document.getElementById("product-price").value);
  const stock = Number(document.getElementById("product-stock").value);

  const emojiMap = {
    "Moda Feminina": "👗",
    "Perfumes": "🧴",
    "Acessórios": "👜",
    "Calçados": "👠"
  };

  state.products.unshift({
    id: Date.now(),
    name,
    category,
    price,
    stock,
    tag: "Novo item",
    emoji: emojiMap[category] || "✨",
    description: "Produto recém-cadastrado pela área administrativa."
  });

  elements.productForm.reset();
  renderFilters();
  renderProducts();
  renderAdmin();
}

function bindEvents() {
  elements.filters.addEventListener("click", function (event) {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    state.activeCategory = button.dataset.category;
    renderFilters();
    renderProducts();
  });

  elements.productsGrid.addEventListener("click", function (event) {
    const button = event.target.closest(".add-cart");
    if (!button) return;

    addToCart(button.dataset.id);
  });

  elements.customerForm.addEventListener("submit", handleCustomerSubmit);
  elements.productForm.addEventListener("submit", handleProductSubmit);

  elements.openCart.addEventListener("click", openCartSidebar);
  elements.closeCart.addEventListener("click", closeCartSidebar);

  elements.openLogin.addEventListener("click", openLoginModal);
  elements.closeLogin.addEventListener("click", closeLoginModal);

  elements.overlay.addEventListener("click", function () {
    closeCartSidebar();
    closeLoginModal();
  });

  elements.loginButton.addEventListener("click", function () {
    alert("Login do cliente realizado com sucesso!");
    closeLoginModal();
  });
}

function init() {
  renderFilters();
  renderProducts();
  renderCustomers();
  renderTracking();
  renderCart();
  renderAdmin();
  bindEvents();
}

document.addEventListener("DOMContentLoaded", init);
