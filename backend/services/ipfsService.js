const { PinataSDK } = require('pinata-web3');
require('dotenv').config();

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

exports.uploadFile = async (filePath, fileName) => {
    try {
        console.log(`Uploading ${fileName} to Pinata...`);
        // We will implement actual upload here when user provides PINATA config
        // For now string mock
        return { IpfsHash: "QmMockHash1234567890" };
    } catch (error) {
        console.error("IPFS Upload Error:", error);
        throw error;
    }
};
