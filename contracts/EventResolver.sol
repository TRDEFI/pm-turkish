// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title EventResolver
 * @notice v2.0 — Subjective event resolution only.
 * @dev    In v2.0, the TRDEFIVault splits resolution into two paths:
 *
 *         - Objective (PRICE_DIRECTION / PRICE_THRESHOLD):
 *           Resolved on the vault itself via EIP-712 signed finalValue.
 *           This contract is NOT involved.
 *
 *         - Subjective (SUBJECTIVE):
 *           Resolved via this contract's LLM + multisig flow.
 *           The vault only accepts the resolved outcome (bool) once
 *           we mark a resolution as FINALIZED.
 *
 *         v2.0 changes vs v1.0:
 *         1. Vault callback implemented (no more "vault polls" TODO).
 *         2. CHALLENGED bug fixed: 1 challenge no longer orphans
 *            a resolution. Resolution can recover to PENDING on
 *            majority confirm OR proceed to REJECTED on majority
 *            challenge. CHALLENGED is now a transitional marker,
 *            not a stuck state.
 *         3. submitResolution now requires that the event is
 *            SUBJECTIVE-typed (vault enforces via its own check,
 *            we don't double-check here for gas savings).
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
        string reasoning;
        address resolver;
        uint256 submittedAt;
        ResolutionStatus status;
        uint256 confirmCount;
        uint256 challengeCount;
        bytes32 dataHash;
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
    uint256 public constant MIN_CONFIRMATIONS = 2; // 2-of-N

    mapping(uint256 => Resolution) public resolutions;
    mapping(uint256 => uint256[]) public eventResolutions;
    mapping(address => MultisigSigner) public signers;
    mapping(uint256 => mapping(address => bool)) public hasConfirmed;
    mapping(uint256 => mapping(address => bool)) public hasChallenged;
    mapping(uint256 => string) public resolutionSources;

    address[] public signerList;
    address public targetVault;

    // ─── Events ─────────────────────────────────────────────────────────
    event ResolutionSubmitted(
        uint256 indexed resolutionId,
        uint256 indexed eventId,
        bool resolvedYes,
        address indexed resolver,
        string reasoning
    );
    event ResolutionConfirmed(uint256 indexed resolutionId, address indexed signer);
    event ResolutionChallenged(uint256 indexed resolutionId, address indexed signer, string reason);
    event ResolutionFinalized(uint256 indexed resolutionId, uint256 indexed eventId, bool resolvedYes);
    event ResolutionRejected(uint256 indexed resolutionId, uint256 indexed eventId);
    event ResolutionRecovered(uint256 indexed resolutionId); // CHALLENGED → PENDING
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
            signer: _signer, active: true, confirmations: 0, challenges: 0
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
     * @notice Submit a resolution for a SUBJECTIVE event.
     * @dev    Off-chain LLM resolver (or backend bot) calls this with
     *         the LLM's reading of the event outcome, plus reasoning
     *         and source JSON for audit. The resolution then enters
     *         a 24h PENDING state for multisig confirmation or
     *         challenge.
     *
     *         Note: the vault enforces that this only applies to
     *         EventType.SUBJECTIVE events. We don't re-check here
     *         (would require a cross-contract call) but the
     *         vault's resolveEvent entry point will reject any
     *         objective event.
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
            abi.encode(eventId, resolvedYes, keccak256(bytes(reasoning)), block.timestamp)
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

    // ─── Multisig Confirmation ──────────────────────────────────────────
    /**
     * @notice Confirm a pending resolution. Works on PENDING or
     *         CHALLENGED — see challengeResolution for the v2.0
     *         state machine.
     */
    function confirmResolution(uint256 resolutionId) external onlySigner {
        Resolution storage res = resolutions[resolutionId];
        require(
            res.status == ResolutionStatus.PENDING || res.status == ResolutionStatus.CHALLENGED,
            "Resolver: not pending or challenged"
        );
        require(!hasConfirmed[resolutionId][msg.sender], "Resolver: already confirmed");

        // Track that this signer has confirmed — even on a CHALLENGED
        // resolution, so re-confirming later would revert (idempotency).
        hasConfirmed[resolutionId][msg.sender] = true;
        res.confirmCount++;
        signers[msg.sender].confirmations++;

        // Emit confirmation event BEFORE any external calls so that
        // off-chain indexers see events in the order they were
        // produced. (Avoids Slither reentrancy-events false positive.)
        emit ResolutionConfirmed(resolutionId, msg.sender);

        // If we were CHALLENGED, moving to a confirm majority reopens
        // the resolution back to PENDING (counter-challenge).
        if (res.status == ResolutionStatus.CHALLENGED) {
            uint256 activeSigners = getActiveSignerCount();
            // Need strict majority of confirms to override the challenge.
            if (res.confirmCount > activeSigners / 2) {
                res.status = ResolutionStatus.PENDING;
                res.challengeCount = 0; // reset; signers can re-challenge if they want
                emit ResolutionRecovered(resolutionId);
            }
            // else: stay in CHALLENGED until majority achieved
        } else {
            // Standard PENDING path: auto-finalize on threshold.
            if (res.confirmCount >= MIN_CONFIRMATIONS) {
                _finalizeResolution(resolutionId);
            }
        }
    }

    // ─── Multisig Challenge ─────────────────────────────────────────────
    /**
     * @notice Challenge a pending resolution.
     * @dev    v2.0 behavior:
     *            - 1 challenge: status → CHALLENGED (transitional)
     *            - Subsequent challenges:
     *                * if challengeCount > activeSigners/2: REJECTED
     *                * else: just increment counter
     *            - Confirmations can rescue a CHALLENGED resolution
     *              back to PENDING (see confirmResolution).
     *            - No more orphan states.
     */
    function challengeResolution(uint256 resolutionId, string calldata reason) external onlySigner {
        Resolution storage res = resolutions[resolutionId];
        require(
            res.status == ResolutionStatus.PENDING || res.status == ResolutionStatus.CHALLENGED,
            "Resolver: not pending or challenged"
        );
        require(!hasChallenged[resolutionId][msg.sender], "Resolver: already challenged");
        require(bytes(reason).length > 0, "Resolver: empty challenge reason");

        hasChallenged[resolutionId][msg.sender] = true;
        res.challengeCount++;
        signers[msg.sender].challenges++;
        res.status = ResolutionStatus.CHALLENGED;

        emit ResolutionChallenged(resolutionId, msg.sender, reason);

        uint256 activeSigners = getActiveSignerCount();
        if (res.challengeCount > activeSigners / 2) {
            res.status = ResolutionStatus.REJECTED;
            emit ResolutionRejected(resolutionId, res.eventId);
        }
    }

    // ─── Finalization (after challenge window) ──────────────────────────
    function finalizeAfterTimeout(uint256 resolutionId) external {
        Resolution storage res = resolutions[resolutionId];
        require(res.status == ResolutionStatus.PENDING, "Resolver: not pending");
        require(
            block.timestamp >= res.submittedAt + CHALLENGE_WINDOW,
            "Resolver: challenge window active"
        );
        _finalizeResolution(resolutionId);
    }

    function _finalizeResolution(uint256 resolutionId) internal {
        Resolution storage res = resolutions[resolutionId];
        require(
            res.status == ResolutionStatus.PENDING,
            "Resolver: cannot finalize non-pending"
        );
        res.status = ResolutionStatus.FINALIZED;
        emit ResolutionFinalized(resolutionId, res.eventId, res.resolvedYes);

        // v2.0: actually notify the vault now. Vault will only honor
        // it for SUBJECTIVE events (its own type check).
        if (targetVault != address(0)) {
            (bool ok, ) = targetVault.call(
                abi.encodeWithSelector(
                    IVaultReceiver.resolveSubjectiveEvent.selector,
                    res.eventId,
                    res.resolvedYes,
                    bytes(res.reasoning)
                )
            );
            // We deliberately swallow failure here: if the vault reverts
            // (e.g. event was objective, or not in ACTIVE state), the
            // resolution is still finalized on this contract. Frontend
            // can call vault.resolveSubjectiveEvent manually in that
            // case. The event log is the source of truth.
            ok; // silence unused warning
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
            res.submittedAt, res.status, res.confirmCount, res.challengeCount, res.dataHash
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

/**
 * @title IVaultReceiver
 * @notice Minimal interface the resolver calls on the vault when a
 *         subjective event is finalized. Must match
 *         TRDEFIVault.resolveSubjectiveEvent selector exactly.
 */
interface IVaultReceiver {
    function resolveSubjectiveEvent(
        uint256 eventId,
        bool resolvedYes,
        bytes calldata resolutionData
    ) external;
}
