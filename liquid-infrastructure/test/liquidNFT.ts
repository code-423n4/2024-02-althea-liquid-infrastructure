import chai from "chai";
import { ethers } from "hardhat";

import { deployContracts, deployLiquidNFT } from "../test-utils";
import { ContractTransactionResponse } from "ethers";
import {
  TestERC20A,
  TestERC20B,
  TestERC20C,
  LiquidInfrastructureNFT,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { expect } = chai;

// This test makes assertions about the LiquidInfrastructureNFT contract by running it on hardhat, this contract
// is part of a hybrid Cosmos implementation, so it is not possible to test the interactions with the x/microtx
// module here. In particular, this test asserts the access control offered by OwnableApprovableERC721' modifiers
//
// Important test details:
// Contract interactions happen via hardhat-ethers: https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-ethers
// Chai is used to make assertions https://www.chaijs.com/api/bdd/
// Ethereum-waffle is used to extend chai and add ethereum matchers: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
async function runTest(opts: {}) {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const newOwner = signers[1];
  const toApprove = signers[2];

  // Deploy a LiquidInfrastructureNFT, subsequent function calls use the deployer as the message signer
  //////////////////
  const accountAsDeployer = await deployLiquidNFT(deployer);
  const nftAddress = await accountAsDeployer.getAddress();
  // Enable calls on the LiquidInfrastructureNFT as the future owner
  const accountAsNewOwner = accountAsDeployer.connect(newOwner);
  // Enable calls as an account which must be approved by the owner
  const accountToApprove = accountAsDeployer.connect(toApprove);

  // Deploy several ERC20 tokens
  //////////////////
  const { testERC20A, testERC20B, testERC20C } = await deployContracts(
    deployer
  );

  console.log("Owner tests");
  await runOwnerTests(
    accountAsDeployer,
    deployer,
    accountAsNewOwner,
    newOwner,
    testERC20A,
    testERC20B,
    testERC20C
  );

  console.log("Approval tests");
  await runApprovalTests(
    accountAsNewOwner,
    newOwner,
    accountAsDeployer,
    deployer,
    accountToApprove,
    toApprove,
    deployer,
    testERC20A,
    testERC20B,
    testERC20C
  );
}

// Test based on ownership changes
async function runOwnerTests(
  accountAsDeployer: LiquidInfrastructureNFT,
  deployer: SignerWithAddress,
  accountAsNewOwner: LiquidInfrastructureNFT,
  newOwner: SignerWithAddress,
  testERC20A: TestERC20A,
  testERC20B: TestERC20B,
  testERC20C: TestERC20C
) {
  const accountTokenId = await accountAsDeployer.AccountId();
  const nftAddress = await accountAsNewOwner.getAddress();

  // owner and future owner balance assertions
  const owner = await accountAsDeployer.ownerOf(accountTokenId);
  expect(owner).to.equal(deployer.address);
  const ownerBalance = await accountAsDeployer.balanceOf(owner);
  expect(ownerBalance).to.equal(1);
  const futureOwnerBalance = await accountAsDeployer.balanceOf(
    newOwner.address
  );
  expect(futureOwnerBalance).to.equal(0);

  // Transfer from the deployer to the owner
  //////////////////
  expect(
    await accountAsDeployer.transferFrom(
      deployer.address,
      newOwner.address,
      accountTokenId
    )
  )
    .to.emit(accountAsDeployer, "Transfer")
    .withArgs(deployer.address, newOwner.address, accountTokenId);

  // updated owner and prev owner balance assertions
  const currOwner = await accountAsDeployer.ownerOf(accountTokenId);
  expect(currOwner).to.equal(newOwner.address);
  const currOwnerBalance = await accountAsDeployer.balanceOf(currOwner);
  expect(currOwnerBalance).to.equal(1);
  const deployerBalance = await accountAsDeployer.balanceOf(deployer.address);
  expect(deployerBalance).to.equal(0);

  // thresholds assertions
  const [erc20s, amounts] = await accountAsDeployer.getThresholds();
  expect(erc20s.length).to.equal(0);
  expect(amounts.length).to.equal(0);

  // Use USDC as an example contract
  const mainnetUSDC: string = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const expectedThreshold = { amount: 1000000, erc20: mainnetUSDC };

  // Fail to call setThresholds with the old owner
  await expect(
    accountAsDeployer.setThresholds(
      [expectedThreshold.erc20],
      [expectedThreshold.amount]
    )
  ).to.be.reverted;

  // Set the thresholds with the new owner and assert the event is correct
  await checkThresholdsChangedEventArgs(
    await accountAsNewOwner.setThresholds(
      [expectedThreshold.erc20],
      [expectedThreshold.amount]
    ),
    [expectedThreshold.erc20],
    [expectedThreshold.amount]
  );

  // transfer tokens to the NFT as if this were via x/microtx
  const withdrawalAmount = 1000000;
  await sendTestERC20sToAccount(
    testERC20A,
    testERC20B,
    testERC20C,
    nftAddress,
    withdrawalAmount
  );

  await withdrawSomeERC20sAndAssertBalances(
    newOwner,
    deployer,
    accountAsDeployer,
    mainnetUSDC,
    withdrawalAmount,
    deployer,
    testERC20A,
    testERC20B,
    testERC20C
  );

  await testRecoveryProcessInit(accountAsDeployer, accountAsNewOwner);
}

// Test approving an account, along with ownership changes revoking an old approval
async function runApprovalTests(
  accountAsOwner: LiquidInfrastructureNFT, // Contract with current owner as signer
  owner: SignerWithAddress, // Current owner
  accountAsNewOwner: LiquidInfrastructureNFT, // Contract with signer who will become owner
  newOwner: SignerWithAddress, // Will become owner
  accountAsToApprove: LiquidInfrastructureNFT, // Contract with account who will be approved by owner
  toApprove: SignerWithAddress, // Will become approved by owner
  deployer: SignerWithAddress,
  testERC20A: TestERC20A,
  testERC20B: TestERC20B,
  testERC20C: TestERC20C
) {
  const nftAddress = await accountAsNewOwner.getAddress();
  const toApproveAddress = toApprove.address;
  const ownerAddress = owner.address;
  const newOwnerAddress = newOwner.address;
  const testERC20AAddress = await testERC20A.getAddress();
  const testERC20BAddress = await testERC20B.getAddress();
  const testERC20CAddress = await testERC20C.getAddress();

  const accountTokenId = await accountAsOwner.AccountId();
  // event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
  await expect(accountAsOwner.approve(toApprove.address, accountTokenId))
    .to.emit(accountAsOwner, "Approval")
    .withArgs(ownerAddress, toApproveAddress, accountTokenId);

  // Call all the restricted functions as the approved account
  const expectedThresholds = [
    { amount: 1000000, erc20: testERC20AAddress },
    { amount: 2000000, erc20: testERC20BAddress },
    { amount: 3000000, erc20: testERC20CAddress },
  ];
  const expectedThresholdAmounts = expectedThresholds.map((et) => et.amount);
  const expectedThresholdAddresses = expectedThresholds.map((et) => et.erc20);

  // Set the thresholds with the new owner and assert the event is correct
  await checkThresholdsChangedEventArgs(
    await accountAsToApprove.setThresholds(
      expectedThresholdAddresses,
      expectedThresholdAmounts
    ),
    expectedThresholdAddresses,
    expectedThresholdAmounts
  );
  // thresholds assertions
  const [erc20s, amounts] = await accountAsToApprove.getThresholds();
  expect(erc20s.length).to.equal(amounts.length);
  expect(erc20s.length).to.equal(expectedThresholdAddresses.length);
  expect(amounts.length).to.equal(expectedThresholdAmounts.length);
  for (let i = 0; i < erc20s.length; i++) {
    const actualErc20 = erc20s[i];
    const actualAmt = amounts[i];
    const expErc20 = expectedThresholdAddresses[i];
    const expAmt = expectedThresholdAmounts[i];
    expect(actualErc20).to.equal(expErc20);
    expect(actualAmt).to.equal(expAmt);
  }

  const withdrawalAmount = 1000000000;
  await sendTestERC20sToAccount(
    testERC20A,
    testERC20B,
    testERC20C,
    nftAddress,
    withdrawalAmount
  );
  await withdrawSomeERC20sAndAssertBalances(
    toApprove,
    newOwner,
    accountAsNewOwner,
    newOwnerAddress,
    withdrawalAmount,
    deployer,
    testERC20A,
    testERC20B,
    testERC20C
  );

  // Now transfer to the new owner and assert that the account approved by the old sender is no longer approved
  expect(
    await accountAsOwner.transferFrom(
      ownerAddress,
      newOwnerAddress,
      accountTokenId
    )
  )
    .to.emit(accountAsOwner, "Transfer")
    .withArgs(ownerAddress, newOwnerAddress, accountTokenId);

  const newExpectedThresholds = [{ amount: 2000000, erc20: testERC20AAddress }];
  const newExpectedThresholdAmounts = newExpectedThresholds.map(
    (et) => et.amount
  );
  const newExpectedThresholdAddresses = newExpectedThresholds.map(
    (et) => et.erc20
  );

  // Set the thresholds with the new owner and assert the event is correct
  await expect(
    accountAsToApprove.setThresholds(
      newExpectedThresholdAddresses,
      newExpectedThresholdAmounts
    )
  ).to.be.reverted;

  // Use the old approver as the bad signer in withdrawal and recovery
  await sendTestERC20sToAccount(
    testERC20A,
    testERC20B,
    testERC20C,
    nftAddress,
    withdrawalAmount
  );
  await withdrawSomeERC20sAndAssertBalances(
    newOwner,
    toApprove,
    accountAsToApprove,
    toApproveAddress,
    withdrawalAmount,
    deployer,
    testERC20A,
    testERC20B,
    testERC20C
  );
  await testRecoveryProcessInit(accountAsToApprove, accountAsNewOwner);
}

// Checks that the result of setting the thresholds is successful and emits an event with the right array values in it
// Call with the result of liquidaccount.setThresholds() and the passed threshold values
async function checkThresholdsChangedEventArgs(
  tx: ContractTransactionResponse,
  expectedErc20s: string[],
  expectedAmounts: number[]
) {
  const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
  if (receipt == null) {
    throw new Error("Unable to get receipt for tx hash");
  }
  const iface = new ethers.Interface([
    "event ThresholdsChanged(address[] newErc20s,uint256[] newAmounts)",
  ]);
  const data = receipt.logs[0].data;
  const topics = receipt.logs[0].topics;
  const event = iface.decodeEventLog("ThresholdsChanged", data, topics);

  const actualErc20s = event["newErc20s"];
  const actualAmounts = event["newAmounts"];

  expect(actualErc20s.length == expectedErc20s.length);
  expect(actualAmounts.length == expectedAmounts.length);
  for (let i = 0; i < actualErc20s.length; i++) {
    const expectedErc20 = expectedErc20s[i];
    const actualErc20 = actualErc20s[i];
    expect(expectedErc20).to.equal(actualErc20);
    const expectedAmt = expectedAmounts[i];
    const actualAmt = actualAmounts[i];
    expect(expectedAmt).to.equal(actualAmt);
  }
}

// Sends `transferAmount` of each test ERC20 to `reciever`
async function sendTestERC20sToAccount(
  testERC20A: TestERC20A,
  testERC20B: TestERC20B,
  testERC20C: TestERC20C,
  receiver: string,
  transferAmount: number
) {
  const initialBalances = {
    A: await testERC20A.balanceOf(receiver),
    B: await testERC20B.balanceOf(receiver),
    C: await testERC20C.balanceOf(receiver),
  };
  await testERC20A.transfer(receiver, transferAmount);
  await testERC20B.transfer(receiver, transferAmount);
  await testERC20C.transfer(receiver, transferAmount);

  const updatedBalances = {
    A: await testERC20A.balanceOf(receiver),
    B: await testERC20B.balanceOf(receiver),
    C: await testERC20C.balanceOf(receiver),
  };
  const expectedBalances = {
    A: BigInt(transferAmount) + initialBalances.A,
    B: BigInt(transferAmount) + initialBalances.B,
    C: BigInt(transferAmount) + initialBalances.C,
  };
  expect(updatedBalances.A).to.equal(expectedBalances.A);
  expect(updatedBalances.B).to.equal(expectedBalances.B);
  expect(updatedBalances.C).to.equal(expectedBalances.C);
}

// Withdraws `withdrawalAmount` of testERC20A and testERC20C from the Liquid Infrastructure Account to `withdrawalReceiver`,
// asserting events and balances change (or don't) as expected. accountBadSender is used to test access control
// failure, while accountGoodSender is used for the happy path testing.
async function withdrawSomeERC20sAndAssertBalances(
  goodSender: SignerWithAddress,
  badSender: SignerWithAddress,
  accountBadSender: LiquidInfrastructureNFT,
  withdrawalReceiver: string,
  withdrawalAmount: number,
  erc20Deployer: SignerWithAddress,
  testERC20A: TestERC20A,
  testERC20B: TestERC20B,
  testERC20C: TestERC20C
) {
  const nftAddress = await accountBadSender.getAddress();
  const accountGoodSender = accountBadSender.connect(goodSender);
  const goodSenderAddress = await goodSender.getAddress();
  const badSenderAddress = await badSender.getAddress();
  const testERC20AAddress = await testERC20A.getAddress();
  const testERC20BAddress = await testERC20B.getAddress();
  const testERC20CAddress = await testERC20C.getAddress();

  const initialBalances = {
    A: await testERC20A.balanceOf(nftAddress),
    B: await testERC20B.balanceOf(nftAddress),
    C: await testERC20C.balanceOf(nftAddress),
  };
  const receiverInitialBalances = {
    A: await testERC20A.balanceOf(withdrawalReceiver),
    B: await testERC20B.balanceOf(withdrawalReceiver),
    C: await testERC20C.balanceOf(withdrawalReceiver),
  };
  const erc20sToWithdraw = [testERC20AAddress, testERC20CAddress];
  const expectedAmountsWithdrawn = [initialBalances.A, initialBalances.C];

  // Reverted when not sent as current owner
  await expect(
    accountBadSender.withdrawBalancesTo(erc20sToWithdraw, withdrawalReceiver)
  ).to.be.reverted;
  await expect(accountBadSender.withdrawBalances(erc20sToWithdraw)).to.be
    .reverted;

  // Successful event emitted when sent as good owner
  await expect(
    accountGoodSender.withdrawBalancesTo(erc20sToWithdraw, withdrawalReceiver)
  )
    .to.emit(accountGoodSender, "SuccessfulWithdrawal")
    .withArgs(withdrawalReceiver, erc20sToWithdraw, expectedAmountsWithdrawn);

  expect(await testERC20A.balanceOf(withdrawalReceiver)).to.equal(
    BigInt(withdrawalAmount) + receiverInitialBalances.A
  );
  expect(await testERC20A.balanceOf(nftAddress)).to.equal(
    initialBalances.A - BigInt(withdrawalAmount)
  );

  // Nothing happened with B, should not see any balance changes
  expect(await testERC20B.balanceOf(withdrawalReceiver)).to.equal(
    receiverInitialBalances.B
  );
  expect(await testERC20B.balanceOf(nftAddress)).to.equal(initialBalances.B);

  expect(await testERC20C.balanceOf(withdrawalReceiver)).to.equal(
    BigInt(withdrawalAmount) + receiverInitialBalances.C
  );
  expect(await testERC20C.balanceOf(nftAddress)).to.equal(
    initialBalances.C - BigInt(withdrawalAmount)
  );

  // Test the withdraw to owner function with just TestERC20B
  const accountId = await accountGoodSender.AccountId();
  const owner = await accountGoodSender.ownerOf(accountId);
  const initialOwnerBalances = {
    A: await testERC20A.balanceOf(owner),
    B: await testERC20B.balanceOf(owner),
    C: await testERC20C.balanceOf(owner),
  };
  await accountGoodSender.withdrawBalances([testERC20BAddress]); // Perform the withdrawal to the owner
  const resultantOwnerBalances = {
    A: await testERC20A.balanceOf(owner),
    B: await testERC20B.balanceOf(owner),
    C: await testERC20C.balanceOf(owner),
  };
  expect(resultantOwnerBalances.A).to.equal(initialOwnerBalances.A); // unchanged A
  expect(resultantOwnerBalances.B).to.equal(
    initialOwnerBalances.B + initialBalances.B
  ); // Expect NFT's balances to be added to the owner's
  expect(resultantOwnerBalances.C).to.equal(initialOwnerBalances.C); // unchanged C
}

// Tests that accountBadSender is not allowed to init the recovery process for the Liquid Infrastructure Account, yet the
// accountGoodSender is and the correct event is emitted
// Note that this will not trigger an actual recovery given that the ethereum provider is hardhat,
// recovery requires EVM <-> Cosmos module interactions which happen separate from the EVM runtime
async function testRecoveryProcessInit(
  accountBadSender: LiquidInfrastructureNFT,
  accountGoodSender: LiquidInfrastructureNFT
) {
  // Reverted when not sent as current owner
  await expect(accountBadSender.recoverAccount()).to.be.reverted;

  // Successful event emitted when sent as good owner
  await expect(accountGoodSender.recoverAccount()).to.emit(
    accountGoodSender,
    "TryRecover"
  );
}

describe("LiquidInfrastructureNFT tests", function () {
  it("works right", async function () {
    await runTest({});
  });
});
