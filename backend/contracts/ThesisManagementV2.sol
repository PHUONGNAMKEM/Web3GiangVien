// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ThesisManagementV2 {
    // === ACCESS CONTROL ===
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // === STRUCTS (gas-optimized: bytes32 keys) ===

    struct Topic {
        string title;
        bytes32 advisorDID;
        uint256 deadline;
        string[] requirements;
        bool exists;
    }

    struct Submission {
        bytes32 studentDID;
        bytes32 topicId;
        string ipfsCID;
        uint256 timestamp;
        uint8 grade;
        string feedback;
        bool graded;
    }

    struct TestResult {
        bytes32 studentDID;
        bytes32 topicId;
        uint16 score;           // Điểm x10 (VD: 85 = 8.5 điểm)
        uint256 timestamp;
    }

    // === MAPPINGS (bytes32 thay cho string → tiết kiệm ~30-50% gas) ===
    mapping(bytes32 => Topic) public topics;                           // topicHash => Topic
    mapping(bytes32 => bytes32[]) public advisorTopics;                // advisorHash => topicHash[]
    mapping(bytes32 => mapping(bytes32 => Submission[])) private submissions; // topicHash => studentHash => Submissions
    mapping(bytes32 => TestResult[]) public testResults;               // topicHash => TestResult[]

    // === EVENTS ===
    event TopicRegistered(bytes32 indexed topicHash, string title, bytes32 indexed advisorDID);
    event ReportSubmitted(bytes32 indexed studentDID, bytes32 indexed topicHash, string ipfsCID);
    event GradeFinalized(bytes32 indexed studentDID, bytes32 indexed topicHash, uint8 grade);
    event TestResultSubmitted(bytes32 indexed topicHash, bytes32 indexed studentDID, uint16 score);

    // === 1. Giảng viên đăng ký đề tài (onlyOwner) ===
    function registerTopic(
        bytes32 topicHash,
        string memory title,
        bytes32 advisorDID,
        uint256 deadline,
        string[] memory requirements
    ) public onlyOwner {
        require(!topics[topicHash].exists, "Topic already exists");

        topics[topicHash] = Topic({
            title: title,
            advisorDID: advisorDID,
            deadline: deadline,
            requirements: requirements,
            exists: true
        });

        advisorTopics[advisorDID].push(topicHash);

        emit TopicRegistered(topicHash, title, advisorDID);
    }

    // === 2. Sinh viên nộp báo cáo (public) ===
    function submitReport(
        bytes32 studentDID,
        bytes32 topicHash,
        string memory ipfsCID,
        uint256 timestamp
    ) public {
        require(topics[topicHash].exists, "Topic does not exist");

        Submission memory newSubmission = Submission({
            studentDID: studentDID,
            topicId: topicHash,
            ipfsCID: ipfsCID,
            timestamp: timestamp,
            grade: 0,
            feedback: "",
            graded: false
        });

        submissions[topicHash][studentDID].push(newSubmission);

        emit ReportSubmitted(studentDID, topicHash, ipfsCID);
    }

    // === 3. Giảng viên chốt điểm (onlyOwner) ===
    function finalizeGrade(
        bytes32 studentDID,
        bytes32 topicHash,
        uint8 grade,
        string memory feedback,
        uint256 submissionIndex
    ) public onlyOwner {
        require(topics[topicHash].exists, "Topic does not exist");
        require(
            submissions[topicHash][studentDID].length > submissionIndex,
            "Invalid submission index"
        );
        require(
            !submissions[topicHash][studentDID][submissionIndex].graded,
            "Submission already graded"
        );

        submissions[topicHash][studentDID][submissionIndex].grade = grade;
        submissions[topicHash][studentDID][submissionIndex].feedback = feedback;
        submissions[topicHash][studentDID][submissionIndex].graded = true;

        emit GradeFinalized(studentDID, topicHash, grade);
    }

    // === 4. Ghi kết quả bài test cạnh tranh (public) ===
    function submitTestResult(
        bytes32 topicHash,
        bytes32 studentDID,
        uint16 score
    ) public {
        require(topics[topicHash].exists, "Topic does not exist");

        testResults[topicHash].push(TestResult({
            studentDID: studentDID,
            topicId: topicHash,
            score: score,
            timestamp: block.timestamp
        }));

        emit TestResultSubmitted(topicHash, studentDID, score);
    }

    // === 5. Lấy danh sách đề tài của giảng viên ===
    function getTopicsByAdvisor(bytes32 advisorDID) public view returns (bytes32[] memory) {
        return advisorTopics[advisorDID];
    }

    // === 6. Lấy lịch sử nộp bài ===
    function getSubmissionHistory(bytes32 studentDID, bytes32 topicHash)
        public view returns (Submission[] memory)
    {
        return submissions[topicHash][studentDID];
    }

    // === 7. Lấy kết quả test của đề tài ===
    function getTestResults(bytes32 topicHash) public view returns (TestResult[] memory) {
        return testResults[topicHash];
    }

    // === 8. Đếm số kết quả test ===
    function getTestResultCount(bytes32 topicHash) public view returns (uint256) {
        return testResults[topicHash].length;
    }
}
