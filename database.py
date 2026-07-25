import pymysql

import random
from datetime import datetime, timedelta
from config import MYSQL_CONFIG

# Menu configuration: category -> {item_name: unit_price}
MENU = {
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
}

PAYMENT_METHODS = ["Card", "Cash", "Mobile"]
ORDER_TYPES = ["Dine-in", "Takeaway", "Delivery"]

def get_db_connection():
    """Returns a connection to the MySQL database."""
    create_database_if_not_exists()
    conn = pymysql.connect(**MYSQL_CONFIG)
    return conn

def create_database_if_not_exists():
    """Connects to MySQL server without database specification to create DB if missing."""
    config_without_db = MYSQL_CONFIG.copy()
    db_name = config_without_db.pop('database', 'bistro_analytics')
    
    try:
        conn = pymysql.connect(**config_without_db)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        conn.commit()
        cursor.close()
        conn.close()
    except pymysql.MySQLError as err:
        print(f"Failed connecting to MySQL Server: {err}")
        raise err

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create sales table with MySQL indexing syntax and status column
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sales (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id VARCHAR(50) NOT NULL,
            timestamp DATETIME NOT NULL,
            item_name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            quantity INT NOT NULL,
            unit_price DECIMAL(10, 2) NOT NULL,
            total_price DECIMAL(10, 2) NOT NULL,
            payment_method VARCHAR(20) NOT NULL,
            order_type VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            INDEX idx_sales_timestamp (timestamp),
            INDEX idx_sales_category (category),
            INDEX idx_sales_payment (payment_method),
            INDEX idx_sales_status (status)
        )
    """)
    
    conn.commit()
    
    # Check if 'status' column exists in 'sales' table, if table exists (auto-migration)
    try:
        cursor.execute("SHOW COLUMNS FROM sales LIKE 'status'")
        result = cursor.fetchone()
        if not result:
            print("Adding 'status' column to sales table...")
            cursor.execute("ALTER TABLE sales ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING'")
            cursor.execute("ALTER TABLE sales ADD INDEX idx_sales_status (status)")
            # Set all existing completed orders to status 'COMPLETED'
            cursor.execute("UPDATE sales SET status = 'COMPLETED'")
            conn.commit()
            print("'status' column added and initialized successfully.")
    except pymysql.MySQLError as err:
        print(f"Migration check ignored or failed: {err}")
        pass

    
    # Check if table is empty
    cursor.execute("SELECT COUNT(*) FROM sales")
    count = cursor.fetchone()[0]
    
    if count == 0:
        print("Database empty. Seeding mock sales data into MySQL...")
        seed_data(conn)
        print("MySQL Database seeded successfully!")
        
    cursor.close()
    conn.close()

def seed_data(conn):
    cursor = conn.cursor()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    total_orders = 1100
    
    current_time = start_date
    time_delta_per_order = timedelta(days=365) / total_orders
    
    records = []
    order_num = 10001
    
    for _ in range(total_orders):
        order_hour = random.choices(
            population=list(range(24)),
            weights=[
                0.5, 0.2, 0.1, 0.1, 0.1, 0.3, 
                1.0, 2.5, 3.5, 2.5, 3.0, 5.0, 
                9.5, 8.5, 4.5, 4.0, 5.0, 8.5, 
                11.0, 10.0, 8.0, 4.5, 2.0, 1.0 
            ],
            k=1
        )[0]
        
        current_time = current_time + time_delta_per_order
        order_time = current_time.replace(
            hour=order_hour,
            minute=random.randint(0, 59),
            second=random.randint(0, 59),
            microsecond=0
        )
        
        is_weekend = order_time.weekday() in [4, 5, 6]
        
        order_id = f"ORD-{order_num}"
        order_num += 1
        
        payment_method = random.choices(PAYMENT_METHODS, weights=[60, 25, 15], k=1)[0]
        order_type = random.choices(ORDER_TYPES, weights=[45, 35, 20], k=1)[0]
        
        num_items = random.choices([1, 2, 3, 4], weights=[40, 35, 18, 7], k=1)[0]
        
        if is_weekend:
            num_items = random.choices([1, 2, 3, 4, 5], weights=[20, 35, 25, 15, 5], k=1)[0]
            
        selected_categories = random.choices(list(MENU.keys()), weights=[25, 45, 15, 15], k=num_items)
        
        for cat in selected_categories:
            items_in_cat = MENU[cat]
            item_name = random.choice(list(items_in_cat.keys()))
            unit_price = items_in_cat[item_name]
            
            qty = random.choices([1, 2, 3], weights=[85, 12, 3], k=1)[0]
            
            if cat == "Beverages" and qty == 1:
                qty = random.choices([1, 2, 4], weights=[70, 25, 5], k=1)[0]
                
            total_price = round(unit_price * qty, 2)
            
            records.append((
                order_id,
                order_time.strftime('%Y-%m-%d %H:%M:%S'),
                item_name,
                cat,
                qty,
                unit_price,
                total_price,
                payment_method,
                order_type,
                'COMPLETED' # seeded data is marked as finished/completed
            ))
            
    cursor.executemany("""
        INSERT INTO sales (
            order_id, timestamp, item_name, category, quantity, unit_price, total_price, payment_method, order_type, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, records)
    
    conn.commit()
    cursor.close()

if __name__ == "__main__":
    init_db()
