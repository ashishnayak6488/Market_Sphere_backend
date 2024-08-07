const express = require("express");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const Event = require("../model/event");
const ErrorHandler = require("../utils/ErrorHandler");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const catchAsyncError = require("../middleware/catchAsyncError");
const router = express.Router();

//create new order

router.post(
  "/create-order",
  catchAsyncError(async (req, res, next) => {
    try {
      const { cart, shippingAddress, user, totalPrice, paymentInfo } = req.body;

      //group cart item by shop id

      const shopItemsMap = new Map();

      for (const item of cart) {
        const shopId = item.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push(item);
      }

      //create an order for each shop

      const orders = [];

      for (const [shopId, items] of shopItemsMap) {
        const order = await Order.create({
          cart: items,
          shippingAddress,
          user,
          totalPrice,
          paymentInfo,
        });
        orders.push(order);
      }

      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//get order of a user

router.get(
  "/get-all-orders/:userId",
  catchAsyncError(async (req, res, next) => {
    try {
      const orders = await Order.find({ "user._id": req.params.userId }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//get order of a shop

router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncError(async (req, res, next) => {
    try {
      const orders = await Order.find({
        "cart.shopId": req.params.shopId,
      }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update order status for seller

router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }
      if (req.body.status === "Transferred to delivery partner") {
        for (const item of order.cart) {
          try {
            await updateOrder(item._id, item.qty);
          } catch (error) {
            return next(
              new ErrorHandler(`Error updating product: ${error.message}`, 500)
            );
          }
        }
      }

      order.status = req.body.status;

      if (req.body.status === "Delivered") {
        order.deliveredAt = Date.now();
        order.paymentInfo.status = "Succeeded";

        const serviceCharge = order.totalPrice * 0.1;
        await updateSellerInfo(order.totalPrice - serviceCharge);
      }

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
      });

      async function updateOrder(id, qty) {
        let item = await Product.findById(id);
        let modelType = "Product";

        if (!item) {
          item = await Event.findById(id);
          modelType = "Event";
        }

        if (!item) {
          throw new Error(
            `Item with id ${id} not found in either Product or Event models`
          );
        }

        // if (modelType === "Product") {
        //   item.stock -= qty;
        //   item.sold_out += qty;
        // } else if (modelType === "Event") {
        //   item.stock -= qty;
        //   item.sold_out += qty;
        // }

        item.stock -= qty;

        item.sold_out += qty;

        await item.save({ validateBeforeSave: false });
      }

      async function updateSellerInfo(amount) {
        const seller = await Shop.findById(req.seller.id);
        seller.availableBalance = amount;

        await seller.save();
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Give a refund (user)

router.put(
  "/order-refund/:id",

  catchAsyncError(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      order.status = req.body.status;

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
        message: "Order refund request successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Accept the refund (seller)

router.put(
  "/order-refund-success/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      order.status = req.body.status;

      await order.save();

      res.status(200).json({
        success: true,
        order,
        message: "Order refund successfully!",
      });

      if (req.body.status === "Refund Success") {
        for (const item of order.cart) {
          try {
            await updateOrder(item._id, item.qty);
          } catch (error) {
            return next(
              new ErrorHandler(`Error updating product: ${error.message}`, 500)
            );
          }
        }
      }

      async function updateOrder(id, qty) {
        let item = await Product.findById(id);
        let modelType = "Product";

        if (!item) {
          item = await Event.findById(id);
          modelType = "Event";
        }

        if (!item) {
          throw new Error(
            `Item with id ${id} not found in either Product or Event models`
          );
        }

        // if (modelType === "Product") {
        //   item.stock -= qty;
        //   item.sold_out += qty;
        // } else if (modelType === "Event") {
        //   item.stock -= qty;
        //   item.sold_out += qty;
        // }

        item.stock += qty;

        item.sold_out -= qty;

        await item.save({ validateBeforeSave: false });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//get order----------- Admin

router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const orders = await Order.find().sort({
        deliveredAt: -1,
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
