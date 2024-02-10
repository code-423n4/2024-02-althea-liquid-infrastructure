# Report


## Gas Optimizations


| |Issue|Instances|
|-|:-|:-:|
| [GAS-1](#GAS-1) | Use assembly to check for `address(0)` | 3 |
| [GAS-2](#GAS-2) | Using bools for storage incurs overhead | 2 |
| [GAS-3](#GAS-3) | Cache array length outside of loop | 7 |
| [GAS-4](#GAS-4) | Use calldata instead of memory for function arguments that do not get mutated | 7 |
| [GAS-5](#GAS-5) | For Operations that will not overflow, you could use unchecked | 81 |
| [GAS-6](#GAS-6) | Use Custom Errors | 8 |
| [GAS-7](#GAS-7) | Don't initialize variables with default value | 7 |
| [GAS-8](#GAS-8) | Long revert strings | 3 |
| [GAS-9](#GAS-9) | Functions guaranteed to revert when called by normal users can be marked `payable` | 4 |
| [GAS-10](#GAS-10) | `++i` costs less gas than `i++`, especially when it's used in `for`-loops (`--i`/`i--` too) | 9 |
| [GAS-11](#GAS-11) | Using `private` rather than `public` for constants, saves gas | 3 |
| [GAS-12](#GAS-12) | Use != 0 instead of > 0 for unsigned integer comparison | 4 |
### <a name="GAS-1"></a>[GAS-1] Use assembly to check for `address(0)`
*Saves 6 gas per instance*

*Instances (3)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

133:         if (!(to == address(0))) {

139:         if (from == address(0) || to == address(0)) {

139:         if (from == address(0) || to == address(0)) {

```

### <a name="GAS-2"></a>[GAS-2] Using bools for storage incurs overhead
Use uint256(1) and uint256(2) for true/false to avoid a Gwarmaccess (100 gas), and to avoid Gsset (20000 gas) when changing from ‘false’ to ‘true’, after having been ‘true’ in the past. See [source](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/58f635312aa21f947cae5f8578638a85aa2519f5/contracts/security/ReentrancyGuard.sol#L23-L27).

*Instances (2)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

65:     mapping(address => bool) public HolderAllowlist;

80:     bool public LockedForDistribution;

```

### <a name="GAS-3"></a>[GAS-3] Cache array length outside of loop
If not cached, the solidity compiler will always read the length of the array during each iteration. That is, if it is a storage array, this is an extra sload operation (100 additional extra gas for each iteration except for the first) and if it is a memory array, this is an extra mload operation (3 additional gas for each iteration except for the first).

*Instances (7)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

171:             for (uint i = 0; i < holders.length; i++) {

220:                 for (uint j = 0; j < distributableERC20s.length; j++) {

271:         for (uint i = 0; i < distributableERC20s.length; i++) {

421:         for (uint i = 0; i < ManagedNFTs.length; i++) {

467:         for (uint i = 0; i < _approvedHolders.length; i++) {

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

120:         for (uint i = 0; i < newErc20s.length; i++) {

175:         for (uint i = 0; i < erc20s.length; i++) {

```

### <a name="GAS-4"></a>[GAS-4] Use calldata instead of memory for function arguments that do not get mutated
Mark data types as `calldata` instead of `memory` where possible. This makes it so that the data is not automatically loaded into memory. If the data passed into the function does not need to be changed (like updating values in an array), it can be passed in as `calldata`. The one exception to this is if the argument must later be passed into another function that takes an argument that specifies `memory` storage.

*Instances (7)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

442:         address[] memory _distributableERC20s

457:         string memory _name,

458:         string memory _symbol,

459:         address[] memory _managedNFTs,

460:         address[] memory _approvedHolders,

462:         address[] memory _distributableErc20s

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

63:         string memory accountName

```

### <a name="GAS-5"></a>[GAS-5] For Operations that will not overflow, you could use unchecked

*Instances (81)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

2: pragma solidity 0.8.12; // Force solidity compliance

2: pragma solidity 0.8.12; // Force solidity compliance

4: import "@openzeppelin/contracts/utils/math/Math.sol";

4: import "@openzeppelin/contracts/utils/math/Math.sol";

4: import "@openzeppelin/contracts/utils/math/Math.sol";

4: import "@openzeppelin/contracts/utils/math/Math.sol";

5: import "@openzeppelin/contracts/access/Ownable.sol";

5: import "@openzeppelin/contracts/access/Ownable.sol";

5: import "@openzeppelin/contracts/access/Ownable.sol";

6: import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

6: import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

6: import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

6: import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

7: import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

7: import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

7: import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

7: import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

8: import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

8: import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

8: import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

8: import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

8: import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

9: import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

9: import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

9: import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

9: import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

9: import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

10: import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

10: import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

10: import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

11: import "./LiquidInfrastructureNFT.sol";

171:             for (uint i = 0; i < holders.length; i++) {

171:             for (uint i = 0; i < holders.length; i++) {

174:                     holders[i] = holders[holders.length - 1];

209:             nextDistributionRecipient + numDistributions,

214:         for (i = nextDistributionRecipient; i < limit; i++) {

214:         for (i = nextDistributionRecipient; i < limit; i++) {

220:                 for (uint j = 0; j < distributableERC20s.length; j++) {

220:                 for (uint j = 0; j < distributableERC20s.length; j++) {

222:                     uint256 entitlement = erc20EntitlementPerUnit[j] *

249:         return (block.number - LastDistribution) >= MinDistributionPeriod;

271:         for (uint i = 0; i < distributableERC20s.length; i++) {

271:         for (uint i = 0; i < distributableERC20s.length; i++) {

275:             uint256 entitlement = balance / supply;

367:             numWithdrawals + nextWithdrawal,

371:         for (i = nextWithdrawal; i < limit; i++) {

371:         for (i = nextWithdrawal; i < limit; i++) {

421:         for (uint i = 0; i < ManagedNFTs.length; i++) {

421:         for (uint i = 0; i < ManagedNFTs.length; i++) {

425:                 ManagedNFTs[i] = ManagedNFTs[ManagedNFTs.length - 1];

467:         for (uint i = 0; i < _approvedHolders.length; i++) {

467:         for (uint i = 0; i < _approvedHolders.length; i++) {

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

2: pragma solidity 0.8.12; // Force solidity compliance

2: pragma solidity 0.8.12; // Force solidity compliance

4: import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

4: import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

4: import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

4: import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

5: import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

5: import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

5: import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

5: import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

6: import "./OwnableApprovableERC721.sol";

67:                 "althea://liquid-infrastructure-account/",

67:                 "althea://liquid-infrastructure-account/",

67:                 "althea://liquid-infrastructure-account/",

67:                 "althea://liquid-infrastructure-account/",

67:                 "althea://liquid-infrastructure-account/",

120:         for (uint i = 0; i < newErc20s.length; i++) {

120:         for (uint i = 0; i < newErc20s.length; i++) {

175:         for (uint i = 0; i < erc20s.length; i++) {

175:         for (uint i = 0; i < erc20s.length; i++) {

```

```solidity
File: liquid-infrastructure/contracts/OwnableApprovableERC721.sol

2: pragma solidity 0.8.12; // Force solidity compliance

2: pragma solidity 0.8.12; // Force solidity compliance

4: import "@openzeppelin/contracts/utils/Context.sol";

4: import "@openzeppelin/contracts/utils/Context.sol";

4: import "@openzeppelin/contracts/utils/Context.sol";

5: import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

5: import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

5: import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

5: import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

```

### <a name="GAS-6"></a>[GAS-6] Use Custom Errors
[Source](https://blog.soliditylang.org/2021/04/21/custom-errors/)
Instead of using error strings, to reduce deployment and runtime cost, you should use Custom Errors. This would save both deployment and runtime cost.

*Instances (8)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

107:         require(!isApprovedHolder(holder), "holder already approved");

117:         require(isApprovedHolder(holder), "holder not approved");

132:         require(!LockedForDistribution, "distribution in progress");

199:         require(numDistributions > 0, "must process at least 1 distribution");

360:         require(!LockedForDistribution, "cannot withdraw during distribution");

431:         require(true, "unable to find released NFT in ManagedNFTs");

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

180:                 require(result, "unsuccessful withdrawal");

```

```solidity
File: liquid-infrastructure/contracts/OwnableApprovableERC721.sol

40:             revert("OwnableApprovable: caller is not owner nor approved");

```

### <a name="GAS-7"></a>[GAS-7] Don't initialize variables with default value

*Instances (7)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

171:             for (uint i = 0; i < holders.length; i++) {

220:                 for (uint j = 0; j < distributableERC20s.length; j++) {

271:         for (uint i = 0; i < distributableERC20s.length; i++) {

421:         for (uint i = 0; i < ManagedNFTs.length; i++) {

467:         for (uint i = 0; i < _approvedHolders.length; i++) {

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

120:         for (uint i = 0; i < newErc20s.length; i++) {

175:         for (uint i = 0; i < erc20s.length; i++) {

```

### <a name="GAS-8"></a>[GAS-8] Long revert strings

*Instances (3)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

199:         require(numDistributions > 0, "must process at least 1 distribution");

360:         require(!LockedForDistribution, "cannot withdraw during distribution");

431:         require(true, "unable to find released NFT in ManagedNFTs");

```

### <a name="GAS-9"></a>[GAS-9] Functions guaranteed to revert when called by normal users can be marked `payable`
If a function modifier such as `onlyOwner` is used, the function will revert if a normal user tries to pay the function. Marking the function as `payable` will lower the gas cost for legitimate callers because the compiler will not include checks for whether a payment was provided.

*Instances (4)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

106:     function approveHolder(address holder) public onlyOwner {

116:     function disapproveHolder(address holder) public onlyOwner {

394:     function addManagedNFT(address nftContract) public onlyOwner {

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

203:     function recoverAccount() public virtual onlyOwner(AccountId) {

```

### <a name="GAS-10"></a>[GAS-10] `++i` costs less gas than `i++`, especially when it's used in `for`-loops (`--i`/`i--` too)
*Saves 5 gas per loop*

*Instances (9)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

171:             for (uint i = 0; i < holders.length; i++) {

214:         for (i = nextDistributionRecipient; i < limit; i++) {

220:                 for (uint j = 0; j < distributableERC20s.length; j++) {

271:         for (uint i = 0; i < distributableERC20s.length; i++) {

371:         for (i = nextWithdrawal; i < limit; i++) {

421:         for (uint i = 0; i < ManagedNFTs.length; i++) {

467:         for (uint i = 0; i < _approvedHolders.length; i++) {

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

120:         for (uint i = 0; i < newErc20s.length; i++) {

175:         for (uint i = 0; i < erc20s.length; i++) {

```

### <a name="GAS-11"></a>[GAS-11] Using `private` rather than `public` for constants, saves gas
If needed, the values can be read from the verified contract source code, or if there are multiple values there can be a single getter function that [returns a tuple](https://github.com/code-423n4/2022-08-frax/blob/90f55a9ce4e25bceed3a74290b854341d8de6afa/src/contracts/FraxlendPair.sol#L156-L178) of the values of all currently-public constants. Saves **3406-3606 gas** in deployment gas due to the compiler not having to create non-payable getter functions for deployment calldata, not having to store the bytes of the value outside of where it's used, and not adding another entry to the method ID table

*Instances (3)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

54:     uint256 public constant Version = 1;

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

46:     uint256 public constant Version = 1;

53:     uint256 public constant AccountId = 1;

```

### <a name="GAS-12"></a>[GAS-12] Use != 0 instead of > 0 for unsigned integer comparison

*Instances (4)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

186:         if (num > 0) {

199:         require(numDistributions > 0, "must process at least 1 distribution");

265:         if (erc20EntitlementPerUnit.length > 0) {

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

178:             if (balance > 0) {

```


## Non Critical Issues


| |Issue|Instances|
|-|:-|:-:|
| [NC-1](#NC-1) | Event is missing `indexed` fields | 7 |
| [NC-2](#NC-2) | Functions not used internally could be marked external | 9 |
### <a name="NC-1"></a>[NC-1] Event is missing `indexed` fields
Index event fields make the field more quickly accessible to off-chain tools that parse events. However, note that each index field costs extra gas during emission, so it's not necessarily best to index the maximum allowed per event (three fields). Each event should use three indexed fields if there are three or more fields, and gas usage is not particularly of concern for the events in question. If there are fewer than three fields, all of the fields should be indexed.

*Instances (7)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

38:     event Distribution(address recipient, address[] tokens, uint256[] amounts);

41:     event Withdrawal(address source);

43:     event AddManagedNFT(address nft);

44:     event ReleaseManagedNFT(address nft, address to);

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

34:     event SuccessfulWithdrawal(address to, address[] erc20s, uint256[] amounts);

36:     event SuccessfulRecovery(address[] erc20s, uint256[] amounts);

37:     event ThresholdsChanged(address[] newErc20s, uint256[] newAmounts);

```

### <a name="NC-2"></a>[NC-2] Functions not used internally could be marked external

*Instances (9)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

106:     function approveHolder(address holder) public onlyOwner {

116:     function disapproveHolder(address holder) public onlyOwner {

303:     function mintAndDistribute(

331:     function burnAndDistribute(uint256 amount) public {

344:     function burnFromAndDistribute(address account, uint256 amount) public {

351:     function withdrawFromAllManagedNFTs() public {

394:     function addManagedNFT(address nftContract) public onlyOwner {

413:     function releaseManagedNFT(

441:     function setDistributableERC20s(

```


## Low Issues


| |Issue|Instances|
|-|:-|:-:|
| [L-1](#L-1) | Unsafe ERC20 operation(s) | 3 |
### <a name="L-1"></a>[L-1] Unsafe ERC20 operation(s)

*Instances (3)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

224:                     if (toDistribute.transfer(recipient, entitlement)) {

418:         nft.transferFrom(address(this), to, nft.AccountId());

```

```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol

179:                 bool result = IERC20(erc20).transfer(destination, balance);

```


## Medium Issues


| |Issue|Instances|
|-|:-|:-:|
| [M-1](#M-1) | Centralization Risk for trusted owners | 9 |
### <a name="M-1"></a>[M-1] Centralization Risk for trusted owners

#### Impact:
Contracts have owners with privileged rights to perform admin tasks and need to be trusted to not perform malicious updates or drain funds.

*Instances (9)*:
```solidity
File: liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol

32:     Ownable,

106:     function approveHolder(address holder) public onlyOwner {

116:     function disapproveHolder(address holder) public onlyOwner {

306:     ) public onlyOwner {

321:     ) public onlyOwner nonReentrant {

394:     function addManagedNFT(address nftContract) public onlyOwner {

416:     ) public onlyOwner nonReentrant {

443:     ) public onlyOwner {

463:     ) ERC20(_name, _symbol) Ownable() {

```

