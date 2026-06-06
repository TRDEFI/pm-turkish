// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title IEventResolver
 * @notice Interface for the EventResolver contract (subjective events only)
 */
interface IEventResolver {
    function isResolutionFinalized(uint256 resolutionId) external view returns (bool);
    function getResolution(uint256 resolutionId) external view returns (
        uint256 eventId,
        bool resolvedYes,
        string memory reasoning,
        address resolver,
        uint256 submittedAt,
        uint8 status,
        uint256 confirmCount,
        uint256 challengeCount,
        bytes32 dataHash
    );
}

/**
 * @title TRDEFIVault
 * @notice Parimutuel prediction market vault — Polygon + USDC
 * @dev v2.0 — Reference-point resolution model.
 *
 *      Two resolution paths:
 *
 *      1. OBJECTIVE events (PRICE_DIRECTION / PRICE_THRESHOLD):
 *         Resolved mechanically by comparing a signed finalValue
 *         against the event's openingPrice. No LLM, no dispute window
 *         in the normal path. Off-chain oracle (operator) signs the
 *         finalValue with EIP-712; the on-chain check is a single
 *         signature recovery + arithmetic comparison.
 *
 *      2. SUBJECTIVE events:
 *         Resolved via the linked EventResolver contract (LLM +
 *         multisig confirm + 24h challenge window). Same flow as v1.
 *
 *      Why this split:
 *      - Most events (price direction, threshold) have observable
 *        ground truth → no need for dispute game.
 *      - Truly subjective events (e.g. "best film of the week")
 *        keep the v1 dispute flow as a fallback.
 *      - Removes 24/7 multisig liveness requirement for the common
 *        case; reserves it for the rare subjective event.
 */
contract TRDEFIVault is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ─── Constants ──────────────────────────────────────────────────────
    IERC20 public immutable USDC;
    uint256 public constant PLATFORM_FEE_BPS = 1000; // 10%
    uint256 public constant MIN_BET = 1e6;           // 1 USDC
    uint256 public constant MAX_BET = 100_000e6;     // 100,000 USDC
    uint256 public constant MIN_LIQUIDITY = 10e6;     // 10 USDC minimum pool

    /// Maximum threshold for PRICE_THRESHOLD events: 50% (5000 bps).
    uint256 public constant MAX_THRESHOLD_BPS = 5000;

    // ─── Enums ──────────────────────────────────────────────────────────
    enum BetSide { YES, NO }
    enum EventStatus { ACTIVE, RESOLVED, DRAWN, CANCELLED }

    /// Objective = resolved by signed numeric comparison.
    /// Subjective = resolved by EventResolver (LLM + multisig).
    enum EventType { SUBJECTIVE, PRICE_DIRECTION, PRICE_THRESHOLD }

    /// GT = YES if finalValue > openingPrice * (1 + thresholdBps/10000)
    /// LT = YES if finalValue < openingPrice * (1 - thresholdBps/10000)
    enum Comparator { GT, LT }

    // ─── EIP-712 ────────────────────────────────────────────────────────
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant ORACLE_TYPEHASH = keccak256(
        "OracleResolution(uint256 eventId,uint256 finalValue,uint256 deadline)"
    );
    bytes32 private immutable _domainSeparator;

    // ─── Structs ────────────────────────────────────────────────────────
    struct Event {
        uint256 id;
        string question;
        string category;
        uint256 deadline;
        uint256 openingPrice;        // Reference point — now USED in resolution
        EventType eventType;         // v2.0 addition
        Comparator comparator;       // v2.0 — only for PRICE_THRESHOLD
        uint256 thresholdBps;        // v2.0 — basis points (0 for DIRECTION)
        EventStatus status;
        bool resolvedYes;
        uint256 totalYesBets;
        uint256 totalNoBets;
        uint256 yesBetCount;
        uint256 noBetCount;
        uint256 createdAt;
        uint256 resolvedAt;
        bytes32 resolutionHash;      // hash of resolution data (audit trail)
        uint256 finalValue;          // v2.0 — value used in objective resolution
    }

    struct Bet {
        uint256 eventId;
        address user;
        BetSide side;
        uint256 amount;
        uint256 timestamp;
        bool claimed;
    }

    struct UserBalance {
        uint256 deposited;
        uint256 withdrawn;
        uint256 won;
        uint256 lost;
        uint256 betCount;
    }

    // ─── State ──────────────────────────────────────────────────────────
    uint256 public nextEventId = 1;
    uint256 public nextBetId = 1;
    uint256 public totalPlatformFees;
    address public eventResolver;
    mapping(address => bool) public isResolver;          // subjective-event resolvers (kept for backwards compat)
    mapping(address => bool) public isTrustedOracle;     // v2.0 — signers for objective resolution

    mapping(uint256 => Event) public events;
    mapping(uint256 => Bet) public bets;
    mapping(address => UserBalance) public userBalances;
    mapping(uint256 => uint256[]) public eventBets;
    mapping(address => uint256[]) public userBets;

    // ─── Events ─────────────────────────────────────────────────────────
    event EventCreated(
        uint256 indexed eventId,
        string question,
        string category,
        uint256 deadline,
        uint256 openingPrice,
        EventType eventType,
        Comparator comparator,
        uint256 thresholdBps
    );
    event BetPlaced(
        uint256 indexed betId,
        uint256 indexed eventId,
        address indexed user,
        BetSide side,
        uint256 amount
    );
    event EventResolved(
        uint256 indexed eventId,
        bool resolvedYes,
        uint256 totalYesBets,
        uint256 totalNoBets,
        uint256 platformFee,
        bytes32 resolutionHash,
        uint256 finalValue
    );
    event WinningsClaimed(
        uint256 indexed betId,
        uint256 indexed eventId,
        address indexed user,
        uint256 amount
    );
    event EventDrawn(uint256 indexed eventId, string reason);
    event EventCancelled(uint256 indexed eventId, string reason);
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event ResolverAdded(address indexed resolver);
    event ResolverRemoved(address indexed resolver);
    event PlatformFeeWithdrawn(address indexed owner, uint256 amount);
    event EventResolverSet(address indexed resolver);
    event TrustedOracleAdded(address indexed oracle);
    event TrustedOracleRemoved(address indexed oracle);

    // ─── Modifiers ──────────────────────────────────────────────────────
    modifier onlyResolver() {
        require(isResolver[msg.sender], "TRDEFI: not authorized resolver");
        _;
    }

    modifier onlyTrustedOracle() {
        require(isTrustedOracle[msg.sender], "TRDEFI: not a trusted oracle");
        _;
    }

    modifier eventExists(uint256 _eventId) {
        require(events[_eventId].id != 0, "TRDEFI: event does not exist");
        _;
    }

    modifier eventActive(uint256 _eventId) {
        require(events[_eventId].status == EventStatus.ACTIVE, "TRDEFI: event not active");
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "TRDEFI: invalid USDC");
        USDC = IERC20(_usdc);
        _domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("TRDEFIVault")),
                keccak256(bytes("2")),
                block.chainid,
                address(this)
            )
        );
    }

    // ─── Admin: Resolvers (subjective events only) ──────────────────────
    function addResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "TRDEFI: invalid address");
        require(!isResolver[_resolver], "TRDEFI: already a resolver");
        isResolver[_resolver] = true;
        emit ResolverAdded(_resolver);
    }

    function removeResolver(address _resolver) external onlyOwner {
        require(isResolver[_resolver], "TRDEFI: not a resolver");
        isResolver[_resolver] = false;
        emit ResolverRemoved(_resolver);
    }

    function setEventResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "TRDEFI: invalid resolver");
        eventResolver = _resolver;
        emit EventResolverSet(_resolver);
    }

    function removeEventResolver() external onlyOwner {
        eventResolver = address(0);
        emit EventResolverSet(address(0));
    }

    // ─── Admin: Trusted Oracles (objective events) ──────────────────────
    /**
     * @notice Add a trusted oracle address. Oracle signs finalValue for
     *         objective events using EIP-712 typed data.
     * @dev    Recommended: use a multisig (e.g. Safe) as the oracle for
     *         production. Single-key oracles are acceptable for low-value
     *         markets; high-value markets should rotate to 2-of-N.
     */
    function addTrustedOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "TRDEFI: invalid oracle");
        require(!isTrustedOracle[_oracle], "TRDEFI: already an oracle");
        isTrustedOracle[_oracle] = true;
        emit TrustedOracleAdded(_oracle);
    }

    function removeTrustedOracle(address _oracle) external onlyOwner {
        require(isTrustedOracle[_oracle], "TRDEFI: not an oracle");
        isTrustedOracle[_oracle] = false;
        emit TrustedOracleRemoved(_oracle);
    }

    // ─── Admin: Emergency ───────────────────────────────────────────────
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── User: Deposit / Withdraw ───────────────────────────────────────
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "TRDEFI: amount must be > 0");
        userBalances[msg.sender].deposited += amount;
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "TRDEFI: amount must be > 0");
        uint256 available = getAvailableBalance(msg.sender);
        require(amount <= available, "TRDEFI: insufficient available balance");
        userBalances[msg.sender].withdrawn += amount;
        USDC.safeTransfer(msg.sender, amount);
        emit Withdrawal(msg.sender, amount);
    }

    function getAvailableBalance(address _user) public view returns (uint256) {
        UserBalance memory ub = userBalances[_user];
        uint256 locked = getUserLockedBalance(_user);
        uint256 deposited = ub.deposited;
        uint256 withdrawn = ub.withdrawn;
        uint256 won = ub.won;

        if (deposited + won > withdrawn + locked) {
            return deposited + won - withdrawn - locked;
        }
        return 0;
    }

    function getUserLockedBalance(address _user) public view returns (uint256) {
        uint256[] memory ids = userBets[_user];
        uint256 locked;
        uint256 len = ids.length;
        for (uint256 i = 0; i < len; i++) {
            Bet storage bet = bets[ids[i]];
            if (!bet.claimed && events[bet.eventId].status == EventStatus.ACTIVE) {
                locked += bet.amount;
            }
        }
        return locked;
    }

    // ─── Owner: Create Event ────────────────────────────────────────────
    /**
     * @notice Create a new prediction event.
     * @param question      Human-readable question (e.g. "Will BTC be above $100k?")
     * @param category      Event category (crypto, forex, weather, etc.)
     * @param deadline      Unix timestamp when the event resolves
     * @param openingPrice  Reference point used by objective resolution
     * @param eventType     SUBJECTIVE | PRICE_DIRECTION | PRICE_THRESHOLD
     * @param comparator    GT | LT — only meaningful for PRICE_THRESHOLD
     * @param thresholdBps  Threshold in basis points (0 for PRICE_DIRECTION)
     *
     * Examples:
     *   "Will BTC move up?"       → DIRECTION,  GT, 0
     *   "Will BTC drop 5%?"       → THRESHOLD,  LT, 500
     *   "Will Dolar exceed 35.5?" → THRESHOLD,  GT, 0   (openingPrice = 35.5 * 1e6)
     */
    function createEvent(
        string calldata question,
        string calldata category,
        uint256 deadline,
        uint256 openingPrice,
        EventType eventType,
        Comparator comparator,
        uint256 thresholdBps
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(bytes(question).length > 0, "TRDEFI: empty question");
        require(deadline > block.timestamp, "TRDEFI: deadline must be in future");
        require(deadline <= block.timestamp + 7 days, "TRDEFI: deadline max 7 days");
        require(uint256(eventType) <= uint256(EventType.PRICE_THRESHOLD), "TRDEFI: invalid event type");
        require(thresholdBps <= MAX_THRESHOLD_BPS, "TRDEFI: threshold too high");
        if (eventType == EventType.PRICE_THRESHOLD) {
            require(thresholdBps > 0, "TRDEFI: threshold required for PRICE_THRESHOLD");
        } else if (eventType == EventType.PRICE_DIRECTION) {
            require(thresholdBps == 0, "TRDEFI: threshold must be 0 for PRICE_DIRECTION");
        }

        uint256 eventId = nextEventId++;
        events[eventId] = Event({
            id: eventId,
            question: question,
            category: category,
            deadline: deadline,
            openingPrice: openingPrice,
            eventType: eventType,
            comparator: comparator,
            thresholdBps: thresholdBps,
            status: EventStatus.ACTIVE,
            resolvedYes: false,
            totalYesBets: 0,
            totalNoBets: 0,
            yesBetCount: 0,
            noBetCount: 0,
            createdAt: block.timestamp,
            resolvedAt: 0,
            resolutionHash: bytes32(0),
            finalValue: 0
        });

        emit EventCreated(eventId, question, category, deadline, openingPrice, eventType, comparator, thresholdBps);
        return eventId;
    }

    // ─── User: Place Bet ────────────────────────────────────────────────
    function placeBet(
        uint256 eventId,
        BetSide side,
        uint256 amount
    ) external nonReentrant whenNotPaused eventExists(eventId) eventActive(eventId) {
        require(amount >= MIN_BET, "TRDEFI: bet below minimum");
        require(amount <= MAX_BET, "TRDEFI: bet above maximum");

        uint256 available = getAvailableBalance(msg.sender);
        require(amount <= available, "TRDEFI: insufficient available balance");

        require(block.timestamp < events[eventId].deadline, "TRDEFI: event deadline passed");

        Event storage ev = events[eventId];

        if (side == BetSide.YES) {
            ev.totalYesBets += amount;
            ev.yesBetCount++;
        } else {
            ev.totalNoBets += amount;
            ev.noBetCount++;
        }

        uint256 betId = nextBetId++;
        bets[betId] = Bet({
            eventId: eventId,
            user: msg.sender,
            side: side,
            amount: amount,
            timestamp: block.timestamp,
            claimed: false
        });

        eventBets[eventId].push(betId);
        userBets[msg.sender].push(betId);
        userBalances[msg.sender].betCount++;

        emit BetPlaced(betId, eventId, msg.sender, side, amount);
    }

    // ─── Resolution: Objective (EIP-712 signed finalValue) ──────────────
    /**
     * @notice Resolve an objective event using a signed finalValue.
     * @dev    Any trusted oracle may submit. The contract recovers the
     *         signer from the EIP-712 digest and checks `isTrustedOracle`.
     *         Replay protection: digest binds eventId, finalValue, deadline
     *         and (via domain) chainId + contract address.
     *
     *         Resolution logic:
     *           PRICE_DIRECTION:
     *             finalValue > openingPrice → YES
     *             finalValue < openingPrice → NO
     *             finalValue == openingPrice → DRAW (refund)
     *           PRICE_THRESHOLD:
     *             comparator=GT, finalValue >= openingPrice*(1+t/10000) → YES
     *             comparator=LT, finalValue <= openingPrice*(1-t/10000) → YES
     *             move in opposite direction by ≥ threshold → NO
     *             move < threshold in either direction → DRAW
     */
    function resolveEventWithProof(
        uint256 eventId,
        uint256 finalValue,
        bytes calldata proof
    ) external onlyTrustedOracle nonReentrant eventExists(eventId) eventActive(eventId) {
        Event storage ev = events[eventId];
        require(
            ev.eventType == EventType.PRICE_DIRECTION || ev.eventType == EventType.PRICE_THRESHOLD,
            "TRDEFI: not an objective event"
        );
        require(block.timestamp >= ev.deadline, "TRDEFI: deadline not reached");
        require(_verifyOracleProof(eventId, finalValue, ev.deadline, proof), "TRDEFI: invalid oracle proof");

        (bool resolvedYes, bool isDraw) = _evaluateObjective(ev, finalValue);

        if (isDraw) {
            ev.status = EventStatus.DRAWN;
            ev.resolvedAt = block.timestamp;
            ev.finalValue = finalValue;
            ev.resolutionHash = keccak256(
                abi.encodePacked(eventId, finalValue, ev.deadline, block.timestamp, msg.sender)
            );
            emit EventDrawn(eventId, "Final value did not exceed threshold");
            return;
        }

        uint256 losingPool = resolvedYes ? ev.totalNoBets : ev.totalYesBets;
        uint256 platformFee = (losingPool * PLATFORM_FEE_BPS) / 10000;

        ev.status = EventStatus.RESOLVED;
        ev.resolvedYes = resolvedYes;
        ev.resolvedAt = block.timestamp;
        ev.finalValue = finalValue;
        ev.resolutionHash = keccak256(
            abi.encodePacked(eventId, finalValue, ev.deadline, block.timestamp, msg.sender, resolvedYes)
        );
        totalPlatformFees += platformFee;

        emit EventResolved(
            eventId, resolvedYes, ev.totalYesBets, ev.totalNoBets, platformFee, ev.resolutionHash, finalValue
        );
    }

    /**
     * @notice Read-only helper: given a hypothetical finalValue, what
     *         would the resolution be? Useful for the frontend to show
     *         "if X happens, YES wins" before the actual resolution.
     */
    function previewResolution(uint256 eventId, uint256 finalValue)
        external
        view
        eventExists(eventId)
        returns (bool resolvedYes, bool isDraw, string memory outcome)
    {
        Event storage ev = events[eventId];
        require(ev.eventType != EventType.SUBJECTIVE, "TRDEFI: subjective event");
        (resolvedYes, isDraw) = _evaluateObjective(ev, finalValue);
        outcome = isDraw
            ? "DRAW (refund)"
            : (resolvedYes ? "YES wins" : "NO wins");
    }

    function _evaluateObjective(Event storage ev, uint256 finalValue)
        internal
        view
        returns (bool resolvedYes, bool isDraw)
    {
        if (ev.eventType == EventType.PRICE_DIRECTION) {
            if (finalValue == ev.openingPrice) {
                return (false, true);
            }
            return (finalValue > ev.openingPrice, false);
        }

        // PRICE_THRESHOLD
        // thresholdUp = openingPrice * (10000 + thresholdBps) / 10000
        // thresholdDown = openingPrice * (10000 - thresholdBps) / 10000
        uint256 t = ev.thresholdBps;
        uint256 up = (ev.openingPrice * (10000 + t)) / 10000;
        uint256 down = ev.openingPrice >= t * ev.openingPrice / 10000
            ? ev.openingPrice - (ev.openingPrice * t) / 10000
            : 0; // underflow guard for very small opening prices

        if (ev.comparator == Comparator.GT) {
            if (finalValue >= up) return (true, false);
            if (finalValue <= down) return (false, false);
            return (false, true);
        } else {
            // Comparator.LT
            if (finalValue <= down) return (true, false);
            if (finalValue >= up) return (false, false);
            return (false, true);
        }
    }

    // ─── Resolution: Subjective (LLM + multisig via EventResolver) ──────
    /**
     * @notice Resolve a subjective event. Only callable by an authorized
     *         resolver. The actual decision flow is:
     *           1. Resolver submits resolution on EventResolver contract
     *           2. 24h challenge window with multisig confirmations
     *           3. Once finalized, an authorized resolver calls this
     *              function with the (bool, data) outcome.
     *
     *         Only for EventType.SUBJECTIVE. Objective events MUST go
     *         through resolveEventWithProof.
     */
    function resolveEvent(
        uint256 eventId,
        bool resolvedYes,
        string calldata resolutionData
    ) external onlyResolver nonReentrant eventExists(eventId) eventActive(eventId) {
        Event storage ev = events[eventId];
        require(ev.eventType == EventType.SUBJECTIVE, "TRDEFI: not a subjective event");
        require(block.timestamp >= ev.deadline, "TRDEFI: deadline not reached");

        // Check liquidity
        if (ev.totalYesBets == 0 || ev.totalNoBets == 0) {
            ev.status = EventStatus.DRAWN;
            ev.resolvedAt = block.timestamp;
            ev.resolutionHash = keccak256(
                abi.encodePacked(eventId, resolvedYes, resolutionData, block.timestamp)
            );
            emit EventDrawn(eventId, "Insufficient liquidity - only one side");
            return;
        }

        uint256 losingPool = resolvedYes ? ev.totalNoBets : ev.totalYesBets;
        uint256 platformFee = (losingPool * PLATFORM_FEE_BPS) / 10000;

        ev.status = EventStatus.RESOLVED;
        ev.resolvedYes = resolvedYes;
        ev.resolvedAt = block.timestamp;
        ev.resolutionHash = keccak256(
            abi.encodePacked(eventId, resolvedYes, resolutionData, block.timestamp)
        );
        totalPlatformFees += platformFee;

        emit EventResolved(
            eventId, resolvedYes, ev.totalYesBets, ev.totalNoBets, platformFee, ev.resolutionHash, 0
        );
    }

    // ─── Callback: EventResolver (subjective events) ────────────────────
    /**
     * @notice Called by the linked EventResolver contract when a
     *         SUBJECTIVE event resolution reaches FINALIZED state.
     *         Writes the outcome into the on-chain event and applies
     *         the same parimutuel math as the manual resolveEvent path.
     * @dev    Only callable by the configured eventResolver. Only
     *         effective for SUBJECTIVE-typed events.
     *
     *         If the vault state is inconsistent (e.g. one-sided
     *         liquidity causing a draw), the function draws the event
     *         instead. If the event is already resolved (race with
     *         manual resolveEvent), the call is a no-op.
     */
    function resolveSubjectiveEvent(
        uint256 eventId,
        bool resolvedYes,
        bytes calldata resolutionData
    ) external nonReentrant eventExists(eventId) eventActive(eventId) {
        require(msg.sender == eventResolver, "TRDEFI: only event resolver");
        Event storage ev = events[eventId];
        require(ev.eventType == EventType.SUBJECTIVE, "TRDEFI: not a subjective event");
        require(block.timestamp >= ev.deadline, "TRDEFI: deadline not reached");

        if (ev.totalYesBets == 0 || ev.totalNoBets == 0) {
            ev.status = EventStatus.DRAWN;
            ev.resolvedAt = block.timestamp;
            ev.resolutionHash = keccak256(
                abi.encodePacked(eventId, resolvedYes, resolutionData, block.timestamp)
            );
            emit EventDrawn(eventId, "Insufficient liquidity - only one side");
            return;
        }

        uint256 losingPool = resolvedYes ? ev.totalNoBets : ev.totalYesBets;
        uint256 platformFee = (losingPool * PLATFORM_FEE_BPS) / 10000;

        ev.status = EventStatus.RESOLVED;
        ev.resolvedYes = resolvedYes;
        ev.resolvedAt = block.timestamp;
        ev.resolutionHash = keccak256(
            abi.encodePacked(eventId, resolvedYes, resolutionData, block.timestamp)
        );
        totalPlatformFees += platformFee;

        emit EventResolved(
            eventId, resolvedYes, ev.totalYesBets, ev.totalNoBets, platformFee, ev.resolutionHash, 0
        );
    }

    // ─── Admin: Draw / Cancel ───────────────────────────────────────────
    function drawEvent(uint256 eventId, string calldata reason)
        external
        onlyOwner
        nonReentrant
        eventExists(eventId)
        eventActive(eventId)
    {
        Event storage ev = events[eventId];
        ev.status = EventStatus.DRAWN;
        ev.resolvedAt = block.timestamp;
        ev.resolutionHash = keccak256(abi.encodePacked(eventId, "DRAW", reason, block.timestamp));
        emit EventDrawn(eventId, reason);
    }

    function cancelEvent(uint256 eventId, string calldata reason)
        external
        onlyOwner
        nonReentrant
        eventExists(eventId)
        eventActive(eventId)
    {
        Event storage ev = events[eventId];
        ev.status = EventStatus.CANCELLED;
        ev.resolvedAt = block.timestamp;
        ev.resolutionHash = keccak256(abi.encodePacked(eventId, "CANCEL", reason, block.timestamp));
        emit EventCancelled(eventId, reason);
    }

    // ─── User: Claim Winnings ───────────────────────────────────────────
    function claimWinnings(uint256 betId) external nonReentrant {
        Bet storage bet = bets[betId];
        require(bet.user == msg.sender, "TRDEFI: not your bet");
        require(!bet.claimed, "TRDEFI: already claimed");

        Event storage ev = events[bet.eventId];
        require(ev.status != EventStatus.ACTIVE, "TRDEFI: event not resolved");

        if (ev.status == EventStatus.DRAWN || ev.status == EventStatus.CANCELLED) {
            bet.claimed = true;
            USDC.safeTransfer(msg.sender, bet.amount);
            emit WinningsClaimed(betId, bet.eventId, msg.sender, bet.amount);
            return;
        }

        bool userWon = (bet.side == BetSide.YES && ev.resolvedYes) ||
                       (bet.side == BetSide.NO && !ev.resolvedYes);

        if (!userWon) {
            bet.claimed = true;
            userBalances[msg.sender].lost += bet.amount;
            emit WinningsClaimed(betId, bet.eventId, msg.sender, 0);
            return;
        }

        uint256 losingPool = ev.resolvedYes ? ev.totalNoBets : ev.totalYesBets;
        uint256 platformFee = (losingPool * PLATFORM_FEE_BPS) / 10000;
        uint256 netLosingPool = losingPool - platformFee;
        uint256 winningPool = (ev.resolvedYes ? ev.totalYesBets : ev.totalNoBets) + netLosingPool;
        uint256 totalWinningBets = ev.resolvedYes ? ev.totalYesBets : ev.totalNoBets;

        uint256 winnings = (bet.amount * winningPool) / totalWinningBets;

        bet.claimed = true;
        userBalances[msg.sender].won += winnings;
        USDC.safeTransfer(msg.sender, winnings);

        emit WinningsClaimed(betId, bet.eventId, msg.sender, winnings);
    }

    function claimMultipleWinnings(uint256[] calldata betIds) external nonReentrant {
        uint256 len = betIds.length;
        for (uint256 i = 0; i < len; i++) {
            _claimSingle(betIds[i]);
        }
    }

    function _claimSingle(uint256 betId) internal {
        Bet storage bet = bets[betId];
        require(bet.user == msg.sender, "TRDEFI: not your bet");
        require(!bet.claimed, "TRDEFI: already claimed");

        Event storage ev = events[bet.eventId];
        require(ev.status != EventStatus.ACTIVE, "TRDEFI: event not resolved");

        if (ev.status == EventStatus.DRAWN || ev.status == EventStatus.CANCELLED) {
            bet.claimed = true;
            USDC.safeTransfer(msg.sender, bet.amount);
            emit WinningsClaimed(betId, bet.eventId, msg.sender, bet.amount);
            return;
        }

        bool userWon = (bet.side == BetSide.YES && ev.resolvedYes) ||
                       (bet.side == BetSide.NO && !ev.resolvedYes);

        if (!userWon) {
            bet.claimed = true;
            userBalances[msg.sender].lost += bet.amount;
            emit WinningsClaimed(betId, bet.eventId, msg.sender, 0);
            return;
        }

        uint256 losingPool = ev.resolvedYes ? ev.totalNoBets : ev.totalYesBets;
        uint256 platformFee = (losingPool * PLATFORM_FEE_BPS) / 10000;
        uint256 netLosingPool = losingPool - platformFee;
        uint256 winningPool = (ev.resolvedYes ? ev.totalYesBets : ev.totalNoBets) + netLosingPool;
        uint256 totalWinningBets = ev.resolvedYes ? ev.totalYesBets : ev.totalNoBets;

        uint256 winnings = (bet.amount * winningPool) / totalWinningBets;

        bet.claimed = true;
        userBalances[msg.sender].won += winnings;
        USDC.safeTransfer(msg.sender, winnings);

        emit WinningsClaimed(betId, bet.eventId, msg.sender, winnings);
    }

    // ─── Admin: Withdraw Platform Fees ──────────────────────────────────
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 amount = totalPlatformFees;
        require(amount > 0, "TRDEFI: no fees to withdraw");
        totalPlatformFees = 0;
        USDC.safeTransfer(owner(), amount);
        emit PlatformFeeWithdrawn(owner(), amount);
    }

    // ─── View Functions ─────────────────────────────────────────────────
    function getEventDetails(uint256 eventId)
        external
        view
        eventExists(eventId)
        returns (
            uint256 id,
            string memory question,
            string memory category,
            uint256 deadline,
            uint256 openingPrice,
            EventType eventType,
            Comparator comparator,
            uint256 thresholdBps,
            EventStatus status,
            bool resolvedYes,
            uint256 totalYesBets,
            uint256 totalNoBets,
            uint256 yesBetCount,
            uint256 noBetCount,
            uint256 finalValue,
            uint256 resolvedAt,
            bytes32 resolutionHash
        )
    {
        Event storage ev = events[eventId];
        return (
            ev.id, ev.question, ev.category, ev.deadline, ev.openingPrice,
            ev.eventType, ev.comparator, ev.thresholdBps, ev.status, ev.resolvedYes,
            ev.totalYesBets, ev.totalNoBets, ev.yesBetCount, ev.noBetCount,
            ev.finalValue, ev.resolvedAt, ev.resolutionHash
        );
    }

    function getBet(uint256 betId) external view returns (
        uint256 eventId, address user, BetSide side, uint256 amount, uint256 timestamp, bool claimed
    ) {
        Bet storage bet = bets[betId];
        return (bet.eventId, bet.user, bet.side, bet.amount, bet.timestamp, bet.claimed);
    }

    function getUserBetIds(address _user) external view returns (uint256[] memory) {
        return userBets[_user];
    }

    function getEventBetIds(uint256 eventId) external view returns (uint256[] memory) {
        return eventBets[eventId];
    }

    function calculatePotentialWinnings(uint256 betId) external view returns (uint256) {
        Bet storage bet = bets[betId];
        Event storage ev = events[bet.eventId];
        require(ev.status != EventStatus.ACTIVE, "TRDEFI: event not resolved");
        if (ev.status == EventStatus.DRAWN || ev.status == EventStatus.CANCELLED) {
            return bet.amount;
        }
        bool userWon = (bet.side == BetSide.YES && ev.resolvedYes) ||
                       (bet.side == BetSide.NO && !ev.resolvedYes);
        if (!userWon) return 0;

        uint256 losingPool = ev.resolvedYes ? ev.totalNoBets : ev.totalYesBets;
        uint256 platformFee = (losingPool * PLATFORM_FEE_BPS) / 10000;
        uint256 netLosingPool = losingPool - platformFee;
        uint256 winningPool = (ev.resolvedYes ? ev.totalYesBets : ev.totalNoBets) + netLosingPool;
        uint256 totalWinningBets = ev.resolvedYes ? ev.totalYesBets : ev.totalNoBets;

        return (bet.amount * winningPool) / totalWinningBets;
    }

    function getVaultBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    function getActiveEvents() external view returns (uint256[] memory) {
        uint256 total = nextEventId - 1;
        uint256[] memory temp = new uint256[](total);
        uint256 count = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (events[i].status == EventStatus.ACTIVE) {
                temp[count++] = i;
            }
        }
        uint256[] memory active = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            active[i] = temp[i];
        }
        return active;
    }

    // ─── EIP-712 Oracle Proof Verification ──────────────────────────────
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator;
    }

    /**
     * @notice Build the EIP-712 digest an oracle should sign.
     *         Exposed as a view helper so off-chain tools (and tests)
     *         can construct the same digest the contract will recover.
     */
    function oracleDigest(uint256 eventId, uint256 finalValue, uint256 deadline)
        external
        view
        returns (bytes32)
    {
        bytes32 structHash = keccak256(
            abi.encode(ORACLE_TYPEHASH, eventId, finalValue, deadline)
        );
        return _hashTypedDataV4(structHash);
    }

    function _verifyOracleProof(
        uint256 eventId,
        uint256 finalValue,
        uint256 deadline,
        bytes calldata proof
    ) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(ORACLE_TYPEHASH, eventId, finalValue, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = digest.recover(proof);
        return isTrustedOracle[recovered];
    }

    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator, structHash));
    }
}
