import chai from "chai";

import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import {
  deployContracts,
  deployERC20A,
  deployLiquidERC20,
  deployLiquidNFT,
} from "../test-utils";
import {
  TestERC20A,
  TestERC20B,
  TestERC20C,
  LiquidInfrastructureNFT,
  LiquidInfrastructureERC20,
} from "../typechain-types/contracts";
import { ERC20 } from "../typechain-types/@openzeppelin/contracts/token/ERC20";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = chai;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ONE_ETH = 1000000000000000000;

// This test makes assertions about the LiquidInfrastructureERC20 contract by running it on hardhat
//
// Important test details:
// Contract interactions happen via hardhat-ethers: https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-ethers
// Chai is used to make assertions https://www.chaijs.com/api/bdd/
// Ethereum-waffle is used to extend chai and add ethereum matchers: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
async function liquidErc20Fixture() {
  const signers = await ethers.getSigners();
  const nftAccount1 = signers[0];
  const nftAccount2 = signers[1];
  const nftAccount3 = signers[2];
  const erc20Owner = signers[3];
  const holder1 = signers[4];
  const holder2 = signers[5];
  const holder3 = signers[6];
  const holder4 = signers[7];
  const badSigner = signers[8];

  // Deploy several ERC20 tokens to use as revenue currencies
  //////////////////
  const { testERC20A, testERC20B, testERC20C } = await deployContracts(
    erc20Owner
  );
  const erc20Addresses = [
    await testERC20A.getAddress(),
    await testERC20B.getAddress(),
    await testERC20C.getAddress(),
  ];

  // Deploy the LiquidInfra ERC20 token with no initial holders nor managed NFTs
  //////////////////
  const infraERC20 = await deployLiquidERC20(
    erc20Owner,
    "Infra",
    "INFRA",
    [],
    [],
    500,
    erc20Addresses
  );

  expect(await infraERC20.totalSupply()).to.equal(0);
  expect(await infraERC20.name()).to.equal("Infra");
  expect(await infraERC20.symbol()).to.equal("INFRA");
  await expect(infraERC20.ManagedNFTs(0)).to.be.reverted;
  expect(await infraERC20.isApprovedHolder(holder1.address)).to.equal(false);
  await expect(infraERC20.mint(holder1.address, 1000)).to.be.reverted;
  expect(await infraERC20.balanceOf(holder1.address)).to.equal(0);

  return {
    infraERC20,
    testERC20A,
    testERC20B,
    testERC20C,
    signers,
    nftAccount1,
    nftAccount2,
    nftAccount3,
    erc20Owner,
    holder1,
    holder2,
    holder3,
    holder4,
    badSigner,
  };
}

// Checks that the owner of the ERC20 is the only one allowed to add ManagedNFTs to the ERC20
async function basicNftManagementTests(
  infraERC20: LiquidInfrastructureERC20,
  nftAccount1: HardhatEthersSigner,
  nftAccount2: HardhatEthersSigner,
  badSigner: HardhatEthersSigner
) {
  // Deploy several LiquidInfrastructureNFTs to test the NFT management features
  //////////////////
  const infraERC20NotOwner = infraERC20.connect(badSigner);
  const NFT1 = await deployLiquidNFT(nftAccount1);
  const NFT1NotOwner = NFT1.connect(badSigner);
  const NFT2 = await deployLiquidNFT(nftAccount2);

  console.log("Manage");
  await transferNftToErc20AndManage(infraERC20, NFT1, nftAccount1);
  // Transfer the NFT back to the original holder
  expect(
    await infraERC20.releaseManagedNFT(
      await NFT1.getAddress(),
      nftAccount1.address
    )
  )
    .to.emit(infraERC20, "ReleaseManagedNFT")
    .withArgs(await NFT1.getAddress(), nftAccount1.address);

  expect(await NFT1.ownerOf(await NFT1.AccountId())).to.equal(
    nftAccount1.address
  );
  console.log("Bad Signer");
  await failToManageNFTBadSigner(infraERC20NotOwner, NFT2, nftAccount2);
  console.log("Not NFT Owner");
  await failToManageNFTNotOwner(infraERC20, NFT1NotOwner);
}

export async function transferNftToErc20AndManage(
  infraERC20: LiquidInfrastructureERC20,
  nftToManage: LiquidInfrastructureNFT,
  nftOwner: HardhatEthersSigner
) {
  const infraAddress = await infraERC20.getAddress();
  const accountId = await nftToManage.AccountId();
  expect(await nftToManage.transferFrom(nftOwner, infraAddress, accountId)).to
    .be.ok;
  expect(await nftToManage.ownerOf(accountId)).to.equal(
    infraAddress,
    "unexpected nft owner"
  );

  expect(await infraERC20.addManagedNFT(await nftToManage.getAddress()))
    .to.emit(infraERC20, "AddManagedNFT")
    .withArgs(await nftToManage.getAddress());
}

async function failToManageNFTBadSigner(
  infraERC20BadSigner: LiquidInfrastructureERC20,
  nftToManage: LiquidInfrastructureNFT,
  nftOwner: HardhatEthersSigner
) {
  const infraAddress = await infraERC20BadSigner.getAddress();
  const nftAddress = await nftToManage.getAddress();
  const accountId = await nftToManage.AccountId();
  await expect(nftToManage.transferFrom(nftOwner, infraAddress, accountId)).to
    .be.ok;

  // It is not clear why this call needs await OUTSIDE of expect
  await expect(
    infraERC20BadSigner.addManagedNFT(nftAddress)
  ).to.be.revertedWith("Ownable: caller is not the owner");
}

async function failToManageNFTNotOwner(
  infraERC20: LiquidInfrastructureERC20,
  nftToManage: LiquidInfrastructureNFT
) {
  // Don't transfer the NFT to the ERC20
  const nftAddress = await nftToManage.getAddress();

  // It is not clear why this call needs await INSIDE of expect
  await expect(infraERC20.addManagedNFT(nftAddress)).to.be.revertedWith(
    "this contract does not own the new ManagedNFT"
  );
}

// Checks that only owner-approved holders are allowed to hold the ERC20,
// and that even the owner cannot give them tokens without approving them
async function basicErc20HolderTests(
  infraERC20: LiquidInfrastructureERC20,
  holder1: HardhatEthersSigner,
  holder2: HardhatEthersSigner,
  badSigner: HardhatEthersSigner
) {
  const infraERC20NotOwner = infraERC20.connect(badSigner);
  const initialSupply = await infraERC20.totalSupply();
  expect(await infraERC20.isApprovedHolder(holder1.address)).to.be.false;
  expect(await infraERC20.isApprovedHolder(holder2.address)).to.be.false;
  expect(await infraERC20.isApprovedHolder(badSigner.address)).to.be.false;

  // Attempt to mint to unapproved holders
  await expect(infraERC20.mint(holder1.address, 1000)).to.be.revertedWith(
    "receiver not approved to hold the token"
  );
  expect(await infraERC20.balanceOf(holder1.address)).to.equal(0);
  await expect(
    infraERC20.mintAndDistribute(holder2.address, 1000)
  ).to.be.revertedWith("receiver not approved to hold the token");
  expect(await infraERC20.totalSupply()).to.equal(initialSupply);
  expect(await infraERC20.balanceOf(holder2.address)).to.equal(0);

  // Attempt to approve using the wrong account
  await expect(
    infraERC20NotOwner.approveHolder(holder1.address)
  ).to.be.revertedWith("Ownable: caller is not the owner");
  expect(await infraERC20NotOwner.isApprovedHolder(holder1.address)).to.be
    .false;
  await expect(
    infraERC20NotOwner.disapproveHolder(holder2.address)
  ).to.be.revertedWith("Ownable: caller is not the owner");
  expect(await infraERC20NotOwner.isApprovedHolder(holder2.address)).to.be
    .false;

  // Now successfully approve holder1
  await expect(infraERC20.approveHolder(holder1.address)).to.not.be.reverted;
  expect(await infraERC20.isApprovedHolder(holder1.address)).to.be.true;
  await expect(infraERC20.approveHolder(holder1.address)).to.be.revertedWith(
    "holder already approved"
  );

  // Grant holder1 some ERC20 and fail to transfer them to holder 2
  await expect(infraERC20.mint(holder1.address, 500)).to.not.be.reverted;
  await expect(infraERC20.mintAndDistribute(holder1.address, 500)).to.not.be
    .reverted;
  expect(await infraERC20.balanceOf(holder1.address)).to.equal(1000);
  const infraERC20Holder1 = infraERC20.connect(holder1);
  await expect(
    infraERC20Holder1.transfer(holder2.address, 500)
  ).to.be.revertedWith("receiver not approved to hold the token");
  expect(await infraERC20.balanceOf(holder1.address)).to.equal(1000);
  expect(await infraERC20.balanceOf(holder2.address)).to.equal(0);

  // And successfully approve holder2
  await expect(infraERC20.approveHolder(holder2.address)).to.not.be.reverted;
  expect(await infraERC20.isApprovedHolder(holder2.address)).to.be.true;

  await expect(infraERC20Holder1.transfer(holder2.address, 500)).to.not.be
    .reverted;
  expect(await infraERC20.balanceOf(holder1.address)).to.equal(500);
  expect(await infraERC20.balanceOf(holder2.address)).to.equal(500);

  // Now disapprove holder2 and ensure they cannot receive more tokens
  await expect(infraERC20.disapproveHolder(holder2.address)).to.not.be.reverted;
  expect(await infraERC20.isApprovedHolder(holder2.address)).to.be.false;
  expect(await infraERC20.balanceOf(holder2.address)).to.equal(500);
  await expect(infraERC20.mint(holder2.address, 500)).to.be.revertedWith(
    "receiver not approved to hold the token"
  );
  await expect(
    infraERC20.mintAndDistribute(holder2.address, 500)
  ).to.be.revertedWith("receiver not approved to hold the token");
  await expect(
    infraERC20Holder1.transfer(holder2.address, 500)
  ).to.be.revertedWith("receiver not approved to hold the token");
  expect(await infraERC20.balanceOf(holder1.address)).to.equal(500);
  expect(await infraERC20.balanceOf(holder2.address)).to.equal(500);

  // But that they are able to reduce their held balance
  const infraERC20Holder2 = infraERC20.connect(holder2);
  await expect(infraERC20Holder2.transfer(holder1.address, 50)).to.not.be
    .reverted;
  expect(await infraERC20.balanceOf(holder1.address)).to.equal(550);
  expect(await infraERC20.balanceOf(holder2.address)).to.equal(450);

  // And ensure the burn works correctly too
  await expect(infraERC20Holder2.burnAndDistribute(150)).to.not.be.reverted;
  await expect(infraERC20Holder2.burn(300)).to.not.be.reverted;
  expect(await infraERC20.balanceOf(holder2.address)).to.equal(0);
  expect(await infraERC20.balanceOf(holder1.address)).to.equal(550);
  expect(await infraERC20.totalSupply()).to.equal(550);

  // Finally, remove holder1's balance so that the other tests do not need to account for it
  await expect(infraERC20Holder1.approve(holder1.address, 550)).to.not.be
    .reverted;
  await expect(infraERC20Holder1.burnFrom(holder1.address, 550)).to.not.be
    .reverted;
  expect(await infraERC20.balanceOf(holder1.address)).to.equal(0);
  expect(await infraERC20.totalSupply()).to.equal(0);
}

async function basicDistributionTests(
  infraERC20: LiquidInfrastructureERC20,
  infraERC20Owner: HardhatEthersSigner,
  holders: HardhatEthersSigner[],
  nftOwners: HardhatEthersSigner[],
  nfts: LiquidInfrastructureNFT[],
  rewardErc20s: ERC20[]
) {
  const [holder1, holder2, holder3, holder4] = holders.slice(0, 4);
  const [nftOwner1, nftOwner2, nftOwner3] = nftOwners.slice(0, 3);
  let [nft1, nft2, nft3] = nfts.slice(0, 3);
  const [erc20a, erc20b, erc20c] = rewardErc20s.slice(0, 3);
  const erc20Addresses = [
    await erc20a.getAddress(),
    await erc20b.getAddress(),
    await erc20c.getAddress(),
  ];

  // Register one NFT as a source of reward erc20s
  await transferNftToErc20AndManage(infraERC20, nft1, nftOwner1);
  await mine(1);
  nft1 = nft1.connect(infraERC20Owner);

  // Allocate some rewards to the NFT
  const rewardAmount1 = 1000000;
  await erc20a.transfer(await nft1.getAddress(), rewardAmount1);
  expect(await erc20a.balanceOf(await nft1.getAddress())).to.equal(
    rewardAmount1
  );

  // And then send the rewards to the ERC20
  await expect(infraERC20.withdrawFromAllManagedNFTs())
    .to.emit(infraERC20, "WithdrawalStarted")
    .and.emit(nft1, "SuccessfulWithdrawal")
    .and.emit(erc20a, "Transfer")
    .withArgs(
      await nft1.getAddress(),
      await infraERC20.getAddress(),
      rewardAmount1
    )
    .and.emit(infraERC20, "Withdrawal")
    .withArgs(await nft1.getAddress())
    .and.emit(infraERC20, "WithdrawalFinished");

  // Attempt to distribute with no holders
  await expect(infraERC20.distributeToAllHolders()).to.not.emit(
    infraERC20,
    "Distribution"
  );

  // Grant a single holder some of the Infra ERC20 tokens and then distribute all held rewards to them
  await expect(infraERC20.mint(holder1.address, 100))
    .to.emit(infraERC20, "Transfer")
    .withArgs(ZERO_ADDRESS, holder1.address, 100);
  await mine(500);
  await expect(infraERC20.distributeToAllHolders())
    .to.emit(infraERC20, "DistributionStarted")
    .and.emit(infraERC20, "DistributionFinished")
    .and.emit(infraERC20, "Distribution")
    .withArgs(holder1.address, erc20Addresses, [rewardAmount1, 0, 0])
    .and.emit(erc20a, "Transfer")
    .withArgs(await infraERC20.getAddress(), holder1.address, rewardAmount1);
}

async function randomDistributionTests(
  infraERC20: LiquidInfrastructureERC20,
  supply: bigint,
  numAccounts: number,
  distributions: number,
  nfts: LiquidInfrastructureNFT[],
  erc20s: TestERC20A[]
) {
  const infraAddress = await infraERC20.getAddress();
  const signers = await ethers.getSigners();
  const holderAllocations = randomDivisions(supply, BigInt(numAccounts));
  const totalRevenue = supply * BigInt(20);
  const revenue = randomDivisions(
    totalRevenue,
    BigInt(Math.ceil(Math.random() * 15))
  ); // Random distributions of lots of rewards
  if (holderAllocations == null) {
    throw new Error("Unable to generate random divisions");
  }

  // Create accounts from the signers and mint ERC20s for them
  let accounts = [];
  for (let i = 0; i < numAccounts; i++) {
    const s = signers[10 + i];
    accounts.push(s);
    await infraERC20.approveHolder(s.address);
    await expect(infraERC20.mint(s.address, holderAllocations[i]))
      .to.emit(infraERC20, "Transfer")
      .withArgs(ZERO_ADDRESS, s.address, holderAllocations[i]);
    expect(await infraERC20.balanceOf(s.address)).to.equal(
      holderAllocations[i]
    );
  }

  // Divide all the revenue into a number of distributions
  console.log("revenue: %s, distributions: %s", revenue, distributions);
  let revenueDistributions: number[][] = chunk(
    revenue,
    Math.ceil(revenue.length / distributions)
  );
  for (let d = 0; d < revenueDistributions.length; d++) {
    let revByNFT = revenueDistributions[d];

    // For each distribution, send the NFTs their portion of the revenue
    for (let r = 0; r < revByNFT.length; r++) {
      let rev = revByNFT[r];
      let nft = nfts[r % nfts.length];
      let nftAddr = await nft.getAddress();
      let erc20 = erc20s[r];
      await erc20.mint(nftAddr, rev);
      expect(await erc20.balanceOf(nftAddr)).to.be.at.least(rev);
    }
    await infraERC20.withdrawFromAllManagedNFTs();
    // Wait for the distribution timer to expire
    await mine(500);
    // Distribute the accrued revenue
    await infraERC20.distributeToAllHolders();
  }

  // After all the distributions, the holders should have their fraction of the `totalRevenue` based on their `division` of the `supply`
  for (let a = 0; a < accounts.length; a++) {
    let account = accounts[a];
    let division = BigInt(holderAllocations[a]);
    let entitlement = BigInt(division / supply) * totalRevenue;
    let totalReceived = BigInt(0);
    for (let e of erc20s) {
      totalReceived += await e.balanceOf(account.address);
    }
    expect(totalReceived).to.equal(entitlement);
  }
}

// Creates `divisions` number of random integers which sum to `total`
function randomDivisions(total: bigint, divisions: bigint) {
  if (divisions > total) {
    throw new Error("total must be at least as large as divisions");
  }
  let ret = [];
  let remainder = total;

  for (let i = 0; i < divisions - BigInt(1); i++) {
    const division = BigInt(Math.floor(Math.random() * Number(remainder)));
    remainder -= division;
    ret.push(division);
  }
  ret.push(remainder);

  return ret;
}

// Splits an array into chunks with `sz` elements each, evenly (excluding the last)
const chunk = (arr: any[], sz: number) => {
  let currChunk = [];
  let chunks = [];
  let c = 0;
  for (let i = 0; i < arr.length; i++) {
    if (c >= sz) {
      c = 0;
      chunks.push(currChunk);
      currChunk = [];
    }
    currChunk.push(arr[i]);
    c++;
  }
  return chunks;
};

async function nftReleaseTests(
  infraERC20: LiquidInfrastructureERC20,
  nft1: LiquidInfrastructureNFT,
  nft2: LiquidInfrastructureNFT,
  nft3: LiquidInfrastructureNFT,
  account1: HardhatEthersSigner,
  account2: HardhatEthersSigner,
  account3: HardhatEthersSigner
) {
  const erc20BadSigner = infraERC20.connect(account1);
  await transferNftToErc20AndManage(infraERC20, nft1, account1);
  await transferNftToErc20AndManage(infraERC20, nft2, account2);
  await transferNftToErc20AndManage(infraERC20, nft3, account3);
  // Transfer the NFT back to the original holder
  expect(
    await infraERC20.releaseManagedNFT(
      await nft1.getAddress(),
      account1.address
    )
  )
    .to.emit(infraERC20, "ReleaseManagedNFT")
    .withArgs(await nft1.getAddress(), account1.address);

  await expect(
    erc20BadSigner.releaseManagedNFT(await nft2.getAddress(), account2.address)
  ).to.be.revertedWith("Ownable: caller is not the owner");

  await expect(
    infraERC20.releaseManagedNFT(await nft1.getAddress(), account1.address)
  ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");

  await transferNftToErc20AndManage(infraERC20, nft1, account1);
  await expect(
    infraERC20.releaseManagedNFT(await nft1.getAddress(), account1.address)
  ).to.not.be.reverted;
  await expect(
    infraERC20.releaseManagedNFT(await nft3.getAddress(), account3.address)
  ).to.not.be.reverted;
}

describe("LiquidInfrastructureERC20 tests", function () {
  it("manages NFTs", async function () {
    const { infraERC20, nftAccount1, nftAccount2, badSigner } =
      await liquidErc20Fixture();

    await basicNftManagementTests(
      infraERC20,
      nftAccount1,
      nftAccount2,
      badSigner
    );
  });

  it("adds and releases NFTs", async function () {
    const { infraERC20, nftAccount1, nftAccount2, nftAccount3 } =
      await liquidErc20Fixture();
    const nft1 = await deployLiquidNFT(nftAccount1);
    const nft2 = await deployLiquidNFT(nftAccount2);
    const nft3 = await deployLiquidNFT(nftAccount3);

    await nftReleaseTests(
      infraERC20,
      nft1,
      nft2,
      nft3,
      nftAccount1,
      nftAccount2,
      nftAccount3
    );
  });

  it("manages holders", async function () {
    const { infraERC20, holder1, holder2, badSigner } =
      await liquidErc20Fixture();

    await basicErc20HolderTests(infraERC20, holder1, holder2, badSigner);
  });

  it("manages distributions (basic)", async function () {
    const {
      infraERC20,
      erc20Owner,
      testERC20A,
      testERC20B,
      testERC20C,
      nftAccount1,
      nftAccount2,
      nftAccount3,
      holder1,
      holder2,
      holder3,
      holder4,
    } = await liquidErc20Fixture();

    const holders = [holder1, holder2, holder3, holder4];
    for (let holder of holders) {
      const address = holder.address;
      await expect(infraERC20.approveHolder(address)).to.not.be.reverted;
    }
    const nftOwners = [nftAccount1, nftAccount2, nftAccount3];
    let nfts: LiquidInfrastructureNFT[] = [
      await deployLiquidNFT(nftAccount1),
      await deployLiquidNFT(nftAccount2),
      await deployLiquidNFT(nftAccount3),
    ];
    const erc20s: ERC20[] = [testERC20A, testERC20B, testERC20C];
    for (const nft of nfts) {
      nft.setThresholds(
        erc20s,
        erc20s.map(() => 0)
      );
    }
    await basicDistributionTests(
      infraERC20,
      erc20Owner,
      holders,
      nftOwners,
      nfts,
      erc20s
    );
  });

  it("manages distributions (random)", async function () {
    const { infraERC20, erc20Owner, nftAccount1 } = await liquidErc20Fixture();

    let nfts = [
      await deployLiquidNFT(nftAccount1),
      await deployLiquidNFT(nftAccount1),
      await deployLiquidNFT(nftAccount1),
    ];
    const erc20As = [
      await deployERC20A(erc20Owner),
      await deployERC20A(erc20Owner),
      await deployERC20A(erc20Owner),
      await deployERC20A(erc20Owner),
    ];
    for (let nft of nfts) {
      await nft.setThresholds(
        await erc20As.map(async (e) => await e.getAddress()),
        erc20As.map(() => 0)
      );
    }
    await randomDistributionTests(
      infraERC20,
      BigInt(1000000) * BigInt(ONE_ETH),
      50,
      5,
      nfts,
      erc20As
    );
  });
});
