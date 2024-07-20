// //create token and save it in cookies

// const sendToken = (user, statusCode, res) => {
//   const token = user.getJwtToken();

//   //options for cookies
//   const options = {
//     expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
//     httpOnly: true,
//     sameSite: "none",
//     secure: true,
//   };

//   res.status(statusCode).cookie("token", token, options).json({
//     success: true,
//     user,
//     token,
//   });
// };

// module.exports = sendToken;

const sendToken = (user, statusCode, res) => {
  try {
    const token = user.getJwtToken();

    // Options for cookies
    const options = {
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    };

    res.status(statusCode).cookie("token", token, options).json({
      success: true,
      user,
      // Consider if you want to send the token in the response body
      // token,
    });
  } catch (error) {
    // Handle any errors that occur during token generation or response sending
    console.error("Error in sendToken:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request",
    });
  }
};

module.exports = sendToken;
