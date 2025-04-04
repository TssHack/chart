const express = require("express");
const axios = require("axios");
const { createCanvas } = require("canvas");
const moment = require("moment");

const app = express();
const PORT = 3000;

app.use(express.json());

// دریافت داده‌های کندل از Binance
async function fetchCandlesData(symbol, timeframe, exchange) {
    const limit = 100;
    let url;

    switch (exchange.toLowerCase()) {
        case "binance":
            url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`;
            break;
        case "mexc":
            url = `https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`;
            break;
        case "bitget":
            url = `https://api.bitget.com/api/v2/market/candles?symbol=${symbol}&period=${timeframe}&limit=${limit}`;
            break;
        default:
            return null;
    }

    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("❌ خطا در دریافت داده‌ها:", error);
        return null;
    }
}

// تابع رسم نمودار کندل‌استیک
function createCandlestickChart(candles, symbol, timeframe, exchange, theme, lan) {
    const width = 1280, height = 720;
    const paddingLeft = 120, paddingRight = 60, paddingTop = 80, paddingBottom = 160;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 🎨 تنظیمات رنگ بر اساس تم انتخاب شده
    const themes = {
        dark: {
            bgColor: "#191919",
            gridColor: "#2E2E2E",
            textColor: "#FFFFFF",
            greenColor: "#0FFF0F",
            redColor: "#FF0000"
        },
        light: {
            bgColor: "#FFFFFF",
            gridColor: "#CCCCCC",
            textColor: "#000000",
            greenColor: "#00AA00",
            redColor: "#FF3333"
        }
    };
    
    const colors = themes[theme] || themes.dark;

    // پس‌زمینه
    ctx.fillStyle = colors.bgColor;
    ctx.fillRect(0, 0, width, height);

    // خطوط شبکه
    ctx.strokeStyle = colors.gridColor;
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
    ctx.fillStyle = colors.textColor;
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
        ctx.strokeStyle = colors.textColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + barWidth / 2, yHigh);
        ctx.lineTo(x + barWidth / 2, yLow);
        ctx.stroke();

        // بدنه کندل
        ctx.fillStyle = close >= open ? colors.greenColor : colors.redColor;
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
    const title = lan === "fa" ? `🧿 نماد: ${symbol} | تایم‌فریم: ${timeframe} | صرافی: ${exchange}` 
                               : `🧿 Symbol: ${symbol} | Timeframe: ${timeframe} | Exchange: ${exchange}`;
    ctx.fillText(title, paddingLeft, 50);

    // 🔥 **نمایش قیمت لحظه‌ای در پایین نمودار**
    const lastClose = parseFloat(candles[candles.length - 1][4]);
    const priceColor = lastClose >= parseFloat(candles[candles.length - 1][1]) ? greenColor : redColor;

    // پس‌زمینه‌ی قیمت لحظه‌ای
    // رسم بک‌گراند رنگی برای قیمت
    // رسم بک‌گراند رنگی برای قیمت
    ctx.fillStyle = "#222222";
    ctx.fillRect(width / 2 - 150, height - 100, 300, 80);

// قیمت لحظه‌ای + USDT
    ctx.fillStyle = priceColor;
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${lastClose.toFixed(decimalPlaces)} USDT`, width / 2, height - 70);
    

// نمایش نام کاربری در پایین تصویر (با فاصله مناسب)
    ctx.fillStyle = "#FFFFFF";  // رنگ سفید برای متن پایین
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center"; // تنظیم ترازبندی به مرکز
    ctx.fillStyle = textColor;
    ctx.font = "bold 18px Arial";
    ctx.fillText("developer:Ehsan Fazli | ID : @abj0o", width / 2, height - 25);
    return canvas.toBuffer("image/png");
}

// مسیر API برای دریافت نمودار
app.get("/chart", async (req, res) => {
    const symbol = req.query.symbol?.toUpperCase() || "BTCUSDT";
    const timeframe = req.query.timeframe || "1h";
    const exchange = req.query.exchange?.toLowerCase() || "binance";
    const theme = req.query.theme?.toLowerCase() || "dark";
    const lan = req.query.lan?.toLowerCase() || "en";

    // دریافت داده‌های کندل از صرافی انتخابی
    const candles = await fetchCandlesData(symbol, timeframe, exchange);
    
    if (!candles) {
        return res.status(500).json({
            error: lan === "fa" ? "❌ خطا در دریافت داده‌ها از صرافی" : "❌ Error fetching data from the exchange"
        });
    }

    // ایجاد تصویر نمودار
    const chartBuffer = createCandlestickChart(candles, symbol, timeframe, exchange, theme, lan);

    res.setHeader("Content-Type", "image/png");
    res.send(chartBuffer);
});

// مسیر API برای دریافت نمودار از طریق `POST`
app.post("/chart", async (req, res) => {
    const { symbol, timeframe, exchange = "binance", theme = "dark", lan = "en" } = req.body;
    
    // بررسی مقدار `symbol` و `timeframe`
    if (!symbol || !timeframe) {
        return res.status(400).json({
            error: lan === "fa" ? "❌ لطفاً `symbol` و `timeframe` را ارسال کنید." : "❌ Please provide `symbol` and `timeframe`."
        });
    }

    // دریافت داده‌های کندل از صرافی انتخابی
    const candles = await fetchCandlesData(symbol.toUpperCase(), timeframe, exchange);
    
    if (!candles) {
        return res.status(500).json({
            error: lan === "fa" ? "❌ خطا در دریافت داده‌ها از صرافی" : "❌ Error fetching data from the exchange"
        });
    }

    // ایجاد تصویر نمودار
    const chartBuffer = createCandlestickChart(candles, symbol.toUpperCase(), timeframe, exchange, theme, lan);

    res.setHeader("Content-Type", "image/png");
    res.send(chartBuffer);
});

// اجرای سرور
app.listen(PORT, () => console.log(`🚀 سرور در حال اجرا: http://localhost:${PORT}`));
