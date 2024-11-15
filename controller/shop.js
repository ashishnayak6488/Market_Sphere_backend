const express = require("express");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const Shop = require("../model/shop");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const cloudinary = require("cloudinary");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const sendShopToken = require("../utils/shopToken");

// // create Shop

// router.post(
//   "/create-shop",
//   catchAsyncError(async (req, res, next) => {
//     try {
//       const { email } = req.body;
//       const sellerEmail = await Shop.findOne({ email });

//       if (sellerEmail) {
//         return next(new ErrorHandler("User already exists", 400));
//       }

//       const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
//         folder: "avatars",
//       });

//       const seller = {
//         name: req.body.name,
//         email: email,
//         password: req.body.password,
//         avatar: {
//           public_id: myCloud.public_id,
//           url: myCloud.secure_url,
//         },
//         address: req.body.address,
//         phoneNumber: req.body.phoneNumber,
//         zipCode: req.body.zipCode,
//       };

//       const activationToken = createActivationToken(seller);
//       // const activationUrl = `https://market-sphere-frontend.vercel.app/seller/activation/${activationToken}`;
//       const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;

//       try {
//         await sendMail({
//           email: seller.email,
//           subject: "Activate Your Shop",
//           message: `Hello ${seller.name} , Please click on the link to activate your Shop: ${activationUrl}`,
//         });
//         res.status(201).json({
//           success: true,
//           message: `Please check your email :- ${seller.email} to activate your Shop`,
//         });
//       } catch (error) {
//         return next(new ErrorHandler(error.message, 500));
//       }
//     } catch (error) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   })
// );

router.post(
  "/create-shop",
  catchAsyncError(async (req, res, next) => {
    try {
      const { email } = req.body;

      // Check for existing shop or pending shop
      const existingShop = await Shop.findOne({
        $or: [{ email: email }, { email: email, status: "pending" }],
      });

      if (existingShop) {
        if (existingShop.status === "pending") {
          return next(
            new ErrorHandler(
              "Shop creation already in progress. Please check your email for activation link.",
              400
            )
          );
        } else {
          return next(new ErrorHandler("Shop already exists", 400));
        }
      }

      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
      });

      const seller = {
        name: req.body.name,
        email: email,
        password: req.body.password,
        avatar: {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        },
        address: req.body.address,
        phoneNumber: req.body.phoneNumber,
        zipCode: req.body.zipCode,
        status: "pending",
      };

      // Create a pending shop entry
      const pendingShop = await Shop.create(seller);

      const activationToken = createActivationToken(pendingShop._id.toString());
      const activationUrl = `https://market-sphere-frontend.vercel.app/seller/activation/${activationToken}`;
      // const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;

      try {
        await sendMail({
          email: seller.email,
          subject: "Activate Your Shop",
          message: `Hello ${seller.name}, Please click on the link to activate your Shop: ${activationUrl}`,
        });
        res.status(201).json({
          success: true,
          message: `Please check your email :- ${seller.email} to activate your Shop`,
        });
      } catch (error) {
        // If email sending fails, remove the pending shop
        await Shop.findByIdAndDelete(pendingShop._id);
        return next(new ErrorHandler(error.message, 500));
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// createActivationToken

// const createActivationToken = (seller) => {
//   return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
//     expiresIn: "5m",
//   });
// };

const createActivationToken = (shopId) => {
  return jwt.sign({ shopId }, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

//activate shop

// router.post(
//   "/activation",
//   catchAsyncError(async (req, res, next) => {
//     try {
//       const { activation_token } = req.body;
//       const newSeller = jwt.verify(
//         activation_token,
//         process.env.ACTIVATION_SECRET
//       );

//       if (!newSeller) {
//         return next(new ErrorHandler("Invalid Token", 400));
//       }
//       const { name, email, password, avatar, zipCode, address, phoneNumber } =
//         newSeller;

//       let seller = await Shop.findOne({ email });

//       if (seller) {
//         return next(new ErrorHandler("Shop already exists", 400));
//       }

//       seller = await Shop.create({
//         name,
//         email,
//         password,
//         avatar,
//         zipCode,
//         phoneNumber,
//         address,
//       });
//       sendShopToken(seller, 201, res);
//     } catch (error) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   })
// );

router.post(
  "/activation",
  catchAsyncError(async (req, res, next) => {
    try {
      const { activation_token } = req.body;
      const decodedToken = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!decodedToken.shopId) {
        return next(new ErrorHandler("Invalid Token", 400));
      }

      const shop = await Shop.findById(decodedToken.shopId);

      if (!shop) {
        return next(new ErrorHandler("Invalid shop or already activated", 400));
      }

      if (shop.status !== "pending") {
        return next(new ErrorHandler("Shop already activated", 400));
      }

      // Activate the shop
      shop.status = "active";
      await shop.save();

      sendShopToken(shop, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//login for Shop

router.post(
  "/login-shop",
  catchAsyncError(async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields", 400));
      }
      const user = await Shop.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Shop does not exists", 400));
      }
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler(
            "Something is wrong or Please provide the correct information",
            400
          )
        );
      }
      sendShopToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//load Shop

router.get(
  "/getSeller",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("Shop Does Not exists", 500));
      }
      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//Logout from the shop

router.get(
  "/logout",
  catchAsyncError(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });

      res.status(201).json({
        success: true,
        message: "Logout Successfull",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get shop info

router.get(
  "/get-shop-info/:id",
  catchAsyncError(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//update shop profile picture

router.put(
  "/update-shop-avatar",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      let existsSeller = await Shop.findById(req.seller._id);

      const imageId = existsSeller.avatar.public_id;

      await cloudinary.v2.uploader.destroy(imageId);

      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 150,
      });

      existsSeller.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };

      await existsSeller.save();

      res.status(200).json({
        success: true,
        seller: existsSeller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller info

router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const { name, description, address, phoneNumber, zipCode } = req.body;

      const shop = await Shop.findOne(req.seller._id);

      if (!shop) {
        return next(new ErrorHandler("shop Does Not exists", 400));
      }

      shop.name = name;
      shop.description = description;
      shop.address = address;
      shop.phoneNumber = phoneNumber;
      shop.zipCode = zipCode;

      await shop.save();

      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//get all seller----------- Admin

router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const sellers = await Shop.find().sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//delete seller----------- Admin

router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncError(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);

      if (!seller) {
        return next(new ErrorHandler("Seller Not find with this id", 400));
      }

      await Shop.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Seller deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//update seller withdraw method---------- seller

router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;
      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        withdrawMethod,
      });
      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

//delete seller withdraw method---------- seller

router.delete(
  "/delete-withdraw-method",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("Seller not found", 400));
      }

      seller.withdrawMethod = null;

      await seller.save();

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
