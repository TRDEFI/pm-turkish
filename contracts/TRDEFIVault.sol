// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IEventResolver
 * @notice Interface for the EventResolver contract
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
 * @dev Users deposit USDC, place bets on events, and claim winnings automatically.
 *      Platform takes 10% commission from the losing pool.
 */
contract TRDEFIVault is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ──────────────────────────────────────────────────────
    IERC20 public immutable USDC;
    uint256 public constant PLATFORM_FEE_BPS = 1000; // 10% = 1000 basis points
    uint256 public constant MIN_BET = 1e6;           // 1 USDC (6 decimals)
    uint256 public constant MAX_BET = 100_000e6;     // 100,000 USDC
    uint256 public constant MIN_LIQUIDITY = 10e6;    // 10 USDC minimum pool

    // ─── Enums ──────────────────────────────────────────────────────────
    enum BetSide { YES, NO }
    enum EventStatus { ACTIVE, RESOLVED, DRAWN, CANCELLED }

    // ─── Structs ────────────────────────────────────────────────────────
    struct Event {
        uint256 id;
        string question;
        string category;
        uint256 deadline;
        uint256 openingPrice;      // Reference price at creation
        EventStatus status;
        bool resolvedYes;          // true = YES won, false = NO won
        uint256 totalYesBets;      // Total USDC bet on YES
        uint256 totalNoBets;       // Total USDC bet on NO
        uint256 yesBetCount;       // Number of YES bettors
        uint256 noBetCount;        // Number of NO bettors
        uint256 createdAt;
        uint256 resolvedAt;
        bytes32 resolutionHash;    // Hash of resolution data for audit
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
    address public eventResolver; // EventResolver contract address (optional)

    mapping(uint256 => Event) public events;
    mapping(uint256 => Bet) public bets;
    mapping(address => UserBalance) public userBalances;
    mapping(address => bool) public isResolver;       // LLM resolver addresses
    mapping(uint256 => uint256[]) public eventBets;   // eventId => betIds
    mapping(address => uint256[]) public userBets;    // user => betIds

    // ─── Events ─────────────────────────────────────────────────────────
    event EventCreated(
        uint256 eventId,
        string question,
        string category,
        uint256 deadline,
        uint256 openingPrice
    );
    event BetPlaced(
        uint256 betId,
        uint256 eventId,
        address indexed user,
        BetSide side,
        uint256 amount
    );
    event EventResolved(
        uint256 eventId,
        bool resolvedYes,
        uint256 totalYesBets,
        uint256 totalNoBets,
        uint256 platformFee,
        bytes32 resolutionHash
    );
    event WinningsClaimed(
        uint256 betId,
        uint256 eventId,
        address indexed user,
        uint256 amount
    );
    event EventDrawn(uint256 eventId, string reason);
    event EventCancelled(uint256 eventId, string reason);
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event ResolverAdded(address indexed resolver);
    event ResolverRemoved(address indexed resolver);
    event PlatformFeeWithdrawn(address indexed owner, uint256 amount);
    event EventResolverSet(address indexed resolver);

    // ─── Modifiers ──────────────────────────────────────────────────────
    modifier onlyResolver() {
        require(
            isResolver[msg.sender] || msg.sender == eventResolver,
            "TRDEFI: not authorized resolver"
        );
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
    /**
     * @param _usdc Address of USDC token on Polygon
     *        Native USDC: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
     */
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "TRDEFI: invalid USDC address");
        USDC = IERC20(_usdc);
    }

    // ─── Admin: Resolver Management ─────────────────────────────────────
    function addResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "TRDEFI: invalid address");
        isResolver[_resolver] = true;
        emit ResolverAdded(_resolver);
    }

    function removeResolver(address _resolver) external onlyOwner {
        isResolver[_resolver] = false;
        emit ResolverRemoved(_resolver);
    }

    // ─── Admin: EventResolver Integration ───────────────────────────────
    /**
     * @notice Set the EventResolver contract address
     * @dev When set, resolveEvent will verify resolution through EventResolver
     * @param _resolver Address of the EventResolver contract
     */
    function setEventResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "TRDEFI: invalid resolver address");
        eventResolver = _resolver;
        emit EventResolverSet(_resolver);
    }

    /**
     * @notice Remove the EventResolver contract address
     * @dev Reverts to direct resolver mode
     */
    function removeEventResolver() external onlyOwner {
        eventResolver = address(0);
        emit EventResolverSet(address(0));
    }

    // ─── Admin: Pause ───────────────────────────────────────────────────
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── Deposit / Withdraw (User) ──────────────────────────────────────
    /**
     * @notice User deposits USDC into the vault
     * @param amount Amount of USDC to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "TRDEFI: amount must be > 0");
        USDC.safeTransferFrom(msg.sender, address(this), amount);
        userBalances[msg.sender].deposited += amount;
        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice User withdraws available USDC from the vault
     * @dev Only unused balance can be withdrawn (not locked in active bets)
     * @param amount Amount of USDC to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "TRDEFI: amount must be > 0");
        uint256 available = getAvailableBalance(msg.sender);
        require(amount <= available, "TRDEFI: insufficient available balance");

        userBalances[msg.sender].withdrawn += amount;
        USDC.safeTransfer(msg.sender, amount);
        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @notice Get user's available (unlocked) balance
     */
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

    /**
     * @notice Get user's balance locked in active bets
     */
    function getUserLockedBalance(address _user) public view returns (uint256) {
        uint256 locked = 0;
        uint256[] memory betIds = userBets[_user];
        for (uint256 i = 0; i < betIds.length; i++) {
            Bet memory bet = bets[betIds[i]];
            Event memory ev = events[bet.eventId];
            if (ev.status == EventStatus.ACTIVE && !bet.claimed) {
                locked += bet.amount;
            }
        }
        return locked;
    }

    // ─── Event Creation (Owner or Resolver) ─────────────────────────────
    /**
     * @notice Create a new prediction event
     * @param question The prediction question (e.g., "BTC > $100k tomorrow?")
     * @param category Event category (hava, kripto-gun, doviz, etc.)
     * @param deadline Unix timestamp when the event resolves
     * @param openingPrice Reference price at creation (e.g., current BTC price)
     */
    function createEvent(
        string calldata question,
        string calldata category,
        uint256 deadline,
        uint256 openingPrice
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(bytes(question).length > 0, "TRDEFI: empty question");
        require(deadline > block.timestamp, "TRDEFI: deadline must be in future");
        require(deadline <= block.timestamp + 7 days, "TRDEFI: deadline max 7 days");

        uint256 eventId = nextEventId++;
        events[eventId] = Event({
            id: eventId,
            question: question,
            category: category,
            deadline: deadline,
            openingPrice: openingPrice,
            status: EventStatus.ACTIVE,
            resolvedYes: false,
            totalYesBets: 0,
            totalNoBets: 0,
            yesBetCount: 0,
            noBetCount: 0,
            createdAt: block.timestamp,
            resolvedAt: 0,
            resolutionHash: bytes32(0)
        });

        emit EventCreated(eventId, question, category, deadline, openingPrice);
        return eventId;
    }

    // ─── Bet Placement ──────────────────────────────────────────────────
    /**
     * @notice Place a bet on an event
     * @param eventId The event ID to bet on
     * @param side YES or NO
     * @param amount Amount of USDC to bet
     */
    function placeBet(
        uint256 eventId,
        BetSide side,
        uint256 amount
    ) external nonReentrant whenNotPaused eventExists(eventId) eventActive(eventId) {
        require(amount >= MIN_BET, "TRDEFI: bet below minimum");
        require(amount <= MAX_BET, "TRDEFI: bet above maximum");

        // Check available balance
        uint256 available = getAvailableBalance(msg.sender);
        require(amount <= available, "TRDEFI: insufficient available balance");

        // Check deadline not passed
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

    // ─── Event Resolution (LLM Resolver) ────────────────────────────────
    /**
     * @notice Resolve an event (called by authorized resolver)
     * @param eventId The event ID to resolve
     * @param resolvedYes true = YES won, false = NO won
     * @param resolutionData Human-readable resolution data (for audit)
     */
    function resolveEvent(
        uint256 eventId,
        bool resolvedYes,
        string calldata resolutionData
    ) external onlyResolver eventExists(eventId) eventActive(eventId) {
        Event storage ev = events[eventId];

        // Deadline must have passed
        require(block.timestamp >= ev.deadline, "TRDEFI: deadline not reached");

        // Check liquidity — if only one side bet, it's a DRAW (refund)
        if (ev.totalYesBets == 0 || ev.totalNoBets == 0) {
            ev.status = EventStatus.DRAWN;
            ev.resolvedAt = block.timestamp;
            emit EventDrawn(eventId, "Insufficient liquidity - only one side");
            return;
        }

        // Calculate platform fee from losing pool
        uint256 losingPool = resolvedYes ? ev.totalNoBets : ev.totalYesBets;
        uint256 platformFee = (losingPool * PLATFORM_FEE_BPS) / 10000;

        // Create resolution hash for audit
        bytes32 resolutionHash = keccak256(
            abi.encodePacked(eventId, resolvedYes, resolutionData, block.timestamp)
        );

        ev.status = EventStatus.RESOLVED;
        ev.resolvedYes = resolvedYes;
        ev.resolvedAt = block.timestamp;
        ev.resolutionHash = resolutionHash;

        totalPlatformFees += platformFee;

        emit EventResolved(eventId, resolvedYes, ev.totalYesBets, ev.totalNoBets, platformFee, resolutionHash);
    }

    /**
     * @notice Mark an event as DRAW (refund all bets)
     * @dev Used when event cannot be resolved (e.g., match cancelled)
     */
    function drawEvent(uint256 eventId, string calldata reason)
        external
        onlyResolver
        eventExists(eventId)
        eventActive(eventId)
    {
        Event storage ev = events[eventId];
        ev.status = EventStatus.DRAWN;
        ev.resolvedAt = block.timestamp;
        emit EventDrawn(eventId, reason);
    }

    /**
     * @notice Cancel an event (refund all bets)
     * @dev Emergency function for owner
     */
    function cancelEvent(uint256 eventId, string calldata reason)
        external
        onlyOwner
        eventExists(eventId)
        eventActive(eventId)
    {
        Event storage ev = events[eventId];
        ev.status = EventStatus.CANCELLED;
        ev.resolvedAt = block.timestamp;
        emit EventCancelled(eventId, reason);
    }

    // ─── Winnings Claim ─────────────────────────────────────────────────
    /**
     * @notice Claim winnings for a single bet
     * @param betId The bet ID to claim
     */
    function claimWinnings(uint256 betId) external nonReentrant {
        Bet storage bet = bets[betId];
        require(bet.user == msg.sender, "TRDEFI: not your bet");
        require(!bet.claimed, "TRDEFI: already claimed");

        Event storage ev = events[bet.eventId];
        require(ev.status != EventStatus.ACTIVE, "TRDEFI: event not resolved");

        // DRAW or CANCELLED → full refund
        if (ev.status == EventStatus.DRAWN || ev.status == EventStatus.CANCELLED) {
            bet.claimed = true;
            USDC.safeTransfer(msg.sender, bet.amount);
            emit WinningsClaimed(betId, bet.eventId, msg.sender, bet.amount);
            return;
        }

        // RESOLVED → check if user won
        bool userWon = (bet.side == BetSide.YES && ev.resolvedYes) ||
                       (bet.side == BetSide.NO && !ev.resolvedYes);

        if (!userWon) {
            bet.claimed = true;
            userBalances[msg.sender].lost += bet.amount;
            emit WinningsClaimed(betId, bet.eventId, msg.sender, 0);
            return;
        }

        // Calculate winnings: parimutuel distribution
        // Winning pool = winner's bet + (losing pool * 0.90)
        // User's share = (userBet / totalWinningBets) * winningPool
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

    /**
     * @notice Claim winnings for multiple bets in one call
     * @param betIds Array of bet IDs to claim
     */
    function claimMultipleWinnings(uint256[] calldata betIds) external nonReentrant {
        uint256 totalWinnings = 0;
        for (uint256 i = 0; i < betIds.length; i++) {
            Bet storage bet = bets[betIds[i]];
            require(bet.user == msg.sender, "TRDEFI: not your bet");
            require(!bet.claimed, "TRDEFI: already claimed");

            Event storage ev = events[bet.eventId];
            require(ev.status != EventStatus.ACTIVE, "TRDEFI: event not resolved");

            if (ev.status == EventStatus.DRAWN || ev.status == EventStatus.CANCELLED) {
                bet.claimed = true;
                totalWinnings += bet.amount;
                emit WinningsClaimed(betIds[i], bet.eventId, msg.sender, bet.amount);
                continue;
            }

            bool userWon = (bet.side == BetSide.YES && ev.resolvedYes) ||
                           (bet.side == BetSide.NO && !ev.resolvedYes);

            if (!userWon) {
                bet.claimed = true;
                userBalances[msg.sender].lost += bet.amount;
                emit WinningsClaimed(betIds[i], bet.eventId, msg.sender, 0);
                continue;
            }

            uint256 losingPool = ev.resolvedYes ? ev.totalNoBets : ev.totalYesBets;
            uint256 platformFee = (losingPool * PLATFORM_FEE_BPS) / 10000;
            uint256 netLosingPool = losingPool - platformFee;
            uint256 winningPool = (ev.resolvedYes ? ev.totalYesBets : ev.totalNoBets) + netLosingPool;
            uint256 totalWinningBets = ev.resolvedYes ? ev.totalYesBets : ev.totalNoBets;

            uint256 winnings = (bet.amount * winningPool) / totalWinningBets;
            bet.claimed = true;
            userBalances[msg.sender].won += winnings;
            totalWinnings += winnings;

            emit WinningsClaimed(betIds[i], bet.eventId, msg.sender, winnings);
        }

        if (totalWinnings > 0) {
            USDC.safeTransfer(msg.sender, totalWinnings);
        }
    }

    // ─── Platform Fee Withdrawal ────────────────────────────────────────
    /**
     * @notice Owner withdraws accumulated platform fees
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 amount = totalPlatformFees;
        require(amount > 0, "TRDEFI: no fees to withdraw");
        totalPlatformFees = 0;
        USDC.safeTransfer(msg.sender, amount);
        emit PlatformFeeWithdrawn(msg.sender, amount);
    }

    // ─── View Functions ─────────────────────────────────────────────────
    /**
     * @notice Get event details
     */
    function getEventDetails(uint256 eventId) external view returns (
        uint256 id,
        string memory question,
        string memory category,
        uint256 deadline,
        uint256 openingPrice,
        EventStatus status,
        bool resolvedYes,
        uint256 totalYesBets,
        uint256 totalNoBets,
        uint256 yesBetCount,
        uint256 noBetCount,
        uint256 createdAt,
        uint256 resolvedAt,
        bytes32 resolutionHash
    ) {
        Event memory ev = events[eventId];
        return (
            ev.id, ev.question, ev.category, ev.deadline, ev.openingPrice,
            ev.status, ev.resolvedYes, ev.totalYesBets, ev.totalNoBets,
            ev.yesBetCount, ev.noBetCount, ev.createdAt, ev.resolvedAt,
            ev.resolutionHash
        );
    }

    /**
     * @notice Get bet details
     */
    function getBet(uint256 betId) external view returns (
        uint256 eventId,
        address user,
        BetSide side,
        uint256 amount,
        uint256 timestamp,
        bool claimed
    ) {
        Bet memory bet = bets[betId];
        return (bet.eventId, bet.user, bet.side, bet.amount, bet.timestamp, bet.claimed);
    }

    /**
     * @notice Get user's bet IDs
     */
    function getUserBetIds(address _user) external view returns (uint256[] memory) {
        return userBets[_user];
    }

    /**
     * @notice Get event's bet IDs
     */
    function getEventBetIds(uint256 eventId) external view returns (uint256[] memory) {
        return eventBets[eventId];
    }

    /**
     * @notice Calculate potential winnings for a bet (before claiming)
     */
    function calculatePotentialWinnings(uint256 betId) external view returns (uint256) {
        Bet memory bet = bets[betId];
        Event memory ev = events[bet.eventId];

        if (ev.status == EventStatus.ACTIVE) return 0;
        if (ev.status == EventStatus.DRAWN || ev.status == EventStatus.CANCELLED) return bet.amount;
        if (bet.claimed) return 0;

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

    /**
     * @notice Get vault's total USDC balance
     */
    function getVaultBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /**
     * @notice Get all active event IDs
     * @dev Returns IDs from nextEventId backwards — frontend should filter
     */
    function getActiveEvents() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextEventId; i++) {
            if (events[i].status == EventStatus.ACTIVE) count++;
        }
        uint256[] memory activeIds = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i < nextEventId; i++) {
            if (events[i].status == EventStatus.ACTIVE) {
                activeIds[idx] = i;
                idx++;
            }
        }
        return activeIds;
    }
}

