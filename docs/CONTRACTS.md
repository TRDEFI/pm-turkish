# Contract Specifications

Detailed specifications for all TRDEFI smart contracts.

---

## 1. TRDEFIVault.sol

**Purpose:** Main vault contract handling all betting operations, deposits, withdrawals, and payouts.

**Inheritance:**
- `Ownable2Step` (OpenZeppelin) — Two-step ownership transfer
- `Pausable` (OpenZeppelin) — Emergency pause mechanism
- `ReentrancyGuard` (OpenZeppelin) — Reentrancy protection

**Dependencies:**
- `IERC20` — USDC token interface
- `SafeERC20` — Safe token transfers
- `IEventResolver` — Event resolver interface

### State Variables

| Variable | Type | Visibility | Description |
|----------|------|------------|-------------|
| `usdc` | `IERC20` | public | USDC token contract |
| `owner` | `address` | public | Contract owner |
| `paused` | `bool` | public | Pause status |
| `platformFeePercent` | `uint256` | public | Platform fee percentage (10%) |
| `minBet` | `uint256` | public | Minimum bet amount |
| `maxBet` | `uint256` | public | Maximum bet amount |
| `eventCount` | `uint256` | public | Total number of events |
| `betCount` | `uint256` | public | Total number of bets |
| `balances` | `mapping(address => uint256)` | public | User balances |
| `events` | `mapping(uint256 => Event)` | public | Event storage |
| `bets` | `mapping(uint256 => Bet)` | public | Bet storage |
| `userBets` | `mapping(address => uint256[])` | public | User's bet IDs |
| `platformFees` | `uint256` | public | Accumulated platform fees |
| `resolvers` | `mapping(address => bool)` | public | Authorized resolvers |
| `eventResolver` | `IEventResolver` | public | Event resolver contract |

### Structs

#### Event
```solidity
struct Event {
    string question;
    string category;
    uint256 deadline;
    uint256 price;
    bool resolved;
    bool yes;
    uint256 yesPool;
    uint256 noPool;
    uint256 yesCount;
    uint256 noCount;
}
```

#### Bet
```solidity
struct Bet {
    address user;
    uint256 eventId;
    bool side; // true = YES, false = NO
    uint256 amount;
    bool claimed;
    bool won;
}
```

### Functions

#### deposit
```solidity
function deposit(uint256 amount) external whenNotPaused
```
- **Access:** Any user
- **Purpose:** Deposit USDC into the vault
- **Parameters:**
  - `amount`: Amount of USDC to deposit (in wei)
- **Events:** `Deposit(address user, uint256 amount)`
- **Errors:**
  - `AmountTooLow`: Amount is below minimum
  - `TransferFailed`: USDC transfer failed

#### withdraw
```solidity
function withdraw(uint256 amount) external whenNotPaused
```
- **Access:** Any user
- **Purpose:** Withdraw available USDC balance
- **Parameters:**
  - `amount`: Amount of USDC to withdraw (in wei)
- **Events:** `Withdrawal(address user, uint256 amount)`
- **Errors:**
  - `InsufficientBalance`: User balance is insufficient
  - `TransferFailed`: USDC transfer failed

#### createEvent
```solidity
function createEvent(
    string memory question,
    string memory category,
    uint256 deadline,
    uint256 price
) external onlyOwner whenNotPaused
```
- **Access:** Owner only
- **Purpose:** Create a new prediction event
- **Parameters:**
  - `question`: Event question
  - `category`: Event category
  - `deadline`: Event deadline (Unix timestamp)
  - `price`: Price per bet (in wei)
- **Events:** `EventCreated(uint256 eventId, string question, uint256 deadline)`
- **Errors:**
  - `DeadlineTooSoon`: Deadline is too soon
  - `InvalidPrice`: Price is zero

#### placeBet
```solidity
function placeBet(
    uint256 eventId,
    bool side,
    uint256 amount
) external whenNotPaused
```
- **Access:** Any user
- **Purpose:** Place a bet on an event
- **Parameters:**
  - `eventId`: Event ID to bet on
  - `side`: true = YES, false = NO
  - `amount`: Bet amount (in wei)
- **Events:** `BetPlaced(uint256 betId, address user, uint256 eventId, bool side, uint256 amount)`
- **Errors:**
  - `EventNotFound`: Event does not exist
  - `EventEnded`: Event deadline has passed
  - `EventResolved`: Event is already resolved
  - `BetTooLow`: Bet amount is below minimum
  - `BetTooHigh`: Bet amount is above maximum
  - `InsufficientBalance`: User balance is insufficient

#### resolveEvent
```solidity
function resolveEvent(
    uint256 eventId,
    bool yes,
    bytes memory data
) external onlyResolver whenNotPaused
```
- **Access:** Authorized resolver only
- **Purpose:** Resolve an event with result
- **Parameters:**
  - `eventId`: Event ID to resolve
  - `yes`: true = YES wins, false = NO wins
  - `data`: Additional resolution data
- **Events:** `EventResolved(uint256 eventId, bool yes, bytes data)`
- **Errors:**
  - `EventNotFound`: Event does not exist
  - `EventNotEnded`: Event deadline has not passed
  - `EventAlreadyResolved`: Event is already resolved

#### claimWinnings
```solidity
function claimWinnings(uint256 betId) external whenNotPaused
```
- **Access:** Bet owner only
- **Purpose:** Claim winnings from a resolved event
- **Parameters:**
  - `betId`: Bet ID to claim
- **Events:** `WinningsClaimed(uint256 betId, address user, uint256 amount)`
- **Errors:**
  - `BetNotFound`: Bet does not exist
  - `NotBetOwner`: Caller is not bet owner
  - `EventNotResolved`: Event is not resolved
  - `AlreadyClaimed`: Bet is already claimed
  - `LostBet`: Bet was on losing side

#### claimMultipleWinnings
```solidity
function claimMultipleWinnings(uint256[] memory betIds) external whenNotPaused
```
- **Access:** Any user
- **Purpose:** Claim winnings from multiple bets
- **Parameters:**
  - `betIds`: Array of bet IDs to claim
- **Events:** Multiple `WinningsClaimed` events
- **Errors:** Same as `claimWinnings` for each bet

#### withdrawPlatformFees
```solidity
function withdrawPlatformFees() external onlyOwner whenNotPaused
```
- **Access:** Owner only
- **Purpose:** Withdraw accumulated platform fees
- **Events:** `PlatformFeesWithdrawn(address owner, uint256 amount)`
- **Errors:**
  - `NoFeesToWithdraw`: No fees to withdraw

#### pause
```solidity
function pause() external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Pause all contract operations
- **Events:** `Paused(address account)`

#### unpause
```solidity
function unpause() external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Unpause contract operations
- **Events:** `Unpaused(address account)`

#### addResolver
```solidity
function addResolver(address resolver) external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Add authorized resolver
- **Parameters:**
  - `resolver`: Address to add as resolver
- **Events:** `ResolverAdded(address resolver)`

#### removeResolver
```solidity
function removeResolver(address resolver) external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Remove authorized resolver
- **Parameters:**
  - `resolver`: Address to remove as resolver
- **Events:** `ResolverRemoved(address resolver)`

#### setEventResolver
```solidity
function setEventResolver(address resolver) external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Set EventResolver contract address
- **Parameters:**
  - `resolver`: EventResolver contract address
- **Events:** `EventResolverSet(address resolver)`

#### removeEventResolver
```solidity
function removeEventResolver() external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Remove EventResolver contract address
- **Events:** `EventResolverRemoved()`

### Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `Deposit` | `address user, uint256 amount` | User deposited USDC |
| `Withdrawal` | `address user, uint256 amount` | User withdrew USDC |
| `EventCreated` | `uint256 eventId, string question, uint256 deadline` | New event created |
| `BetPlaced` | `uint256 betId, address user, uint256 eventId, bool side, uint256 amount` | Bet placed on event |
| `EventResolved` | `uint256 eventId, bool yes, bytes data` | Event resolved with result |
| `WinningsClaimed` | `uint256 betId, address user, uint256 amount` | User claimed winnings |
| `PlatformFeesWithdrawn` | `address owner, uint256 amount` | Owner withdrew platform fees |
| `Paused` | `address account` | Contract paused |
| `Unpaused` | `address account` | Contract unpaused |
| `ResolverAdded` | `address resolver` | Resolver added |
| `ResolverRemoved` | `address resolver` | Resolver removed |
| `EventResolverSet` | `address resolver` | EventResolver contract set |
| `EventResolverRemoved` | - | EventResolver contract removed |

### Errors

| Error | Description |
|-------|-------------|
| `AmountTooLow` | Deposit amount is below minimum |
| `InsufficientBalance` | User balance is insufficient |
| `TransferFailed` | Token transfer failed |
| `DeadlineTooSoon` | Event deadline is too soon |
| `InvalidPrice` | Event price is zero |
| `EventNotFound` | Event does not exist |
| `EventEnded` | Event deadline has passed |
| `EventResolved` | Event is already resolved |
| `EventNotEnded` | Event deadline has not passed |
| `EventAlreadyResolved` | Event is already resolved |
| `BetTooLow` | Bet amount is below minimum |
| `BetTooHigh` | Bet amount is above maximum |
| `BetNotFound` | Bet does not exist |
| `NotBetOwner` | Caller is not bet owner |
| `EventNotResolved` | Event is not resolved |
| `AlreadyClaimed` | Bet is already claimed |
| `LostBet` | Bet was on losing side |
| `NoFeesToWithdraw` | No platform fees to withdraw |
| `NotResolver` | Caller is not authorized resolver |

---

## 2. EventResolver.sol

**Purpose:** Oracle layer for LLM-driven event resolution with multisig fallback.

**Inheritance:**
- `Ownable` (OpenZeppelin) — Ownership management

### State Variables

| Variable | Type | Visibility | Description |
|----------|------|------------|-------------|
| `vault` | `address` | public | TRDEFIVault contract address |
| `signers` | `address[]` | public | Authorized signers |
| `signerIndex` | `mapping(address => uint256)` | public | Signer index mapping |
| `resolutions` | `mapping(uint256 => Resolution)` | public | Resolution storage |
| `resolutionCount` | `uint256` | public | Total number of resolutions |
| `confirmationThreshold` | `uint256` | public | Required confirmations (2) |
| `challengeWindow` | `uint256` | public | Challenge window duration (24 hours) |

### Structs

#### Resolution
```solidity
struct Resolution {
    uint256 eventId;
    bool yes;
    string reasoning;
    string[] sources;
    bytes32 resolutionHash;
    uint256 timestamp;
    uint256 confirmations;
    uint256 challenges;
    bool finalized;
    bool rejected;
    address[] confirmedBy;
    address[] challengedBy;
}
```

### Functions

#### setVault
```solidity
function setVault(address _vault) external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Set TRDEFIVault contract address
- **Parameters:**
  - `_vault`: Vault contract address

#### submitResolution
```solidity
function submitResolution(
    uint256 eventId,
    bool yes,
    string memory reasoning,
    string[] memory sources
) external
```
- **Access:** Anyone
- **Purpose:** Submit a resolution for an event
- **Parameters:**
  - `eventId`: Event ID to resolve
  - `yes`: true = YES wins, false = NO wins
  - `reasoning`: Resolution reasoning
  - `sources`: Array of source URLs
- **Events:** `ResolutionSubmitted(uint256 resolutionId, uint256 eventId, bool yes)`

#### confirmResolution
```solidity
function confirmResolution(uint256 resolutionId) external onlySigner
```
- **Access:** Authorized signer only
- **Purpose:** Confirm a resolution
- **Parameters:**
  - `resolutionId`: Resolution ID to confirm
- **Events:** `ResolutionConfirmed(uint256 resolutionId, address signer)`

#### challengeResolution
```solidity
function challengeResolution(uint256 resolutionId, string memory reason) external onlySigner
```
- **Access:** Authorized signer only
- **Purpose:** Challenge a resolution
- **Parameters:**
  - `resolutionId`: Resolution ID to challenge
  - `reason`: Challenge reason
- **Events:** `ResolutionChallenged(uint256 resolutionId, address signer, string reason)`

#### finalizeAfterTimeout
```solidity
function finalizeAfterTimeout(uint256 resolutionId) external
```
- **Access:** Anyone
- **Purpose:** Finalize resolution after challenge window expires
- **Parameters:**
  - `resolutionId`: Resolution ID to finalize
- **Events:** `ResolutionFinalized(uint256 resolutionId)`

#### addSigner
```solidity
function addSigner(address signer) external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Add authorized signer
- **Parameters:**
  - `signer`: Address to add as signer
- **Events:** `SignerAdded(address signer)`

#### removeSigner
```solidity
function removeSigner(address signer) external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Remove authorized signer
- **Parameters:**
  - `signer`: Address to remove as signer
- **Events:** `SignerRemoved(address signer)`

### Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `ResolutionSubmitted` | `uint256 resolutionId, uint256 eventId, bool yes` | Resolution submitted |
| `ResolutionConfirmed` | `uint256 resolutionId, address signer` | Resolution confirmed |
| `ResolutionChallenged` | `uint256 resolutionId, address signer, string reason` | Resolution challenged |
| `ResolutionFinalized` | `uint256 resolutionId` | Resolution finalized |
| `SignerAdded` | `address signer` | Signer added |
| `SignerRemoved` | `address signer` | Signer removed |

---

## 3. TRDEFIDepositManager.sol

**Purpose:** MoonPay integration for fiat onramp management.

**Inheritance:**
- `Ownable` (OpenZeppelin) — Ownership management

### State Variables

| Variable | Type | Visibility | Description |
|----------|------|------------|-------------|
| `usdc` | `IERC20` | public | USDC token contract |
| `vault` | `address` | public | TRDEFIVault contract address |
| `webhookSigners` | `mapping(address => bool)` | public | Authorized webhook signers |
| `processedTxIds` | `mapping(string => bool)` | public | Processed transaction IDs |
| `deposits` | `mapping(string => Deposit)` | public | Deposit storage |

### Structs

#### Deposit
```solidity
struct Deposit {
    address user;
    uint256 amount;
    string moonpayTxId;
    uint256 timestamp;
    bool credited;
}
```

### Functions

#### setVault
```solidity
function setVault(address _vault) external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Set TRDEFIVault contract address
- **Parameters:**
  - `_vault`: Vault contract address

#### deposit
```solidity
function deposit(address user, string memory moonpayTxId) external
```
- **Access:** Anyone
- **Purpose:** Record a MoonPay deposit
- **Parameters:**
  - `user`: User address
  - `moonpayTxId`: MoonPay transaction ID
- **Events:** `DepositRecorded(address user, string moonpayTxId)`

#### creditDeposit
```solidity
function creditDeposit(string memory moonpayTxId) external onlyWebhookSigner
```
- **Access:** Authorized webhook signer only
- **Purpose:** Credit a verified deposit to user's vault balance
- **Parameters:**
  - `moonpayTxId`: MoonPay transaction ID
- **Events:** `DepositCredited(address user, string moonpayTxId, uint256 amount)`

#### batchCreditDeposits
```solidity
function batchCreditDeposits(string[] memory txIds) external onlyWebhookSigner
```
- **Access:** Authorized webhook signer only
- **Purpose:** Credit multiple verified deposits
- **Parameters:**
  - `txIds`: Array of MoonPay transaction IDs
- **Events:** Multiple `DepositCredited` events

#### addWebhookSigner
```solidity
function addWebhookSigner(address signer) external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Add authorized webhook signer
- **Parameters:**
  - `signer`: Address to add as webhook signer
- **Events:** `WebhookSignerAdded(address signer)`

#### removeWebhookSigner
```solidity
function removeWebhookSigner(address signer) external onlyOwner
```
- **Access:** Owner only
- **Purpose:** Remove authorized webhook signer
- **Parameters:**
  - `signer`: Address to remove as webhook signer
- **Events:** `WebhookSignerRemoved(address signer)`

### Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `DepositRecorded` | `address user, string moonpayTxId` | Deposit recorded |
| `DepositCredited` | `address user, string moonpayTxId, uint256 amount` | Deposit credited |
| `WebhookSignerAdded` | `address signer` | Webhook signer added |
| `WebhookSignerRemoved` | `address signer` | Webhook signer removed |

---

## Access Control Matrix

| Function | Owner | Resolver | Signer | WebhookSigner | User |
|----------|-------|----------|--------|---------------|------|
| `deposit()` | | | | | ✅ |
| `withdraw()` | | | | | ✅ |
| `createEvent()` | ✅ | | | | |
| `placeBet()` | | | | | ✅ |
| `resolveEvent()` | | ✅ | | | |
| `claimWinnings()` | | | | | ✅ |
| `pause()` | ✅ | | | | |
| `unpause()` | ✅ | | | | |
| `submitResolution()` | | | | | ✅ |
| `confirmResolution()` | | | ✅ | | |
| `challengeResolution()` | | | ✅ | | |
| `finalizeAfterTimeout()` | | | | | ✅ |
| `creditDeposit()` | | | | ✅ | |
| `batchCreditDeposits()` | | | | ✅ | |

---

*Last Updated: 2026-05-21*
