# Các lệnh cURL Test SBERT qua Postman

Để quá trình test nhanh gọn và không bị vướng bảo mật (không cần truyền JWT Token), bạn hãy test **trực tiếp vào API của ML-Service (FastAPI)** đang chạy ở port `8001`.

Dưới đây là 20 lệnh cURL tương ứng với 20 ca kiểm thử trong file `dataset_test_sbert.md`. Các điểm số đã được gán chính xác theo bảng. Bạn chỉ cần copy từng block và chọn chức năng **Import -> Raw text** trong Postman để chạy!

### Ca 1 (Khớp hoàn toàn)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.7,
    "major_scores": {
      "React": 8.0,
      "NodeJS": 8.0,
      "Lập trình Web": 8.8,
      "Hệ CSDL": 10.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_1",
      "requirements": ["React", "NodeJS", "Database"]
    }
  ]
}'
```

### Ca 2 (Khớp hoàn toàn)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.6,
    "major_scores": {
      "Trí tuệ nhân tạo": 9.2,
      "Python": 8.0,
      "Deep learning": 8.8
    }
  },
  "topics": [
    {
      "topic_id": "ca_2",
      "requirements": ["AI", "Python", "Deep Learning"]
    }
  ]
}'
```

### Ca 3 (Khớp hoàn toàn)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.2,
    "major_scores": {
      "Lập trình di động": 8.2,
      "Java": 8.0,
      "Android": 8.0,
      "Firebase": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_3",
      "requirements": ["Android", "Java", "Mobile App"]
    }
  ]
}'
```

### Ca 4 (Khớp)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.9,
    "major_scores": {
      "Thiết kế web": 9.5,
      "Hệ cơ sở dữ liệu": 10.0,
      "PHP": 8.0,
      "MySQL": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_4",
      "requirements": ["PHP", "MySQL", "Web"]
    }
  ]
}'
```

### Ca 5 (Khớp)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.6,
    "major_scores": {
      "Công nghệ .NET": 8.1,
      "C#": 8.0,
      "SQL Server": 8.0,
      "Phân tích thiết kế": 10.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_5",
      "requirements": ["C#", ".NET", "SQL Server"]
    }
  ]
}'
```

### Ca 6 (Khớp)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 9.0,
    "major_scores": {
      "Nhập môn Big Data": 9.0,
      "Khai phá dữ liệu": 9.7,
      "Python": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_6",
      "requirements": ["Big Data", "Data Mining", "Python"]
    }
  ]
}'
```

### Ca 7 (Khớp)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.8,
    "major_scores": {
      "Bảo mật máy tính": 9.5,
      "An toàn mạng máy tính": 8.0,
      "Linux": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_7",
      "requirements": ["Security", "Network", "Bảo mật"]
    }
  ]
}'
```

### Ca 8 (Khớp)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 9.1,
    "major_scores": {
      "Internet of Things": 9.5,
      "C++": 8.0,
      "Arduino": 8.0,
      "Điện toán đám mây": 10.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_8",
      "requirements": ["IoT", "C++", "Arduino"]
    }
  ]
}'
```

### Ca 9 (Khớp)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.4,
    "major_scores": {
      "Lập trình mã nguồn mở": 8.6,
      "Linux": 8.0,
      "Docker": 8.0,
      "DevOps": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_9",
      "requirements": ["Linux", "Docker", "Open Source"]
    }
  ]
}'
```

### Ca 10 (Khớp)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.7,
    "major_scores": {
      "Blockchain": 8.0,
      "Solidity": 8.0,
      "Web3": 8.0,
      "Phân tích thiết kế hệ thống": 10.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_10",
      "requirements": ["Blockchain", "Solidity", "Web3"]
    }
  ]
}'
```

### Ca 11 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.5,
    "major_scores": {
      "Thiết kế web": 9.5,
      "HTML": 8.0,
      "CSS": 8.0,
      "JavaScript": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_11",
      "requirements": ["Python", "Deep Learning", "AI"]
    }
  ]
}'
```

### Ca 12 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.9,
    "major_scores": {
      "Trí tuệ nhân tạo": 9.2,
      "Deep learning": 8.8,
      "Python": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_12",
      "requirements": ["Swift", "iOS", "Mobile"]
    }
  ]
}'
```

### Ca 13 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.2,
    "major_scores": {
      "Công nghệ .NET": 8.1,
      "C#": 8.0,
      "Lập trình hướng đối tượng": 9.5
    }
  },
  "topics": [
    {
      "topic_id": "ca_13",
      "requirements": ["Hadoop", "Spark", "Big Data"]
    }
  ]
}'
```

### Ca 14 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.7,
    "major_scores": {
      "Lập trình di động": 8.2,
      "Flutter": 8.0,
      "Dart": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_14",
      "requirements": ["Solidity", "Web3", "Smart Contract"]
    }
  ]
}'
```

### Ca 15 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 9.0,
    "major_scores": {
      "Mạng máy tính": 8.3,
      "Quản trị hệ thống mạng": 9.0,
      "Cisco": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_15",
      "requirements": ["React", "NodeJS", "MongoDB"]
    }
  ]
}'
```

### Ca 16 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.6,
    "major_scores": {
      "Internet of Things": 9.5,
      "Arduino": 8.0,
      "Mạch điện": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_16",
      "requirements": ["C#", "SQL Server", "WinForms"]
    }
  ]
}'
```

### Ca 17 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.4,
    "major_scores": {
      "Blockchain": 8.0,
      "Smart Contract": 8.0,
      "Ethereum": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_17",
      "requirements": ["OpenCV", "Python", "Machine Learning"]
    }
  ]
}'
```

### Ca 18 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 9.1,
    "major_scores": {
      "Nhập môn Big Data": 9.0,
      "Khai phá dữ liệu": 9.7,
      "R": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_18",
      "requirements": ["Unity", "C#", "Game Design"]
    }
  ]
}'
```

### Ca 19 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.8,
    "major_scores": {
      "Bảo mật máy tính": 9.5,
      "An toàn mạng máy tính": 8.0,
      "Penetration Testing": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_19",
      "requirements": ["React Native", "Firebase", "Google Maps API"]
    }
  ]
}'
```

### Ca 20 (Lệch)
```bash
curl --location 'http://127.0.0.1:8001/match-student' \
--header 'Content-Type: application/json' \
--data '{
  "student": {
    "gpa": 8.5,
    "major_scores": {
      "Lập trình mã nguồn mở": 8.6,
      "PHP": 8.0,
      "Laravel": 8.0
    }
  },
  "topics": [
    {
      "topic_id": "ca_20",
      "requirements": ["C", "Embedded Systems", "IoT"]
    }
  ]
}'
```
