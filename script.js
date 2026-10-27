
const menuItems = [
  { id: 1, name: "Margherita Pizza", price: 249, category: "Pizza", emoji: "🍕" },
  { id: 2, name: "Veg Burger", price: 129, category: "Burger", emoji: "🍔" },
  { id: 3, name: "Chicken Burger", price: 179, category: "Burger", emoji: "🍔" },
  { id: 4, name: "White Sauce Pasta", price: 199, category: "Pasta", emoji: "🍝" },
  { id: 5, name: "French Fries", price: 99, category: "Snacks", emoji: "🍟" },
  { id: 6, name: "Cold Coffee", price: 119, category: "Drinks", emoji: "🥤" },
  { id: 7, name: "Chocolate Cake", price: 149, category: "Dessert", emoji: "🍰" },
  { id: 8, name: "Paneer Pizza", price: 299, category: "Pizza", emoji: "🍕" }
];

const TABLE_COUNT = 8;
const STORAGE_KEY = "foodhub_restaurant_data";

const money = amount =>
  "₹" + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.orders)) {
      return {
        orders: saved.orders,
        nextId: Number(saved.nextId) || 1
      };
    }
  } catch (error) {
    console.warn("Could not load saved data.", error);
  }

  return { orders: [], nextId: 1 };
}

let data = loadData();
let cart = {};
let selectedCategory = "All";
let searchText = "";

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    alert("Unable to save data. Please check browser storage.");
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function notify(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// Navigation
function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === pageName);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  const titles = {
    dashboard: "Dashboard",
    menu: "Food Menu & Orders",
    orders: "Order Management",
    tables: "Table Management"
  };

  document.getElementById("pageTitle").textContent =
    titles[pageName] || "Dashboard";

  if (pageName === "dashboard") renderDashboard();
  if (pageName === "orders") renderOrders();
  if (pageName === "tables") renderTables();
}

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

// Table helpers
function tableIsOccupied(tableNumber) {
  return data.orders.some(order =>
    order.table === tableNumber && order.status === "Pending"
  );
}

function getAvailableTables() {
  const available = [];

  for (let i = 1; i <= TABLE_COUNT; i++) {
    if (!tableIsOccupied(i)) available.push(i);
  }

  return available;
}

function renderTableSelect() {
  const select = document.getElementById("tableSelect");
  const previousValue = Number(select.value);
  const available = getAvailableTables();

  select.innerHTML = available.length
    ? available.map(table =>
        `<option value="${table}">Table ${table}</option>`
      ).join("")
    : '<option value="">No tables available</option>';

  if (available.includes(previousValue)) {
    select.value = previousValue;
  }
}

// Menu
function renderCategories() {
  const categories = [
    "All",
    ...new Set(menuItems.map(item => item.category))
  ];

  document.getElementById("categoryFilters").innerHTML =
    categories.map(category => `
      <button
        class="filter-btn ${selectedCategory === category ? "active" : ""}"
        data-category="${escapeHTML(category)}">
        ${escapeHTML(category)}
      </button>
    `).join("");

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      renderCategories();
      renderMenu();
    });
  });
}

function renderMenu() {
  const filtered = menuItems.filter(item => {
    const matchesCategory =
      selectedCategory === "All" ||
      item.category === selectedCategory;

    const matchesSearch =
      item.name.toLowerCase().includes(searchText.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  document.getElementById("foodGrid").innerHTML = filtered.length
    ? filtered.map(item => `
        <div class="food-card">
          <div class="food-emoji">${item.emoji}</div>
          <div class="food-info">
            <h3>${escapeHTML(item.name)}</h3>
            <div class="food-bottom">
              <span class="price">${money(item.price)}</span>
              <button class="add-btn" data-add="${item.id}">
                + Add
              </button>
            </div>
          </div>
        </div>
      `).join("")
    : '<p class="empty">No food items found.</p>';

  document.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
      addToCart(Number(button.dataset.add));
    });
  });
}

document.getElementById("searchFood").addEventListener("input", event => {
  searchText = event.target.value;
  renderMenu();
});

// Cart
function addToCart(id) {
  const item = menuItems.find(food => food.id === id);
  if (!item) return;

  cart[id] = (cart[id] || 0) + 1;
  renderCart();
  notify(item.name + " added to cart");
}

function changeQuantity(id, amount) {
  if (!cart[id]) return;

  cart[id] += amount;

  if (cart[id] <= 0) {
    delete cart[id];
  }

  renderCart();
}

function getTotals() {
  const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find(food => food.id === Number(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const tax = Math.round(subtotal * 0.05 * 100) / 100;

  return {
    subtotal,
    tax,
    total: subtotal + tax
  };
}

function renderCart() {
  const container = document.getElementById("cartItems");
  const entries = Object.entries(cart).filter(([, qty]) => qty > 0);

  if (!entries.length) {
    container.innerHTML =
      '<p class="empty">Your cart is empty.</p>';
  } else {
    container.innerHTML = entries.map(([id, qty]) => {
      const item = menuItems.find(food => food.id === Number(id));
      if (!item) return "";

      return `
        <div class="cart-item">
          <div>
            <h4>${escapeHTML(item.name)}</h4>
            <small>${money(item.price)} each</small>
            <div class="quantity">
              <button data-change="${id}" data-amount="-1">−</button>
              <span>${qty}</span>
              <button data-change="${id}" data-amount="1">+</button>
            </div>
          </div>
          <strong>${money(item.price * qty)}</strong>
        </div>
      `;
    }).join("");
  }

  container.querySelectorAll("[data-change]").forEach(button => {
    button.addEventListener("click", () => {
      changeQuantity(
        Number(button.dataset.change),
        Number(button.dataset.amount)
      );
    });
  });

  const totals = getTotals();

  document.getElementById("subtotal").textContent =
    money(totals.subtotal);

  document.getElementById("tax").textContent =
    money(totals.tax);

  document.getElementById("grandTotal").textContent =
    money(totals.total);
}

document.getElementById("clearCart").addEventListener("click", () => {
  cart = {};
  renderCart();
  notify("Cart cleared");
});

// Place an order
document.getElementById("placeOrder").addEventListener("click", () => {
  const entries = Object.entries(cart).filter(([, qty]) => qty > 0);

  if (!entries.length) {
    notify("Please add food items first");
    return;
  }

  const table = Number(document.getElementById("tableSelect").value);

  if (!table || tableIsOccupied(table)) {
    notify("Please select an available table");
    renderTableSelect();
    return;
  }

  const items = entries.map(([id, qty]) => {
    const food = menuItems.find(item => item.id === Number(id));

    return {
      id: food.id,
      name: food.name,
      price: food.price,
      qty
    };
  });

  const totals = getTotals();

  const order = {
    id: data.nextId++,
    date: new Date().toLocaleString("en-IN"),
    table,
    items,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    status: "Pending"
  };

  data.orders.unshift(order);
  saveData();

  cart = {};

  renderCart();
  renderTableSelect();
  renderDashboard();
  renderOrders();
  renderTables();

  notify("Order #" + order.id + " placed successfully!");
  showPage("orders");
});

// Order management
function renderOrders() {
  const tbody = document.getElementById("allOrders");

  if (!data.orders.length) {
    tbody.innerHTML =
      '<tr><td colspan="7">No orders yet.</td></tr>';
    return;
  }

  tbody.innerHTML = data.orders.map(order => `
    <tr>
      <td>#${order.id}</td>
      <td>${escapeHTML(order.date)}</td>
      <td>Table ${order.table}</td>
      <td>${order.items.reduce((sum, item) => sum + item.qty, 0)} items</td>
      <td>${money(order.total)}</td>
      <td>
        <span class="status ${order.status}">
          ${order.status}
        </span>
      </td>
      <td>
        <button class="small-btn" data-print="${order.id}">
          Print
        </button>
        ${order.status === "Pending" ? `
          <button class="small-btn complete-btn"
                  data-complete="${order.id}">
            Complete
          </button>
          <button class="small-btn cancel-btn"
                  data-cancel="${order.id}">
            Cancel
          </button>
        ` : ""}
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-complete]").forEach(button => {
    button.addEventListener("click", () => {
      updateOrder(Number(button.dataset.complete), "Completed");
    });
  });

  tbody.querySelectorAll("[data-cancel]").forEach(button => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.cancel);

      if (confirm("Cancel order #" + id + "?")) {
        updateOrder(id, "Cancelled");
      }
    });
  });

  tbody.querySelectorAll("[data-print]").forEach(button => {
    button.addEventListener("click", () => {
      printBill(Number(button.dataset.print));
    });
  });
}

function updateOrder(id, status) {
  const order = data.orders.find(item => item.id === id);
  if (!order || order.status !== "Pending") return;

  order.status = status;
  saveData();

  renderOrders();
  renderDashboard();
  renderTables();
  renderTableSelect();

  notify("Order #" + id + " " + status.toLowerCase());
}

// Print receipt
function printBill(id) {
  const order = data.orders.find(item => item.id === id);
  if (!order) return;

  const receipt = window.open("", "_blank", "width=420,height=650");

  if (!receipt) {
    notify("Please allow pop-ups to print the bill");
    return;
  }

  const itemRows = order.items.map(item => `
    <tr>
      <td>${escapeHTML(item.name)} × ${item.qty}</td>
      <td style="text-align:right">
        ${money(item.price * item.qty)}
      </td>
    </tr>
  `).join("");

  receipt.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bill #${order.id}</title>
      <style>
        body { font-family: Arial; padding: 25px; color: #222; }
        h2, p { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td { padding: 10px 0; border-bottom: 1px dashed #ccc; }
        .total { text-align: right; margin-top: 20px; }
        button { padding: 10px 20px; cursor: pointer; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <h2>FoodHub Restaurant</h2>
      <p>Customer Receipt</p>
      <hr>
      <p>Order #${order.id}<br>
      Table ${order.table}<br>${escapeHTML(order.date)}</p>
      <table>${itemRows}</table>
      <div class="total">
        <p>Subtotal: ${money(order.subtotal)}</p>
        <p>GST (5%): ${money(order.tax)}</p>
        <h3>Total: ${money(order.total)}</h3>
        <p>Status: ${escapeHTML(order.status)}</p>
      </div>
      <p>Thank you for visiting!</p>
      <button onclick="window.print()">Print Bill</button>
    </body>
    </html>
  `);

  receipt.document.close();
}

// Dashboard
function renderDashboard() {
  const completedOrPending = data.orders.filter(
    order => order.status !== "Cancelled"
  );

  const revenue = completedOrPending.reduce(
    (sum, order) => sum + order.total, 0
  );

  document.getElementById("totalOrders").textContent =
    completedOrPending.length;

  document.getElementById("totalRevenue").textContent =
    money(revenue);

  document.getElementById("availableTables").textContent =
    getAvailableTables().length;

  document.getElementById("menuCount").textContent =
    menuItems.length;

  const recent = document.getElementById("recentOrders");
  const orders = data.orders.slice(0, 5);

  recent.innerHTML = orders.length
    ? orders.map(order => `
        <tr>
          <td>#${order.id}</td>
          <td>Table ${order.table}</td>
          <td>${order.items.reduce((sum, item) => sum + item.qty, 0)}</td>
          <td>${money(order.total)}</td>
          <td>
            <span class="status ${order.status}">
              ${order.status}
            </span>
          </td>
        </tr>
      `).join("")
    : '<tr><td colspan="5">No orders available.</td></tr>';
}

// Table management
function renderTables() {
  const grid = document.getElementById("tableGrid");

  grid.innerHTML = Array.from(
    { length: TABLE_COUNT },
    (_, index) => {
      const table = index + 1;
      const order = data.orders.find(item =>
        item.table === table && item.status === "Pending"
      );

      return `
        <div class="table-card ${order ? "occupied" : "available"}">
          <div class="table-icon">🪑</div>
          <h3>Table ${table}</h3>
          <p>${order ? "Occupied" : "Available"}</p>
          ${order
            ? `<button data-table-order="${order.id}">View Order #${order.id}</button>`
            : `<button data-table-select="${table}">Create Order</button>`
          }
        </div>
      `;
    }
  ).join("");

  grid.querySelectorAll("[data-table-select]").forEach(button => {
    button.addEventListener("click", () => {
      showPage("menu");
      const table = Number(button.dataset.tableSelect);
      renderTableSelect();
      document.getElementById("tableSelect").value = String(table);
    });
  });

  grid.querySelectorAll("[data-table-order]").forEach(button => {
    button.addEventListener("click", () => {
      showPage("orders");
      notify("Showing order #" + button.dataset.tableOrder);
    });
  });
}

// Initialize the application
renderCategories();
renderMenu();
renderTableSelect();
renderCart();
renderDashboard();
renderOrders();
renderTables();
