require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// 压缩接口
app.post('/compress', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send('没有上传图片');
  const isPaidUser = req.headers['x-user-status'] === 'paid';
  const quality = isPaidUser ? 90 : 70;

  try {
    const compressedBuffer = await sharp(req.file.buffer)
      .resize({ width: 800 })
      .jpeg({ quality })
      .toBuffer();
    res.type('image/jpeg').send(compressedBuffer);
  } catch (err) {
    res.status(500).send('压缩失败');
  }
});

// 创建Stripe结账会话
app.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Image Optimizer Premium' },
        unit_amount: 1500 // $15
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${process.env.DOMAIN}/success.html`,
    cancel_url: `${process.env.DOMAIN}`
  });
  res.json({ id: session.id });
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
