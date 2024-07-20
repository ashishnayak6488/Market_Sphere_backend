const express = require("express");

const path = require("path");
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const catchAsyncError = require("../middleware/catchAsyncError");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const Shop = require("../model/shop");
const sendShopToken = require("../utils/shopToken");

const router = express.Router();

// create Shop

router.post("/create-shop", upload.single("file"), async (req, res, next) => {
  try {
    const { email } = req.body;
    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {
      const filename = req.file.filename;
      const filePath = `uploads/${filename}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Error in deleting the file" });
        }
      });
      return next(new ErrorHandler("Shop Already exits", 400));
    }

    const filename = req.file.filename;
    const fileUrl = path.join(filename);

    const seller = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      zipCode: req.body.zipCode,
      avatar: fileUrl,
    };

    const activationToken = createActivationToken(seller);
    const activationUrl = `https://market-sphere-frontend.vercel.app/seller/activation/${activationToken}`;

    try {
      await sendMail({
        email: seller.email,
        subject: "Activate Your Shop",
        message: `Hello ${seller.name} , Please click on the link to activate your Shop: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `Please check your email :- ${seller.email} to activate your Shop`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// createActivationToken

const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

//activate shop

router.post(
  "/activation",
  catchAsyncError(async (req, res, next) => {
    try {
      const { activation_token } = req.body;
      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandler("Invalid Token", 400));
      }
      const { name, email, password, avatar, zipCode, address, phoneNumber } =
        newSeller;

      let seller = await Shop.findOne({ email });

      if (seller) {
        return next(new ErrorHandler("Shop already exists", 400));
      }

      seller = await Shop.create({
        name,
        email,
        password,
        avatar,
        zipCode,
        phoneNumber,
        address,
      });
      sendShopToken(seller, 201, res);
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
      const seller = await Shop.findOne({ email }).select("+password");

      if (!seller) {
        return next(new ErrorHandler("Shop does not exists", 400));
      }
      const isPasswordValid = await seller.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler(
            "Something is wrong or Please provide the correct information",
            400
          )
        );
      }
      sendShopToken(seller, 201, res);
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
      console.log(req.seller);
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
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
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
  upload.single("image"),
  catchAsyncError(async (req, res, next) => {
    try {
      const existsSeller = await Shop.findById(req.seller._id);

      const existAvatarPath = `uploads/${existsSeller.avatar}`;

      fs.unlinkSync(existAvatarPath);
      const fileUrl = path.join(req.file.filename);

      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        avatar: fileUrl,
      });

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop info

router.put(
  "/update-shop-info",
  isSeller,
  catchAsyncError(async (req, res, next) => {
    try {
      const { name, description, address, phoneNumber, zipCode } = req.body;

      const seller = await Shop.findOne(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("User Does Not exists", 500));
      }

      seller.name = name;
      seller.description = description;
      seller.address = address;
      seller.phoneNumber = phoneNumber;
      seller.zipCode = zipCode;

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
