import { BigNumber } from 'ethers';
import { keccak256 } from 'ethers/lib/utils';
import { network, ethers } from 'hardhat';
import { encodeParameters, wait } from './utils';

import addresses from '../deployments/addresses.mainnet.json';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const CURVE_MIN_SUPPLY = 0;
const CURVE_MAX_SUPPLY = 10000;
const CURVE_MIN_CEILING_CENTS = 101;
const CURVE_MAX_CEILING_CENTS = 105;

async function main() {
  if (network.name !== 'mainnet') {
    throw new Error('Cannot launch on mainnet');
  }

  const { provider } = ethers;
  const [operator] = await ethers.getSigners();

  const estimateGasPrice = await provider.getGasPrice();
  const gasPrice = estimateGasPrice.mul(3).div(2);
  console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  const override = { gasPrice };

  const LinearCurve = await ethers.getContractFactory('LinearThreshold');

  console.log('\n===================================================\n');

  console.log('=> Deploy\n');

  const ebtcUnit = BigNumber.from(10).pow(18);
  const wbtcUnit = BigNumber.from(10).pow(8);
  const newLinearCurve = await LinearCurve.connect(operator).deploy(
    ebtcUnit.mul(CURVE_MIN_SUPPLY),
    ebtcUnit.mul(CURVE_MAX_SUPPLY),
    wbtcUnit.mul(CURVE_MIN_CEILING_CENTS).div(100),
    wbtcUnit.mul(CURVE_MAX_CEILING_CENTS).div(100)
  );
  console.log('New linear threshold contract: ', newLinearCurve.address);

  console.log('\n===================================================\n');

  console.log('=> Migration\n');

  const treasury = await ethers.getContractAt('Treasury', addresses.treasury);
  const timelock = await ethers.getContractAt('Timelock', addresses.timelock);

  const eta = Math.round(new Date().getTime() / 1000) + 2 * DAY + 600;
  const signature = 'setCeilingCurve(address)';
  const data = encodeParameters(ethers, ['address'], [newLinearCurve.address]);
  const calldata = [treasury.address, 0, signature, data, eta];
  const txHash = keccak256(
    encodeParameters(
      ethers,
      ['address', 'uint256', 'string', 'bytes', 'uint256'],
      calldata
    )
  );

  const tx = await timelock
    .connect(operator)
    .queueTransaction(...calldata, override);
  await wait(
    ethers,
    tx.hash,
    `\n1. timelock.queueTransaction (treausry.setCeilingCurve) => txHash: ${txHash}`
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
