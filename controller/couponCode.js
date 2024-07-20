// const express = require("express");

// const router = express.Router();
// const Shop = require("../model/shop");
// const { isSeller } = require("../middleware/auth");
// const catchAsyncError = require("../middleware/catchAsyncError");
// const ErrorHandler = require("../utils/ErrorHandler");
// const CouponCode = require("../model/couponCode");

// // create product

// router.post(
//   "/create-coupon-code",
//   isSeller,
//   catchAsyncError(async (req, res, next) => {
//     try {
//       const iscouponCode = await CouponCode.find({ name: req.body.name });

//       if (iscouponCode.length !== 0) {
//         return next(new ErrorHandler("Coupon code already Exists", 400));
//       } else {
//         const couponCode = await CouponCode.create(req.body);

//         res.status(201).json({
//           success: true,
//           couponCode,
//         });
//       }
//     } catch (error) {
//       return next(new ErrorHandler(error, 400));
//     }
//   })
// );

// // get all products of a shop

// router.get(
//   "/get-coupon/:id",
//   isSeller,
//   catchAsyncError(async (req, res, next) => {
//     try {
//       const couponCodes = await CouponCode.find({
//         shopId: req.seller.id,
//       });

//       res.status(201).json({
//         success: true,
//         couponCodes,
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error, 400));
//     }
//   })
// );

// // delete product of a shop

// router.delete(
//   "/delete-coupon/:id",
//   isSeller,
//   catchAsyncError(async (req, res, next) => {
//     try {
//       const couponId = req.params.id;

//       const couponCode = await CouponCode.findByIdAndDelete(couponId);

//       if (!couponCode) {
//         return next(new ErrorHandler("Coupon Not found with this id", 400));
//       }

//       res.status(201).json({
//         success: true,
//         message: "Coupon Deleted Successfully",
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error, 400));
//     }
//   })
// );

// // get coupon code value by its name
// router.get(
//   "/get-coupon-value/:name",
//   catchAsyncError(async (req, res, next) => {
//     try {
//       const couponCode = await CouponCode.findOne({ name: req.params.name });

//       res.status(200).json({
//         success: true,
//         couponCode,
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error, 400));
//     }
//   })
// );

// module.exports = router;

const express = require("express");
const router = express.Router();
const Shop = require("../model/shop");
const { isSeller } = require("../middleware/auth");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const CouponCode = require("../model/couponCode");

// create coupon code
router.post(
  "/create-coupon-code",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const existingCoupon = await CouponCode.find({ name: req.body.name });

      if (existingCoupon.length !== 0) {
        return next(new ErrorHandler("Coupon code already exists", 400));
      }

      const couponCode = await CouponCode.create(req.body);

      res.status(201).json({
        success: true,
        couponCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all coupons of a shop
router.get(
  "/get-coupon/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const couponCodes = await CouponCode.find({ shopId: req.seller.id });

      res.status(200).json({
        success: true,
        couponCodes,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete coupon of a shop
router.delete(
  "/delete-coupon/:id",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const couponCode = await CouponCode.findByIdAndDelete(req.params.id);

      if (!couponCode) {
        return next(new ErrorHandler("Coupon not found", 400));
      }

      res.status(201).json({
        success: true,
        message: "Coupon deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// // get coupon code value by its name
// router.get(
//   "/get-coupon-value/:name",
//   catchAsyncError(async (req, res, next) => {
//     try {
//       const couponCode = await CouponCode.findOne({ name: req.params.name });

//       if (!couponCode) {
//         return next(new ErrorHandler("Coupon not found", 404));
//       }

//       // Check if the coupon is expired or has reached its usage limit
//       if (couponCode.expirationDate && new Date() > couponCode.expirationDate) {
//         return next(new ErrorHandler("Coupon has expired", 400));
//       }

//       if (
//         couponCode.usageLimit &&
//         couponCode.usedCount >= couponCode.usageLimit
//       ) {
//         return next(new ErrorHandler("Coupon usage limit reached", 400));
//       }

//       res.status(200).json({
//         success: true,
//         couponCode,
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error, 400));
//     }
//   })
// );

// get coupon code value by its name
// get coupon code value by its name
router.get(
  "/get-coupon-value/:name",
  catchAsyncError(async (req, res, next) => {
    try {
      const couponCode = await CouponCode.findOne({ name: req.params.name });

      res.status(200).json({
        success: true,
        couponCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

module.exports = router;
