// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
// Fractionalize an asset: owner locks a described asset + sets total shares at a price; buyers buy shares.
contract ArcFraction {
    struct Vault { address curator; string asset; string description; uint256 totalShares; uint256 sharePrice; uint256 soldShares; uint256 raised; bool active; uint256 createdAt; }
    Vault[] public vaults;
    mapping(uint256 => mapping(address => uint256)) public shares;
    mapping(uint256 => address[]) public holders;
    mapping(uint256 => mapping(address => bool)) public isHolder;
    event VaultCreated(uint256 indexed id, address curator, string asset, uint256 totalShares);
    event SharesBought(uint256 indexed id, address buyer, uint256 amount);
    function create(string calldata asset, string calldata desc, uint256 totalShares, uint256 sharePrice) external {
        require(totalShares > 0 && sharePrice > 0, "Invalid");
        vaults.push(Vault(msg.sender, asset, desc, totalShares, sharePrice, 0, 0, true, block.timestamp));
        emit VaultCreated(vaults.length-1, msg.sender, asset, totalShares);
    }
    function buy(uint256 id, uint256 amount) external payable {
        Vault storage v = vaults[id];
        require(v.active && amount > 0 && v.soldShares + amount <= v.totalShares, "Unavailable");
        require(msg.value == v.sharePrice * amount, "Wrong amount");
        if (!isHolder[id][msg.sender]) { isHolder[id][msg.sender] = true; holders[id].push(msg.sender); }
        shares[id][msg.sender] += amount; v.soldShares += amount; v.raised += msg.value;
        (bool ok,) = payable(v.curator).call{value: msg.value}(""); require(ok,"f");
        emit SharesBought(id, msg.sender, amount);
    }
    function getVault(uint256 id) external view returns (Vault memory) { return vaults[id]; }
    function sharesOf(uint256 id, address u) external view returns (uint256) { return shares[id][u]; }
    function getHolders(uint256 id) external view returns (address[] memory) { return holders[id]; }
    function totalVaults() external view returns (uint256) { return vaults.length; }
}