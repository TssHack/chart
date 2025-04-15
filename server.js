const express = require("express");
const axios = require("axios");
const moment = require("moment");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { Chart, registerables } = require('chart.js');
const { CandlestickController, CandlestickElement } = require('chartjs-chart-financial'); // فقط کندل استیک کافیست معمولا
require('chartjs-adapter-moment');

// Register necessary components
Chart.register(...registerables, CandlestickController, CandlestickElement);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- تنظیمات ترجمه (بدون تغییر) ---
const translations = {
    en: {
        title: "Symbol: {{symbol}} | Timeframe: {{timeframe}}",
        fetchError: "❌ Error fetching data from MEXC",
        paramError: "❌ Please provide 'symbol' and 'timeframe'",
        currentPrice: "Current Price",
        developerInfo: "Developer: Ehsan Fazli | ID: @abj0o",
        priceAxisLabel: "Price (USDT)",
        timeAxisLabel: "Time"
    },
    fa: {
        title: "نماد: {{symbol}} | تایم‌فریم: {{timeframe}}",
        fetchError: "❌ خطا در دریافت داده‌ها از MEXC",
        paramError: "❌ لطفاً 'symbol' و 'timeframe' را ارسال کنید",
        currentPrice: "قیمت لحظه‌ای",
        developerInfo: "توسعه‌دهنده: احسان فضلی | آی‌دی: @abj0o",
        priceAxisLabel: "قیمت (USDT)",
        timeAxisLabel: "زمان"
    }
};

function getText(lang, key, replacements = {}) {
    const language = translations[lang] ? lang : 'en';
    let text = translations[language][key] || key;
    for (const placeholder in replacements) {
        text = text.replace(`{{${placeholder}}}`, replacements[placeholder]);
    }
    return text;
}

// --- تعریف تم‌ها ---
const themes = {
    dark: {
        bgColor: '#131722',      // پس‌زمینه تیره (مانند TradingView)
        textColor: '#D1D4DC',    // متن خاکستری روشن
        gridColor: 'rgba(54, 60, 78, 0.6)', // خطوط شبکه کم‌رنگ‌تر
        axisBorderColor: '#404040', // خطوط اصلی محور کمی نمایان
        greenColor: '#26a69a',    // سبز TradingView
        redColor: '#ef5350',      // قرمز TradingView
        subtitleColor: '#777777', // رنگ زیرنویس کم‌رنگ
        wickBorderColor: '#B0B0B0' // رنگ فتیله (Wick)
    },
    light: {
        bgColor: '#FFFFFF',      // پس‌زمینه سفید
        textColor: '#333333',    // متن خاکستری تیره
        gridColor: 'rgba(224, 224, 224, 0.7)', // خطوط شبکه روشن
        axisBorderColor: '#C0C0C0', // خطوط اصلی محور
        greenColor: '#1E8449',    // سبز تیره‌تر برای کنتراست بهتر روی سفید
        redColor: '#C0392B',      // قرمز تیره‌تر برای کنتراست بهتر روی سفید
        subtitleColor: '#555555', // رنگ زیرنویس
        wickBorderColor: '#666666' // رنگ فتیله تیره‌تر
    }
};

// --- دریافت داده‌های کندل از MEXC (بدون تغییر) ---
async function fetchCandlesDataFromMEXC(symbol, interval) {
    const limit = 100;
    const url = `https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    try {
        // console.log(`Workspaceing data from: ${url}`);
        const response = await axios.get(url);
        if (response.data && Array.isArray(response.data)) {
            response.data.sort((a, b) => a[0] - b[0]);
            return response.data;
        } else {
            console.error("❌ Invalid data format received from MEXC:", response.data);
            return null;
        }
    } catch (error) {
        console.error("❌ Error fetching data from MEXC:", error.response ? error.response.data : error.message);
        return null;
    }
}

// --- تابع رسم نمودار با Chart.js (با تم و گرافیک بهبودیافته) ---
async function createCandlestickChartWithChartJS(candles, symbol, timeframe, lang = 'en', theme = 'dark') {
    const selectedTheme = themes[theme] || themes.dark; // انتخاب تم، پیش‌فرض تیره

    const width = 1280;
    const height = 720;

    const financialData = candles.map(c => ({
        x: c[0],
        o: parseFloat(c[1]),
        h: parseFloat(c[2]),
        l: parseFloat(c[3]),
        c: parseFloat(c[4])
    }));

    const lastCandle = financialData[financialData.length - 1];
    const lastClose = lastCandle.c;
    const isLastCandleGreen = lastClose >= lastCandle.o;

    const prices = financialData.flatMap(d => [d.h, d.l]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    let decimalPlaces = 2;
    if (maxPrice < 0.01) decimalPlaces = 6;
    else if (maxPrice < 1) decimalPlaces = 4;

    const chartJSNodeCanvas = new ChartJSNodeCanvas({
        width,
        height,
        backgroundColour: selectedTheme.bgColor // تنظیم رنگ پس‌زمینه بر اساس تم
    });

    const configuration = {
        type: 'candlestick',
        data: {
            datasets: [{
                label: `${symbol} ${timeframe}`,
                data: financialData,
                borderColor: selectedTheme.wickBorderColor, // رنگ فتیله
                borderWidth: 1.5, // ضخامت فتیله کمی بیشتر
                // رنگ کندل‌ها بر اساس تم
                color: {
                    up: selectedTheme.greenColor,
                    down: selectedTheme.redColor,
                    unchanged: selectedTheme.textColor,
                },
                // افزودن حاشیه نازک به بدنه کندل‌ها (با همان رنگ فتیله برای سادگی)
                 borderSkipped: false, // Important for body border appearance
                 // Optional: Slightly different border for body?
                 // bodyBorderColor: selectedTheme.textColor, // Example
            }]
        },
        options: {
            responsive: false,
            animation: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    // متن عنوان اصلی با رنگ متن تم
                    text: [
                         getText(lang, 'title', { symbol, timeframe }),
                         `${getText(lang, 'currentPrice')}: ${lastClose.toFixed(decimalPlaces)} USDT`
                         ],
                    padding: { top: 15, bottom: 25 },
                    color: selectedTheme.textColor, // رنگ متن اصلی عنوان از تم
                    font: { size: 26, weight: 'bold', family: 'Arial, sans-serif' } // فونت بزرگتر و خواناتر
                },
                subtitle: {
                    display: true,
                    text: getText(lang, 'developerInfo'),
                    position: 'bottom',
                    align: 'center',
                    color: selectedTheme.subtitleColor, // رنگ زیرنویس از تم
                    font: { size: 14, family: 'Arial, sans-serif' },
                    padding: { top: 25, bottom: 10 }
                },
                tooltip: { enabled: false }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: calculateTimeUnit(timeframe, candles.length),
                        tooltipFormat: 'll HH:mm',
                        displayFormats: {
                             minute: 'HH:mm', hour: 'HH:mm', day: 'MMM D', month: 'MMM YYYY' // فرمت‌های ساده‌تر
                        }
                    },
                    grid: {
                        color: selectedTheme.gridColor,       // رنگ شبکه از تم
                        borderColor: selectedTheme.axisBorderColor, // رنگ خط اصلی محور از تم
                        borderWidth: 1,
                        drawBorder: true,                    // نمایش خط اصلی محور
                        tickLength: 10, // طول خطوط کوچک راهنما روی محور
                         tickColor: selectedTheme.gridColor // رنگ خطوط راهنما
                    },
                    ticks: {
                        color: selectedTheme.textColor,      // رنگ متن محور از تم
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10,
                        font: { size: 13 } // فونت کمی بزرگتر برای محور
                    },
                },
                y: {
                    position: 'right', // نمایش محور قیمت در سمت راست (مرسوم‌تر در نمودارهای مالی)
                    grid: {
                        color: selectedTheme.gridColor,       // رنگ شبکه از تم
                        borderColor: selectedTheme.axisBorderColor, // رنگ خط اصلی محور از تم
                        borderWidth: 1,
                        drawBorder: true,                    // نمایش خط اصلی محور
                        tickLength: 10,
                         tickColor: selectedTheme.gridColor
                    },
                    ticks: {
                        color: selectedTheme.textColor,      // رنگ متن محور از تم
                        callback: function(value) { return value.toFixed(decimalPlaces); },
                        font: { size: 13 }, // فونت کمی بزرگتر برای محور
                        // افزودن padding به برچسب‌های محور Y برای فاصله از لبه
                        padding: 10
                    },
                    title: {
                        display: true,
                        text: getText(lang, 'priceAxisLabel'),
                        color: selectedTheme.textColor,      // رنگ عنوان محور از تم
                        font: { size: 14, family: 'Arial, sans-serif' },
                        padding: { top: 0, bottom: 5 }
                    }
                }
            },
            layout: {
                // تنظیم دقیق‌تر padding
                padding: {
                    top: 20,     // فضای بیشتر برای عنوان
                    right: 80,    // فضای کافی برای محور Y در سمت راست
                    bottom: 5,
                    left: 50     // فضای کمتر لازم در سمت چپ چون محور Y به راست منتقل شد
                }
            }
        }
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
}

// --- Helper Function to Determine Time Unit (بدون تغییر) ---
function calculateTimeUnit(timeframe, dataLength) {
    // ... (همان کد قبلی) ...
     if (timeframe.includes('m')) { // Minutes
        if (dataLength > 60*2) return 'hour'; // If many minutes, show hours
        return 'minute';
    } else if (timeframe.includes('h')) { // Hours
         if (dataLength > 24 * 3) return 'day'; // If many hours show days
        return 'hour';
    } else if (timeframe.includes('d')) { // Days
        if (dataLength > 30 * 3) return 'month'; // If many days show months
        return 'day';
    } else if (timeframe.includes('w')) { // Weeks
         return 'week';
    } else if (timeframe.includes('M')) { // Months (MEXC might use M)
        return 'month';
    }
    return 'day'; // Default
}


// --- مسیر API (GET) با پارامتر theme ---
app.get("/chart", async (req, res) => {
    const symbol = req.query.symbol?.toUpperCase();
    const timeframe = req.query.timeframe;
    const lang = req.query.lang || 'en';
    const theme = req.query.theme === 'light' ? 'light' : 'dark'; // دریافت تم، پیش‌فرض تیره

    if (!symbol || !timeframe) {
        return res.status(400).json({ error: getText(lang, 'paramError') });
    }
    const mexcSymbol = symbol.replace('/', '');
    const candles = await fetchCandlesDataFromMEXC(mexcSymbol, timeframe);
    if (!candles || candles.length === 0) {
        return res.status(500).json({ error: getText(lang, 'fetchError') });
    }

    try {
        const chartBuffer = await createCandlestickChartWithChartJS(candles, mexcSymbol, timeframe, lang, theme);
        res.setHeader("Content-Type", "image/png");
        res.send(chartBuffer);
    } catch (chartError) {
         console.error("❌ Error generating chart:", chartError);
         res.status(500).json({ error: `❌ Error generating chart: ${chartError.message}` });
    }
});

// --- مسیر API (POST) با پارامتر theme ---
app.post("/chart", async (req, res) => {
    // دریافت تم از بدنه درخواست، پیش‌فرض تیره
    const { symbol, timeframe, lang = 'en', theme = 'dark' } = req.body;
    const selectedTheme = theme === 'light' ? 'light' : 'dark'; // اطمینان از مقدار معتبر

    if (!symbol || !timeframe) {
        return res.status(400).json({ error: getText(lang, 'paramError') });
    }
    const mexcSymbol = symbol.toUpperCase().replace('/', '');
    const candles = await fetchCandlesDataFromMEXC(mexcSymbol, timeframe);
    if (!candles || candles.length === 0) {
        return res.status(500).json({ error: getText(lang, 'fetchError') });
    }

     try {
        const chartBuffer = await createCandlestickChartWithChartJS(candles, mexcSymbol, timeframe, lang, selectedTheme);
        res.setHeader("Content-Type", "image/png");
        res.send(chartBuffer);
    } catch (chartError) {
         console.error("❌ Error generating chart:", chartError);
         res.status(500).json({ error: `❌ Error generating chart: ${chartError.message}` });
    }
});

// --- اجرای سرور (بدون تغییر) ---
app.listen(PORT, () => console.log(`🚀 سرور در حال اجرا روی پورت: ${PORT}`));
