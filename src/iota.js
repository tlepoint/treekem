'use strict';

const cs = window.crypto.subtle;
const EC = require('elliptic').ec;
const BN = require('bn.js');

const p256 = new EC('p256');

const ENDIAN = 'be';
const INTLEN = 32;

function bn2b64(n) {
  const bytes = n.toArray(ENDIAN, INTLEN);
  let base64 = (new Buffer(bytes)).toString('base64');
  return base64.replace(/=/g, '')
               .replace(/\+/g, '-')
               .replace(/\//g, '_');
}

async function iota(secret) {
  // Digest the input
  const digest = await cs.digest("SHA-256", secret);

  // Convert it to an integer and compute the resulting key pair
  const arr = Array.from(new Uint8Array(digest));
  const hex = arr.map(x => ('0' + x.toString(16)).slice(-2)).join("");
  const bnD = new BN(hex, 16);
  const keyPair = p256.keyFromPrivate(bnD);
  keyPair.getPublic();
  
  // Build JWKs
  const d = bn2b64(bnD);
  const x = bn2b64(keyPair.pub.x.fromRed());
  const y = bn2b64(keyPair.pub.y.fromRed());
  const privJWK = {kty: "EC", crv: "P-256", x: x, y: y, d: d};
  const pubJWK = {kty: "EC", crv: "P-256", x: x, y: y};

  const alg = {
    name: "ECDH",
    namedCurve: "P-256",
  }; 
  return {
    privateKey: await cs.importKey("jwk", privJWK, alg, false, ["deriveKey", "deriveBits"]),
    publicKey: await cs.importKey("jwk", pubJWK, alg, true, []),
  }
}

module.exports = iota;
