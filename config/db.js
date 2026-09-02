const dns = require("dns");
const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (err) {
    if (err.code === "ECONNREFUSED" && err.syscall === "querySrv") {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
      await mongoose.connect(process.env.MONGO_URI);
    } else {
      throw err;
    }
  }
  console.log("MongoDB connected");
}

module.exports = connectDB;
