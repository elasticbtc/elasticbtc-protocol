import { expect } from 'chai';
import { network, ethers } from 'hardhat';
import { deadline, wait } from './utils';

const ZERO = ethers.BigNumber.from(0);
const ONE_WBTC = ethers.BigNumber.from('100000000'); // 10 ** 8
const KnownAddresses = require('../migrations/known-contracts.js');

async function main() {
  if (network.name === 'mainnet') {
    throw new Error('Cannot run simulation on mainnet');
  }

  if (network.name === 'localhost') {
    network.name = 'development';
  }

  const { provider } = ethers;
  const [operator] = await ethers.getSigners();

  const estimateGasPrice = await provider.getGasPrice();
  const gasPrice = estimateGasPrice.mul(3).div(2);
  console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  const override = { gasPrice };

  const addresses = require(`../deployments/addresses.${network.name}.json`);
  const uniswapRouterAddress =
    addresses.uniswapV2Router || KnownAddresses.UniswapV2Router02[network.name];

  const uniswapRouter = await ethers.getContractAt(
    'UniswapV2Router02',
    uniswapRouterAddress
  );
  const wbtc = await ethers.getContractAt('MockWBTC', addresses.wbtc);
  const ebtc = await ethers.getContractAt('Cash', addresses.cash);
  const ebs = await ethers.getContractAt('Share', addresses.share);
  const oracle = await ethers.getContractAt(
    'Oracle',
    addresses.seigniorageOracle
  );
  const boardroom = await ethers.getContractAt(
    'Boardroom',
    addresses.boardroom
  );
  const treasury = await ethers.getContractAt('Treasury', addresses.treasury);

  let tx;

  const ebtcSupply = await ebtc.totalSupply();
  console.log('EBTC Supply: ', ebtcSupply.toString());
  console.log(
    'Accumulated Seigniorage: ',
    (await treasury.getReserve()).toString()
  );

  console.log('\n===== Buy tokens on uniswap =====');
  console.log('Buy 1 WBTC worth of EBTC ...');
  tx = await uniswapRouter.connect(operator).swapExactTokensForTokens(
    ONE_WBTC,
    ZERO, // We don't care about slippage
    [wbtc.address, ebtc.address],
    operator.address,
    deadline()
  );
  await wait(ethers, tx.hash, 'uniswapRouter.swapExactTokensForTokens');

  console.log('Buy 1 WBTC worth of EBS ...');
  tx = await uniswapRouter.connect(operator).swapExactTokensForTokens(
    ONE_WBTC,
    ZERO, // We don't care about slippage
    [wbtc.address, ebs.address],
    operator.address,
    deadline()
  );
  await wait(ethers, tx.hash, 'uniswapRouter.swapExactTokensForTokens');

  console.log('\n===== Stake EBS =====');
  const ebsBalance = await ebs.balanceOf(operator.address);
  await ebs.approve(boardroom.address, ebsBalance);
  tx = await boardroom.connect(operator).stake(ebsBalance);
  await wait(ethers, tx.hash, 'boardroom.stake');
  console.log(`Staked ${ebsBalance.toString()} EBS in boardroom`);
  const oldBoardroomBalance = await ebtc.balanceOf(boardroom.address);

  console.log(`\n===== Update Oracle =====`);
  await oracle.connect(operator).update();
  console.log(
    `Current EBTC TWAP: ${await treasury.getSeigniorageOraclePrice()}`
  );

  console.log(
    `\n===== Calling allocateSeigniorage on treasury at ${addresses.treasury} =====`
  );
  try {
    tx = await treasury.connect(operator).allocateSeigniorage(override);
    await wait(ethers, tx.hash, 'oracle.update');
  } catch (e) {
    throw new Error(`Failed to allocate seigniorage. Error: ${e}`);
  }

  const newTwap = await treasury.getSeigniorageOraclePrice();
  console.log(`Updated EBTC TWAP: ${newTwap}`);
  const seigniorageAmount = (await ebtc.balanceOf(boardroom.address)).sub(
    oldBoardroomBalance
  );

  const theoreticalAmount = ebtcSupply.mul(newTwap.sub(ONE_WBTC)).div(ONE_WBTC);
  const fundReserve = theoreticalAmount
    .mul(await treasury.fundAllocationRate())
    .div('1000');
  const devReserve = theoreticalAmount
    .mul(await treasury.devFundAllocationRate())
    .div('1000');
  const expectedAmount = theoreticalAmount.sub(fundReserve).sub(devReserve);
  console.log(`Seigniorage Amount: ${seigniorageAmount}`);
  console.log(`Expected Amount: ${expectedAmount}`);
  expect(seigniorageAmount.toString()).to.eq(expectedAmount.toString());

  console.log('\n===== Claim EBTC =====');
  tx = await boardroom.connect(operator).claimReward();
  await wait(ethers, tx.hash, 'boardroom.claimReward');
  const EBTCBalance = await ebtc.balanceOf(operator.address);
  console.log(`${EBTCBalance} claimed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
