// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ThesisManagement {
    struct Topic {
        string title;
        string advisorDID;
        uint256 deadline;
        string[] requirements;
        bool exists;
    }

    struct Submission {
        string studentDID;
        string topicId;
        string ipfsCID;
        uint256 timestamp;
        uint8 grade;
        string feedback;
        bool graded;
    }

    // Mappings
    mapping(string => Topic) public topics; // topicId => Topic
    mapping(string => string[]) public advisorTopics; // advisorDID => array of topicIds

    // topicId => studentDID => Array of Submissions
    mapping(string => mapping(string => Submission[])) private submissions;

    // Events
    event TopicRegistered(string indexed topicId, string title, string indexed advisorDID);
    event ReportSubmitted(string indexed studentDID, string indexed topicId, string ipfsCID);
    event GradeFinalized(string indexed studentDID, string indexed topicId, uint8 grade);

    // 1. Giảng viên đăng ký đề tài
    function registerTopic(
        string memory topicId,
        string memory title,
        string memory advisorDID,
        uint256 deadline,
        string[] memory requirements
    ) public {
        require(!topics[topicId].exists, "Topic already exists");

        topics[topicId] = Topic({
            title: title,
            advisorDID: advisorDID,
            deadline: deadline,
            requirements: requirements,
            exists: true
        });

        advisorTopics[advisorDID].push(topicId);

        emit TopicRegistered(topicId, title, advisorDID);
    }

    // 2. Sinh viên nộp báo cáo
    function submitReport(
        string memory studentDID,
        string memory topicId,
        string memory ipfsCID,
        uint256 timestamp
    ) public {
        require(topics[topicId].exists, "Topic does not exist");

        Submission memory newSubmission = Submission({
            studentDID: studentDID,
            topicId: topicId,
            ipfsCID: ipfsCID,
            timestamp: timestamp,
            grade: 0,
            feedback: "",
            graded: false
        });

        submissions[topicId][studentDID].push(newSubmission);

        emit ReportSubmitted(studentDID, topicId, ipfsCID);
    }

    // 3. Giảng viên chốt điểm
    function finalizeGrade(
        string memory studentDID,
        string memory topicId,
        uint8 grade,
        string memory feedback,
        uint256 submissionIndex
    ) public {
        require(topics[topicId].exists, "Topic does not exist");
        require(
            submissions[topicId][studentDID].length > submissionIndex,
            "Invalid submission index"
        );
        require(
            !submissions[topicId][studentDID][submissionIndex].graded,
            "Submission already graded"
        );

        submissions[topicId][studentDID][submissionIndex].grade = grade;
        submissions[topicId][studentDID][submissionIndex].feedback = feedback;
        submissions[topicId][studentDID][submissionIndex].graded = true;

        emit GradeFinalized(studentDID, topicId, grade);
    }

    // 4. Lấy danh sách đề tài của giảng viên
    function getTopicsByAdvisor(string memory advisorDID) public view returns (string[] memory) {
        return advisorTopics[advisorDID];
    }

    // 5. Lấy lịch sử nộp bài của sinh viên cho 1 đề tài
    function getSubmissionHistory(string memory studentDID, string memory topicId)
        public
        view
        returns (Submission[] memory)
    {
        return submissions[topicId][studentDID];
    }
}
