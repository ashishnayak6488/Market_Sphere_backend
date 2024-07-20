const express = require("express");

const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncError = require("../middleware/catchAsyncError");
const { isSeller } = require("../middleware/auth");
const Shop = require("../model/shop");
const Product = require("../model/product");

const router = express.Router();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

router.post(
  "/process",
  catchAsyncError(async (req, res, next) => {
    const myPayment = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "inr",
      metadata: {
        company: "Ashish Nayak",
      },
    });
    res.status(200).json({
      success: true,
      client_secret: myPayment.client_secret,
    });
  })
);

router.get(
  "/stripeapikey",
  catchAsyncError(async (req, res, next) => {
    res.status(200).json({
      stripeApiKey: process.env.STRIPE_PUBLISHER_KEY,
    });
  })
);

module.exports = router;
