import json
import pandas as pd
import mplfinance as mpf

# خواندن داده‌ها از فایل JSON
with open("candlestick_data.json", "r") as f:
    data = json.load(f)

# تبدیل داده‌ها به DataFrame
df = pd.DataFrame(data)
df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s")
df.set_index("timestamp", inplace=True)

# تغییر نام ستون‌ها برای سازگاری با mplfinance
df.rename(columns={"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"}, inplace=True)

# رسم نمودار شمعی
mpf.plot(df, type="candle", volume=True, style="charles", savefig="candlestick_chart.png")

print("نمودار با موفقیت تولید شد!")
