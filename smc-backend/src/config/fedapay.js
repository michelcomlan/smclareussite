const axios = require('axios');

const FEDAPAY_BASE_URL =
  process.env.FEDAPAY_ENV === 'live'
    ? 'https://api.fedapay.com/v1'
    : 'https://sandbox-api.fedapay.com/v1';

const fedapayClient = axios.create({
  baseURL: FEDAPAY_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

module.exports = { fedapayClient, FEDAPAY_BASE_URL };
