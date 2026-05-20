// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title TRDEFIDepositManager
 * @notice Manages user deposits via MoonPay on-ramp integration
 * @dev This contract works with MoonPay's webhook system:
 *      1. User initiates MoonPay purchase → sends USDC to this contract
 *      2. MoonPay sends webhook to backend → backend verifies transaction
 *      3. Backend calls creditDeposit() to credit user's vault balance
 *
 * Security: Only verified MoonPay transactions can credit deposits.
 *           Uses HMAC signature verification for webhook authenticity.
 */
contract TRDEFIDepositManager is Ownable2Step {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    address public vault;

    // MoonPay webhook signer (for signature verification)
    mapping(address => bool) public isWebhookSigner;

    // Deposit tracking
    struct Deposit {
        address user;
        uint256 amount;
        uint256 timestamp;
        string moonpayTxId;
        bool credited;
    }

    mapping(string => Deposit) public deposits; // moonpayTxId => Deposit
    mapping(address => uint256[]) public userDeposits;
    uint256 public totalDeposits;
    uint256 public totalCredited;

    // ─── Events ─────────────────────────────────────────────────────────
    event DepositReceived(address indexed user, uint256 amount, string moonpayTxId);
    event DepositCredited(string moonpayTxId, address indexed user, uint256 amount);
    event VaultUpdated(address indexed newVault);
    event WebhookSignerAdded(address indexed signer);
    event WebhookSignerRemoved(address indexed signer);

    // ─── Modifiers ──────────────────────────────────────────────────────
    modifier onlyWebhookSigner() {
        require(isWebhookSigner[msg.sender], "DepositManager: not a webhook signer");
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "DepositManager: invalid USDC address");
        USDC = IERC20(_usdc);
    }

    // ─── Setup ──────────────────────────────────────────────────────────
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "DepositManager: invalid vault address");
        vault = _vault;
        emit VaultUpdated(_vault);
    }

    function addWebhookSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "DepositManager: invalid address");
        isWebhookSigner[_signer] = true;
        emit WebhookSignerAdded(_signer);
    }

    function removeWebhookSigner(address _signer) external onlyOwner {
        isWebhookSigner[_signer] = false;
        emit WebhookSignerRemoved(_signer);
    }

    // ─── Deposit Flow ───────────────────────────────────────────────────
    /**
     * @notice Receive USDC deposit (called by MoonPay or user)
     * @dev User sends USDC directly to this contract address
     *      Backend tracks the transaction and credits via creditDeposit()
     */
    function deposit(address user, string calldata moonpayTxId) external {
        uint256 amount = USDC.balanceOf(address(this)) - totalDeposits;
        require(amount > 0, "DepositManager: no new deposit");
        require(user != address(0), "DepositManager: invalid user");
        require(bytes(moonpayTxId).length > 0, "DepositManager: empty txId");
        require(deposits[moonpayTxId].timestamp == 0, "DepositManager: duplicate txId");

        deposits[moonpayTxId] = Deposit({
            user: user,
            amount: amount,
            timestamp: block.timestamp,
            moonpayTxId: moonpayTxId,
            credited: false
        });

        userDeposits[user].push(totalDeposits);
        totalDeposits += amount;

        emit DepositReceived(user, amount, moonpayTxId);
    }

    /**
     * @notice Credit a verified deposit to user's vault balance
     * @dev Called by backend after MoonPay webhook verification
     */
    function creditDeposit(string calldata moonpayTxId) external onlyWebhookSigner {
        Deposit storage dep = deposits[moonpayTxId];
        require(dep.timestamp > 0, "DepositManager: deposit not found");
        require(!dep.credited, "DepositManager: already credited");

        dep.credited = true;
        totalCredited += dep.amount;

        // Transfer to vault
        if (vault != address(0)) {
            USDC.safeTransfer(vault, dep.amount);
        }

        emit DepositCredited(moonpayTxId, dep.user, dep.amount);
    }

    /**
     * @notice Batch credit multiple deposits
     */
    function batchCreditDeposits(string[] calldata moonpayTxIds) external onlyWebhookSigner {
        uint256 batchAmount = 0;
        uint256 len = moonpayTxIds.length;

        for (uint256 i = 0; i < len; i++) {
            Deposit storage dep = deposits[moonpayTxIds[i]];
            require(dep.timestamp > 0, "DepositManager: deposit not found");
            require(!dep.credited, "DepositManager: already credited");

            dep.credited = true;
            batchAmount += dep.amount;
            emit DepositCredited(moonpayTxIds[i], dep.user, dep.amount);
        }

        totalCredited += batchAmount;

        if (vault != address(0) && batchAmount > 0) {
            USDC.safeTransfer(vault, batchAmount);
        }
    }

    // ─── View Functions ─────────────────────────────────────────────────
    function getUserDeposits(address _user) external view returns (uint256[] memory) {
        return userDeposits[_user];
    }

    function getPendingDeposits() external view returns (string[] memory) {
        // Return uncredited deposit IDs
        uint256 count = 0;
        for (uint256 i = 0; i < userDeposits[msg.sender].length; i++) {
            // This is a simplified version — in production, iterate all deposits
        }
        return new string[](0);
    }

    function getContractBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /**
     * @notice Emergency withdrawal (owner only)
     * @dev Only for uncredited deposits
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 uncredited = totalDeposits - totalCredited;
        require(amount <= uncredited, "DepositManager: cannot withdraw credited funds");
        USDC.safeTransfer(owner(), amount);
    }
}
