let ioInstance = null;

module.exports = function (io) {
  ioInstance = io;
};

module.exports.close = function () {
  if (ioInstance) {
    console.log("🔌 Closing WebSocket server...");
    ioInstance.close();
  } else {
    console.log("⚠ No WebSocket server instance to close");
  }
};
