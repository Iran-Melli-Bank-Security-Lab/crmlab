// Compatibility wrapper.
// The canonical Socket.IO implementation for this project is:
//   @/realtime/socket.server
// Keep this file only so old imports do not create a second Socket.IO instance.

export { closeSocket, getIO, getIOIfInitialized, setupSocket } from "../socket.server";
