const app = require("./app");
const mongoose = require("mongoose");

////////////// Catching Uncaught Exceptions ////////////////
process.on("uncaughtException", (error) => {
  console.log("UNCAUGHT EXCEPTION : 💥 Shutting down...");
  console.log(error.name, error.message);
  process.exit(1);
});

////////////// Connection link with DB ////////////////
const DB = process.env.DB_LINK.replace("<password>", process.env.DB_PASSWORD);

////////////// Connection DB ////////////////
mongoose.connect(DB).then((connexion) => {
  console.log("DB connection successfull!");
});

////////////// Listening to requests ////////////////
const server = app.listen(process.env.PORT, () => {
  console.log(`App running on port 1205...`);
});

////////////// Errors Outside Express: Unhandled Rejections ////////////////
process.on("unhandledRejection", (error) => {
  console.log("UNHANDLED REJECTION : 💥 Shutting down...");
  console.log(error.name, error.message);
  server.close(() => {
    process.exit(1);
  });
});
