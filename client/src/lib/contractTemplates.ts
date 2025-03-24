// Contract templates for common contract types

export const contractTemplates = {
  SimpleStorage: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;
    
    function set(uint256 _value) public {
        value = _value;
    }
    
    function get() public view returns (uint256) {
        return value;
    }
}`,

  ERC20Token: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ERC20Token {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory name_, string memory symbol_, uint256 initialSupply) {
        name = name_;
        symbol = symbol_;
        _mint(msg.sender, initialSupply * 10 ** decimals);
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
    
    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view returns (uint256) {
        return allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        _transfer(sender, recipient, amount);
        
        uint256 currentAllowance = allowances[sender][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        
        return true;
    }
    
    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        
        uint256 senderBalance = balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            balances[sender] = senderBalance - amount;
        }
        balances[recipient] += amount;
        
        emit Transfer(sender, recipient, amount);
    }
    
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");
        
        totalSupply += amount;
        balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }
    
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        
        allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}`,

  BettingContract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BettingContract {
    enum Status { Open, Accepted, Resolved, Voided }
    enum Outcome { NotResolved, Outcome1Wins, Outcome2Wins, Draw }
    
    struct BetDetails {
        string title;
        string description;
        string category;
        string outcome1;
        string outcome2;
        uint256 endDate;
        uint256 betAmount;
        address creator;
        address acceptor;
        address resolver;
        Status status;
        Outcome outcome;
    }
    
    string public title;
    string public description;
    string public category;
    string public outcome1;
    string public outcome2;
    uint256 public endDate;
    uint256 public betAmount;
    
    address public creator;
    address public acceptor;
    address public resolver;
    
    Status public status;
    Outcome public outcome;
    
    event BetAccepted(address indexed acceptor, uint256 amount);
    event BetResolved(Outcome outcome, address indexed winner);
    event BetVoided();
    
    modifier onlyResolver() {
        require(msg.sender == resolver, "Only the resolver can call this function");
        _;
    }
    
    modifier onlyBeforeEndDate() {
        require(block.timestamp < endDate, "Bet period has ended");
        _;
    }
    
    modifier onlyAfterEndDate() {
        require(block.timestamp >= endDate, "Bet period has not ended yet");
        _;
    }
    
    constructor(
        string memory _title,
        string memory _description,
        string memory _category,
        string memory _outcome1,
        string memory _outcome2,
        uint256 _endDate,
        address _resolver
    ) payable {
        require(_endDate > block.timestamp, "End date must be in the future");
        
        title = _title;
        description = _description;
        category = _category;
        outcome1 = _outcome1;
        outcome2 = _outcome2;
        endDate = _endDate;
        betAmount = msg.value;
        
        creator = msg.sender;
        resolver = _resolver;
        status = Status.Open;
        outcome = Outcome.NotResolved;
    }
    
    function acceptBet() external payable returns (uint256) {
        require(status == Status.Open, "Bet is not open for acceptance");
        require(msg.value == betAmount, "Must match the exact bet amount");
        require(msg.sender != creator, "Creator cannot accept their own bet");
        
        acceptor = msg.sender;
        status = Status.Accepted;
        
        emit BetAccepted(acceptor, msg.value);
        
        return betAmount;
    }
    
    function resolveBet(Outcome _outcome) external onlyResolver {
        require(status == Status.Accepted, "Bet must be accepted before resolving");
        require(_outcome != Outcome.NotResolved, "Cannot resolve to NotResolved state");
        require(outcome == Outcome.NotResolved, "Bet already resolved");
        
        outcome = _outcome;
        status = Status.Resolved;
        
        address winner;
        if (_outcome == Outcome.Outcome1Wins) {
            winner = creator;
        } else if (_outcome == Outcome.Outcome2Wins) {
            winner = acceptor;
        } else {
            // In case of a draw, both get their money back
            payable(creator).transfer(betAmount);
            payable(acceptor).transfer(betAmount);
            emit BetResolved(_outcome, address(0));
            return;
        }
        
        // Winner gets both stakes
        payable(winner).transfer(betAmount * 2);
        
        emit BetResolved(_outcome, winner);
    }
    
    function voidBet() external onlyResolver {
        require(status == Status.Open || status == Status.Accepted, "Cannot void resolved or already voided bet");
        
        status = Status.Voided;
        
        // Return funds to participants
        payable(creator).transfer(betAmount);
        if (status == Status.Accepted) {
            payable(acceptor).transfer(betAmount);
        }
        
        emit BetVoided();
    }
    
    function getBetDetails() external view returns (BetDetails memory) {
        return BetDetails({
            title: title,
            description: description,
            category: category,
            outcome1: outcome1,
            outcome2: outcome2,
            endDate: endDate,
            betAmount: betAmount,
            creator: creator,
            acceptor: acceptor,
            resolver: resolver,
            status: status,
            outcome: outcome
        });
    }
}`
};

// Function to get contract template by type
export function getContractTemplate(contractType: string): string {
  const template = contractTemplates[contractType as keyof typeof contractTemplates];
  if (!template) {
    throw new Error(`Contract template for ${contractType} not found`);
  }
  return template;
}
