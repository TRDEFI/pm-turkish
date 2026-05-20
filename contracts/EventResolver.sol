// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title EventResolver
 * @notice LLM-driven event resolution with multisig fallback
 * @dev This contract acts as the oracle layer for TRDEFI prediction markets.
 *      LLM resolver submits resolution → multisig confirms → vault executes.
 *
 * Architecture:
 * 1. LLM resolver (off-chain) analyzes event outcome → submits resolution
 * 2. Resolution enters pending state with 24h challenge window
 * 3. Multisig signers can confirm or challenge
 * 4. After challenge window, resolution is final
 * 5. If challenged, multisig vote determines outcome
 */
contract EventResolver is Ownable2Step {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ─── Enums ──────────────────────────────────────────────────────────
    enum ResolutionStatus { PENDING, CONFIRMED, CHALLENGED, FINALIZED, REJECTED }

    // ─── Structs ────────────────────────────────────────────────────────
    struct Resolution {
        uint256 eventId;
        bool resolvedYes;
        string reasoning;          // LLM explanation + source references
        address resolver;          // LLM resolver address
        uint256 submittedAt;
        ResolutionStatus status;
        uint256 confirmCount;
        uint256 challengeCount;
        bytes32 dataHash;          // Hash of resolution data for audit
    }

    struct MultisigSigner {
        address signer;
        bool active;
        uint256 confirmations;
        uint256 challenges;
    }

    // ─── State ──────────────────────────────────────────────────────────
    uint256 public nextResolutionId = 1;
    uint256 public constant CHALLENGE_WINDOW = 24 hours;
    uint256 public constant MIN_CONFIRMATIONS = 2; // 2-of-N multisig

    mapping(uint256 => Resolution) public resolutions;
    mapping(uint256 => uint256[]) public eventResolutions; // eventId => resolutionIds
    mapping(address => MultisigSigner) public signers;
    mapping(uint256 => mapping(address => bool)) public hasConfirmed;
    mapping(uint256 => mapping(address => bool)) public hasChallenged;
    mapping(uint256 => string) public resolutionSources; // resolutionId => JSON sources

    address[] public signerList;

    // ─── Target vault (set after deployment) ────────────────────────────
    address public targetVault;

    // ─── Events ─────────────────────────────────────────────────────────
    event ResolutionSubmitted(
        uint256 resolutionId,
        uint256 eventId,
        bool resolvedYes,
        address indexed resolver,
        string reasoning
    );
    event ResolutionConfirmed(uint256 resolutionId, address indexed signer);
    event ResolutionChallenged(uint256 resolutionId, address indexed signer, string reason);
    event ResolutionFinalized(uint256 resolutionId, uint256 eventId, bool resolvedYes);
    event ResolutionRejected(uint256 resolutionId, uint256 eventId);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event VaultSet(address indexed vault);

    // ─── Modifiers ──────────────────────────────────────────────────────
    modifier onlySigner() {
        require(signers[msg.sender].active, "Resolver: not an active signer");
        _;
    }

    modifier onlyVault() {
        require(msg.sender == targetVault, "Resolver: only vault can call");
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Setup ──────────────────────────────────────────────────────────
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Resolver: invalid vault address");
        targetVault = _vault;
        emit VaultSet(_vault);
    }

    function addSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Resolver: invalid address");
        require(!signers[_signer].active, "Resolver: already a signer");
        signers[_signer] = MultisigSigner({
            signer: _signer,
            active: true,
            confirmations: 0,
            challenges: 0
        });
        signerList.push(_signer);
        emit SignerAdded(_signer);
    }

    function removeSigner(address _signer) external onlyOwner {
        require(signers[_signer].active, "Resolver: not an active signer");
        signers[_signer].active = false;
        emit SignerRemoved(_signer);
    }

    // ─── LLM Resolution Submission ──────────────────────────────────────
    /**
     * @notice Submit a resolution (called by LLM resolver or backend)
     * @param eventId The event ID to resolve
     * @param resolvedYes true = YES won, false = NO won
     * @param reasoning Human-readable explanation + source URLs
     * @param sourcesJson JSON string of source references (for audit)
     */
    function submitResolution(
        uint256 eventId,
        bool resolvedYes,
        string calldata reasoning,
        string calldata sourcesJson
    ) external returns (uint256) {
        require(bytes(reasoning).length > 0, "Resolver: empty reasoning");

        uint256 resolutionId = nextResolutionId++;
        bytes32 dataHash = keccak256(
            abi.encodePacked(eventId, resolvedYes, reasoning, block.timestamp)
        );

        resolutions[resolutionId] = Resolution({
            eventId: eventId,
            resolvedYes: resolvedYes,
            reasoning: reasoning,
            resolver: msg.sender,
            submittedAt: block.timestamp,
            status: ResolutionStatus.PENDING,
            confirmCount: 0,
            challengeCount: 0,
            dataHash: dataHash
        });

        resolutionSources[resolutionId] = sourcesJson;
        eventResolutions[eventId].push(resolutionId);

        emit ResolutionSubmitted(resolutionId, eventId, resolvedYes, msg.sender, reasoning);
        return resolutionId;
    }

    // ─── Multisig Confirmation / Challenge ──────────────────────────────
    /**
     * @notice Confirm a pending resolution
     */
    function confirmResolution(uint256 resolutionId) external onlySigner {
        Resolution storage res = resolutions[resolutionId];
        require(res.status == ResolutionStatus.PENDING, "Resolver: not pending");
        require(!hasConfirmed[resolutionId][msg.sender], "Resolver: already confirmed");

        hasConfirmed[resolutionId][msg.sender] = true;
        res.confirmCount++;
        signers[msg.sender].confirmations++;

        emit ResolutionConfirmed(resolutionId, msg.sender);

        // Auto-finalize if enough confirmations
        if (res.confirmCount >= MIN_CONFIRMATIONS) {
            _finalizeResolution(resolutionId);
        }
    }

    /**
     * @notice Challenge a pending resolution
     * @param reason Why the resolution is being challenged
     */
    function challengeResolution(uint256 resolutionId, string calldata reason) external onlySigner {
        Resolution storage res = resolutions[resolutionId];
        require(res.status == ResolutionStatus.PENDING, "Resolver: not pending");
        require(!hasChallenged[resolutionId][msg.sender], "Resolver: already challenged");

        hasChallenged[resolutionId][msg.sender] = true;
        res.challengeCount++;
        res.status = ResolutionStatus.CHALLENGED;
        signers[msg.sender].challenges++;

        emit ResolutionChallenged(resolutionId, msg.sender, reason);

        // If majority challenges, reject
        uint256 activeSigners = getActiveSignerCount();
        if (res.challengeCount > activeSigners / 2) {
            res.status = ResolutionStatus.REJECTED;
            emit ResolutionRejected(resolutionId, res.eventId);
        }
    }

    // ─── Finalization ───────────────────────────────────────────────────
    /**
     * @notice Finalize a resolution after challenge window expires
     * @dev Anyone can call this — it's permissionless after timeout
     */
    function finalizeAfterTimeout(uint256 resolutionId) external {
        Resolution storage res = resolutions[resolutionId];
        require(res.status == ResolutionStatus.PENDING, "Resolver: not pending");
        require(block.timestamp >= res.submittedAt + CHALLENGE_WINDOW, "Resolver: challenge window active");

        _finalizeResolution(resolutionId);
    }

    function _finalizeResolution(uint256 resolutionId) internal {
        Resolution storage res = resolutions[resolutionId];
        res.status = ResolutionStatus.FINALIZED;

        emit ResolutionFinalized(resolutionId, res.eventId, res.resolvedYes);

        // Notify vault (if set)
        if (targetVault != address(0)) {
            // In production, this would call the vault's resolveEvent function
            // For now, the vault polls this contract or we use a callback
        }
    }

    // ─── View Functions ─────────────────────────────────────────────────
    function getResolution(uint256 resolutionId) external view returns (
        uint256 eventId,
        bool resolvedYes,
        string memory reasoning,
        address resolver,
        uint256 submittedAt,
        ResolutionStatus status,
        uint256 confirmCount,
        uint256 challengeCount,
        bytes32 dataHash
    ) {
        Resolution memory res = resolutions[resolutionId];
        return (
            res.eventId, res.resolvedYes, res.reasoning, res.resolver,
            res.submittedAt, res.status, res.confirmCount, res.challengeCount,
            res.dataHash
        );
    }

    function getEventResolutions(uint256 eventId) external view returns (uint256[] memory) {
        return eventResolutions[eventId];
    }

    function getActiveSignerCount() public view returns (uint256) {
        uint256 count = 0;
        uint256 len = signerList.length;
        for (uint256 i = 0; i < len; i++) {
            if (signers[signerList[i]].active) count++;
        }
        return count;
    }

    function getSignerList() external view returns (address[] memory) {
        return signerList;
    }

    function isResolutionFinalized(uint256 resolutionId) external view returns (bool) {
        return resolutions[resolutionId].status == ResolutionStatus.FINALIZED;
    }

    function canFinalize(uint256 resolutionId) external view returns (bool) {
        Resolution memory res = resolutions[resolutionId];
        if (res.status != ResolutionStatus.PENDING) return false;
        if (res.confirmCount >= MIN_CONFIRMATIONS) return true;
        if (block.timestamp >= res.submittedAt + CHALLENGE_WINDOW) return true;
        return false;
    }
}
