const express = require('express');
const axios = require('axios');
const { createCanvas } = require('canvas');
const Chart = require('chart.js');

const app = express();
const port = 3000;

// تنظیمات برای گرفتن داده‌ها از API
const getDataFromAPI = async () => {
  const url = 'https://api.bitget.com/api/v2/spot/market/candles?symbol=BTCUSDT&granularity=1h&limit=100';
  try {
    const response = await axios.get(url);
    return response.data.data; // فرض می‌کنیم داده‌ها در response.data.data هستند
  } catch (error) {
    console.error('Error fetching data from API:', error);
    return [];
  }
};

// ساخت چارت شمعی و ارسال تصویر به کاربر
app.get('/chart', async (req, res) => {
  const data = await getDataFromAPI();

  if (data.length === 0) {
    return res.status(500).json({ error: 'خطا در دریافت داده‌ها' });
  }

  // داده‌ها برای چارت
  const labels = data.map(item => new Date(item[0]).toLocaleString()); // زمان
  const openData = data.map(item => item[1]); // قیمت افتتاحیه
  const highData = data.map(item => item[2]); // قیمت بیشترین
  const lowData = data.map(item => item[3]); // قیمت کمترین
  const closeData = data.map(item => item[4]); // قیمت بسته‌شده

  // ایجاد یک canvas برای چارت
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');

  // ساخت چارت با استفاده از Chart.js
  const chart = new Chart(ctx, {
    type: 'candlestick',
    data: {
      labels: labels,
      datasets: [{
        label: 'BTC/USDT',
        data: data.map((item, index) => ({
          t: new Date(item[0]),
          o: openData[index],
          h: highData[index],
          l: lowData[index],
          c: closeData[index]
        })),
        borderColor: '#4BC0C0',
        borderWidth: 1,
        backgroundColor: '#FFFFFF',
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'minute'
          }
        },
        y: {
          ticks: {
            beginAtZero: false
          }
        }
      }
    }
  });

  // ارسال تصویر چارت به کاربر
  res.set('Content-Type', 'image/png');
  canvas.toBuffer((err, buffer) => {
    if (err) {
      res.status(500).send('خطا در تولید تصویر');
    } else {
      res.send(buffer);
    }
  });
});

// شروع سرور
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
