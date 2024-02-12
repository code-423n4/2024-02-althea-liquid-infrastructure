# Althea Liquid Infrastructure audit details

- Total Prize Pool: $24,500 in USDC
  - HM awards: $16,500 in USDC
  - Analysis awards: $1,000 in USDC
  - QA awards: $500 in USDC
  - Bot Race awards: $1,500 in USDC
  - Gas awards: $500 in USDC
  - Judge awards: $2,400 in USDC
  - Lookout awards: $1,600 in USDC
  - Scout awards: $500 in USDC
- Join [C4 Discord](https://discord.gg/code4rena) to register
- Submit findings [using the C4 form](https://code4rena.com/contests/2024-02-althea-liquid-infrastructure/submit)
- [Read our guidelines for more details](https://docs.code4rena.com/roles/wardens)
- Starts February 13, 2024 20:00 UTC
- Ends February 19, 2024 20:00 UTC

## Automated Findings / Publicly Known Issues

The 4naly3er report can be found [here](https://github.com/code-423n4/2024-02-althea-liquid-infrastructure/blob/main/4naly3er-report.md).

Automated findings output for the audit can be found [here](https://github.com/code-423n4/2024-02-althea-liquid-infrastructure/blob/main/bot-report.md) within 24 hours of audit opening.

_Note for C4 wardens: Anything included in this `Automated Findings / Publicly Known Issues` section is considered a publicly known issue and is ineligible for awards._

The following are intended design and aren't considered issues:
* Some of the variables in LiquidInfrastructureNFT.sol will have no effect on most EVM chains (in particular: `thresholdErc20s`, `thresholdAmounts`, `getThresholds()`, `setThresholds()`, and `recoverAccount()`).
These values and functions are all specific to deployment on Althea-L1 and will interact with Althea-L1's Cosmos module functionality. These contract elements are not out of scope, but the interaction between these elements and any Cosmos modules should not be considered.
* In order to simplify the distribution logic and accounting of LiquidInfrastructureERC20.sol, many contract functions periodically become blocked.
During a revenue distribution all token transfers should be blocked (including mints and burns).
If a distribution has not happened in at least `MinDistributionPeriod` blocks then all mints and burns should be blocked.

# Overview

## About Liquid Infrastructure

Liquid Infrastructure is a protocol to enable the tokenization and investment in real world assets which accrue revenue on-chain, and will be deployed on the Althea-L1 blockchain after launch.
The protocol consists of tokenized real world assets represented on-chain by deployed LiquidInfrastructureNFT contracts, and the LiquidInfrastructureERC20 token that functions to aggregate and distribute revenue proportionally to holders.
LiquidInfrastructureNFTs are flexible enough to represent devices like routers participating in Althea's pay-per-forward billing protocol, vending machines, renewable energy infrastructure, or electric car chargers.
Liquid Infrastructure makes it possible to automatically manage these tokenized assets and arbitrarily group them, creating ERC20 tokens that represent real world assets of various classes.

Althea-L1 is a Cosmos SDK chain with an EVM compatibility layer, and the Liquid Infrastructure contracts make mention of several features that the chain will bring to Liquid Infrastructure.
The Althea-L1 chain and its functionality provided by Cosmos SDK modules (e.g. x/bank, x/microtx, ...) are all out of scope for this audit.

## Links

- [Liquid Infrastructure](https://www.althea.net/liquid-infrastructure)
- [Twitter](https://twitter.com/AltheaNetwork)
- [Discord](https://discord.gg/hHx7HxcycF)

# Scope

| Contract                                                                                                                                                                    | SLOC | Purpose                                                                                                          | Libraries used                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [LiquidInfrastructureERC20.sol](https://github.com/code-423n4/2024-02-althea-liquid-infrastructure/blob/main/liquid-infrastructure/contracts/LiquidInfrastructureERC20.sol) | 270  | This ERC20 withdraws revenue from its managed LiquidInfrastructureNFTs and distributes proportionally to holders | [`@openzeppelin/*`](https://openzeppelin.com/contracts/)                                                                                                                                                                       |
| [LiquidInfrastructureNFT.sol](https://github.com/code-423n4/2024-02-althea-liquid-infrastructure/blob/main/liquid-infrastructure/contracts/LiquidInfrastructureNFT.sol)     | 88   | This ERC721 accumulates ERC20 balances and enables permissioned balance withdrawals                              | [`@openzeppelin/*`](https://openzeppelin.com/contracts/) [`OwnableApprovableERC721`](https://github.com/code-423n4/2024-02-althea-liquid-infrastructure/blob/main/liquid-infrastructure/contracts/OwnableApprovableERC721.sol) |
| [OwnableApprovableERC721.sol](https://github.com/code-423n4/2024-02-althea-liquid-infrastructure/blob/main/liquid-infrastructure/contracts/OwnableApprovableERC721.sol)     | 19   | This abstract contract provides modifiers based on ownership and approval status of ERC721 tokens                | [`@openzeppelin/*`](https://openzeppelin.com/contracts/)                                                                                                                                                                       |

## Out of scope

- All of the `Test*` contracts, which are simple testing contracts used to test ERC20 balance accumulation.
- Althea-L1 and all Cosmos modules including the Bank (`x/bank`) and Microtx (`x/microtx`) modules mentioned in `LiquidInfrastructureNFT.sol`, and any interaction between Cosmos modules and the in-scope contracts should not be considered.

# Additional Context

- `LiquidInfrastructureERC20.sol` is expected to facilitate a KYC (Know Your Customer) process to restrict which addresses are allowed to hold an ERC20 balance.
- LiquidInfrastructureNFT.sol's threshold variables (`thresholdErc20s`, `thresholdAmounts`) and functions (`getThresholds()`, `setThresholds()`), and recovery functionality through `recoverAccount()` are all specific to deployment on Althea-L1. These fields and values should offer no effective functionality on other EVM chains. They are not out of scope, but the interaction between these values and any Cosmos modules should not be considered.
- Liquid Infrastructure is expected to use ERC20 stablecoins like USDC, Dai, or USDT as revenue tokens. The protocol is expected to vet ERC20s and opt-in to their use to avoid issues with non-standard tokens (e.g. rebasing tokens).
- `LiquidInfrastructureERC20.sol` should comply with ERC20 standard, except that `transfer()` must not work during an active distribution and `mint()` and `burn()` should not work when the minimum distribution period has elapsed.
- `LiquidInfrastructureNFT.sol` should comply with ERC721 standard and contain a single token with ID `1`.
- Each `LiquidInfrastructureNFT.sol` is expected to have a single owner address for the only token contained by the contract. The owner should have typical permissions, with the added ability to withdraw ERC20 balances held by the NFT. LiquidInfrastructureNFTs may or may not be managed by a LiquidInfrastructureERC20, in which case the ERC20 must be able to withdraw balances.

## Attack ideas (Where to look for bugs)

- Errors in the distribution to holders, such as the ability to take rewards entitled to another holder

- DoS attacks against the LiquidInfrastructureERC20 are of significant concern, particularly if there is a way to permanently trigger out of gas errors

- Acquiring the ERC20 (and therefore rewards) without approval is another significant concern

## Scoping Details

```
- If you have a public code repo, please share it here: https://github.com/althea-net/liquid-infrastructure-contracts
- How many contracts are in scope?: 3
- Total SLoC for these contracts?: 377
- How many external imports are there?: 9
- How many separate interfaces and struct definitions are there for the contracts within scope?: 0 interfaces 0 structs
- Does most of your code generally use composition or inheritance?: Inheritance
- How many external calls?: 9
- What is the overall line coverage percentage provided by your tests?: 95.09
- Is this an upgrade of an existing system?: No
- Check all that apply (e.g. timelock, NFT, AMM, ERC20, rollups, etc.): NFT, ERC20
- Is there a need to understand a separate part of the codebase / get context in order to audit this part of the protocol?: No
- Please describe required context:
- Does it use an oracle?: No
- Describe any novel or unique curve logic or mathematical models your code uses:
- Is this either a fork of or an alternate implementation of another project?: No
- Does it use a side-chain?: No
- Describe any specific areas you would like addressed:
```

# Tests

See README.md in the `liquid-infrastructure` directory for compliation and testing instructions.

## Miscellaneous

Employees of Althea, Hawk Networks and employees' family members are ineligible to participate in this audit.
