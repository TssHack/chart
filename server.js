const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;

app.use(cors());

// دریافت نمودار شمعی
app.get("/candlestick", async (req, res) => {
  const symbol = req.query.symbol || "BTCUSDT";
  const timeframe = req.query.timeframe || "1h";

  try {
    const response = await axios.get(
      `https://api.getbit.com/v1/candlestick?symbol=${symbol}&timeframe=${timeframe}`
    );

    const data = response.data;
    if (!data || data.length === 0) {
      return res.status(500).json({ error: "داده‌ای برای نمایش موجود نیست." });
    }

    // ذخیره داده‌ها در فایل JSON برای پردازش در پایتون
    const fs = require("fs");
    fs.writeFileSync("candlestick_data.json", JSON.stringify(data));

    // اجرای اسکریپت پایتون برای رسم نمودار
    exec("python3 generate_chart.py", (error) => {
      if (error) {
        console.error("خطا در تولید نمودار:", error);
        return res.status(500).json({ error: "خطا در تولید نمودار." });
      }
      
      // ارسال تصویر چارت به کاربر
      res.sendFile(__dirname + "/candlestick_chart.png");
    });
  } catch (error) {
    console.error("خطا در دریافت داده‌ها:", error);
    res.status(500).json({ error: "خطا در دریافت داده‌ها." });
  }
});

// راه‌اندازی سرور
app.listen(PORT, () => {
  console.log(`سرور روی پورت ${PORT} اجرا شد.`);
});
