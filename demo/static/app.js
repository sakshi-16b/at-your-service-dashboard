document.addEventListener('DOMContentLoaded', () => {
    // Menu definitions (matched with backend database.py)
    const MENU = {
        "Appetizers": {
            "Garlic Bread": 5.99,
            "Bruschetta": 7.99,
            "Chicken Wings": 9.99,
            "Calamari": 11.99,
            "Stuffed Mushrooms": 8.49
        },
        "Mains": {
            "Margherita Pizza": 12.99,
            "Pepperoni Pizza": 14.99,
            "Spaghetti Bolognese": 15.99,
            "Grilled Salmon": 19.99,
            "Ribeye Steak": 24.99,
            "Veggie Burger": 11.99,
            "Chicken Alfredo": 16.49
        },
        "Desserts": {
            "Tiramisu": 6.99,
            "Chocolate Lava Cake": 7.99,
            "Cheesecake": 6.99,
            "Apple Pie": 5.99,
            "Gelato Scoop": 3.99
        },
        "Beverages": {
            "Soda": 2.49,
            "Iced Tea": 2.99,
            "Draft Beer": 5.49,
            "Red Wine Glass": 7.99,
            "Mineral Water": 1.99,
            "Cappuccino": 3.99
        }
    };

    // State Variables
    let currentTab = 'dashboard';
    let currentPage = 1;
    const recordsPerPage = 50;
    
    let filters = {
        start_date: '',
        end_date: '',
        category: '',
        payment_method: '',
        search: ''
    };

    let simulatorPollingInterval = null;
    let kdsPollingInterval = null;
    let timerTickInterval = null;
    let isSimulatorRunning = false;
    let seenSimOrderIds = new Set();
    
    const chartsManager = new BistroCharts();
    
    // Cache UI Elements
    const elements = {
        body: document.body,
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        menuItems: document.querySelectorAll('.menu-item'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        tabTitle: document.getElementById('tabTitle'),
        tabSubtitle: document.getElementById('tabSubtitle'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        sidebar: document.getElementById('sidebar'),
        
        // Filter elements
        filterStartDate: document.getElementById('filterStartDate'),
        filterEndDate: document.getElementById('filterEndDate'),
        filterCategory: document.getElementById('filterCategory'),
        filterPayment: document.getElementById('filterPayment'),
        filterSearch: document.getElementById('filterSearch'),
        clearFiltersBtn: document.getElementById('clearFiltersBtn'),
        
        // KPI metrics
        kpiRevenue: document.getElementById('kpiRevenue'),
        kpiOrders: document.getElementById('kpiOrders'),
        kpiAOV: document.getElementById('kpiAOV'),
        kpiSimStatus: document.getElementById('kpiSimStatus'),
        kpiLiveStatusCard: document.getElementById('kpiLiveStatusCard'),
        
        // Table & Pagination
        salesTableBody: document.getElementById('salesTableBody'),
        recordCountLabel: document.getElementById('recordCountLabel'),
        prevPageBtn: document.getElementById('prevPageBtn'),
        nextPageBtn: document.getElementById('nextPageBtn'),
        paginationInfo: document.getElementById('paginationInfo'),
        
        // KDS Tab
        kdsGrid: document.getElementById('kdsGrid'),
        activeTicketCountLabel: document.getElementById('activeTicketCountLabel'),
        
        // Modal - Add Transaction
        addOrderBtn: document.getElementById('addOrderBtn'),
        addOrderModal: document.getElementById('addOrderModal'),
        closeAddOrderModal: document.getElementById('closeAddOrderModal'),
        cancelAddOrderModal: document.getElementById('cancelAddOrderModal'),
        addOrderForm: document.getElementById('addOrderForm'),
        addCategory: document.getElementById('addCategory'),
        addItemName: document.getElementById('addItemName'),
        addQuantity: document.getElementById('addQuantity'),
        addUnitPrice: document.getElementById('addUnitPrice'),
        addPayment: document.getElementById('addPayment'),
        addType: document.getElementById('addType'),
        modalFoodPreviewImg: document.getElementById('modalFoodPreviewImg'),
        modalFoodPreviewPlaceholder: document.getElementById('modalFoodPreviewPlaceholder'),
        loginScreen: document.getElementById('loginScreen'),
        appContainer: document.getElementById('appContainer'),
        loginForm: document.getElementById('loginForm'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        rememberMe: document.getElementById('rememberMe'),
        loginCard: document.getElementById('loginCard'),
        logoutBtn: document.getElementById('logoutBtn'),
        
        // Modal - Import CSV
        importBtn: document.getElementById('importBtn'),
        importModal: document.getElementById('importModal'),
        closeImportModal: document.getElementById('closeImportModal'),
        cancelImportModal: document.getElementById('cancelImportModal'),
        importForm: document.getElementById('importForm'),
        importDragArea: document.getElementById('importDragArea'),
        importFileInput: document.getElementById('importFileInput'),
        selectedFileInfo: document.getElementById('selectedFileInfo'),
        selectedFileName: document.getElementById('selectedFileName'),
        clearSelectedFile: document.getElementById('clearSelectedFile'),
        submitImportBtn: document.getElementById('submitImportBtn'),
        
        exportBtn: document.getElementById('exportBtn'),
        
        // Simulation Tab
        simBadge: document.getElementById('simBadge'),
        toggleSimBtn: document.getElementById('toggleSimBtn'),
        simTickerSubtitle: document.getElementById('simTickerSubtitle'),
        tickerList: document.getElementById('tickerList'),
        
        // Forecasting tab
        forecastedRevenue: document.getElementById('forecastedRevenue'),
        forecastConfidence: document.getElementById('forecastConfidence'),
        
        toastContainer: document.getElementById('toastContainer')
    };

    // --- NAVIGATION & TABS ---
    elements.menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    function switchTab(tabId) {
        currentTab = tabId;
        
        elements.menuItems.forEach(link => {
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        elements.tabPanes.forEach(pane => {
            const paneId = pane.getAttribute('id');
            if (paneId === `${tabId}Tab`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
        
        // Clear KDS intervals when switching away
        if (tabId !== 'kds') {
            stopKdsIntervals();
        }
        
        switch (tabId) {
            case 'dashboard':
                elements.tabTitle.textContent = "Dashboard Overview";
                elements.tabSubtitle.textContent = "Real-time performance metrics and sales statistics.";
                loadDashboardData();
                break;
            case 'analytics':
                elements.tabTitle.textContent = "Detailed Analytics";
                elements.tabSubtitle.textContent = "In-depth hourly and weekly sales breakdowns.";
                loadAnalyticsData();
                break;
            case 'transactions':
                elements.tabTitle.textContent = "Transaction Ledger";
                elements.tabSubtitle.textContent = "Search, filter, and audit individual customer invoices.";
                loadTransactionsTable();
                break;
            case 'kds':
                elements.tabTitle.textContent = "Kitchen Display (KDS)";
                elements.tabSubtitle.textContent = "Active preparation pipelines and cooking alerts.";
                loadKdsData();
                startKdsIntervals();
                break;
            case 'forecasting':
                elements.tabTitle.textContent = "Sales Forecasting";
                elements.tabSubtitle.textContent = "Adjust forecasting parameters and view projections.";
                loadForecastingData();
                break;
            case 'simulation':
                elements.tabTitle.textContent = "Live Order Simulator";
                elements.tabSubtitle.textContent = "Configure and test real-time data ingestion streams.";
                loadSimulatorView();
                break;
        }
        
        closeMobileMenu(); // Close sidebar on mobile when a link is clicked
    }

    // --- THEME & UI HELPERS ---
    // Mobile Menu Toggle
    if (elements.mobileMenuBtn) {
        elements.mobileMenuBtn.addEventListener('click', () => {
            elements.sidebar.classList.add('open');
            elements.sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // prevent scrolling behind
        });
    }

    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.addEventListener('click', () => {
            closeMobileMenu();
        });
    }

    function closeMobileMenu() {
        if (elements.sidebar) elements.sidebar.classList.remove('open');
        if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Theme Toggle
    elements.themeToggleBtn.addEventListener('click', () => {
        if (elements.body.classList.contains('dark-theme')) {
            elements.body.classList.remove('dark-theme');
            elements.body.classList.add('light-theme');
            elements.themeToggleBtn.querySelector('span').textContent = "Light Mode";
            elements.themeToggleBtn.querySelector('i').className = "fa-solid fa-sun";
        } else {
            elements.body.classList.remove('light-theme');
            elements.body.classList.add('dark-theme');
            elements.themeToggleBtn.querySelector('span').textContent = "Dark Mode";
            elements.themeToggleBtn.querySelector('i').className = "fa-solid fa-moon";
        }
        switchTab(currentTab);
    });

    // --- TOAST NOTIFICATIONS ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-circle-xmark';
        if (type === 'warning') iconClass = 'fa-triangle-exclamation';
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass} toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // --- API HELPER FUNCTIONS ---
    function getQueryString() {
        const queryParams = [];
        for (const [key, val] of Object.entries(filters)) {
            if (val) queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
        }
        return queryParams.length ? '?' + queryParams.join('&') : '';
    }

    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error(err);
            showToast("Failed to fetch data from backend. Make sure your database and server are running.", "error");
            return null;
        }
    }

    // --- DATA LOADING ---
    
    // View 1: Dashboard
    async function loadDashboardData() {
        const url = `/api/dashboard/stats${getQueryString()}`;
        const data = await fetchData(url);
        if (!data) return;
        
        elements.kpiRevenue.textContent = `₹${data.summary.total_revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        elements.kpiOrders.textContent = data.summary.total_orders.toLocaleString();
        elements.kpiAOV.textContent = `₹${data.summary.aov.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        chartsManager.drawRevenueTrend('revenueTrendChart', data.trend);
        chartsManager.drawCategoryShare('categoryShareChart', data.categories);
        chartsManager.drawTopItems('topItemsChart', data.top_items);
    }

    // View 2: Analytics
    async function loadAnalyticsData() {
        const url = `/api/dashboard/stats${getQueryString()}`;
        const data = await fetchData(url);
        if (!data) return;
        
        chartsManager.drawWeeklyDistribution('weeklyDistributionChart', data.weekly);
        chartsManager.drawHourlyPeak('hourlyPeakChart', data.hourly);
    }

    // View 3: Transactions
    async function loadTransactionsTable() {
        const url = `/api/sales${getQueryString()}${getQueryString() ? '&' : '?'}page=${currentPage}&limit=${recordsPerPage}`;
        const data = await fetchData(url);
        if (!data) return;
        
        elements.salesTableBody.innerHTML = '';
        if (data.data.length === 0) {
            elements.salesTableBody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--text-muted);">No transactions match selected filters.</td></tr>';
        } else {
            data.data.forEach(sale => {
                const tr = document.createElement('tr');
                const dt = new Date(sale.timestamp);
                const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                tr.innerHTML = `
                    <td style="font-weight:600;color:var(--text-primary);">${sale.order_id}</td>
                    <td>${dateStr}</td>
                    <td style="font-weight:500;">${sale.item_name}</td>
                    <td><span class="badge badge-${sale.category.toLowerCase()}">${sale.category}</span></td>
                    <td>${sale.quantity}</td>
                    <td>₹${sale.unit_price.toFixed(2)}</td>
                    <td style="font-weight:600;">₹${sale.total_price.toFixed(2)}</td>
                    <td><span class="badge badge-${sale.payment_method.toLowerCase()}">${sale.payment_method}</span></td>
                    <td>${sale.order_type}</td>
                    <td><span class="badge badge-${sale.status.toLowerCase()}">${sale.status}</span></td>
                    <td style="text-align: center;">
                        <button class="btn-table-action print-receipt-btn" data-order-id="${sale.order_id}" title="Download PDF Receipt">
                            <i class="fa-solid fa-file-pdf"></i> PDF
                        </button>
                    </td>
                `;
                elements.salesTableBody.appendChild(tr);
            });
            
            // Bind PDF Click handler
            document.querySelectorAll('.print-receipt-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const orderId = btn.getAttribute('data-order-id');
                    generatePDFReceipt(orderId);
                });
            });
        }
        
        elements.recordCountLabel.textContent = `Showing ${data.data.length} of ${data.total_records.toLocaleString()} records`;
        elements.paginationInfo.textContent = `Page ${data.page} of ${data.total_pages || 1}`;
        elements.prevPageBtn.disabled = data.page <= 1;
        elements.nextPageBtn.disabled = data.page >= data.total_pages;
    }

    // View 4: Kitchen Display System (KDS)
    async function loadKdsData() {
        const activeOrders = await fetchData('/api/kds');
        if (!activeOrders) return;
        
        elements.kdsGrid.innerHTML = '';
        
        // Update ticket count header
        elements.activeTicketCountLabel.textContent = `Active Kitchen Tickets (${activeOrders.length})`;
        
        if (activeOrders.length === 0) {
            elements.kdsGrid.innerHTML = `
                <div class="empty-ticker-state" style="grid-column: 1 / -1; padding: 60px 0;">
                    <i class="fa-solid fa-fire-burner" style="font-size:48px; margin-bottom:12px; opacity:0.4;"></i>
                    <p>No active kitchen tickets. The board is clear!</p>
                </div>
            `;
            return;
        }
        
        activeOrders.forEach(order => {
            const ticket = document.createElement('div');
            ticket.className = `kds-ticket ticket-${order.status.toLowerCase()}`;
            ticket.setAttribute('data-order-id', order.order_id);
            ticket.setAttribute('data-timestamp', order.timestamp);
            
            // Determine cover image based on primary category
            const primaryCategory = order.items[0] ? order.items[0].category : 'Mains';
            const categoryImages = {
                "Appetizers": "burger.jpg",
                "Mains": "pizza.jpg",
                "Desserts": "dessert.jpg",
                "Beverages": "drink.jpg"
            };
            const coverImage = categoryImages[primaryCategory] || 'pizza.jpg';
            
            // Build item list
            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `
                    <li class="kds-item">
                        <span>${item.item_name}</span>
                        <span class="kds-item-qty">x${item.quantity}</span>
                    </li>
                `;
            });
            
            // Determine action button based on current status
            let actionText = '';
            let nextStatus = '';
            let iconClass = '';
            
            if (order.status === 'PENDING') {
                actionText = 'Start Preparing';
                nextStatus = 'PREPARING';
                iconClass = 'fa-fire-burner';
            } else if (order.status === 'PREPARING') {
                actionText = 'Mark Ready';
                nextStatus = 'READY';
                iconClass = 'fa-bell';
            } else if (order.status === 'READY') {
                actionText = 'Serve & Complete';
                nextStatus = 'COMPLETED';
                iconClass = 'fa-circle-check';
            }
            
            ticket.innerHTML = `
                <div class="kds-ticket-cover" style="background-image: url('images/${coverImage}');"></div>
                <div class="kds-ticket-header">
                    <span class="kds-ticket-id">${order.order_id}</span>
                    <span class="kds-ticket-time" id="time-${order.order_id}"><i class="fa-regular fa-clock"></i> 0m ago</span>
                </div>
                <div class="kds-ticket-body">
                    <ul class="kds-item-list">
                        ${itemsHtml}
                    </ul>
                    <div class="kds-ticket-meta">
                        <span>${order.order_type}</span>
                        <span>${order.payment_method}</span>
                    </div>
                </div>
                <div class="kds-ticket-footer">
                    <button class="btn-kds-action" data-order-id="${order.order_id}" data-next-status="${nextStatus}">
                        <i class="fa-solid ${iconClass}"></i> ${actionText}
                    </button>
                </div>
            `;
            
            elements.kdsGrid.appendChild(ticket);
        });
        
        // Bind KDS action button events
        elements.kdsGrid.querySelectorAll('.btn-kds-action').forEach(btn => {
            btn.addEventListener('click', async () => {
                const orderId = btn.getAttribute('data-order-id');
                const nextStatus = btn.getAttribute('data-next-status');
                await updateOrderStatus(orderId, nextStatus);
            });
        });
        
        // Initial tick for elapsed timers
        updateElapsedTimers();
    }

    async function updateOrderStatus(orderId, nextStatus) {
        try {
            const response = await fetch('/api/kds/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status: nextStatus })
            });
            const result = await response.json();
            
            if (response.ok) {
                showToast(`Order ${orderId} updated to ${nextStatus}!`);
                loadKdsData();
            } else {
                showToast(result.error || "Failed to update order status.", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Server error updating order.", "error");
        }
    }

    // Tick elapsed timers on active kitchen cards
    function updateElapsedTimers() {
        const tickets = document.querySelectorAll('.kds-ticket');
        const now = new Date();
        
        tickets.forEach(ticket => {
            const orderId = ticket.getAttribute('data-order-id');
            const timestampStr = ticket.getAttribute('data-timestamp');
            const orderTime = new Date(timestampStr);
            
            const diffMs = now - orderTime;
            const diffMins = Math.floor(diffMs / 60000);
            const diffSecs = Math.floor((diffMs % 60000) / 1000);
            
            const timerLabel = document.getElementById(`time-${orderId}`);
            if (timerLabel) {
                timerLabel.innerHTML = `<i class="fa-regular fa-clock"></i> ${diffMins}m ${diffSecs}s ago`;
                
                // If order is sitting for more than 10 minutes, highlight as critical
                if (diffMins >= 10) {
                    timerLabel.classList.add('critical');
                } else {
                    timerLabel.classList.remove('critical');
                }
            }
        });
    }

    function startKdsIntervals() {
        // Poll KDS API for new tickets every 5 seconds
        if (!kdsPollingInterval) {
            kdsPollingInterval = setInterval(loadKdsData, 5000);
        }
        // Tick timer labels every 1 second
        if (!timerTickInterval) {
            timerTickInterval = setInterval(updateElapsedTimers, 1000);
        }
    }

    function stopKdsIntervals() {
        if (kdsPollingInterval) {
            clearInterval(kdsPollingInterval);
            kdsPollingInterval = null;
        }
        if (timerTickInterval) {
            clearInterval(timerTickInterval);
            timerTickInterval = null;
        }
    }

    // View 5: Forecasting
    async function loadForecastingData() {
        const statsUrl = `/api/dashboard/stats`;
        const forecastUrl = `/api/forecast`;
        
        const [statsData, forecastData] = await Promise.all([
            fetchData(statsUrl),
            fetchData(forecastUrl)
        ]);
        
        if (!statsData || !forecastData) return;
        
        const totalForecastRevenue = forecastData.reduce((sum, d) => sum + d.revenue, 0);
        elements.forecastedRevenue.textContent = `₹${totalForecastRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const confFactor = Math.min(96.5, Math.max(75.0, 85.0 + (statsData.trend.length * 0.05))).toFixed(1);
        elements.forecastConfidence.textContent = `${confFactor}%`;
        
        chartsManager.drawForecast('forecastChart', statsData.trend, forecastData);
    }

    // View 6: Live Simulator
    async function loadSimulatorView() {
        const status = await fetchData('/api/simulator/status');
        if (!status) return;
        
        updateSimulatorState(status.running);
        
        elements.tickerList.innerHTML = '';
        if (status.recent_orders.length === 0) {
            elements.tickerList.innerHTML = `
                <div class="empty-ticker-state">
                    <i class="fa-solid fa-network-wired"></i>
                    <p>Turn on the simulator to view the real-time order feed.</p>
                </div>
            `;
        } else {
            const sortedOrders = [...status.recent_orders].reverse();
            sortedOrders.forEach(order => addOrderToTicker(order, false));
        }
    }

    // --- LIVE SIMULATOR CONTROLS ---
    
    function updateSimulatorState(running) {
        isSimulatorRunning = running;
        
        if (running) {
            elements.simBadge.className = "status-badge active";
            elements.simBadge.textContent = "Online";
            elements.toggleSimBtn.textContent = "Stop Simulator";
            elements.toggleSimBtn.className = "btn btn-secondary";
            elements.simTickerSubtitle.textContent = "Live dining rush simulator feeding active database...";
            
            elements.kpiSimStatus.textContent = "ACTIVE";
            elements.kpiSimStatus.style.color = "var(--success)";
            elements.kpiLiveStatusCard.classList.add('running');
            
            if (!simulatorPollingInterval) {
                simulatorPollingInterval = setInterval(pollSimulatorData, 2000);
            }
        } else {
            elements.simBadge.className = "status-badge inactive";
            elements.simBadge.textContent = "Offline";
            elements.toggleSimBtn.textContent = "Start Simulator";
            elements.toggleSimBtn.className = "btn btn-primary";
            elements.simTickerSubtitle.textContent = "Simulator is offline.";
            
            elements.kpiSimStatus.textContent = "INACTIVE";
            elements.kpiSimStatus.style.color = "";
            elements.kpiLiveStatusCard.classList.remove('running');
            
            if (simulatorPollingInterval) {
                clearInterval(simulatorPollingInterval);
                simulatorPollingInterval = null;
            }
        }
    }

    async function toggleSimulator() {
        const targetState = !isSimulatorRunning;
        
        try {
            const response = await fetch('/api/simulator/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enable: targetState })
            });
            const result = await response.json();
            
            updateSimulatorState(result.running);
            showToast(targetState ? "Live sales simulator started!" : "Simulator stopped.", targetState ? "success" : "warning");
        } catch (err) {
            console.error(err);
            showToast("Failed to communicate with simulator.", "error");
        }
    }

    async function pollSimulatorData() {
        const status = await fetchData('/api/simulator/status');
        if (!status) return;
        
        if (status.running !== isSimulatorRunning) {
            updateSimulatorState(status.running);
        }
        
        if (status.recent_orders.length > 0) {
            const emptyState = elements.tickerList.querySelector('.empty-ticker-state');
            if (emptyState) emptyState.remove();
        }
        
        let newCount = 0;
        status.recent_orders.forEach(order => {
            const uniqueKey = `${order.order_id}-${order.item_name}-${order.timestamp}`;
            if (!seenSimOrderIds.has(uniqueKey)) {
                seenSimOrderIds.add(uniqueKey);
                addOrderToTicker(order, true);
                newCount++;
            }
        });
        
        if (newCount > 0) {
            if (currentTab === 'dashboard') {
                loadDashboardData();
            } else if (currentTab === 'analytics') {
                loadAnalyticsData();
            } else if (currentTab === 'kds') {
                loadKdsData();
            }
        }
    }

    function addOrderToTicker(order, prepend = true) {
        const item = document.createElement('div');
        item.className = "ticker-item";
        
        const dt = new Date(order.timestamp);
        const timeStr = dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        
        item.innerHTML = `
            <div class="ticker-left">
                <div class="ticker-icon"><i class="fa-solid fa-burger"></i></div>
                <div class="ticker-details">
                    <span class="ticker-title">${order.item_name} (Qty: ${order.quantity})</span>
                    <span class="ticker-meta">${order.order_id} &bull; ${order.order_type}</span>
                </div>
            </div>
            <div class="ticker-right">
                <span class="ticker-price">+₹${order.total_price.toFixed(2)}</span>
                <div class="ticker-badges">
                    <span class="badge badge-${order.category.toLowerCase()}">${order.category}</span>
                    <span class="badge badge-${order.payment_method.toLowerCase()}">${order.payment_method}</span>
                </div>
            </div>
        `;
        
        if (prepend) {
            elements.tickerList.insertBefore(item, elements.tickerList.firstChild);
            if (elements.tickerList.children.length > 25) {
                elements.tickerList.lastChild.remove();
            }
        } else {
            elements.tickerList.appendChild(item);
        }
    }

    elements.toggleSimBtn.addEventListener('click', toggleSimulator);

    // --- INTERACTIVE PDF INVOICE GENERATOR ---
    
    async function generatePDFReceipt(orderId) {
        showToast(`Generating receipt for ${orderId}...`, 'info');
        
        // Fetch order details from backend
        const order = await fetchData(`/api/sales/order/${orderId}`);
        if (!order) {
            showToast("Could not retrieve order details.", "error");
            return;
        }
        
        // Format Timestamp
        const orderDate = new Date(order.timestamp);
        const formattedDate = orderDate.toLocaleDateString() + ' ' + orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Calculate Totals
        let subtotal = 0;
        let itemRowsHtml = '';
        order.items.forEach(item => {
            subtotal += item.total_price;
            itemRowsHtml += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-weight: 500;">${item.item_name}</td>
                    <td style="padding: 10px 0; text-align: center;">${item.quantity}</td>
                    <td style="padding: 10px 0; text-align: right;">₹${item.unit_price.toFixed(2)}</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: 600;">₹${item.total_price.toFixed(2)}</td>
                </tr>
            `;
        });
        
        const gst = subtotal * 0.05; // 5% GST
        const total = subtotal + gst;
        
        // Create receipt HTML template
        const receiptDiv = document.createElement('div');
        receiptDiv.style.position = 'absolute';
        receiptDiv.style.left = '-9999px'; // Render off-screen
        
        receiptDiv.innerHTML = `
            <div id="receipt-container" style="font-family: 'Inter', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: #ffffff; width: 600px; line-height: 1.5; border-radius: 8px;">
                <!-- Header -->
                <div style="text-align: center; border-bottom: 3px solid #6366f1; padding-bottom: 24px; margin-bottom: 24px;">
                    <h2 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">AT YOUR SERVICE</h2>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">At Your Service Plaza, Cyber City, India</p>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">Phone: +91 98765 43210 &bull; Support: support@atyourservice.com</p>
                </div>
                
                <!-- Metadata Grid -->
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div>
                        <span style="color: #64748b; font-weight: 600;">Order Details:</span><br>
                        <strong style="font-size: 15px; color: #0f172a;">${order.order_id}</strong><br>
                        <strong>Date:</strong> ${formattedDate}<br>
                        <strong>Type:</strong> ${order.order_type}
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #64748b; font-weight: 600;">Billing Info:</span><br>
                        <span style="display: inline-block; margin-top: 4px;" class="badge">Payment: ${order.payment_method}</span><br>
                        <strong>Status:</strong> <span style="color: #10b981; font-weight: 700;">${order.status}</span>
                    </div>
                </div>
                
                <!-- Table -->
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
                            <th style="padding: 10px 0; text-align: left;">Item Description</th>
                            <th style="padding: 10px 0; text-align: center;">Qty</th>
                            <th style="padding: 10px 0; text-align: right;">Rate</th>
                            <th style="padding: 10px 0; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRowsHtml}
                    </tbody>
                </table>
                
                <!-- Totals -->
                <div style="margin-left: auto; width: 260px; font-size: 13px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #64748b;">Subtotal:</span>
                        <span style="font-weight: 600; color: #334155;">₹${subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: #64748b;">GST (5%):</span>
                        <span style="font-weight: 600; color: #334155;">₹${gst.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 16px; border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 8px; color: #0f172a; font-weight: 800;">
                        <span>Total Paid:</span>
                        <span>₹${total.toFixed(2)}</span>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 20px;">
                    <p style="font-weight: 600; color: #64748b; margin-bottom: 4px;">Thank you for dining with us!</p>
                    <p style="margin: 0;">This is a computer-generated invoice created by At Your Service.</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(receiptDiv);
        
        const receiptContainer = document.getElementById('receipt-container');
        
        // html2pdf config options
        const opt = {
            margin:       10,
            filename:     `AtYourServiceReceipt_${orderId}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Generate and download PDF
        try {
            await html2pdf().set(opt).from(receiptContainer).save();
            showToast(`PDF invoice downloaded for ${orderId}!`);
        } catch (err) {
            console.error(err);
            showToast("Failed to generate PDF.", "error");
        } finally {
            // Cleanup in-memory element
            receiptDiv.remove();
        }
    }

    // --- GLOBAL FILTERS ENGINE ---
    
    elements.filterStartDate.addEventListener('change', handleFilterChange);
    elements.filterEndDate.addEventListener('change', handleFilterChange);
    elements.filterCategory.addEventListener('change', handleFilterChange);
    elements.filterPayment.addEventListener('change', handleFilterChange);
    
    let searchDebounceTimer = null;
    elements.filterSearch.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            filters.search = elements.filterSearch.value.trim();
            currentPage = 1;
            refreshCurrentTab();
        }, 400);
    });

    function handleFilterChange() {
        filters.start_date = elements.filterStartDate.value;
        filters.end_date = elements.filterEndDate.value;
        filters.category = elements.filterCategory.value;
        filters.payment_method = elements.filterPayment.value;
        
        currentPage = 1;
        refreshCurrentTab();
    }

    elements.clearFiltersBtn.addEventListener('click', () => {
        elements.filterStartDate.value = '';
        elements.filterEndDate.value = '';
        elements.filterCategory.value = '';
        elements.filterPayment.value = '';
        elements.filterSearch.value = '';
        
        filters = { start_date: '', end_date: '', category: '', payment_method: '', search: '' };
        currentPage = 1;
        
        showToast("Filters cleared.", "info");
        refreshCurrentTab();
    });

    function refreshCurrentTab() {
        switchTab(currentTab);
    }

    // --- PAGINATION EVENTS ---
    elements.prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadTransactionsTable();
        }
    });

    elements.nextPageBtn.addEventListener('click', () => {
        currentPage++;
        loadTransactionsTable();
    });

    // --- ADD TRANSACTION MODAL FLOW ---
    
    function resetModalPreview() {
        if (elements.modalFoodPreviewImg) {
            elements.modalFoodPreviewImg.src = '';
            elements.modalFoodPreviewImg.style.display = 'none';
        }
        if (elements.modalFoodPreviewPlaceholder) {
            elements.modalFoodPreviewPlaceholder.style.display = 'flex';
        }
    }

    elements.addOrderBtn.addEventListener('click', () => {
        elements.addOrderForm.reset();
        resetModalPreview();
        elements.addItemName.innerHTML = '<option value="" disabled selected>Select Category First</option>';
        elements.addItemName.disabled = true;
        elements.addUnitPrice.value = '';
        elements.addOrderModal.classList.add('active');
    });

    function closeModals() {
        elements.addOrderModal.classList.remove('active');
        elements.importModal.classList.remove('active');
        resetModalPreview();
    }

    [elements.closeAddOrderModal, elements.cancelAddOrderModal, elements.closeImportModal, elements.cancelImportModal].forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    window.addEventListener('click', (e) => {
        if (e.target === elements.addOrderModal || e.target === elements.importModal) {
            closeModals();
        }
    });

    elements.addCategory.addEventListener('change', () => {
        const cat = elements.addCategory.value;
        
        // Category image mapping
        const categoryImages = {
            "Appetizers": "images/burger.jpg",
            "Mains": "images/pizza.jpg",
            "Desserts": "images/dessert.jpg",
            "Beverages": "images/drink.jpg"
        };
        
        if (cat && categoryImages[cat]) {
            elements.modalFoodPreviewImg.src = categoryImages[cat];
            elements.modalFoodPreviewImg.style.display = 'block';
            elements.modalFoodPreviewPlaceholder.style.display = 'none';
        } else {
            resetModalPreview();
        }
        
        if (!cat || !MENU[cat]) return;
        
        elements.addItemName.innerHTML = '<option value="" disabled selected>Select Item</option>';
        Object.keys(MENU[cat]).forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            elements.addItemName.appendChild(opt);
        });
        
        elements.addItemName.disabled = false;
        elements.addUnitPrice.value = '';
    });

    elements.addItemName.addEventListener('change', () => {
        const cat = elements.addCategory.value;
        const item = elements.addItemName.value;
        if (MENU[cat] && MENU[cat][item]) {
            elements.addUnitPrice.value = MENU[cat][item].toFixed(2);
        }
    });

    elements.addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            item_name: elements.addItemName.value,
            category: elements.addCategory.value,
            quantity: parseInt(elements.addQuantity.value),
            unit_price: parseFloat(elements.addUnitPrice.value),
            payment_method: elements.addPayment.value,
            order_type: elements.addType.value
        };
        
        try {
            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                showToast("Transaction saved successfully!");
                closeModals();
                refreshCurrentTab();
            } else {
                const err = await response.json();
                showToast(err.error || "Failed to save transaction.", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Server connection error.", "error");
        }
    });

    // --- CSV IMPORT FLOW ---
    
    elements.importBtn.addEventListener('click', () => {
        elements.importForm.reset();
        resetImportFileState();
        elements.importModal.classList.add('active');
    });

    function resetImportFileState() {
        elements.importFileInput.value = '';
        elements.selectedFileInfo.style.display = 'none';
        elements.importDragArea.style.display = 'flex';
        elements.selectedFileName.textContent = '';
        elements.submitImportBtn.disabled = true;
    }

    elements.importDragArea.addEventListener('click', () => {
        elements.importFileInput.click();
    });

    elements.importFileInput.addEventListener('change', () => {
        handleFileSelect(elements.importFileInput.files[0]);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        elements.importDragArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            elements.importDragArea.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        elements.importDragArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            elements.importDragArea.classList.remove('dragover');
        }, false);
    });

    elements.importDragArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFileSelect(file);
    }, false);

    function handleFileSelect(file) {
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
            showToast("Only CSV files are supported.", "error");
            return;
        }
        
        elements.importDragArea.style.display = 'none';
        elements.selectedFileInfo.style.display = 'flex';
        elements.selectedFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        elements.submitImportBtn.disabled = false;
    }

    elements.clearSelectedFile.addEventListener('click', (e) => {
        e.stopPropagation();
        resetImportFileState();
    });

    elements.importForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = elements.importFileInput.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        elements.submitImportBtn.textContent = "Importing...";
        elements.submitImportBtn.disabled = true;
        
        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (response.ok) {
                showToast(result.message || "Import completed successfully!");
                closeModals();
                refreshCurrentTab();
            } else {
                showToast(result.error || "Failed to import CSV.", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Connection error while importing file.", "error");
        } finally {
            elements.submitImportBtn.textContent = "Import Data";
            elements.submitImportBtn.disabled = false;
        }
    });

    // --- AUTHENTICATION & LOGIN ---
    
    function checkAuthState() {
        const isSessionAuth = sessionStorage.getItem('bistro_auth') === 'true';
        const isLocalAuth = localStorage.getItem('bistro_auth_remember') === 'admin';
        
        if (isSessionAuth || isLocalAuth) {
            elements.loginScreen.style.display = 'none';
            elements.appContainer.style.display = 'flex';
            return true;
        } else {
            elements.loginScreen.style.display = 'flex';
            elements.appContainer.style.display = 'none';
            return false;
        }
    }

    // Auth UI Toggle Logic
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotForm');
    const otpForm = document.getElementById('otpForm');

    document.getElementById('showSignupBtn').addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; signupForm.style.display = 'block'; });
    document.getElementById('showLoginBtn').addEventListener('click', (e) => { e.preventDefault(); signupForm.style.display = 'none'; loginForm.style.display = 'block'; });
    document.getElementById('showForgotBtn').addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; forgotForm.style.display = 'block'; });
    document.getElementById('showLoginFromForgotBtn').addEventListener('click', (e) => { e.preventDefault(); forgotForm.style.display = 'none'; loginForm.style.display = 'block'; });
    document.getElementById('cancelResetBtn').addEventListener('click', (e) => { e.preventDefault(); otpForm.style.display = 'none'; loginForm.style.display = 'block'; });

    // Signup Form Submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value.trim();
        const mobile = document.getElementById('signupMobile').value.trim();
        
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, mobile_number: mobile })
            });
            const data = await response.json();
            
            if (response.ok) {
                showToast("Account created successfully! Please log in.", "success");
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
                document.getElementById('loginUsername').value = username;
            } else {
                elements.loginCard.classList.add('shake');
                showToast(data.error || "Signup failed.", "error");
                setTimeout(() => elements.loginCard.classList.remove('shake'), 400);
            }
        } catch (error) {
            showToast("Network error during signup.", "error");
        }
    });

    // Login Form Submission
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = elements.loginUsername.value.trim();
        const password = elements.loginPassword.value.trim();
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            
            if (response.ok) {
                sessionStorage.setItem('bistro_auth', 'true');
                // Remember me was removed from UI in this iteration for simplicity
                
                elements.loginScreen.style.opacity = '0';
                elements.loginScreen.style.transform = 'scale(0.95)';
                
                showToast(`Welcome back, ${data.username}!`, "success");
                
                setTimeout(() => {
                    elements.loginScreen.style.display = 'none';
                    elements.appContainer.style.display = 'flex';
                    elements.loginScreen.style.opacity = '1';
                    elements.loginScreen.style.transform = 'scale(1)';
                    
                    switchTab('dashboard');
                    fetchData('/api/simulator/status').then(status => {
                        if (status && status.running) {
                            updateSimulatorState(true);
                        }
                    });
                }, 450);
            } else {
                elements.loginCard.classList.add('shake');
                showToast(data.error || "Invalid credentials.", "error");
                setTimeout(() => elements.loginCard.classList.remove('shake'), 400);
            }
        } catch (error) {
            showToast("Network error during login.", "error");
        }
    });

    // Forgot Password Flow - Request OTP
    let resetMobileNumber = '';
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetMobileNumber = document.getElementById('forgotMobile').value.trim();
        
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile_number: resetMobileNumber })
            });
            const data = await response.json();
            
            if (response.ok) {
                // Show simulated OTP in an alert since we don't have a real SMS gateway connected
                alert(`[SIMULATED SMS to ${resetMobileNumber}]\\nYour At Your Service OTP is: ${data.simulated_otp}\\n(This alert appears because real SMS requires a paid Twilio API key)`);
                
                showToast("OTP sent to your mobile!", "success");
                forgotForm.style.display = 'none';
                otpForm.style.display = 'block';
            } else {
                elements.loginCard.classList.add('shake');
                showToast(data.error || "Failed to send OTP.", "error");
                setTimeout(() => elements.loginCard.classList.remove('shake'), 400);
            }
        } catch (error) {
            showToast("Network error.", "error");
        }
    });

    // OTP Verification and Password Reset
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = document.getElementById('resetOtp').value.trim();
        const newPassword = document.getElementById('resetPassword').value.trim();
        
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile_number: resetMobileNumber, otp: otp, new_password: newPassword })
            });
            const data = await response.json();
            
            if (response.ok) {
                showToast(data.message, "success");
                otpForm.style.display = 'none';
                loginForm.style.display = 'block';
                document.getElementById('loginPassword').value = ''; // clear out old
            } else {
                elements.loginCard.classList.add('shake');
                showToast(data.error || "Invalid OTP.", "error");
                setTimeout(() => elements.loginCard.classList.remove('shake'), 400);
            }
        } catch (error) {
            showToast("Network error.", "error");
        }
    });

    elements.logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('bistro_auth');
        localStorage.removeItem('bistro_auth_remember');
        
        showToast("Logged out successfully.", "warning");
        
        elements.loginUsername.value = '';
        elements.loginPassword.value = '';
        elements.rememberMe.checked = false;
        
        elements.loginScreen.style.display = 'flex';
        elements.appContainer.style.display = 'none';
        
        if (simulatorPollingInterval) {
            clearInterval(simulatorPollingInterval);
            simulatorPollingInterval = null;
        }
        stopKdsIntervals();
    });

    // --- 3D PARALLAX TILT EFFECT ---
    
    function init3DTilt() {
        const cards = document.querySelectorAll('.kpi-card');
        
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left; // mouse X inside card
                const y = e.clientY - rect.top;  // mouse Y inside card
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Tilt calculation (max 12 degrees tilt for comfort)
                const rotateX = ((centerY - y) / centerY) * 12;
                const rotateY = ((x - centerX) / centerX) * 12;
                
                // Apply 3D transform with slight scale elevation
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
                card.style.transition = 'transform 0.05s ease'; // responsive mouse follow
            });
            
            card.addEventListener('mouseleave', () => {
                // Reset card with smooth transition
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
                card.style.transition = 'transform 0.5s ease-out';
            });
        });
    }

    // --- INITIAL BOOT ---
    
    init3DTilt();
    
    if (checkAuthState()) {
        switchTab('dashboard');
        fetchData('/api/simulator/status').then(status => {
            if (status && status.running) {
                updateSimulatorState(true);
            }
        });
    }
});
