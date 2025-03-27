// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BettingContract
 * @dev A betting contract designed for Arbitrum with security features and owner controls
 */
contract BettingContract is ReentrancyGuard, Pausable, Ownable {
    // ======== Structs ========
    struct Bet {
        address bettor;
        uint256 amount;
        uint256 predictionTimestamp;
        bool isResolved;
        bool didWin;
    }

    // ======== State Variables ========
    uint256 public minBetAmount;
    uint256 public maxBetAmount;
    uint256 public houseEdgePercent;
    uint256 public totalContractBalance;
    uint256 public totalBets;
    uint256 public totalBetsResolved;
    
    // Mapping betId to Bet struct
    mapping(uint256 => Bet) public bets;
    
    // Mapping user address to array of their bet IDs
    mapping(address => uint256[]) public userBets;

    // ======== Events ========
    event BetPlaced(uint256 indexed betId, address indexed bettor, uint256 amount, uint256 predictionTimestamp);
    event BetResolved(uint256 indexed betId, address indexed bettor, bool didWin, uint256 payout);
    event MinBetAmountChanged(uint256 oldValue, uint256 newValue);
    event MaxBetAmountChanged(uint256 oldValue, uint256 newValue);
    event HouseEdgeChanged(uint256 oldValue, uint256 newValue);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event FundsDeposited(address indexed from, uint256 amount);

    // ======== Constructor ========
    constructor(uint256 _minBetAmount, uint256 _maxBetAmount, uint256 _houseEdgePercent) {
        require(_minBetAmount > 0, "Minimum bet must be greater than 0");
        require(_maxBetAmount > _minBetAmount, "Maximum bet must be greater than minimum bet");
        require(_houseEdgePercent <= 1000, "House edge cannot exceed 10%");
        
        minBetAmount = _minBetAmount;
        maxBetAmount = _maxBetAmount;
        houseEdgePercent = _houseEdgePercent; // Base points (100 = 1%)
    }

    // ======== External Functions ========
    
    /**
     * @dev Place a bet with a prediction timestamp
     * @param _predictionTimestamp The timestamp the user is betting on
     */
    function placeBet(uint256 _predictionTimestamp) public payable nonReentrant whenNotPaused {
        require(msg.value >= minBetAmount, "Bet amount below minimum");
        require(msg.value <= maxBetAmount, "Bet amount above maximum");
        require(_predictionTimestamp > block.timestamp, "Prediction must be in the future");
        
        uint256 betId = totalBets;
        
        // Store the bet
        bets[betId] = Bet({
            bettor: msg.sender,
            amount: msg.value,
            predictionTimestamp: _predictionTimestamp,
            isResolved: false,
            didWin: false
        });
        
        // Add bet to user's list
        userBets[msg.sender].push(betId);
        
        // Update contract stats
        totalBets++;
        totalContractBalance += msg.value;
        
        emit BetPlaced(betId, msg.sender, msg.value, _predictionTimestamp);
    }
    
    /**
     * @dev Get all bets for a specific user
     * @param _user Address of the user
     * @return Array of bet IDs
     */
    function getUserBets(address _user) external view returns (uint256[] memory) {
        return userBets[_user];
    }
    
    /**
     * @dev Get detailed information about a specific bet
     * @param _betId ID of the bet
     * @return Bet struct with bet details
     */
    function getBetDetails(uint256 _betId) external view returns (Bet memory) {
        require(_betId < totalBets, "Bet does not exist");
        return bets[_betId];
    }

    // ======== Owner Functions ========
    
    /**
     * @dev Resolve a bet (owner only)
     * @param _betId ID of the bet to resolve
     * @param _didWin Optional parameter to override the winner determination
     */
    function resolveBet(uint256 _betId, bool _didWin) external onlyOwner nonReentrant {
        require(_betId < totalBets, "Bet does not exist");
        Bet storage bet = bets[_betId];
        
        require(!bet.isResolved, "Bet already resolved");
        require(block.timestamp >= bet.predictionTimestamp, "Cannot resolve before prediction time");
        
        bet.isResolved = true;
        bet.didWin = _didWin;
        
        totalBetsResolved++;
        
        uint256 payout = 0;
        if (_didWin) {
            // Calculate winning amount minus house edge
            payout = bet.amount + (bet.amount * (10000 - houseEdgePercent) / 10000);
            
            require(address(this).balance >= payout, "Contract has insufficient funds");
            
            // Update contract balance
            totalContractBalance -= payout;
            
            // Send payout to winner
            (bool success, ) = payable(bet.bettor).call{value: payout}("");
            require(success, "Failed to send payout");
        }
        
        emit BetResolved(_betId, bet.bettor, _didWin, payout);
    }
    
    /**
     * @dev Resolve a bet using block.timestamp for randomness
     * @param _betId ID of the bet to resolve
     */
    function resolveRandomBet(uint256 _betId) external onlyOwner nonReentrant {
        require(_betId < totalBets, "Bet does not exist");
        Bet storage bet = bets[_betId];
        
        require(!bet.isResolved, "Bet already resolved");
        require(block.timestamp >= bet.predictionTimestamp, "Cannot resolve before prediction time");
        
        // Use block.timestamp for randomness
        bool didWin = uint256(keccak256(abi.encodePacked(block.timestamp, _betId, bet.bettor))) % 2 == 0;
        
        bet.isResolved = true;
        bet.didWin = didWin;
        
        totalBetsResolved++;
        
        uint256 payout = 0;
        if (didWin) {
            // Calculate winning amount minus house edge
            payout = bet.amount + (bet.amount * (10000 - houseEdgePercent) / 10000);
            
            require(address(this).balance >= payout, "Contract has insufficient funds");
            
            // Update contract balance
            totalContractBalance -= payout;
            
            // Send payout to winner
            (bool success, ) = payable(bet.bettor).call{value: payout}("");
            require(success, "Failed to send payout");
        }
        
        emit BetResolved(_betId, bet.bettor, didWin, payout);
    }
    
    /**
     * @dev Set minimum bet amount (owner only)
     * @param _minBetAmount New minimum bet amount
     */
    function setMinBetAmount(uint256 _minBetAmount) external onlyOwner {
        require(_minBetAmount > 0, "Minimum bet must be greater than 0");
        require(_minBetAmount < maxBetAmount, "Minimum bet must be less than maximum bet");
        
        uint256 oldValue = minBetAmount;
        minBetAmount = _minBetAmount;
        
        emit MinBetAmountChanged(oldValue, _minBetAmount);
    }
    
    /**
     * @dev Set maximum bet amount (owner only)
     * @param _maxBetAmount New maximum bet amount
     */
    function setMaxBetAmount(uint256 _maxBetAmount) external onlyOwner {
        require(_maxBetAmount > minBetAmount, "Maximum bet must be greater than minimum bet");
        
        uint256 oldValue = maxBetAmount;
        maxBetAmount = _maxBetAmount;
        
        emit MaxBetAmountChanged(oldValue, _maxBetAmount);
    }
    
    /**
     * @dev Set house edge percentage (owner only)
     * @param _houseEdgePercent New house edge percentage (in basis points, 100 = 1%)
     */
    function setHouseEdgePercent(uint256 _houseEdgePercent) external onlyOwner {
        require(_houseEdgePercent <= 1000, "House edge cannot exceed 10%");
        
        uint256 oldValue = houseEdgePercent;
        houseEdgePercent = _houseEdgePercent;
        
        emit HouseEdgeChanged(oldValue, _houseEdgePercent);
    }
    
    /**
     * @dev Pause the contract (owner only)
     */
    function pauseContract() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract (owner only)
     */
    function unpauseContract() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Withdraw funds from the contract (owner only)
     * @param _amount Amount to withdraw
     */
    function withdrawFunds(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= address(this).balance, "Insufficient contract balance");
        
        // Calculate reserved funds for unresolved bets
        uint256 reservedFunds = totalContractBalance;
        
        // Ensure withdrawal doesn't affect ability to pay unresolved bets
        require(_amount <= address(this).balance - reservedFunds, "Cannot withdraw reserved funds");
        
        (bool success, ) = payable(owner()).call{value: _amount}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner(), _amount);
    }
    
    /**
     * @dev Deposit funds to the contract - can be called by anyone
     */
    function depositFunds() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        
        emit FundsDeposited(msg.sender, msg.value);
    }
    
    /**
     * @dev Get contract's balance and statistics
     * @return Contract balance, total bets, and total resolved bets
     */
    function getContractStats() external view returns (uint256, uint256, uint256) {
        return (address(this).balance, totalBets, totalBetsResolved);
    }
    
    /**
     * @dev Get contract's balance
     * @return Contract's current balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ======== Fallback and Receive Functions ========
    
    /**
     * @dev Fallback function - rejects all unexpected calls
     */
    fallback() external payable {
        revert("Direct interactions not supported");
    }
    
    /**
     * @dev Receive function - allows contract to receive ETH
     */
    receive() external payable {
        // Emitting an event to track deposits that weren't through the depositFunds function
        emit FundsDeposited(msg.sender, msg.value);
    }
}