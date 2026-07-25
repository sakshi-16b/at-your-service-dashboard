from flask import Flask, jsonify, request, send_from_directory, Response
import pymysql
import os
import threading
import time
import csv
import io
import random
from datetime import datetime
from database import get_db_connection, init_db, MENU, PAYMENT_METHODS, ORDER_TYPES
from forecast_service import get_forecast

app = Flask(__name__, static_folder='static', static_url_path='')

# Global simulator variables
simulator_running = False
simulator_thread = None
recent_simulated_orders = []

@app.route('/')
def index():
    return app.send_static_file('index.html')

# Initialize DB on start (Disabled for Vercel deployment)
# with app.app_context():
#     init_db()

def get_filtered_query_clause(params):
    query_parts = []
    values = []
    
    if params.get('start_date'):
        query_parts.append("timestamp >= %s")
        values.append(params.get('start_date') + " 00:00:00")
        
    if params.get('end_date'):
        query_parts.append("timestamp <= %s")
        values.append(params.get('end_date') + " 23:59:59")
        
    if params.get('category'):
        query_parts.append("category = %s")
        values.append(params.get('category'))
        
    if params.get('payment_method'):
        query_parts.append("payment_method = %s")
        values.append(params.get('payment_method'))
        
    if params.get('search'):
        query_parts.append("(item_name LIKE %s OR order_id LIKE %s)")
        search_val = f"%{params.get('search')}%"
        values.append(search_val)
        values.append(search_val)
        
    where_clause = ""
    if query_parts:
        where_clause = "WHERE " + " AND ".join(query_parts)
        
    return where_clause, values

@app.route('/api/sales', methods=['GET'])
def get_sales():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    offset = (page - 1) * limit
    
    where_clause, values = get_filtered_query_clause(request.args)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursorclass=pymysql.cursors.DictCursor)
    
    cursor.execute(f"SELECT COUNT(*) as count FROM sales {where_clause}", values)
    total_records = cursor.fetchone()["count"]
    
    cursor.execute(f"""
        SELECT id, order_id, DATE_FORMAT(timestamp, '%%Y-%%m-%%dT%%H:%%i:%%S') as formatted_time, item_name, category, quantity, unit_price, total_price, payment_method, order_type, status
        FROM sales
        {where_clause}
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s
    """, values + [limit, offset])
    
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    sales = []
    for r in rows:
        sales.append({
            "id": r["id"],
            "order_id": r["order_id"],
            "timestamp": r["formatted_time"],
            "item_name": r["item_name"],
            "category": r["category"],
            "quantity": int(r["quantity"]),
            "unit_price": float(r["unit_price"]),
            "total_price": float(r["total_price"]),
            "payment_method": r["payment_method"],
            "order_type": r["order_type"],
            "status": r["status"]
        })
        
    return jsonify({
        "data": sales,
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": (total_records + limit - 1) // limit
    })

# GET specific order details (for invoice generation)
@app.route('/api/sales/order/<order_id>', methods=['GET'])
def get_order_by_id(order_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursorclass=pymysql.cursors.DictCursor)
    cursor.execute("""
        SELECT id, order_id, DATE_FORMAT(timestamp, '%Y-%m-%dT%H:%i:%S') as formatted_time, item_name, category, quantity, unit_price, total_price, payment_method, order_type, status
        FROM sales
        WHERE order_id = %s
    """, (order_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    if not rows:
        return jsonify({"error": "Order not found"}), 404
        
    items = []
    for r in rows:
        items.append({
            "id": r["id"],
            "item_name": r["item_name"],
            "category": r["category"],
            "quantity": int(r["quantity"]),
            "unit_price": float(r["unit_price"]),
            "total_price": float(r["total_price"])
        })
        
    order_info = {
        "order_id": order_id,
        "timestamp": rows[0]["formatted_time"],
        "payment_method": rows[0]["payment_method"],
        "order_type": rows[0]["order_type"],
        "status": rows[0]["status"],
        "items": items
    }
    return jsonify(order_info)

@app.route('/api/sales', methods=['POST'])
def add_sale():
    data = request.get_json() or {}
    
    required = ['item_name', 'category', 'quantity', 'unit_price', 'payment_method', 'order_type']
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
        
    try:
        qty = int(data['quantity'])
        price = float(data['unit_price'])
    except ValueError:
        return jsonify({"error": "Quantity and unit price must be numbers"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT MAX(CAST(SUBSTRING(order_id, 5) AS UNSIGNED)) FROM sales")
    max_num = cursor.fetchone()[0]
    next_num = (max_num or 10000) + 1
    order_id = f"ORD-{next_num}"
    
    now_dt = datetime.now()
    timestamp_str = now_dt.strftime('%Y-%m-%d %H:%M:%S')
    total_price = round(qty * price, 2)
    
    cursor.execute("""
        INSERT INTO sales (order_id, timestamp, item_name, category, quantity, unit_price, total_price, payment_method, order_type, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING')
    """, (
        order_id,
        timestamp_str,
        data['item_name'],
        data['category'],
        qty,
        price,
        total_price,
        data['payment_method'],
        data['order_type']
    ))
    
    new_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    
    return jsonify({
        "id": new_id,
        "order_id": order_id,
        "timestamp": now_dt.isoformat(),
        "item_name": data['item_name'],
        "category": data['category'],
        "quantity": qty,
        "unit_price": price,
        "total_price": total_price,
        "payment_method": data['payment_method'],
        "order_type": data['order_type'],
        "status": 'PENDING'
    }), 201

# --- KITCHEN DISPLAY SYSTEM (KDS) ENDPOINTS ---

@app.route('/api/kds', methods=['GET'])
def get_kds_orders():
    conn = get_db_connection()
    cursor = conn.cursor(cursorclass=pymysql.cursors.DictCursor)
    
    # Retrieve all items of active orders (status != COMPLETED)
    cursor.execute("""
        SELECT order_id, DATE_FORMAT(timestamp, '%Y-%m-%dT%H:%i:%S') as formatted_time, item_name, category, quantity, unit_price, total_price, payment_method, order_type, status
        FROM sales
        WHERE status != 'COMPLETED'
        ORDER BY timestamp ASC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    orders_map = {}
    for r in rows:
        o_id = r["order_id"]
        if o_id not in orders_map:
            orders_map[o_id] = {
                "order_id": o_id,
                "timestamp": r["formatted_time"],
                "status": r["status"],
                "payment_method": r["payment_method"],
                "order_type": r["order_type"],
                "items": []
            }
        orders_map[o_id]["items"].append({
            "item_name": r["item_name"],
            "category": r["category"],
            "quantity": int(r["quantity"]),
            "unit_price": float(r["unit_price"]),
            "total_price": float(r["total_price"])
        })
        
    return jsonify(list(orders_map.values()))

@app.route('/api/kds/status', methods=['POST'])
def update_kds_status():
    data = request.get_json() or {}
    order_id = data.get('order_id')
    new_status = data.get('status')
    
    if not order_id or not new_status:
        return jsonify({"error": "Missing order_id or status"}), 400
        
    valid_statuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED']
    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE sales SET status = %s WHERE order_id = %s", (new_status, order_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": f"Order {order_id} status updated to {new_status}."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- DASHBOARD STATS ---

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    where_clause, values = get_filtered_query_clause(request.args)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursorclass=pymysql.cursors.DictCursor)
    
    # 1. Total Revenue, Total Orders, AOV
    cursor.execute(f"""
        SELECT 
            SUM(total_price) as total_revenue, 
            COUNT(DISTINCT order_id) as total_orders
        FROM sales 
        {where_clause}
    """, values)
    summary = cursor.fetchone()
    
    total_revenue = round(float(summary["total_revenue"] or 0.0), 2)
    total_orders = int(summary["total_orders"] or 0)
    aov = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0
    
    # 2. Category distribution
    cursor.execute(f"""
        SELECT category, SUM(total_price) as category_revenue, SUM(quantity) as category_quantity
        FROM sales
        {where_clause}
        GROUP BY category
        ORDER BY category_revenue DESC
    """, values)
    cat_rows = cursor.fetchall()
    categories = []
    for c in cat_rows:
        categories.append({
            "category": c["category"],
            "revenue": round(float(c["category_revenue"]), 2),
            "quantity": int(c["category_quantity"])
        })
        
    # 3. Revenue Trend (Daily)
    cursor.execute(f"""
        SELECT DATE_FORMAT(timestamp, '%Y-%m-%d') as sale_date, SUM(total_price) as daily_revenue
        FROM sales
        {where_clause}
        GROUP BY sale_date
        ORDER BY sale_date ASC
    """, values)
    trend_rows = cursor.fetchall()
    trend = []
    for t in trend_rows:
        trend.append({
            "date": t["sale_date"],
            "revenue": round(float(t["daily_revenue"]), 2)
        })
        
    # 4. Hourly Sales Distribution
    cursor.execute(f"""
        SELECT DATE_FORMAT(timestamp, '%H') as sale_hour, SUM(total_price) as hourly_revenue, COUNT(DISTINCT order_id) as hourly_orders
        FROM sales
        {where_clause}
        GROUP BY sale_hour
        ORDER BY sale_hour ASC
    """, values)
    hour_rows = cursor.fetchall()
    hourly = []
    for h in hour_rows:
        if h["sale_hour"]:
            hourly.append({
                "hour": int(h["sale_hour"]),
                "revenue": round(float(h["hourly_revenue"]), 2),
                "orders": int(h["hourly_orders"])
            })
            
    # 5. Day-of-Week Sales Distribution
    cursor.execute(f"""
        SELECT DATE_FORMAT(timestamp, '%w') as weekday, SUM(total_price) as revenue
        FROM sales
        {where_clause}
        GROUP BY weekday
        ORDER BY weekday ASC
    """, values)
    weekday_rows = cursor.fetchall()
    
    weekday_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    weekly = []
    for w in weekday_rows:
        if w["weekday"] is not None:
            day_idx = int(w["weekday"])
            weekly.append({
                "weekday": weekday_names[day_idx],
                "day_index": day_idx,
                "revenue": round(float(w["revenue"]), 2)
            })
    weekly.sort(key=lambda x: (x["day_index"] - 1) % 7)

    # 6. Top 5 Selling Items
    cursor.execute(f"""
        SELECT item_name, category, SUM(quantity) as quantity, SUM(total_price) as revenue
        FROM sales
        {where_clause}
        GROUP BY item_name, category
        ORDER BY revenue DESC
        LIMIT 5
    """, values)
    item_rows = cursor.fetchall()
    top_items = []
    for i in item_rows:
        top_items.append({
            "item_name": i["item_name"],
            "category": i["category"],
            "quantity": int(i["quantity"]),
            "revenue": round(float(i["revenue"]), 2)
        })
        
    cursor.close()
    conn.close()
    
    return jsonify({
        "summary": {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "aov": aov
        },
        "categories": categories,
        "trend": trend,
        "hourly": hourly,
        "weekly": weekly,
        "top_items": top_items
    })

@app.route('/api/forecast', methods=['GET'])
def get_sales_forecast():
    try:
        forecast = get_forecast()
        return jsonify(forecast)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/import', methods=['POST'])
def import_csv():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "Only CSV files allowed"}), 400
        
    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        required_headers = ['order_id', 'timestamp', 'item_name', 'category', 'quantity', 'unit_price', 'total_price', 'payment_method', 'order_type']
        headers = csv_reader.fieldnames
        if not all(h in headers for h in required_headers):
            return jsonify({"error": f"CSV must contain headers: {', '.join(required_headers)}"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        imported_count = 0
        records = []
        for row in csv_reader:
            try:
                qty = int(row['quantity'])
                u_price = float(row['unit_price'])
                t_price = float(row['total_price'])
                
                # Check for status or use default 'COMPLETED' for external CSV data
                status = row.get('status', 'COMPLETED')
                
                time_str = row['timestamp'].replace('T', ' ')
                if '.' in time_str:
                    time_str = time_str.split('.')[0]
                
                records.append((
                    row['order_id'],
                    time_str,
                    row['item_name'],
                    row['category'],
                    qty,
                    u_price,
                    t_price,
                    row['payment_method'],
                    row['order_type'],
                    status
                ))
                imported_count += 1
            except ValueError:
                continue
                
        if records:
            cursor.executemany("""
                INSERT INTO sales (order_id, timestamp, item_name, category, quantity, unit_price, total_price, payment_method, order_type, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, records)
            conn.commit()
            
        cursor.close()
        conn.close()
        return jsonify({"message": f"Successfully imported {imported_count} sales records."}), 201
        
    except Exception as e:
        return jsonify({"error": f"Failed to parse CSV: {str(e)}"}), 500

@app.route('/api/export', methods=['GET'])
def export_csv():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT order_id, DATE_FORMAT(timestamp, '%Y-%m-%dT%H:%i:%S') as formatted_time, item_name, category, quantity, unit_price, total_price, payment_method, order_type, status
        FROM sales
        ORDER BY timestamp ASC
    """)
    rows = cursor.fetchall()
    
    def generate():
        data = io.StringIO()
        writer = csv.writer(data)
        writer.writerow(['order_id', 'timestamp', 'item_name', 'category', 'quantity', 'unit_price', 'total_price', 'payment_method', 'order_type', 'status'])
        yield data.getvalue()
        data.seek(0)
        data.truncate(0)
        
        for row in rows:
            writer.writerow(list(row))
            yield data.getvalue()
            data.seek(0)
            data.truncate(0)
            
    response = Response(generate(), mimetype='text/csv')
    response.headers.set("Content-Disposition", "attachment", filename="restaurant_sales_export.csv")
    cursor.close()
    conn.close()
    return response

# Simulator Worker Thread Function
def simulator_worker():
    global simulator_running, recent_simulated_orders
    
    print("Simulator thread started.")
    
    while simulator_running:
        sleep_time = random.uniform(2.0, 5.0)
        time.sleep(sleep_time)
        
        if not simulator_running:
            break
            
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT MAX(CAST(SUBSTRING(order_id, 5) AS UNSIGNED)) FROM sales")
            max_num = cursor.fetchone()[0]
            next_num = (max_num or 10000) + 1
            order_id = f"ORD-{next_num}"
            
            now_dt = datetime.now()
            timestamp_str = now_dt.strftime('%Y-%m-%d %H:%M:%S')
            payment_method = random.choices(PAYMENT_METHODS, weights=[50, 30, 20], k=1)[0]
            order_type = random.choices(ORDER_TYPES, weights=[40, 40, 20], k=1)[0]
            
            num_items = random.choices([1, 2, 3], weights=[50, 35, 15], k=1)[0]
            selected_categories = random.choices(list(MENU.keys()), weights=[25, 45, 15, 15], k=num_items)
            
            order_records = []
            for cat in selected_categories:
                items_in_cat = MENU[cat]
                item_name = random.choice(list(items_in_cat.keys()))
                unit_price = items_in_cat[item_name]
                qty = random.choices([1, 2], weights=[90, 10], k=1)[0]
                total_price = round(unit_price * qty, 2)
                
                cursor.execute("""
                    INSERT INTO sales (order_id, timestamp, item_name, category, quantity, unit_price, total_price, payment_method, order_type, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING')
                """, (order_id, timestamp_str, item_name, cat, qty, unit_price, total_price, payment_method, order_type))
                
                order_records.append({
                    "order_id": order_id,
                    "timestamp": now_dt.isoformat(),
                    "item_name": item_name,
                    "category": cat,
                    "quantity": qty,
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "payment_method": payment_method,
                    "order_type": order_type,
                    "status": 'PENDING'
                })
                
            conn.commit()
            cursor.close()
            conn.close()
            
            recent_simulated_orders.extend(order_records)
            recent_simulated_orders = recent_simulated_orders[-20:]
            
        except Exception as e:
            print(f"Error in simulator thread: {str(e)}")
            
    print("Simulator thread stopped.")

@app.route('/api/simulator/status', methods=['GET'])
def get_simulator_status():
    global simulator_running, recent_simulated_orders
    return jsonify({
        "running": simulator_running,
        "recent_orders": recent_simulated_orders
    })

@app.route('/api/simulator/toggle', methods=['POST'])
def toggle_simulator():
    global simulator_running, simulator_thread, recent_simulated_orders
    
    data = request.get_json() or {}
    enable = data.get('enable', False)
    
    if enable:
        if not simulator_running:
            simulator_running = True
            recent_simulated_orders = []
            simulator_thread = threading.Thread(target=simulator_worker, daemon=True)
            simulator_thread.start()
            return jsonify({"status": "started", "running": True})
        else:
            return jsonify({"status": "already running", "running": True})
    else:
        if simulator_running:
            simulator_running = False
            if simulator_thread:
                simulator_thread.join(timeout=1.0)
            return jsonify({"status": "stopped", "running": False})
        else:
            return jsonify({"status": "already stopped", "running": False})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
