import { network, ethers } from 'hardhat';
import { ParamType, keccak256 } from 'ethers/lib/utils';

import {
  WBTC,
  ORACLE_START_DATE,
  TREASURY_START_DATE,
  UNI_FACTORY,
} from '../deploy.config';
import OLD from '../deployments/4.json';
import { encodeParameters, wait } from './utils';

const DEV_FUND_ADDRESS = '0x0000000000000000000000000000000000000000';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

async function main() {
  if (network.name !== 'mainnet') {
    throw new Error('wrong network');
  }

  const { provider } = ethers;
  const [operator] = await ethers.getSigners();

  const estimateGasPrice = await provider.getGasPrice();
  const gasPrice = estimateGasPrice.mul(3).div(2);
  console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  const override = { gasPrice };

  // Fetch existing contracts
  // === token
  const cash = await ethers.getContractAt('Cash', OLD.Cash);
  const bond = await ethers.getContractAt('Bond', OLD.Bond);
  const share = await ethers.getContractAt('Share', OLD.Share);

  // === core
  const seigniorageOracle = await ethers.getContractAt('Oracle', OLD.Oracle);
  const timelock = await ethers.getContractAt('Timelock', OLD.Timelock);
  const treasury = await ethers.getContractAt('Treasury', OLD.Treasury);
  const boardroom = await ethers.getContractAt('Boardroom', OLD.Boardroom);

  console.log('Deployments');
  console.log(JSON.stringify(OLD, null, 2));

  if (operator.address !== (await timelock.admin())) {
    throw new Error(`Invalid admin ${operator.address}`);
  }
  console.log(`Admin verified ${operator.address}`);

  const Oracle = await ethers.getContractFactory('Oracle');
  const Treasury = await ethers.getContractFactory('Treasury');
  // const Boardroom = await ethers.getContractFactory('Boardroom');
  const SimpleFund = await ethers.getContractFactory('SimpleERCFund');

  let tx;

  console.log('\n===================================================\n');

  console.log('=> Deploy\n');

  const simpleFund = await SimpleFund.connect(operator).deploy();
  await wait(
    ethers,
    simpleFund.deployTransaction.hash,
    `\nDeploy fund contract => ${simpleFund.address}`
  );

  const bondOracle = await Oracle.connect(operator).deploy(
    UNI_FACTORY,
    cash.address,
    WBTC,
    HOUR,
    ORACLE_START_DATE,
    override
  );
  await wait(
    ethers,
    bondOracle.deployTransaction.hash,
    `\nDeploy new Oracle => ${bondOracle.address}`
  );

  // const newBoardroom = await Boardroom.connect(operator).deploy(
  //   cash.address,
  //   share.address,
  //   override
  // );
  // await wait(
  //   ethers,
  //   newBoardroom.deployTransaction.hash,
  //   `\nDeploy new Boardroom => ${newBoardroom.address}`
  // );

  const newTreasury = await Treasury.connect(operator).deploy(
    cash.address,
    bond.address,
    share.address,
    bondOracle.address,
    seigniorageOracle.address,
    boardroom.address,
    simpleFund.address,
    DEV_FUND_ADDRESS,
    TREASURY_START_DATE,
    override
  );
  await wait(
    ethers,
    newTreasury.deployTransaction.hash,
    `\nDeploy new Treasury => ${newTreasury.address}`
  );

  console.log('\n===================================================\n');

  console.log('=> RBAC\n');

  // tx = await newBoardroom
  //   .connect(operator)
  //   .transferOperator(newTreasury.address, override);
  // await wait(tx.hash, 'boardroom.transferOperator');

  // tx = await newBoardroom
  //   .connect(operator)
  //   .transferOwnership(timelock.address, override);
  // await wait(tx.hash, 'boardroom.transferOwnership');

  tx = await simpleFund
    .connect(operator)
    .transferOperator(timelock.address, override);
  await wait(ethers, tx.hash, 'fund.transferOperator');

  tx = await simpleFund
    .connect(operator)
    .transferOwnership(timelock.address, override);
  await wait(ethers, tx.hash, 'fund.transferOwnership');

  tx = await newTreasury
    .connect(operator)
    .transferOperator(timelock.address, override);
  await wait(ethers, tx.hash, 'treasury.transferOperator');

  tx = await newTreasury
    .connect(operator)
    .transferOwnership(timelock.address, override);
  await wait(ethers, tx.hash, 'treasury.transferOwnership');

  console.log('\n===================================================\n');

  console.log('=> Migration\n');

  let eta;
  let calldata;
  let txHash;

  // 1. transfer operator to old treasury
  eta = Math.round(new Date().getTime() / 1000) + 2 * DAY + 60;
  calldata = [
    boardroom.address,
    0,
    'transferOperator(address)',
    encodeParameters(ethers, ['address'], [treasury.address]),
    eta,
  ];
  txHash = keccak256(
    encodeParameters(
      ethers,
      ['address', 'uint256', 'string', 'bytes', 'uint256'],
      calldata
    )
  );

  tx = await timelock.connect(operator).queueTransaction(...calldata, override);
  await wait(
    ethers,
    tx.hash,
    `\n1. timelock.queueTransaction (boardroom.transferOperator) => txHash: ${txHash}`
  );
  console.log(`Tx execution ETA: ${eta}`);

  if (!(await timelock.connect(operator).queuedTransactions(txHash))) {
    throw new Error('wtf');
  }

  // 2. migrate treasury
  eta = Math.round(new Date().getTime() / 1000) + 2 * DAY + 60;
  calldata = [
    treasury.address,
    0,
    'migrate(address)',
    encodeParameters(ethers, ['address'], [newTreasury.address]),
    eta,
  ];
  txHash = keccak256(
    encodeParameters(
      ethers,
      ['address', 'uint256', 'string', 'bytes', 'uint256'],
      calldata
    )
  );

  tx = await timelock.connect(operator).queueTransaction(...calldata, override);
  await wait(
    ethers,
    tx.hash,
    `\n2. timelock.queueTransaction (treasury.migrate) => txHash: ${txHash}`
  );
  console.log(`Tx execution ETA: ${eta}`);

  if (!(await timelock.connect(operator).queuedTransactions(txHash))) {
    throw new Error('wtf');
  }

  // 3. transfer operator to new treasury
  eta = Math.round(new Date().getTime() / 1000) + 2 * DAY + 60;
  calldata = [
    boardroom.address,
    0,
    'transferOperator(address)',
    encodeParameters(ethers, ['address'], [newTreasury.address]),
    eta,
  ];
  txHash = keccak256(
    encodeParameters(
      ethers,
      ['address', 'uint256', 'string', 'bytes', 'uint256'],
      calldata
    )
  );

  tx = await timelock.connect(operator).queueTransaction(...calldata, override);
  await wait(
    ethers,
    tx.hash,
    `\n3. timelock.queueTransaction (boardroom.transferOperator) => txHash: ${txHash}`
  );
  console.log(`Tx execution ETA: ${eta}`);

  if (!(await timelock.connect(operator).queuedTransactions(txHash))) {
    throw new Error('wtf');
  }

  console.log('OK!');

  console.log('\n===================================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
