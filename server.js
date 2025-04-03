const express = require("express");
const axios = require("axios");
const { createCanvas } = require("canvas");
const moment = require("moment");

const app = express();
const PORT = 3000;

// دریافت داده‌های کندل از Binance
async function fetchCandlesData(symbol, timeframe) {
    const limit = 100;
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("❌ خطا در دریافت داده‌ها:", error);
        return null;
    }
}

// تابع رسم نمودار کندل‌استیک
function createCandlestickChart(candles, symbol, timeframe) {
    const width = 1280, height = 720; // رزولوشن بالا
    const paddingLeft = 120, paddingRight = 60, paddingTop = 80, paddingBottom = 160;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 🎨 رنگ‌ها
    const bgColor = "#191919", gridColor = "#2E2E2E", textColor = "#FFFFFF";
    const greenColor = "#0FFF0F", redColor = "#FF0000";

    // پس‌زمینه
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // خطوط شبکه
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const numGridLines = 10;
    for (let i = 0; i <= numGridLines; i++) {
        const y = paddingTop + (i * (chartHeight / numGridLines));
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
    }

    // محاسبه محدوده قیمت‌ها
    const maxPrice = Math.max(...candles.map(c => parseFloat(c[2])));
    const minPrice = Math.min(...candles.map(c => parseFloat(c[3])));
    const valueRange = maxPrice - minPrice;
    const decimalPlaces = maxPrice < 1 ? 6 : 2;

    // نمایش قیمت‌های محور Y
    ctx.fillStyle = textColor;
    ctx.font = "18px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= numGridLines; i++) {
        const price = maxPrice - (i * (valueRange / numGridLines));
        const y = paddingTop + (i * (chartHeight / numGridLines));
        ctx.fillText(price.toFixed(decimalPlaces), paddingLeft - 10, y);
    }

    // رسم کندل‌ها
    const barWidth = Math.max(chartWidth / candles.length - 2, 4);
    candles.forEach((candle, i) => {
        const [time, open, high, low, close] = candle.map(parseFloat);
        const x = paddingLeft + i * (chartWidth / candles.length);
        const yOpen = paddingTop + chartHeight - ((open - minPrice) / valueRange * chartHeight);
        const yClose = paddingTop + chartHeight - ((close - minPrice) / valueRange * chartHeight);
        const yHigh = paddingTop + chartHeight - ((high - minPrice) / valueRange * chartHeight);
        const yLow = paddingTop + chartHeight - ((low - minPrice) / valueRange * chartHeight);

        // خط سایه (Wick)
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + barWidth / 2, yHigh);
        ctx.lineTo(x + barWidth / 2, yLow);
        ctx.stroke();

        // بدنه کندل
        ctx.fillStyle = close >= open ? greenColor : redColor;
        ctx.fillRect(x, Math.min(yOpen, yClose), barWidth, Math.abs(yOpen - yClose));
    });

    // نمایش زمان روی محور X
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const timeSteps = Math.max(1, Math.floor(candles.length / 6));
    for (let i = 0; i < candles.length; i += timeSteps) {
        const time = moment(candles[i][0]).format("HH:mm");
        const x = paddingLeft + i * (chartWidth / candles.length) + barWidth / 2;
        ctx.fillText(time, x, height - paddingBottom + 20);
    }

    // عنوان نمودار
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`📊 Symbol: ${symbol} | Interval: ${timeframe}`, paddingLeft, 50);

    // 🔥 **نمایش قیمت لحظه‌ای در پایین نمودار**
    const lastClose = parseFloat(candles[candles.length - 1][4]); // آخرین قیمت بسته شدن
    const priceColor = lastClose >= parseFloat(candles[candles.length - 1][1]) ? greenColor : redColor;

    // پس‌زمینه‌ی قیمت لحظه‌ای
    ctx.fillStyle = "#222222";
    ctx.fillRect(width / 2 - 110, height - 100, 220, 70);

    // قیمت لحظه‌ای
    ctx.fillStyle = priceColor;
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText(lastClose.toFixed(decimalPlaces), width / 2, height - 55);

    // نمایش نام کاربری در پایین تصویر
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("@abj0o", width / 2, height - 20);

    return canvas.toBuffer("image/png");
}

// مسیر API برای دریافت نمودار
app.get("/chart", async (req, res) => {
    const symbol = req.query.symbol?.toUpperCase() || "BTCUSDT";
    const timeframe = req.query.timeframe || "1h";

    const candles = await fetchCandlesData(symbol, timeframe);
    if (!candles) return res.status(500).json({ error: "❌ خطا در دریافت داده‌ها" });

    const chartBuffer = createCandlestickChart(candles, symbol, timeframe);

    res.setHeader("Content-Type", "image/png");
    res.send(chartBuffer);
});

// اجرای سرور
app.listen(PORT, () => console.log(`🚀 سرور در حال اجرا: http://localhost:${PORT}`));
