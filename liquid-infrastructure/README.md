# Althea Liquid Infrastructure Contracts

This repo contains the smart contracts for Althea Liquid Infrastructure. This is a portable implementation of a revenue generating NFT and then an ERC20 that can hold one or more of these revenue generating NFT. The concept here is to be modular. When using [Althea L1](https://github.com/althea-net/althea-L1) revenue will be distributed to the Liquid Infrastructure NFT automatically by MicroTX module. On other chains it's up to the maintainer of the network to lock revenue into the NFT via an external script after which the ERC20 layer will handle distributions to all holders.

Distributions are done directly to the address holding the ERC20, the holder does not call a claim endpoint instead a distribution endpoint exists that distributes to all holders every distribution epoch, this greatly simplifies the distribuiton logic. 

The contract source files live in `contracts/`. The tests live in `test/` and may use `test-utils/` for reusable testing components.
Testing relies on the use of [HardHat](https://hardhat.org/) and `contract-deployer.ts`, which is called via `scripts/contract-deployer.sh`.

## Compiling the contracts

1. Run `npm install`
1. Run `npm run compile`
1. The compiled files are all placed in artifacts/contracts/\<Contract Name\>.sol/\<Contract Name\>.json, these are directly usable with libraries like ethers.js.

## Testing the contracts

The tests should use [Chai](https://www.chaijs.com/) with the [ethereum-waffle extensions](https://ethereum-waffle.readthedocs.io/en/latest/).

Define tests in the `test/` folder and then run `npm run test` to run them.
