const express = require("express");
const userRoutes = require("./Routes/userRoutes");
const handlerError = require("./Controllers/errorController");
const dotenv = require("dotenv");
const pug = require("pug");
const path = require("path");
const AppError = require("./utils/appError");

////////////// Environement variables ////////////////
dotenv.config({ path: "./config.env" });

////////////// Initialisation Server Express ////////////////
app = express();

////////////// Body parser: reading data from body ////////////////
app.use(express.json());

////////////// Configuration views with pug ////////////////
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

////////////// Host files from local to server ////////////////
app.use(express.static(path.join(__dirname, "public")));

////////////// EndPoints ////////////////
app.use("/api/v1/users", userRoutes);

app.all("*", (request, response, next) => {
  next(new AppError(`Can't find ${request.originalUrl} on this server!`, 404));
});

app.use(handlerError);

module.exports = app;
