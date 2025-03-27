const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BettingContract", function () {
  // Contract deployment parameters
  const minBetAmount = ethers.utils.parseEther("0.01");
  const maxBetAmount = ethers.utils.parseEther("1");
  const houseEdgePercent = 500; // 5% house edge (in basis points)
  
  // Variables for contract, owner, and users
  let bettingContract;
  let owner, user1, user2, user3;
  
  // Current timestamp for prediction times
  let currentTimestamp;
  let futureTimestamp;
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy a fresh contract for each test
    const BettingContract = await ethers.getContractFactory("BettingContract");
    bettingContract = await BettingContract.deploy(minBetAmount, maxBetAmount, houseEdgePercent);
    await bettingContract.deployed();
    
    // Get current timestamp and calculate future timestamp
    currentTimestamp = Math.floor(Date.now() / 1000);
    futureTimestamp = currentTimestamp + 3600; // 1 hour in the future
  });
  
  describe("Deployment", function () {
    it("Should set the correct constructor parameters", async function () {
      expect(await bettingContract.minBetAmount()).to.equal(minBetAmount);
      expect(await bettingContract.maxBetAmount()).to.equal(maxBetAmount);
      expect(await bettingContract.houseEdgePercent()).to.equal(houseEdgePercent);
      expect(await bettingContract.owner()).to.equal(owner.address);
    });
    
    it("Should have zero initial stats", async function () {
      const stats = await bettingContract.getContractStats();
      expect(stats[1]).to.equal(0); // totalBets
      expect(stats[2]).to.equal(0); // totalBetsResolved
    });
  });
  
  describe("Betting functionality", function () {
    it("Should allow placing a valid bet", async function () {
      const betAmount = ethers.utils.parseEther("0.1");
      
      // Place a bet
      await expect(bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount }))
        .to.emit(bettingContract, "BetPlaced")
        .withArgs(0, user1.address, betAmount, futureTimestamp);
      
      // Check bet details
      const bet = await bettingContract.getBetDetails(0);
      expect(bet.bettor).to.equal(user1.address);
      expect(bet.amount).to.equal(betAmount);
      expect(bet.predictionTimestamp).to.equal(futureTimestamp);
      expect(bet.isResolved).to.be.false;
      expect(bet.didWin).to.be.false;
      
      // Check contract stats
      const stats = await bettingContract.getContractStats();
      expect(stats[1]).to.equal(1); // totalBets
    });
    
    it("Should reject bet amount below minimum", async function () {
      const betAmount = ethers.utils.parseEther("0.001"); // Below minimum
      
      await expect(
        bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount })
      ).to.be.revertedWith("Bet amount below minimum");
    });
    
    it("Should reject bet amount above maximum", async function () {
      const betAmount = ethers.utils.parseEther("2"); // Above maximum
      
      await expect(
        bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount })
      ).to.be.revertedWith("Bet amount above maximum");
    });
    
    it("Should reject bet with past prediction time", async function () {
      const betAmount = ethers.utils.parseEther("0.1");
      const pastTimestamp = currentTimestamp - 3600; // 1 hour in the past
      
      await expect(
        bettingContract.connect(user1).placeBet(pastTimestamp, { value: betAmount })
      ).to.be.revertedWith("Prediction must be in the future");
    });
    
    it("Should track multiple bets from the same user", async function () {
      const betAmount = ethers.utils.parseEther("0.1");
      
      // Place two bets from the same user
      await bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount });
      await bettingContract.connect(user1).placeBet(futureTimestamp + 3600, { value: betAmount });
      
      // Check user's bets
      const userBets = await bettingContract.getUserBets(user1.address);
      expect(userBets.length).to.equal(2);
      expect(userBets[0]).to.equal(0);
      expect(userBets[1]).to.equal(1);
    });
  });
  
  describe("Bet Resolution", function () {
    beforeEach(async function () {
      // Place bets for testing resolution
      const betAmount = ethers.utils.parseEther("0.1");
      await bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount });
      await bettingContract.connect(user2).placeBet(futureTimestamp, { value: betAmount });
      
      // Fast forward time to after the prediction time
      await time.increaseTo(futureTimestamp + 1);
    });
    
    it("Should resolve a bet as won correctly", async function () {
      // Resolve bet as a win
      await expect(bettingContract.connect(owner).resolveBet(0, true))
        .to.emit(bettingContract, "BetResolved")
        .withArgs(0, user1.address, true, ethers.utils.parseEther("0.195")); // 0.1 + (0.1 * 0.95) = 0.195
      
      // Check bet details
      const bet = await bettingContract.getBetDetails(0);
      expect(bet.isResolved).to.be.true;
      expect(bet.didWin).to.be.true;
      
      // Check contract stats
      const stats = await bettingContract.getContractStats();
      expect(stats[2]).to.equal(1); // totalBetsResolved
    });
    
    it("Should resolve a bet as lost correctly", async function () {
      // Resolve bet as a loss
      await expect(bettingContract.connect(owner).resolveBet(0, false))
        .to.emit(bettingContract, "BetResolved")
        .withArgs(0, user1.address, false, 0); // No payout for a loss
      
      // Check bet details
      const bet = await bettingContract.getBetDetails(0);
      expect(bet.isResolved).to.be.true;
      expect(bet.didWin).to.be.false;
      
      // Check contract stats
      const stats = await bettingContract.getContractStats();
      expect(stats[2]).to.equal(1); // totalBetsResolved
    });
    
    it("Should allow resolving multiple bets", async function () {
      // Resolve both bets
      await bettingContract.connect(owner).resolveBet(0, true);
      await bettingContract.connect(owner).resolveBet(1, false);
      
      // Check contract stats
      const stats = await bettingContract.getContractStats();
      expect(stats[2]).to.equal(2); // totalBetsResolved
    });
    
    it("Should prevent non-owners from resolving bets", async function () {
      await expect(
        bettingContract.connect(user3).resolveBet(0, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should prevent resolving a bet twice", async function () {
      // Resolve bet once
      await bettingContract.connect(owner).resolveBet(0, true);
      
      // Try to resolve again
      await expect(
        bettingContract.connect(owner).resolveBet(0, false)
      ).to.be.revertedWith("Bet already resolved");
    });
    
    it("Should use block.timestamp for random resolution", async function () {
      // Test resolveRandomBet function
      await bettingContract.connect(owner).resolveRandomBet(1);
      
      // Check bet was resolved
      const bet = await bettingContract.getBetDetails(1);
      expect(bet.isResolved).to.be.true;
    });
  });
  
  describe("Owner Functions", function () {
    it("Should allow owner to change minimum bet amount", async function () {
      const newMinBet = ethers.utils.parseEther("0.05");
      
      await expect(bettingContract.connect(owner).setMinBetAmount(newMinBet))
        .to.emit(bettingContract, "MinBetAmountChanged")
        .withArgs(minBetAmount, newMinBet);
      
      expect(await bettingContract.minBetAmount()).to.equal(newMinBet);
    });
    
    it("Should allow owner to change maximum bet amount", async function () {
      const newMaxBet = ethers.utils.parseEther("2");
      
      await expect(bettingContract.connect(owner).setMaxBetAmount(newMaxBet))
        .to.emit(bettingContract, "MaxBetAmountChanged")
        .withArgs(maxBetAmount, newMaxBet);
      
      expect(await bettingContract.maxBetAmount()).to.equal(newMaxBet);
    });
    
    it("Should allow owner to change house edge percentage", async function () {
      const newHouseEdge = 300; // 3%
      
      await expect(bettingContract.connect(owner).setHouseEdgePercent(newHouseEdge))
        .to.emit(bettingContract, "HouseEdgeChanged")
        .withArgs(houseEdgePercent, newHouseEdge);
      
      expect(await bettingContract.houseEdgePercent()).to.equal(newHouseEdge);
    });
    
    it("Should allow owner to pause and unpause the contract", async function () {
      // Pause contract
      await bettingContract.connect(owner).pauseContract();
      
      // Try to place a bet while paused
      const betAmount = ethers.utils.parseEther("0.1");
      await expect(
        bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount })
      ).to.be.revertedWith("Pausable: paused");
      
      // Unpause contract
      await bettingContract.connect(owner).unpauseContract();
      
      // Should be able to place bet after unpausing
      await bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount });
    });
    
    it("Should allow owner to withdraw unused funds", async function () {
      // First add some funds to the contract
      const fundAmount = ethers.utils.parseEther("1");
      await owner.sendTransaction({ to: bettingContract.address, value: fundAmount });
      
      const initialOwnerBalance = await owner.getBalance();
      
      // Withdraw half the funds
      const withdrawAmount = ethers.utils.parseEther("0.5");
      const tx = await bettingContract.connect(owner).withdrawFunds(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      // Check owner balance increased by the correct amount
      const finalOwnerBalance = await owner.getBalance();
      expect(finalOwnerBalance.add(gasUsed).sub(initialOwnerBalance)).to.equal(withdrawAmount);
    });
    
    it("Should not allow withdrawing more than available unreserved funds", async function () {
      // Place a bet that reserves funds
      const betAmount = ethers.utils.parseEther("0.1");
      await bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount });
      
      // Add additional funds
      const fundAmount = ethers.utils.parseEther("0.2");
      await owner.sendTransaction({ to: bettingContract.address, value: fundAmount });
      
      // Try to withdraw more than unreserved funds
      const withdrawAmount = ethers.utils.parseEther("0.3"); // Trying to withdraw bet amount + funds
      await expect(
        bettingContract.connect(owner).withdrawFunds(withdrawAmount)
      ).to.be.revertedWith("Cannot withdraw reserved funds");
      
      // Should be able to withdraw just the unreserved amount
      await bettingContract.connect(owner).withdrawFunds(fundAmount);
    });
    
    it("Should allow funds to be deposited", async function () {
      const depositAmount = ethers.utils.parseEther("0.5");
      
      // Initial balance
      const initialBalance = await bettingContract.getContractBalance();
      
      // Deposit funds
      await expect(bettingContract.connect(user2).depositFunds({ value: depositAmount }))
        .to.emit(bettingContract, "FundsDeposited")
        .withArgs(user2.address, depositAmount);
      
      // Check new balance
      const newBalance = await bettingContract.getContractBalance();
      expect(newBalance.sub(initialBalance)).to.equal(depositAmount);
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle insufficient contract balance", async function () {
      // Place a large bet
      const betAmount = ethers.utils.parseEther("0.5");
      await bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount });
      
      // Fast forward time
      await time.increaseTo(futureTimestamp + 1);
      
      // Withdraw funds to create insufficient balance scenario
      const withdrawAmount = ethers.utils.parseEther("0.2");
      await owner.sendTransaction({ to: bettingContract.address, value: withdrawAmount });
      await bettingContract.connect(owner).withdrawFunds(withdrawAmount);
      
      // Resolve bet as won (would need 0.5 + (0.5 * 0.95) = 0.975 ETH)
      await expect(
        bettingContract.connect(owner).resolveBet(0, true)
      ).to.be.revertedWith("Contract has insufficient funds");
    });
    
    it("Should maintain state consistency with concurrent operations", async function () {
      // Place multiple bets from different users
      const betAmount = ethers.utils.parseEther("0.1");
      
      await bettingContract.connect(user1).placeBet(futureTimestamp, { value: betAmount });
      await bettingContract.connect(user2).placeBet(futureTimestamp, { value: betAmount });
      await bettingContract.connect(user3).placeBet(futureTimestamp, { value: betAmount });
      
      // Fast forward time
      await time.increaseTo(futureTimestamp + 1);
      
      // Resolve bets with different outcomes
      await bettingContract.connect(owner).resolveBet(0, true);
      await bettingContract.connect(owner).resolveBet(1, false);
      await bettingContract.connect(owner).resolveBet(2, true);
      
      // Verify all bets were resolved correctly
      const bet0 = await bettingContract.getBetDetails(0);
      const bet1 = await bettingContract.getBetDetails(1);
      const bet2 = await bettingContract.getBetDetails(2);
      
      expect(bet0.isResolved).to.be.true;
      expect(bet0.didWin).to.be.true;
      
      expect(bet1.isResolved).to.be.true;
      expect(bet1.didWin).to.be.false;
      
      expect(bet2.isResolved).to.be.true;
      expect(bet2.didWin).to.be.true;
      
      // Check final contract stats
      const stats = await bettingContract.getContractStats();
      expect(stats[2]).to.equal(3); // totalBetsResolved
    });
    
    it("Should handle zero value operations correctly", async function () {
      // Try to deposit zero amount
      await expect(
        bettingContract.connect(user1).depositFunds({ value: 0 })
      ).to.be.revertedWith("Deposit amount must be greater than 0");
      
      // Try to withdraw zero amount
      await expect(
        bettingContract.connect(owner).withdrawFunds(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
    
    it("Should reject invalid parameter configurations", async function () {
      // Try to set min bet higher than max bet
      await expect(
        bettingContract.connect(owner).setMinBetAmount(ethers.utils.parseEther("2"))
      ).to.be.revertedWith("Minimum bet must be less than maximum bet");
      
      // Try to set max bet lower than min bet
      await expect(
        bettingContract.connect(owner).setMaxBetAmount(ethers.utils.parseEther("0.001"))
      ).to.be.revertedWith("Maximum bet must be greater than minimum bet");
      
      // Try to set house edge too high
      await expect(
        bettingContract.connect(owner).setHouseEdgePercent(1100) // 11%
      ).to.be.revertedWith("House edge cannot exceed 10%");
    });
  });
});