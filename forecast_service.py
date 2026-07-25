from database import get_db_connection
import pymysql
from datetime import datetime, timedelta
import math
import random

def get_forecast():
    """
    Generates a 7-day sales forecast using a combination of linear trend
    and day-of-week seasonality, computed in pure Python from MySQL history.
    """
    conn = get_db_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    
    # Fetch daily sales totals (MySQL format)
    cursor.execute("""
        SELECT DATE_FORMAT(timestamp, '%Y-%m-%d') as sale_date, SUM(total_price) as daily_revenue
        FROM sales
        GROUP BY sale_date
        ORDER BY sale_date ASC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    if not rows:
        return []
        
    # Convert to list of dicts: {"date": str, "revenue": float}
    history = []
    for row in rows:
        history.append({
            "date": row["sale_date"],
            "revenue": float(row["daily_revenue"])
        })
        
    n = len(history)
    if n < 7:
        return generate_fallback_forecast(history)
        
    # Calculate Linear Trend (y = mx + b)
    sum_x = sum(i for i in range(n))
    sum_y = sum(h["revenue"] for h in history)
    sum_xx = sum(i*i for i in range(n))
    sum_xy = sum(i * history[i]["revenue"] for i in range(n))
    
    denominator = (n * sum_xx - sum_x * sum_x)
    if denominator == 0:
        slope = 0
        intercept = sum_y / n
    else:
        slope = (n * sum_xy - sum_x * sum_y) / denominator
        intercept = (sum_y - slope * sum_x) / n
        
    # Calculate Day-of-Week Seasonality
    weekday_totals = {i: 0.0 for i in range(7)}
    weekday_counts = {i: 0 for i in range(7)}
    
    for h in history:
        dt = datetime.strptime(h["date"], "%Y-%m-%d")
        wd = dt.weekday()
        weekday_totals[wd] += h["revenue"]
        weekday_counts[wd] += 1
        
    overall_avg = sum_y / n
    weekday_factors = {}
    for i in range(7):
        if weekday_counts[i] > 0 and overall_avg > 0:
            avg_for_day = weekday_totals[i] / weekday_counts[i]
            weekday_factors[i] = avg_for_day / overall_avg
        else:
            weekday_factors[i] = 1.0
            
    # Generate 7-day forecast
    forecast = []
    last_date_str = history[-1]["date"]
    last_date = datetime.strptime(last_date_str, "%Y-%m-%d")
    
    for step in range(1, 8):
        future_date = last_date + timedelta(days=step)
        future_day_idx = n + step - 1
        future_wd = future_date.weekday()
        
        trend_val = slope * future_day_idx + intercept
        trend_val = max(0.0, trend_val)
        
        seasonal_factor = weekday_factors.get(future_wd, 1.0)
        forecast_val = round(trend_val * seasonal_factor, 2)
        
        forecast.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "revenue": forecast_val,
            "day_of_week": future_date.strftime("%A"),
            "confidence_lower": round(forecast_val * 0.9, 2),
            "confidence_upper": round(forecast_val * 1.1, 2)
        })
        
    return forecast

def generate_fallback_forecast(history):
    last_date_str = history[-1]["date"] if history else datetime.now().strftime("%Y-%m-%d")
    last_date = datetime.strptime(last_date_str, "%Y-%m-%d")
    avg_rev = sum(h["revenue"] for h in history) / len(history) if history else 150.0
    
    forecast = []
    for step in range(1, 8):
        future_date = last_date + timedelta(days=step)
        forecast.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "revenue": round(avg_rev * (1.0 + random.uniform(-0.1, 0.1)), 2),
            "day_of_week": future_date.strftime("%A"),
            "confidence_lower": round(avg_rev * 0.8, 2),
            "confidence_upper": round(avg_rev * 1.2, 2)
        })
    return forecast
