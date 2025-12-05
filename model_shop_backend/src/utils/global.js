// src/utils/global.js
let ioInstance = null;

export const setIo = (io) => {
  ioInstance = io;
};

export const getIo = () => {
  if (!ioInstance) throw new Error('Socket.IO chưa được khởi tạo!');
  return ioInstance;
};