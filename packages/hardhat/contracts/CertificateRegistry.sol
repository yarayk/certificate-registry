// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract CertificateRegistry {
    enum Status { Unregistered, Valid, Revoked }

    address public immutable teacher = msg.sender;
    mapping(bytes32 => Status) private statuses;

    event CertificateStatusChanged(bytes32 indexed fileHash, Status newStatus);

    modifier onlyTeacher() {
        require(msg.sender == teacher, "Only teacher");
        _;
    }

    function issueCertificate(bytes32 fileHash) external onlyTeacher {
        require(fileHash != bytes32(0), "Zero hash");
        require(statuses[fileHash] == Status.Unregistered, "Already registered");
        statuses[fileHash] = Status.Valid;
        emit CertificateStatusChanged(fileHash, Status.Valid);
    }

    function revokeCertificate(bytes32 fileHash) external onlyTeacher {
        require(statuses[fileHash] == Status.Valid, "Certificate not valid");
        statuses[fileHash] = Status.Revoked;
        emit CertificateStatusChanged(fileHash, Status.Revoked);
    }

    function getStatus(bytes32 fileHash) external view returns (Status) {
        return statuses[fileHash];
    }
}
