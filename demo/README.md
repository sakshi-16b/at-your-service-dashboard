# BistroAnalytics 📊🍕

A premium, responsive, glassmorphic **Restaurant Sales Analysis Web Dashboard** powered by a **MySQL Database**, a **Python (Flask) backend**, and a **Vanilla HTML/CSS/JS frontend**.

This project provides real-time sales performance tracking, in-depth analytical breakdowns (by hourly peaks, category share, and weekly distribution), sales forecasting, a **Kitchen Display System (KDS)** pipeline, an **Interactive PDF Invoice Generator**, and a live sales simulator to model dinner rush traffic.

---

## Key Features

1. **Dashboard Overview**:
   - Live KPI cards tracking **Total Revenue**, **Total Orders**, **Average Order Value (AOV)**, and **Simulator Status**. All currency in Rupees (**₹**).
   - Interactive line chart depicting daily **Revenue Trends**.
   - Doughnut chart showing **Sales by Category** (Appetizers, Mains, Desserts, Beverages) and their revenue share.
   - Horizontal bar chart tracking the **Top 5 Selling Items** by total revenue contribution.

2. **Detailed Analytics**:
   - Vertical bar chart representing **Weekly Sales Distribution** (Monday to Sunday) to identify busiest days.
   - Combined line-bar chart mapping **Hourly Sales Peaks** against overall order volumes to audit staff resource requirements.

3. **Transaction Ledger & PDF Invoicing**:
   - Audit trail showing all transactions with search, pagination, and multi-field filtering (Date range, Category, Payment method).
   - **Download PDF Receipt**: Click the "PDF" button next to any transaction to generate and download a professional, styled invoice (with subtotals, GST calculations, and payment metadata) on the fly using `html2pdf.js`.
   - "New Order" dialog modal that dynamically retrieves menu items and unit prices, updating the database instantly.

4. **Kitchen Display System (KDS)**:
   - A dedicated tab showing **Active Kitchen Tickets** in real time (status is not `'COMPLETED'`).
   - Cards group items together by `order_id` and track their active state: `PENDING` ➔ `PREPARING` ➔ `READY`.
   - A live ticket timer counts up the minutes elapsed since the order was placed (timer turns red and flashes if it sits longer than 10 minutes!).
   - Back-of-house staff can cycle tickets through their cooking lifecycle (`Start Preparing` ➔ `Mark Ready` ➔ `Serve & Complete`) directly from the board.

5. **Sales Forecasting**:
   - 7-day predictive modeling using a custom **Linear Trend + Day-of-Week Seasonality** mathematical model calculated in pure Python.
   - Renders a dotted forecast projection with a shaded **90% confidence interval band**.

6. **Live Order Simulator**:
   - A multi-threaded daemon simulator on Flask that writes random, realistic orders to the database every 2-5 seconds (with initial status `PENDING` so they appear on the KDS board instantly).
   - Live order stream ticker displaying simulated sales in real time, auto-updating dashboard metrics, charts, and kitchen tickets.

---

## File Structure

```text
demo/
│
├── app.py                # Core Flask server and API endpoints
├── database.py           # Database initializer and MySQL mock seeder (~1,100 records)
├── forecast_service.py   # Trend & Seasonality forecasting calculations
├── config.py             # MySQL database server connection parameters
├── requirements.txt      # Python dependencies (Flask, mysql-connector-python)
├── run.bat               # Easy-click launcher for Windows
├── README.md             # Project documentation
│
└── static/               # Frontend Assets served by Flask
    ├── index.html        # Single Page Application structure
    ├── styles.css        # Premium glassmorphic stylesheet
    ├── app.js            # Controller handling state, modals, KDS, and PDF receipt rendering
    └── charts.js         # Chart.js helper wrapping line, bar, doughnut, and forecast graphs
```

---

## Setup & Running

### 1. Database Configuration
Before starting, update your MySQL connection settings in **`config.py`**:
```python
MYSQL_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'your_mysql_password_here',  # <-- Enter your MySQL password here
    'database': 'bistro_analytics'
}
```

### 2. Startup (Windows)
Double-click the **`run.bat`** file in the root folder. It will:
1. Detect Python.
2. Install dependencies (`flask`, `mysql-connector-python`).
3. Start the server on `http://127.0.0.1:5000`.

*(Alternatively, run `pip install -r requirements.txt` followed by `python app.py` manually in your terminal).*

### 3. Visualizing in MySQL Workbench
1. Open MySQL Workbench and create/open your local connection.
2. In the left panel under **Schemas**, you will see **`bistro_analytics`** (if you don't see it, right-click and choose **Refresh All**).
3. Expand `Tables` -> right-click **`sales`** -> select **Select Rows - Limit 1000** to query all records.
