const { body } = require("express-validator");
const jwt = require("jsonwebtoken");
require("dotenv").config;

const {
  handleValidation,
  hashPassword,
  checkPassword,
} = require("../util/utils");
const Doctor = require("../models/Doctor");
const Medicine = require("../models/Medicine");
const Tips = require("../models/Tips");
const { deleteAllTipsOfUser } = require("./TipsController");

// ...register new doctor
const createDoctor = async (req, res) => {
  if (handleValidation(req, res)) {
    try {
      const {
        name,
        email,
        password,
        phone,
        chamberLocation,
        licenceNo,
        degree,
      } = req.body;
      const hashedPassword = hashPassword(password);
      const resp = await Doctor.create({
        name,
        email,
        password: hashedPassword,
        phone,
        chamberLocation,
        licenceNo,
        degree,
      });
      return res.status(201).json(resp);
    } catch (error) {
      console.log(error);
      if (error.code === 11000) {
        return res.status(409).send({ msg: "User already Exists" });
      }
      return res.status(500).send({ msg: "Something Went Wrong" });
    }
  }
};

// ...login doctor
const loginDoctor = async (req, res) => {
  if (handleValidation(req, res)) {
    const { email, password } = req.body;
    try {
      const user = await Doctor.findOne({ email });
      if (user) {
        const passMatched = checkPassword(password, user.password);
        if (passMatched) {
          const userdata = {
            id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
          };
          // send user jwt
          const token = jwt.sign(userdata, process.env.JWT_SECRET);
          return res.json({ token: token, data: userdata });
        } else {
          return res.status(404).send("User not found");
        }
      }
      return res.status(404).send("User not found");
    } catch (error) {
      console.log(error);
    }
  }
};

const profile = async (req, res) => {
  try {
    const id = req.params.id;
    const profile = await Doctor.findOne({ _id: id })
      .populate({
        path: "tipses",
        populate: {
          path: "author",
        },
      })
      .select("-password");
    if (profile.isAdmin) {
      const totalUsers = await Doctor.countDocuments();
      const totaltips = await Tips.countDocuments();
      const totalMedicine = await Medicine.countDocuments();
      const counts = {
        "total users": totalUsers,
        "total tips": totaltips,
        "total medicines": totalMedicine,
      };
      return res.status(200).json({ profile, counts });
    }
    console.log(profile.counts);
    return res.status(200).json({ profile });
  } catch (error) {
    console.log(error);
    return res.sendStatus(404);
  }
};

const allUsers = async (req, res) => {
  if (handleValidation(req, res)) {
    console.log(req.user);
    if (req.user.isAdmin) {
      const users = await Doctor.find({ isAdmin: false });
      return res.json(users);
    }
    return res.sendStatus(401);
  }
};

const deleteUser = async (req, res) => {
  try {
    if (handleValidation(req, res)) {
      if (req.user.isAdmin) {
        const idOfUser = req.body.id;
        const user = await Doctor.findOne({ _id: idOfUser });
        if (user) {
          const tips = await deleteAllTipsOfUser(idOfUser);
          const resp = await Doctor.deleteOne({ _id: idOfUser });
          res.status(200).json({ resp, tips });
        }
      } else {
        return res.sendStatus(401);
      }
    }
  } catch (error) {
    res.sendStatus(500);
    console.log(error);
  }
};

// ...validate data
const validate = (method) => {
  switch (method) {
    case "createDoctor": {
      return [
        body("name")
          .trim()
          .exists()
          .withMessage("username required")
          .isLength({ min: 5 })
          .withMessage("username must be at least 5 characters long"),
        body("email")
          .trim()
          .notEmpty()
          .withMessage("Email required")
          .isEmail()
          .normalizeEmail()
          .withMessage("Incorrect email format"),
        body("password")
          .trim()
          .exists()
          .withMessage("password required")
          .isLength({ min: 6 })
          .withMessage("password must be at least 6 characters long"),
        body("licenceNo")
          .trim()
          .notEmpty()
          .withMessage("licenceNo can not be empty"),
        body("degree")
          .trim()
          .notEmpty()
          .withMessage("degree can not be empty."),
        body("phone")
          .trim()
          .isMobilePhone()
          .withMessage("invalid mobile number")
          .notEmpty(),
      ];
    }

    case "checkDoctor": {
      return [
        body("email").trim().notEmpty().withMessage("Email required"),
        body("password").trim().notEmpty().withMessage("password required"),
      ];
    }
  }
};

module.exports = {
  validate,
  createDoctor,
  loginDoctor,
  profile,
  allUsers,
  deleteUser,
};
