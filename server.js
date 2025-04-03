const express = require("express");
const axios = require("axios");
const { createCanvas } = require("canvas");
const moment = require("moment");

const app = express();
const PORT = 3000;

// تابع دریافت داده‌های کندل استیک از Binance
async function fetchCandlesData(symbol, timeframe) {
    const limit = 120;
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}

// تابع ساخت نمودار کندل استیک
function createCandlestickChart(candles, symbol, timeframe) {
    const width = 1000, height = 600;
    const paddingLeft = 90, paddingRight = 40, paddingTop = 50, paddingBottom = 120;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // رنگ‌ها
    const bgColor = "#191919";
    const borderColor = "#555";
    const gridColor = "#323232";
    const greenColor = "#0FFF0F";
    const redColor = "#FF0000";
    const textColor = "#FFFFFF";

    // پس‌زمینه
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = borderColor;
    ctx.strokeRect(paddingLeft - 10, paddingTop - 10, chartWidth + 20, chartHeight + 20);

    // خطوط شبکه
    const numGridLines = 10;
    for (let i = 0; i <= numGridLines; i++) {
        const y = paddingTop + (i * (chartHeight / numGridLines));
        ctx.strokeStyle = gridColor;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
    }

    // محاسبه ماکسیمم و مینیمم قیمت
    const maxPrice = Math.max(...candles.map(c => parseFloat(c[2])));
    const minPrice = Math.min(...candles.map(c => parseFloat(c[3])));
    const valueRange = maxPrice - minPrice;
    const decimalPlaces = maxPrice < 1 ? 6 : 2;

    // قیمت‌ها در کنار نمودار
    ctx.fillStyle = textColor;
    ctx.font = "14px Arial";
    for (let i = 0; i <= numGridLines; i++) {
        const price = maxPrice - (i * (valueRange / numGridLines));
        const y = paddingTop + (i * (chartHeight / numGridLines));
        ctx.fillText(price.toFixed(decimalPlaces), paddingLeft - 80, y + 5);
    }

    // رسم کندل‌ها
    const barWidth = chartWidth / candles.length;
    candles.forEach((candle, i) => {
        const [time, open, high, low, close] = candle.map(parseFloat);
        const x = paddingLeft + i * barWidth;
        const yOpen = paddingTop + chartHeight - ((open - minPrice) / valueRange * chartHeight);
        const yClose = paddingTop + chartHeight - ((close - minPrice) / valueRange * chartHeight);
        const yHigh = paddingTop + chartHeight - ((high - minPrice) / valueRange * chartHeight);
        const yLow = paddingTop + chartHeight - ((low - minPrice) / valueRange * chartHeight);

        ctx.strokeStyle = textColor;
        ctx.beginPath();
        ctx.moveTo(x + barWidth / 2, yHigh);
        ctx.lineTo(x + barWidth / 2, yLow);
        ctx.stroke();

        ctx.fillStyle = close >= open ? greenColor : redColor;
        ctx.fillRect(x + 2, Math.min(yOpen, yClose), barWidth - 4, Math.abs(yOpen - yClose));
    });

    // نمایش زمان در پایین نمودار
    const timeInterval = 10;
    ctx.font = "12px Arial";
    for (let i = 0; i < candles.length; i += timeInterval) {
        const time = moment(candles[i][0]).format("HH:mm");
        const x = paddingLeft + i * barWidth + barWidth / 4;
        ctx.fillText(time, x, height - paddingBottom + 20);
    }

    // نمایش عنوان نمودار
    ctx.font = "18px Arial";
    ctx.fillText(`Symbol: ${symbol} | Interval: ${timeframe}`, paddingLeft, 30);

    // نمایش نام کاربری در پایین تصویر
    ctx.font = "bold 16px Arial";
    ctx.fillText("@abj0o", width / 2 - 40, height - 20);

    return canvas.toBuffer("image/png");
}

// مسیر API برای نمایش مستقیم تصویر نمودار
app.get("/chart", async (req, res) => {
    const symbol = req.query.symbol?.toUpperCase() || "BTCUSDT";
    const timeframe = req.query.timeframe || "1h";

    const candles = await fetchCandlesData(symbol, timeframe);
    if (!candles) return res.status(500).json({ error: "Failed to fetch data" });

    const chartBuffer = createCandlestickChart(candles, symbol, timeframe);

    res.setHeader("Content-Type", "image/png");
    res.send(chartBuffer);
});

// اجرای سرور
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
