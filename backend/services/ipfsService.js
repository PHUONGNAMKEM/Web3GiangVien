const { PinataSDK } = require('pinata-web3');
require('dotenv').config();

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

const fs = require('fs');

exports.uploadFile = async (filePath, fileName) => {
    try {
        console.log(`Đang tải ${fileName} lên IPFS (Pinata)...`);
        
        // 1. Đọc file từ thư mục tạm trên server (Multer)
        const fileBuffer = fs.readFileSync(filePath);
        
        // 2. Tạo Blob/File object (Hỗ trợ từ Node.js v20+)
        const blob = new Blob([fileBuffer]);
        const file = new File([blob], fileName, { type: 'application/octet-stream' });
        
        // 3. Thực hiện tải lên Pinata
        const upload = await pinata.upload.file(file);
        
        console.log("Tải IPFS thành công:", upload.IpfsHash);
        
        // 4. Xóa file tạm sau khi đã upload (Tùy chọn, nên thực hiện để trống ổ cứng)
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.warn("Không thể xóa file tạm:", err.message);
        }

        return { IpfsHash: upload.IpfsHash };
    } catch (error) {
        console.error("Lỗi khi tải file lên IPFS:", error);
        throw error;
    }
};
