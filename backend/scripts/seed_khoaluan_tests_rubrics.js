require('dotenv').config();
const mongoose = require('mongoose');
const DeTai = require('../models/DeTai');
const BaiTest = require('../models/BaiTest');

async function seedTestsAndRubrics() {
  console.log('🔗 Đang kết nối MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB thành công!');

  // ==========================================
  // 1. ĐỀ TÀI: DT_KL_GSPHONG_01 & DT_KL_PHONG_01 (Blockchain Sharding)
  // ==========================================
  const shardingTopics = await DeTai.find({ 
    MaDeTai: { $in: ['DT_KL_GSPHONG_01', 'DT_KL_PHONG_01'] } 
  });
  
  if (shardingTopics.length > 0) {
    for (const topic of shardingTopics) {
      console.log(`\n🔹 Đang seed cho đề tài: ${topic.MaDeTai} (${topic._id})`);
      
      // Cập nhật Rubrics
      topic.SuDungRubrics = true;
      topic.Rubrics = [
        {
          TenTieuChi: 'Kiến trúc Sharding & Phân cấp',
          MoTa: 'Đánh giá cấu trúc phân mảnh, cách thức đồng bộ và giao tiếp giữa các shards (Cross-shard).',
          TrongSo: 40,
          DiemToiDa: 10,
          GoiYChoAI: ['blockchain', 'sharding', 'shard', 'scalability', 'tps', 'cross-shard']
        },
        {
          TenTieuChi: 'Thuật toán đồng thuận & Smart Contract',
          MoTa: 'Thiết kế giao thức đồng thuận (PoS) trên từng shard và tối ưu hóa phí gas của các Smart Contract thử nghiệm.',
          TrongSo: 30,
          DiemToiDa: 10,
          GoiYChoAI: ['consensus', 'proof-of-stake', 'solidity', 'contract', 'go']
        },
        {
          TenTieuChi: 'Đánh giá hiệu năng & Thử nghiệm thực tế',
          MoTa: 'Đo lường các chỉ số TPS, độ trễ (latency), khả năng chịu lỗi của hệ thống khi tăng tải mạng giả lập.',
          TrongSo: 30,
          DiemToiDa: 10,
          GoiYChoAI: ['performance', 'tps', 'latency', 'testing', 'experiment', 'benchmarking']
        }
      ];
      await topic.save();
      console.log(`✅ Đã cập nhật Rubrics cho đề tài ${topic.MaDeTai}`);

      // Tạo bài test
      await BaiTest.deleteOne({ DeTai: topic._id });
      const test = new BaiTest({
        DeTai: topic._id,
        TieuDe: 'Bài Test Tuyển Chọn Nghiên Cứu Blockchain Sharding',
        MoTa: 'Bài đánh giá kiến thức chuyên môn về Sharding, mật mã học blockchain và kỹ thuật kiểm thử hiệu năng dành cho sinh viên đăng ký đề tài.',
        ThoiGianLam: 15,
        NguongDat: 70,
        CauHoi: [
          {
            LoaiCauHoi: 'TracNghiem',
            NoiDung: 'Trong kiến trúc blockchain sharding, bài toán "Cross-shard transaction" (giao dịch chéo shard) chủ yếu đối mặt với thách thức lớn nào sau đây?',
            LuaChon: [
              'A. Đảm bảo tính nguyên tử (Atomicity) và bảo mật chéo shard không bị double-spending',
              'B. Tăng dung lượng lưu trữ phần cứng của từng nốt đơn lẻ',
              'C. Giảm số lượng shard đang chạy đồng thời trên mạng lưới',
              'D. Sử dụng ít băng thông mạng nhất có thể để kết nối server trung tâm'
            ],
            DapAnDung: 'A',
            Diem: 3
          },
          {
            LoaiCauHoi: 'TracNghiem',
            NoiDung: 'Giải pháp Sharding nào phân chia đồng thời cả trạng thái lưu trữ (state), xử lý giao dịch (transaction) và mạng lưới truyền thông (network)?',
            LuaChon: [
              'A. State Sharding',
              'B. Transaction Sharding',
              'C. Network Sharding',
              'D. Full Sharding'
            ],
            DapAnDung: 'D',
            Diem: 3
          },
          {
            LoaiCauHoi: 'TracNghiem',
            NoiDung: 'Trong thuật toán đồng thuận PoS được tối ưu hóa cho Sharding, thuật ngữ "Committee" (Ủy ban) đại diện cho điều gì?',
            LuaChon: [
              'A. Nhóm các giảng viên trong hội đồng bảo vệ khóa luận',
              'B. Một tập hợp các validators được lựa chọn ngẫu nhiên và luân phiên để xác thực giao dịch cho một shard cụ thể',
              'C. Các máy đào chuyên dụng thực hiện giải thuật toán SHA-256',
              'D. Cơ quan quản lý trung tâm chịu trách nhiệm phân quyền ví người dùng'
            ],
            DapAnDung: 'B',
            Diem: 4
          }
        ]
      });
      await test.save();
      console.log(`✅ Đã tạo thành công Bài Test cho đề tài ${topic.MaDeTai}`);
    }
  } else {
    console.log('⚠️ Không tìm thấy đề tài Blockchain Sharding nào trong DB!');
  }

  // ==========================================
  // 2. ĐỀ TÀI: DT_KL_PGSPHONG_01 (AI & NFT SBT)
  // ==========================================
  const topic02 = await DeTai.findOne({ MaDeTai: 'DT_KL_PGSPHONG_01' });
  if (topic02) {
    console.log(`\n🔹 Đang seed cho đề tài: ${topic02.MaDeTai}`);
    
    // Cập nhật Rubrics
    topic02.SuDungRubrics = true;
    topic02.Rubrics = [
      {
        TenTieuChi: 'Thiết kế AI Model & FastAPI Service',
        MoTa: 'Đánh giá việc xây dựng, tinh chỉnh mô hình xử lý ngôn ngữ tự nhiên và hiệu năng API so sánh tương đồng tài liệu.',
        TrongSo: 40,
        DiemToiDa: 10,
        GoiYChoAI: ['ai', 'fastapi', 'sbert', 'matching', 'grading', 'model', 'nlp']
      },
      {
        TenTieuChi: 'Smart Contract & SBT Minting',
        MoTa: 'Chất lượng code Smart Contract Soulbound Token, cơ chế chống chuyển nhượng và bảo mật cấp phát chứng chỉ.',
        TrongSo: 30,
        DiemToiDa: 10,
        GoiYChoAI: ['solidity', 'smart contract', 'nft', 'sbt', 'soulbound', 'erc-721']
      },
      {
        TenTieuChi: 'Tích hợp hệ thống & Trải nghiệm Web3',
        MoTa: 'Khả năng tích hợp Web3.js/Ethers.js, tương tác ví MetaMask và đồng bộ quy trình AI chấm điểm tự động mint.',
        TrongSo: 30,
        DiemToiDa: 10,
        GoiYChoAI: ['react', 'web3', 'metamask', 'oracle', 'dapp', 'interaction']
      }
    ];
    await topic02.save();
    console.log(`✅ Đã cập nhật Rubrics cho đề tài ${topic02.MaDeTai}`);

    // Tạo bài test
    await BaiTest.deleteOne({ DeTai: topic02._id });
    const test02 = new BaiTest({
      DeTai: topic02._id,
      TieuDe: 'Bài Test Tuyển Chọn Khóa Luận AI & Web3 NFT',
      MoTa: 'Bài kiểm tra kiến thức về các mô hình học máy ngôn ngữ, lập trình Web3 và thiết kế token Soulbound (SBT).',
      ThoiGianLam: 15,
      NguongDat: 70,
      CauHoi: [
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: 'Soulbound Token (SBT) khác biệt hoàn toàn với các token NFT tiêu chuẩn (như ERC-721 thông thường) ở đặc điểm cốt lõi nào?',
          LuaChon: [
            'A. Tốc độ chuyển đổi và phí gas giao dịch rẻ hơn gấp nhiều lần',
            'B. Tính chất không thể chuyển nhượng (Non-transferable) sau khi đã mint vào địa chỉ ví',
            'C. Chỉ có thể lưu trữ trên mạng lưới chuỗi khối Bitcoin',
            'D. Yêu cầu mã hóa bằng mã khóa đối xứng hai chiều'
          ],
          DapAnDung: 'B',
          Diem: 3
        },
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: 'Chuẩn token ERC nào trong hệ sinh thái Ethereum thường được mở rộng hoặc kế thừa trực tiếp để xây dựng các Soulbound Token?',
          LuaChon: [
            'A. ERC-20',
            'B. ERC-721',
            'C. ERC-777',
            'D. ERC-4626'
          ],
          DapAnDung: 'B',
          Diem: 3
        },
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: 'Mô hình NLP (Xử lý ngôn ngữ tự nhiên) nào thường được sử dụng tối ưu để tính tương đồng ngữ nghĩa giữa hai văn bản báo cáo (Sentence Similarity) trong các ứng dụng AI hiện đại?',
          LuaChon: [
            'A. Sentence-BERT (SBERT)',
            'B. Mô hình mạng nơ-ron tích chập CNN',
            'C. Thuật toán phân cụm K-Means',
            'D. Mô hình phân loại ảnh ResNet-50'
          ],
          DapAnDung: 'A',
          Diem: 4
        }
      ]
    });
    await test02.save();
    console.log(`✅ Đã tạo thành công Bài Test cho đề tài ${topic02.MaDeTai}`);
  } else {
    console.log('⚠️ Không tìm thấy đề tài DT_KL_PGSPHONG_01');
  }

  // ==========================================
  // 3. ĐỀ TÀI: DT_KL_WALLET_01 (DID Identity & AI Security)
  // ==========================================
  const topic03 = await DeTai.findOne({ MaDeTai: 'DT_KL_WALLET_01' });
  if (topic03) {
    console.log(`\n🔹 Đang seed cho đề tài: ${topic03.MaDeTai}`);
    
    // Cập nhật Rubrics
    topic03.SuDungRubrics = true;
    topic03.Rubrics = [
      {
        TenTieuChi: 'Kiến trúc Định danh phi tập trung (DID)',
        MoTa: 'Đánh giá việc áp dụng tiêu chuẩn W3C DID, cấu trúc Verifiable Credentials và luồng xác minh định danh.',
        TrongSo: 40,
        DiemToiDa: 10,
        GoiYChoAI: ['did', 'decentralized identity', 'verifiable credential', 'did document', 'w3c', 'holder', 'issuer']
      },
      {
        TenTieuChi: 'Mô hình Machine Learning phát hiện bất thường',
        MoTa: 'Hiệu quả của mô hình AI/ML trong nhận diện các cuộc tấn công sybil, giả mạo danh tính hoặc giao dịch bất thường.',
        TrongSo: 30,
        DiemToiDa: 10,
        GoiYChoAI: ['machine learning', 'anomaly detection', 'security', 'sybil', 'on-chain analysis']
      },
      {
        TenTieuChi: 'Giao diện React & Hợp đồng thông minh',
        MoTa: 'Thiết kế giao diện dApp quản lý danh tính, tích hợp lưu trữ IPFS và chất lượng các Smart Contract bổ trợ.',
        TrongSo: 30,
        DiemToiDa: 10,
        GoiYChoAI: ['react', 'solidity', 'security', 'cryptography', 'dapp', 'ipfs']
      }
    ];
    await topic03.save();
    console.log(`✅ Đã cập nhật Rubrics cho đề tài ${topic03.MaDeTai}`);

    // Tạo bài test
    await BaiTest.deleteOne({ DeTai: topic03._id });
    const test03 = new BaiTest({
      DeTai: topic03._id,
      TieuDe: 'Bài Test Tuyển Chọn Định Danh Số & An Toàn Web3',
      MoTa: 'Bài kiểm tra kiến thức về các tiêu chuẩn W3C DID, Verifiable Credentials và các mô hình học máy phát hiện tấn công mạng xã hội phi tập trung.',
      ThoiGianLam: 15,
      NguongDat: 70,
      CauHoi: [
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: 'Thành phần cốt lõi nào trong kiến trúc Định danh phi tập trung (DID) tiêu chuẩn của W3C chứa các khóa công khai và service endpoints để xác thực chủ sở hữu?',
          LuaChon: [
            'A. DID Document',
            'B. Thiết bị bảo mật vật lý USB Token',
            'C. Cơ sở dữ liệu SQL Server được lưu trữ tập trung',
            'D. Khóa mã hóa đối xứng Private Key của admin'
          ],
          DapAnDung: 'A',
          Diem: 3
        },
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: 'Khái niệm "Verifiable Credentials" (VC) trong tiêu chuẩn DID đại diện cho điều gì sau đây?',
          LuaChon: [
            'A. Một tệp dữ liệu số được mã hóa và ký bởi Issuer, cho phép Holder lưu trữ và trình bày để Verifier xác minh một cách bảo mật',
            'B. Tiền tệ pháp định được chuyển đổi on-chain',
            'C. Mật khẩu cá nhân dùng để đăng nhập hệ thống Web2',
            'D. Ảnh quét thẻ căn cước công dân được lưu trữ trên OneDrive hoặc Google Drive'
          ],
          DapAnDung: 'A',
          Diem: 3
        },
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: 'Trong an toàn thông tin blockchain, cuộc tấn công "Sybil Attack" được hiểu là gì?',
          LuaChon: [
            'A. Một thực thể cố gắng tạo ra nhiều danh tính giả mạo để chiếm đoạt quyền kiểm soát hoặc làm sai lệch kết quả bầu chọn/vận hành của mạng phi tập trung',
            'B. Gửi hàng loạt giao dịch rác gây tắc nghẽn mạng lưới (DDoS)',
            'C. Giải mã khóa private key thông qua tấn công brute-force',
            'D. Thay đổi các tham số đầu ra của mô hình học máy'
          ],
          DapAnDung: 'A',
          Diem: 4
        }
      ]
    });
    await test03.save();
    console.log(`✅ Đã tạo thành công Bài Test cho đề tài ${topic03.MaDeTai}`);
  } else {
    console.log('⚠️ Không tìm thấy đề tài DT_KL_WALLET_01');
  }

  console.log('\n🎉 Quá trình seed Bài Test và Rubrics cho 3 đề tài Khóa Luận hoàn tất!');
  await mongoose.disconnect();
}

seedTestsAndRubrics().catch(console.error);
