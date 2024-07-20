// //create token and save it in cookies

// const sendShopToken = (seller, statusCode, res) => {
//   const token = seller.getJwtToken();

//   //options for cookies
//   const options = {
//     expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
//     httpOnly: true,
//     sameSite: "none",
//     secure: true,
//   };

//   res.status(statusCode).cookie("seller_token", token, options).json({
//     success: true,
//     seller,
//     token,
//   });
// };

// module.exports = sendShopToken;

const sendShopToken = (seller, statusCode, res) => {
  try {
    const token = seller.getJwtToken();

    // Options for cookies
    const options = {
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    };

    res.status(statusCode).cookie("seller_token", token, options).json({
      success: true,
      seller,
      // Consider if you want to send the token in the response body
      // token,
    });
  } catch (error) {
    console.error("Error in sendShopToken:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request",
    });
  }
};

module.exports = sendShopToken;
