const crypto = require("crypto")

const tokenEncoding = "base64url";


function createSecret() {
  return crypto.randomBytes(64).toString("hex");
}

console.log(createSecret())