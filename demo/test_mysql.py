import mysql.connector
from config import MYSQL_CONFIG

def test_connection():
    print("=========================================")
    print("Testing MySQL Connection settings...")
    print("=========================================")
    
    # Try connecting without specifying DB first (to see if password/host are correct)
    config_test = MYSQL_CONFIG.copy()
    db_name = config_test.pop('database', 'bistro_analytics')
    
    print(f"Connecting to host={config_test.get('host')}, port={config_test.get('port')}, user={config_test.get('user')}...")
    
    try:
        conn = mysql.connector.connect(**config_test)
        print("[SUCCESS] Connected to MySQL Server!")
        
        cursor = conn.cursor()
        print(f"Creating database '{db_name}' if not exists...")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        conn.commit()
        print(f"[SUCCESS] Database '{db_name}' verified/created.")
        
        # Now try full connection
        print("Reconnecting to verify database access...")
        conn_full = mysql.connector.connect(**MYSQL_CONFIG)
        print("[SUCCESS] Fully connected to the database!")
        
        cursor_full = conn_full.cursor()
        # Check tables
        cursor_full.execute("SHOW TABLES")
        tables = cursor_full.fetchall()
        print("Tables present:")
        if not tables:
            print("  (None. Please run 'python database.py' to create and seed the tables)")
        for t in tables:
            print(f"  - {t[0]}")
            
        cursor_full.close()
        conn_full.close()
        cursor.close()
        conn.close()
        print("\nAll connections tests passed!")
        print("Please refresh your MySQL Workbench schema list.")
        
    except mysql.connector.Error as err:
        print("\n[ERROR] Connection failed!")
        print(f"Details: {err}")
        print("\nPlease check your credentials in config.py.")
    print("=========================================")

if __name__ == "__main__":
    test_connection()
